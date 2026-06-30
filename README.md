# Aniversário da Livia

Site de aniversário com acesso por código de convite, RSVP individual ou de casal e painel administrativo. A comemoração será em **8 de agosto de 2026, às 19h**, no Geek Bunker Burger, em Fortaleza.

## Tecnologias e funcionalidades

- HTML5, CSS3 e JavaScript Vanilla
- Supabase (PostgreSQL, Auth, RLS, RPCs e Edge Functions)
- Cloudflare Turnstile e limitação de tentativas
- Convites individuais, de casal, acompanhantes e crianças
- Painel de convidados e confirmações
- Sem lista de presentes e sem página “Nossa História”

## Configuração

1. Crie um projeto Supabase separado e siga `docs/rebuild_runbook.md`.
2. Ative o login anônimo em **Authentication > Providers > Anonymous**.
3. Informe a URL e a chave pública em `js/supabase.js`.
4. Configure os secrets de `claim-invite` conforme `supabase/functions/.env.example` e publique a função.
5. Informe a Site Key pública do Turnstile em `js/captcha-config.js`.
6. Crie o usuário administrativo no Supabase Auth e vincule-o em `admin_users`.

Nunca publique a `SUPABASE_SERVICE_ROLE_KEY`, o secret do Turnstile ou o pepper de rate limit no frontend.

Desenvolvido por **Messias D. P. de M. Filho**.
