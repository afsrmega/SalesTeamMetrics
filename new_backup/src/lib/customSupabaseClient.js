import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hqkntfemxfcpmzfipkyk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhxa250ZmVteGZjcG16Zmlwa3lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5MDk4NjUsImV4cCI6MjA4NTQ4NTg2NX0.xcNTOtIzuL2VPzCB0C0LCRShVgTHH1_412QuQfhRzd4';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
