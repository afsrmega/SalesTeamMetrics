import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wvodcaxnrybfcnenccad.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2b2RjYXhucnliZmNuZW5jY2FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMDUyNzcsImV4cCI6MjA5MTU4MTI3N30.Sxa3-5DBtiSDwl189jHZ76RiyCGwhAzqI6P7QGDLEGw';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
