import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { validateRequest, finalizeMemePreviewRequestSchema } from '../_shared/validation.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function dataUrlToUint8Array(dataUrl: string): { bytes: Uint8Array; contentType: string } {
  const [header, base64] = dataUrl.split(",");
  const contentTypeMatch = header.match(/data:(.*?);base64/);
  const contentType = contentTypeMatch ? contentTypeMatch[1] : "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return { bytes, contentType };
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // CRITICAL SECURITY FIX: Validate all inputs with Zod schema
    const validation = await validateRequest(req, finalizeMemePreviewRequestSchema);
    
    if ('error' in validation) {
      console.error('❌ Input validation failed', validation);
      return new Response(JSON.stringify({ 
        error: validation.error,
        details: validation.details 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ✅ Now we have VALIDATED and TYPE-SAFE data
    const { memeId, id_short } = validation.data;

    // FIXED: Use SERVICE_ROLE_KEY for proper permissions
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.info("🔎 Finalizing meme preview", { memeId, id_short });

    // 1) Fetch meme
    const { data: meme, error: memeErr } = await supabase
      .from("memes")
      .select("id, id_short, image_urls, layers_payload")
      .eq("id", memeId)
      .maybeSingle();

    if (memeErr || !meme) {
      console.error("❌ Meme fetch failed", memeErr);
      return new Response(JSON.stringify({ error: "Meme not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const shortId = id_short || meme.id_short;
    const filePath = `${shortId}.png`;

    // 2) If DB already has a non-placeholder URL and it loads, approve
    const currentPreview = (meme.image_urls as any)?.preview as string | undefined;
    if (currentPreview && 
        !currentPreview.includes("placeholder") && 
        !currentPreview.includes("/placeholder.svg") &&
        currentPreview.startsWith("http")) {
      try {
        console.info("🔍 Verifying existing preview URL", { url: currentPreview });
        const headResp = await fetch(currentPreview, { 
          method: "HEAD", 
          signal: AbortSignal.timeout(5000) 
        });
        if (headResp.ok) {
          console.info("✅ Existing preview verified", { url: currentPreview });
          return new Response(JSON.stringify({ ok: true, url: currentPreview }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (e) {
        console.warn("⚠️ Existing preview not reachable, will regenerate", e);
      }
    }

    // 3) Try to locate existing storage file first
    const publicUrl = supabase.storage.from("memes").getPublicUrl(filePath).data.publicUrl;
    console.info("🔍 Checking existing storage file", { publicUrl });
    try {
      const probe = await fetch(publicUrl, { 
        method: "HEAD", 
        signal: AbortSignal.timeout(5000) 
      });
      if (probe.ok) {
        // Update DB and return
        const { error: updErr } = await supabase
          .from("memes")
          .update({ image_urls: { preview: publicUrl } })
          .eq("id", memeId);
        if (updErr) {
          console.error("❌ Failed to write existing storage URL", updErr);
        }
        console.info("✅ Found existing storage file and verified", { publicUrl });
        return new Response(JSON.stringify({ ok: true, url: publicUrl }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (e) {
      console.warn("⚠️ Storage file check failed", { 
        error: e instanceof Error ? e.message : String(e), 
        publicUrl 
      });
    }

    // 4) Generate image via existing generator function
    console.info("🎨 Generating new meme image", { memeId });
    const genResp = await supabase.functions.invoke("generate-meme-image", {
      body: { memeId },
    });

    if (genResp.error) {
      console.error("❌ generate-meme-image failed", genResp.error);
      return new Response(JSON.stringify({ error: "generation_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imageUrl: string | undefined = (genResp.data as any)?.imageUrl;
    console.info("📸 Generator response", { 
      hasImageUrl: !!imageUrl, 
      imageUrlPrefix: imageUrl?.substring(0, 50),
      dataType: imageUrl?.startsWith('data:') ? 'data_url' : imageUrl?.startsWith('http') ? 'http_url' : 'unknown'
    });
    
    if (!imageUrl) {
      console.error("❌ No imageUrl from generator", genResp.data);
      return new Response(JSON.stringify({ error: "no_image_from_generator" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5) Upload to storage (if data URL); if already HTTP, just use it
    let finalUrl = imageUrl;
    console.info("📁 Processing image", { isDataUrl: imageUrl.startsWith("data:"), isHttpUrl: imageUrl.startsWith("http") });
    
    if (imageUrl.startsWith("data:")) {
      const { bytes, contentType } = dataUrlToUint8Array(imageUrl);
      const { error: uploadErr } = await supabase.storage
        .from("memes")
        .upload(filePath, bytes, { contentType, upsert: true });

      if (uploadErr) {
        console.error("❌ Storage upload failed", uploadErr);
        return new Response(JSON.stringify({ error: "upload_failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      finalUrl = supabase.storage.from("memes").getPublicUrl(filePath).data.publicUrl;
      console.info("📦 Storage upload completed", { finalUrl });
    }

    // 6) Write to DB
    console.info("💾 Updating database", { memeId, finalUrl });
    const { error: dbErr } = await supabase
      .from("memes")
      .update({ image_urls: { preview: finalUrl } })
      .eq("id", memeId);

    if (dbErr) {
      console.error("❌ DB update failed", dbErr);
      return new Response(JSON.stringify({ error: "db_update_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 7) Verify public URL
    console.info("✅ Final verification", { finalUrl });
    try {
      const check = await fetch(finalUrl, { 
        method: "HEAD", 
        signal: AbortSignal.timeout(5000) 
      });
      if (!check.ok) {
        console.error("❌ Public URL verification failed", { status: check.status });
        return new Response(JSON.stringify({ error: "verify_failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (e) {
      console.error("❌ Public URL fetch crashed", e);
      return new Response(JSON.stringify({ error: "verify_fetch_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.info("✅ Finalized meme preview", { memeId, finalUrl });
    return new Response(JSON.stringify({ ok: true, url: finalUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ finalize-meme-preview crashed", error);
    return new Response(JSON.stringify({ error: "unexpected_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});