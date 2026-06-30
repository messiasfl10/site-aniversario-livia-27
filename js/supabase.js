// Preencha com os dados públicos do projeto Supabase do aniversário.
// A service role key nunca deve ser colocada no frontend.
const SUPABASE_URL = "https://SEU-PROJETO.supabase.co";
const SUPABASE_ANON_KEY = "SUA_CHAVE_PUBLICA_ANON";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
