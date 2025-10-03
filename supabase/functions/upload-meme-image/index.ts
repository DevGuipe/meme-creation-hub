import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { validateRequest, uploadMemeImageRequestSchema } from '../_shared/validation.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function dataUrlToUint8Array(dataUrl: string): { bytes: Uint8Array, contentType: string } {
  const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
  if (!match) throw new Error('Invalid data URL format');
  
  const contentType = match[1] || 'image/png';
  
  // FIXED: Validate content type is actually an image
  const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!validImageTypes.includes(contentType.toLowerCase())) {
    throw new Error(`Invalid content type: ${contentType}. Must be a valid image type.`);
  }
  
  const base64 = match[2];
  if (!base64 || base64.length === 0) {
    throw new Error('Empty base64 data');
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return { bytes, contentType };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // CRITICAL SECURITY FIX: Validate all inputs with Zod schema
    const validation = await validateRequest(req, uploadMemeImageRequestSchema);
    
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
    const { memeId, id_short, image } = validation.data;

    console.log('🖼️ Starting image upload with VALIDATED data', { 
      memeId, 
      id_short, 
      imageSize: image?.length || 0,
      timestamp: new Date().toISOString()
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    if (!supabaseUrl || !serviceKey) {
      console.error('❌ Missing Supabase environment variables');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { bytes, contentType } = dataUrlToUint8Array(image);
    // FIXED: Determine extension from content type
    const extension = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png';
    const filePath = `${id_short}.${extension}`;

    console.log('📁 Uploading to storage', { 
      filePath, 
      contentType, 
      bytesLength: bytes.length,
      extension
    });

    // Upload (upsert) to public bucket 'memes'
    const { error: uploadError } = await supabase.storage
      .from('memes')
      .upload(filePath, bytes, { contentType, upsert: true });

    if (uploadError) {
      console.error('❌ Storage upload failed', { 
        error: uploadError, 
        filePath, 
        memeId, 
        id_short 
      });
      return new Response(JSON.stringify({ 
        error: 'Failed to upload image to storage',
        details: uploadError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Storage upload successful', { filePath });

    const { data: pub } = supabase.storage.from('memes').getPublicUrl(filePath);
    const publicUrl = pub.publicUrl;

    console.log('🔗 Generated public URL', { publicUrl });

    // Update meme record with preview URL
    console.log('💾 Updating database record', { memeId, publicUrl });
    
    const { data: updateData, error: updateError } = await supabase
      .from('memes')
      .update({ image_urls: { preview: publicUrl } })
      .eq('id', memeId)
      .select('id, image_urls');

    if (updateError) {
      console.error('❌ Database update failed', { 
        error: updateError, 
        memeId, 
        publicUrl 
      });
      return new Response(JSON.stringify({ 
        error: 'Failed to update meme record',
        details: updateError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!updateData || updateData.length === 0) {
      console.error('❌ No meme record updated', { memeId });
      return new Response(JSON.stringify({ 
        error: 'Meme record not found or not updated' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Database update successful', { 
      memeId, 
      updatedRecord: updateData[0] 
    });

    return new Response(JSON.stringify({ url: publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Unexpected error in upload-meme-image:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});