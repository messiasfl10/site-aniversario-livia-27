// Preencha com os dados públicos do projeto Supabase do aniversário.
// A service role key nunca deve ser colocada no frontend.
const SUPABASE_URL = "https://wjmesacqvihqjbbzhzni.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_qm_rRum8DY93Fx9bnmvPWg_UOJ-dFqJ";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
