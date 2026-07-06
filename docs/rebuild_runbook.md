# Reconstrução do Supabase do zero

Este é o único fluxo de reconstrução necessário para o site de aniversário.

1. Crie um projeto Supabase novo e guarde a URL e a chave pública/publishable.
2. Em **Authentication > Providers**, habilite Anonymous e Email.
3. No SQL Editor, execute `docs/supabase_setup.sql` inteiro.
4. Em Authentication, crie o usuário administrador. Copie seu UUID e execute o `insert` indicado no final do setup.
5. Execute `docs/supabase_verify.sql`. As três primeiras consultas devem retornar zero linhas e o resumo deve mostrar apenas `true`, inclusive para a tabela privada de controle de e-mails.
6. Preencha `js/supabase.js` com URL e chave pública. Nunca use a service role no frontend.
7. Gere um segredo longo para `INVITE_RATE_LIMIT_PEPPER`, defina `ALLOWED_ORIGINS`, configure o SMTP e publique as duas Edge Functions.

No PowerShell, gere um segredo criptograficamente seguro de 48 bytes em Base64 URL-safe:

```powershell
$bytes = New-Object byte[] 48
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$rng.Dispose()
$pepper = [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
$pepper
```

O último comando exibe o segredo somente para você conferir. Não o coloque no
Git, em arquivos JavaScript ou em `.env` versionado. Na mesma janela do
PowerShell, vincule o projeto e envie os secrets:

```powershell
supabase link --project-ref SEU_PROJECT_REF
supabase secrets set "INVITE_RATE_LIMIT_PEPPER=$pepper"
supabase secrets set "ALLOWED_ORIGINS=https://seu-dominio.example,http://127.0.0.1:8000,http://localhost:8000"
supabase secrets set "ADMIN_EMAIL=seu-email@gmail.com"
supabase secrets set "SMTP_HOST=smtp.gmail.com"
supabase secrets set "SMTP_PORT=587"
supabase secrets set "SMTP_SECURE=false"
supabase secrets set "SMTP_USER=seu-email@gmail.com"
supabase secrets set "SMTP_PASS=SUA-SENHA-DE-APP"
supabase secrets set "SMTP_FROM_EMAIL=Aniversário da Livia <seu-email@gmail.com>"
supabase functions deploy claim-invite
supabase functions deploy notify-rsvp
```

Substitua `SEU_PROJECT_REF` pelo identificador exibido em **Project Settings**
e `https://seu-dominio.example` pela origem exata do site, sem barra no final.
Cada origem é separada por vírgula; caminhos como `/site/` não devem ser
incluídos. Para confirmar os nomes configurados, sem revelar os valores:

```powershell
supabase secrets list
```

Na porta `587`, `SMTP_SECURE=false` usa STARTTLS obrigatório com TLS 1.2 ou
superior. Gere `SMTP_PASS` como senha de app de uma conta Google com verificação
em duas etapas e nunca use a senha normal da conta. O guia completo está em
`docs/rsvp_email_notifications.md`.

8. Configure o Turnstile conforme `docs/turnstile_setup.md`.
9. Cadastre convites no painel. Para casal, use `invite_type = couple`; para individual, `individual`.
10. Gere a mensagem de convite no painel de convidados e confira se ela mostra:
    - tratamento correto para individual ou casal;
    - link direto para o site principal;
    - link do cardápio e tratamento correto da frase para individual ou casal;
    - código de convite correto;
    - instruções de confirmação e prazo de RSVP.
11. Teste: admin, convite inválido, individual, casal, RSVP Sim/Não, edição do RSVP, e-mails do convidado e administrador, bloqueio de envio duplicado, geração/cópia da mensagem de convite e logout.

## Runbook de atualização e operação

Para atualizar um projeto Supabase já existente, execute nesta ordem:

```powershell
supabase link --project-ref SEU_PROJECT_REF
supabase db push
supabase functions deploy notify-rsvp
```

Depois, envie ou atualize um RSVP e consulte `rsvp_email_deliveries` pelo SQL
Editor usando o ID do RSVP. `sent_at` preenchido indica sucesso; `failed_at`
preenchido indica falha SMTP. Uma segunda chamada para o mesmo `rsvp_id` e
`rsvp_updated_at` deve retornar sucesso sem enviar novas mensagens.

Para investigar falhas, consulte **Edge Functions > notify-rsvp > Logs** no
Dashboard. Confirme os nomes com `supabase secrets list`, revise a senha de app
e teste novamente alterando e salvando o RSVP. Não apague registros da tabela
de entregas apenas para forçar reenvio: isso pode duplicar uma mensagem já
aceita por um dos destinatários.

## Checklist de segurança do frontend

Antes de publicar uma nova versão, valide:

- Não há handlers inline como `onclick` em HTML estático ou gerado por JavaScript.
- Dados dinâmicos vindos do banco, formulário ou URL são renderizados com `textContent` ou propriedades DOM.
- Elementos dinâmicos são criados com `document.createElement` sempre que possível.
- URLs dinâmicas são validadas antes de serem aplicadas em `href` ou `src`.
- A CSP das páginas continua sem `unsafe-inline` em `script-src`.
- `node --check` passa nos JavaScripts alterados.
- `git diff --check` não aponta erros.

Não existem migrações de presentes, PIX ou Nossa História neste projeto.
