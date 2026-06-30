# Inventário Do Ambiente Supabase

Este arquivo contém somente valores não secretos ou nomes de configurações.
Senhas, tokens, chaves privadas e o valor do pepper devem ficar em um
gerenciador de senhas.

Snapshot documental criado em 18 de junho de 2026.

## Projeto Atual

- Project ref: `pzgrshdabbvlhdzxtteq`
- Edge Function: `claim-invite`
- Verify JWT: habilitado
- Frontend de convidados: `mode: "supabase"`
- Fonte da Edge Function conferida com o arquivo exportado do projeto atual

## Authentication

- Email/Password: habilitado para o administrador
- Anonymous Sign-Ins: habilitado para convidados
- Usuário administrador: recriar manualmente em `Authentication → Users`
- Vínculo administrativo: inserir em `public.admin_users`

Valores que devem ser conferidos e anotados antes de uma reconstrução:

- Site URL:
- Redirect URLs:
- Confirmação de e-mail obrigatória:
- Anonymous Sign-In rate limit:
- CAPTCHA/Turnstile: habilitado com Cloudflare Turnstile; a Secret Key fica no Supabase e a Site Key pública em `js/captcha-config.js`.
- SMTP customizado:

## Edge Function Secrets

Secrets obrigatórios:

- `INVITE_RATE_LIMIT_PEPPER`
- `ALLOWED_ORIGINS`

Valores que devem ficar no gerenciador de senhas:

- pepper atual;
- lista de origens de produção;
- origens locais necessárias.

Origem local usada durante o desenvolvimento:

```text
http://127.0.0.1:5500
```

## Frontend

Ao criar outro projeto Supabase, atualizar em `js/supabase.js`:

- `SUPABASE_URL`;
- `SUPABASE_ANON_KEY` ou publishable key.

A `service_role` nunca deve ser colocada no frontend.

## Dados Persistentes

Dados que podem ser exportados e restaurados:

- `guests`;
- `rsvps`;
- `gifts`;
- `gift_contributions`;
- `settings`.

Dados que normalmente não devem ser migrados:

- usuários anônimos de `auth.users`;
- `guest_access_sessions`;
- `invite_login_attempts`.

O usuário administrativo deve ser recriado no Auth e ligado novamente ao
registro correto de `guests`.
