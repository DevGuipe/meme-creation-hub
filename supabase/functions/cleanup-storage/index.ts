import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧹 Starting storage cleanup for production...');

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

    // Get all files from memes bucket
    const { data: files, error: listError } = await supabase.storage
      .from('memes')
      .list();

    if (listError) {
      console.error('❌ Failed to list storage files:', listError);
      return new Response(JSON.stringify({ error: 'Failed to list files' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📂 Found ${files?.length || 0} files to clean up`);

    let deletedCount = 0;
    let errors = 0;

    if (files && files.length > 0) {
      // Delete all files in batches
      const filePaths = files.map(file => file.name);
      
      console.log('🗑️ Deleting files:', filePaths);
      
      const { error: deleteError } = await supabase.storage
        .from('memes')
        .remove(filePaths);

      if (deleteError) {
        console.error('❌ Failed to delete some files:', deleteError);
        errors++;
      } else {
        deletedCount = filePaths.length;
        console.log(`✅ Successfully deleted ${deletedCount} files`);
      }
    }

    const result = {
      success: true,
      filesDeleted: deletedCount,
      errors: errors,
      message: deletedCount > 0 
        ? `Successfully cleaned up ${deletedCount} storage files` 
        : 'No files to clean up'
    };

    console.log('🎉 Storage cleanup completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Storage cleanup failed:', error);
    return new Response(JSON.stringify({ 
      error: 'Storage cleanup failed', 
      details: error instanceof Error ? error.message : String(error) 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});