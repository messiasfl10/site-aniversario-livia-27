# Cloudflare Turnstile

1. Crie um widget chamado `Aniversário Ana Livia` e cadastre produção e localhost.
2. Informe a Site Key pública em `js/captcha-config.js`.
3. Configure o Secret Key no Supabase em **Authentication > Bot and Abuse Protection > CAPTCHA**.
4. Teste os logins de convidado e administrador. Tokens expiram e são reiniciados após falhas.

O Secret Key do Turnstile nunca deve aparecer no repositório ou no frontend.
