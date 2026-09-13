// Safe to expose in the browser: this is the public URL + publishable key,
// not the service_role secret key. Never put the service_role key in client code.
const SUPABASE_URL = "https://pglmcidxsetuuoycdtku.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_oh5bzD_60i-3W08BmsZLiw_9gKoJ2z-";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
