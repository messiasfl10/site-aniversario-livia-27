# Reconstrução do Supabase do zero

Este é o único fluxo de reconstrução necessário para o site de aniversário.

1. Crie um projeto Supabase novo e guarde a URL e a chave pública/publishable.
2. Em **Authentication > Providers**, habilite Anonymous e Email.
3. No SQL Editor, execute `docs/supabase_setup.sql` inteiro.
4. Em Authentication, crie o usuário administrador. Copie seu UUID e execute o `insert` indicado no final do setup.
5. Execute `docs/supabase_verify.sql`. As três primeiras consultas devem retornar zero linhas e o resumo deve mostrar apenas `true`.
6. Preencha `js/supabase.js` com URL e chave pública. Nunca use a service role no frontend.
7. Gere um segredo longo para `INVITE_RATE_LIMIT_PEPPER`, defina `ALLOWED_ORIGINS` e publique `claim-invite`:

```bash
supabase link --project-ref SEU_PROJECT_REF
supabase secrets set INVITE_RATE_LIMIT_PEPPER="SEGREDO_ALEATORIO_LONGO"
supabase secrets set ALLOWED_ORIGINS="https://seu-dominio.example,http://localhost:8000"
supabase functions deploy claim-invite
```

8. Configure o Turnstile conforme `docs/turnstile_setup.md`.
9. Cadastre convites no painel. Para casal, use `invite_type = couple`; para individual, `individual`.
10. Teste: admin, convite inválido, individual, casal, RSVP Sim/Não, edição do RSVP e logout.

Não existem migrações de presentes, PIX ou Nossa História neste projeto.
