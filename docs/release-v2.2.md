# Release v2.2 - Aniversário da Livia - 27 Anos

Data: 2026-07-06

## Resumo

Esta release adiciona notificações por e-mail para confirmações de presença. Quando um convidado cria ou atualiza o RSVP, o sistema salva a resposta no Supabase e aciona a Edge Function `notify-rsvp`, que envia uma confirmação para o convidado e uma notificação para o administrador usando SMTP.

## Destaques

- Nova Edge Function `notify-rsvp` para envio de e-mails transacionais.
- E-mail de confirmação enviado ao endereço informado pelo convidado no RSVP.
- E-mail administrativo enviado para `ADMIN_EMAIL` sempre que o RSVP público é criado ou atualizado.
- Envio por SMTP, compatível com Gmail usando senha de app.
- Textos com concordância para convite individual e convite de casal.
- Assuntos e mensagens com coração roxo, mantendo o tom afetivo do convite.
- E-mail administrativo com dados principais do RSVP, incluindo presença, telefone, acompanhantes, restrições alimentares e mensagem.
- Inclusão das respostas individuais dos membros quando o convite é de casal.
- Falhas no envio de e-mail não impedem o salvamento do RSVP.
- Nova documentação dedicada para configuração de SMTP, secrets, deploy e testes.

## Segurança

- Chaves e senhas SMTP ficam apenas nos secrets do Supabase.
- Nenhuma credencial de e-mail é exposta no frontend.
- A Edge Function valida a sessão do convidado antes de enviar a notificação.
- O payload do RSVP é conferido contra o convidado autenticado.
- Conteúdo dinâmico dos e-mails HTML passa por escape antes da renderização.
- O envio pelo navegador respeita `ALLOWED_ORIGINS` na resposta CORS da Edge Function.

## Configuração

A release exige a configuração dos seguintes secrets no Supabase:

```text
ADMIN_EMAIL
SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_USER
SMTP_PASS
SMTP_FROM_EMAIL
ALLOWED_ORIGINS
```

Para Gmail, a configuração recomendada é:

```text
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app
SMTP_FROM_EMAIL=Aniversário da Livia <seu-email@gmail.com>
```

O passo a passo completo está em [`docs/rsvp_email_notifications.md`](rsvp_email_notifications.md).

## Deploy

Após configurar os secrets, publique a Edge Function:

```bash
supabase functions deploy notify-rsvp
```

Se necessário, publique também a função de acesso por convite:

```bash
supabase functions deploy claim-invite
```

## Validação

- Teste manual de criação de RSVP.
- Teste manual de atualização de RSVP.
- Teste manual de envio para convite individual.
- Teste manual de envio para convite de casal.
- Verificação de recebimento do e-mail do convidado.
- Verificação de recebimento do e-mail administrativo.
- `node --check` em `js/guest-data.js`.
- `node --check` em `js/rsvp.js`.

## Observações de publicação

- A release não exige mudanças no banco de dados.
- A release exige novos secrets no Supabase.
- A release exige deploy da Edge Function `notify-rsvp`.
- O envio de e-mail depende da disponibilidade do provedor SMTP configurado.
- Em caso de falha no envio, consulte os logs com `supabase functions logs notify-rsvp`.
