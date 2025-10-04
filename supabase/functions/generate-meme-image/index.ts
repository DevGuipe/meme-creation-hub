import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { validateRequest, generateMemeImageRequestSchema } from '../_shared/validation.ts'

interface Layer {
  id: string;
  type: 'background' | 'body' | 'head' | 'prop' | 'text';
  content: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  zIndex: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  textShadow?: string;
  textAlign?: string;
}

async function generateMemeImage(layers: Layer[], memeId: string): Promise<string> {
  // LIMITATION: Deno's Canvas API is not fully stable for complex rendering
  // For production, we prefer using pre-rendered images from Storage
  // This fallback generates a simple SVG placeholder when Storage images are unavailable
  
  // Create SVG as string and convert to base64
  const svg = `
    <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="600" fill="#f0f0f0"/>
      <text x="400" y="100" text-anchor="middle" font-size="24" font-family="Arial" fill="#333">
        POPCAT Meme #${memeId}
      </text>
      <text x="400" y="150" text-anchor="middle" font-size="16" font-family="Arial" fill="#666">
        Layers: ${layers.length}
      </text>
      ${layers.filter(l => l.type === 'text').map((layer, i) => 
        `<text x="400" y="${200 + i * 30}" text-anchor="middle" font-size="14" font-family="Arial" fill="#333">
          ${layer.content}
        </text>`
      ).join('')}
    </svg>
  `;
  
  const base64 = btoa(svg);
  return `data:image/svg+xml;base64,${base64}`;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // CRITICAL SECURITY FIX: Validate all inputs with Zod schema
    const validation = await validateRequest(req, generateMemeImageRequestSchema);
    
    if ('error' in validation) {
      console.error('❌ Input validation failed', validation);
      return new Response(JSON.stringify({ 
        error: validation.error,
        details: validation.details 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ✅ Now we have VALIDATED and TYPE-SAFE data
    const { memeId } = validation.data;

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get meme data - FIXED: Use maybeSingle() instead of single()
    const { data: meme, error } = await supabase
      .from('memes')
      .select('*')
      .eq('id', memeId)
      .maybeSingle();

    if (error || !meme) {
      console.error('Error fetching meme:', error);
      return new Response(JSON.stringify({ error: 'Meme not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prefer pre-rendered image from Storage if available
    const filePath = `${meme.id_short}.png`;
    let imageUrl: string | null = null;

    try {
      const { error: dlErr } = await supabase.storage.from('memes').download(filePath);
      if (!dlErr) {
        const { data: pub } = supabase.storage.from('memes').getPublicUrl(filePath);
        imageUrl = pub.publicUrl;
      }
    } catch (_) {
      // ignore and fallback
    }

    if (!imageUrl) {
      // Parse layers payload safely and generate a simple placeholder SVG as a last resort
      try {
        const payload = typeof meme.layers_payload === 'string' 
          ? JSON.parse(meme.layers_payload) 
          : meme.layers_payload;
        // FIXED: layers_payload is stored directly as array, not nested
        const layers = Array.isArray(payload) ? payload : (Array.isArray(payload?.layers) ? payload.layers : []);
        imageUrl = await generateMemeImage(layers, meme.id_short);

        // If the URL is a data: URL (not fetchable by Telegram), fallback to web placeholder
        if (imageUrl.startsWith('data:')) {
          const webUrl = Deno.env.get('WEB_APP_URL') || 'https://chadmaker.click';
          imageUrl = `${webUrl}/placeholder.svg`;
        }
      } catch (parseError) {
        console.error('Error parsing layers_payload:', parseError);
        const webUrl = Deno.env.get('WEB_APP_URL') || 'https://chadmaker.click';
        imageUrl = `${webUrl}/placeholder.svg`;
      }
    }

    return new Response(JSON.stringify({ 
      imageUrl,
      memeData: {
        id: meme.id,
        id_short: meme.id_short,
        template_key: meme.template_key
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-meme-image function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});