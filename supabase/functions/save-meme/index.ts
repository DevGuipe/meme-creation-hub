// save-meme (rewritten)
// Robust, idempotent meme save pipeline with strict validation and clear errors
// - Strict Zod validation for all inputs
// - Idempotency: returns existing meme when same content is sent again
// - Deterministic short id generation via DB function
// - Safe image handling (data URL -> Uint8Array), MIME enforced
// - Storage upload to public bucket 'memes'
// - Clear CORS and error responses with details

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helpers
function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const telegramIdSchema = z
  .number()
  .int()
  .positive()
  .min(1)
  .max(9_999_999_999);

const templateKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/, "Template key contains invalid characters");

const layerSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["background", "body", "head", "prop", "text"]),
  content: z.string().max(10_000),
  x: z.number().min(-1000).max(1000),
  y: z.number().min(-1000).max(1000),
  scale: z.number().min(0.1).max(10),
  rotation: z.number().min(-360).max(360),
  zIndex: z.number().int().min(0).max(100),
  fontSize: z.number().min(8).max(200).optional(),
  fontFamily: z.string().max(100).optional(),
  fontWeight: z.string().max(50).optional(),
  fontStyle: z.string().max(50).optional(),
  textColor: z.string().max(50).optional(),
  strokeColor: z.string().max(50).optional(),
  strokeWidth: z.number().min(0).max(50).optional(),
  textAlign: z.string().max(20).optional(),
  textShadow: z.string().max(500).optional(),
});

const layersArraySchema = z
  .array(layerSchema)
  .min(1, "At least one layer is required")
  .max(50, "Too many layers (maximum 50)");

const dataUrlSchema = z
  .string()
  .regex(/^data:image\/(png|jpeg|jpg|gif|webp);base64,/i, "Invalid image format")
  .max(10_000_000, "Image too large (maximum 10MB in base64)");

const requestSchema = z.object({
  telegramUserId: telegramIdSchema,
  templateKey: templateKeySchema,
  layersPayload: z.union([
    layersArraySchema,
    z.string().transform((s, ctx) => {
      try {
        const parsed = JSON.parse(s);
        return layersArraySchema.parse(parsed);
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid layers payload JSON" });
        return z.NEVER;
      }
    }),
  ]),
  image: dataUrlSchema.optional(),
  idempotencyKey: z.string().min(1).max(100).optional(),
});

function parseDataUrl(dataUrl: string): { contentType: string; bytes: Uint8Array } {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|gif|webp));base64,(.*)$/i);
  if (!match) throw new Error("Invalid image data URL");
  const contentType = match[1].toLowerCase();
  const base64 = match[2];
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return { contentType, bytes };
}

async function getOrCreateUserId(supabase: any, telegramId: number): Promise<string> {
  const { data: existing, error: getErr } = await supabase.rpc("get_user_id_by_telegram_id", {
    telegram_user_id: telegramId,
  });
  if (!getErr && existing) return existing as string;

  const { data: created, error: createErr } = await supabase.rpc("create_user_if_not_exists", {
    telegram_user_id: telegramId,
    user_first_name: "Web",
  });
  if (createErr) throw new Error(`Failed to create user: ${createErr.message}`);
  if (!created) throw new Error("User creation returned no ID");
  return created as string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(500, { error: "Server not configured" });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  try {
    const body = await req.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      const details = parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`);
      return jsonResponse(400, { error: "Validation failed", details });
    }

    const { telegramUserId, templateKey, layersPayload, image, idempotencyKey } = parsed.data;

    console.log("🚀 save-meme invoked", {
      telegramUserId,
      templateKey,
      layersCount: layersPayload.length,
      hasImage: !!image,
      hasIdempotency: !!idempotencyKey,
    });

    // Idempotency: if key provided and an entry exists, return it
    if (idempotencyKey) {
      const { data: existing, error: existingErr } = await supabase
        .from("memes")
        .select("id, id_short, image_url")
        .eq("idempotency_key", idempotencyKey)
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle();

      if (existingErr) console.warn("Idempotency lookup error", existingErr);
      if (existing) {
        const url = existing.image_url || null;
        console.log("♻️ Returning existing idempotent meme", existing.id_short);
        return jsonResponse(200, { memeId: existing.id, id_short: existing.id_short, url });
      }
    }

    // Resolve owner
    const ownerId = await getOrCreateUserId(supabase, telegramUserId);

    // Generate short id early to name the file deterministically
    const { data: shortId, error: shortErr } = await supabase.rpc("generate_meme_short_id", {
      owner_uuid: ownerId,
    });
    if (shortErr || !shortId) throw new Error(shortErr?.message || "Failed to generate short id");

    // Prepare image upload (optional)
    let publicUrl: string | null = null;
    if (image) {
      try {
        const { bytes, contentType } = parseDataUrl(image);
        const filePath = `${shortId}.png`; // normalize to png extension in public URL
        const { error: upErr } = await supabase.storage
          .from("memes")
          .upload(filePath, bytes, {
            contentType,
            upsert: true,
          });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("memes").getPublicUrl(filePath);
        publicUrl = urlData.publicUrl;
        console.log("✅ Image uploaded", { publicUrl });
      } catch (e) {
        console.error("Image upload failed", e);
        return jsonResponse(400, { error: "Image upload failed", details: [e instanceof Error ? e.message : String(e)] });
      }
    }

    // Insert meme
    const insertPayload = {
      id_short: shortId as string,
      owner_id: ownerId,
      template_key: templateKey,
      layers_payload: layersPayload,
      image_url: publicUrl,
      idempotency_key: idempotencyKey || null,
    } as const;

    const { data: inserted, error: insertErr } = await supabase
      .from("memes")
      .insert(insertPayload)
      .select("id, id_short, image_url")
      .single();

    if (insertErr) {
      // If unique/idempotency violation, try fetch existing and return it
      if (String(insertErr.message || "").toLowerCase().includes("idempotency") || String(insertErr.code || "") === "23505") {
        const { data: existing, error: exErr } = await supabase
          .from("memes")
          .select("id, id_short, image_url")
          .eq("idempotency_key", idempotencyKey)
          .is("deleted_at", null)
          .limit(1)
          .maybeSingle();
        if (!exErr && existing) {
          const url = existing.image_url || null;
          console.log("♻️ Returning existing after unique conflict", existing.id_short);
          return jsonResponse(200, { memeId: existing.id, id_short: existing.id_short, url });
        }
      }
      console.error("Insert failed", insertErr);
      return jsonResponse(500, { error: "Database insert failed", details: [insertErr.message || "Unknown DB error"] });
    }

    const url = inserted.image_url || null;
    console.log("✅ save-meme done", { memeId: inserted.id, id_short: inserted.id_short, hasUrl: !!url });
    return jsonResponse(200, { memeId: inserted.id, id_short: inserted.id_short, url });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("save-meme error", message, e);
    // Try to surface Zod details if present
    const details: string[] = [];
    if (typeof e === "object" && e && "issues" in (e as any)) {
      const iss = (e as any).issues as Array<any>;
      for (const i of iss) {
        const path = Array.isArray(i.path) ? i.path.join(".") : "field";
        details.push(`${path}: ${i.message}`);
      }
    }
    return jsonResponse(400, { error: message || "Unknown error", details: details.length ? details : undefined });
  }
});
