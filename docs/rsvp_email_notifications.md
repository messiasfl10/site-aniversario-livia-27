# Notificações de RSVP por e-mail

Este guia mostra como configurar o envio de e-mails quando um convidado cria ou atualiza o RSVP.

O fluxo implementado é:

```text
Convidado envia RSVP
-> save_current_rsvp salva os dados no Supabase
-> frontend chama a Edge Function notify-rsvp
-> notify-rsvp envia e-mail por SMTP
-> convidado recebe confirmação
-> administrador recebe notificação
```

O envio de e-mail é secundário. Se a notificação falhar, o RSVP continua salvo e o erro fica registrado nos logs da Edge Function.

## Arquivos envolvidos

```text
js/guest-data.js
js/rsvp.js
supabase/functions/notify-rsvp/index.ts
supabase/functions/.env.example
```

## 1. Preparar o Gmail

Para usar Gmail por SMTP, não use a senha normal da conta. Use uma senha de app.

1. Acesse `https://myaccount.google.com`.
2. Entre na conta que enviará os e-mails.
3. Vá em **Segurança**.
4. Ative a **Verificação em duas etapas**, se ainda não estiver ativa.
5. Abra **Senhas de app**.

Atalho:

```text
https://myaccount.google.com/apppasswords
```

Depois:

1. Crie uma senha de app com um nome como `Supabase RSVP`.
2. Copie a senha gerada pelo Google.
3. Use essa senha como `SMTP_PASS`.

Exemplo fictício:

```text
abcd efgh ijkl mnop
```

No Supabase, pode cadastrar com ou sem espaços. O formato sem espaços costuma ser mais simples:

```text
abcdefghijklmnop
```

## 2. Definir os secrets

Para Gmail, use:

```text
ADMIN_EMAIL=seu-email@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app-do-google
SMTP_FROM_EMAIL=Aniversário da Livia - 27 Anos <seu-email@gmail.com>
ALLOWED_ORIGINS=https://usuario.github.io,http://localhost:8000,http://127.0.0.1:8000
```

Na porta `587`, `SMTP_SECURE=false` indica que a conexão começa sem TLS
implícito e é elevada obrigatoriamente para TLS por STARTTLS. A Edge Function
usa `requireTLS` e exige no mínimo TLS 1.2, portanto o envio falha se o servidor
não oferecer uma conexão criptografada. Como alternativa, a porta `465` usa
TLS implícito e deve ser configurada com `SMTP_SECURE=true`.

`ADMIN_EMAIL` é o e-mail que receberá as notificações administrativas.

`SMTP_USER` é a conta que enviará os e-mails.

`SMTP_PASS` é a senha de app gerada pelo Google.

`SMTP_FROM_EMAIL` é o remetente exibido para os convidados.

`ALLOWED_ORIGINS` deve conter as origens que podem chamar a Edge Function pelo navegador.

Se o site estiver no GitHub Pages em uma URL como:

```text
https://usuario.github.io/site-aniversario-livia
```

cadastre apenas a origem, sem o caminho:

```text
https://usuario.github.io
```

## 3. Conferir a Supabase CLI

Na raiz do projeto, rode:

```bash
supabase --version
```

Se a CLI não estiver instalada, instale seguindo a documentação oficial do Supabase CLI.

No Windows, uma opção comum é:

```bash
npm install -g supabase
```

Depois confira novamente:

```bash
supabase --version
```

## 4. Fazer login na Supabase CLI

Rode:

```bash
supabase login
```

Siga o fluxo de autenticação exibido pela CLI.

## 5. Vincular o projeto local ao Supabase

Identifique o Project Ref do projeto Supabase.

No arquivo `js/supabase.js`, a URL do projeto segue este formato:

```text
https://PROJECT_REF.supabase.co
```

Neste projeto, por exemplo:

```text
https://wjmesacqvihqjbbzhzni.supabase.co
```

o Project Ref é:

```text
wjmesacqvihqjbbzhzni
```

Na raiz do projeto, rode:

```bash
supabase link --project-ref wjmesacqvihqjbbzhzni
```

Se a CLI pedir a senha do banco, consulte ou redefina em:

```text
Supabase Dashboard > Project Settings > Database
```

## 6. Cadastrar os secrets no Supabase

No PowerShell, rode os comandos abaixo trocando pelos seus valores reais:

```powershell
supabase secrets set ADMIN_EMAIL=seu-email@gmail.com
supabase secrets set SMTP_HOST=smtp.gmail.com
supabase secrets set SMTP_PORT=587
supabase secrets set SMTP_SECURE=false
supabase secrets set SMTP_USER=seu-email@gmail.com
supabase secrets set "SMTP_PASS=sua-senha-de-app"
supabase secrets set "SMTP_FROM_EMAIL=Aniversário da Livia <seu-email@gmail.com>"
supabase secrets set "ALLOWED_ORIGINS=https://usuario.github.io,http://localhost:8000,http://127.0.0.1:8000"
```

Exemplo fictício:

```powershell
supabase secrets set ADMIN_EMAIL=messias@gmail.com
supabase secrets set SMTP_HOST=smtp.gmail.com
supabase secrets set SMTP_PORT=587
supabase secrets set SMTP_SECURE=false
supabase secrets set SMTP_USER=messias@gmail.com
supabase secrets set "SMTP_PASS=abcdefghijklmnop"
supabase secrets set "SMTP_FROM_EMAIL=Aniversário da Livia <messias@gmail.com>"
supabase secrets set "ALLOWED_ORIGINS=https://messiasfilho.github.io,http://localhost:8000,http://127.0.0.1:8000"
```

Para conferir os secrets cadastrados:

```bash
supabase secrets list
```

A CLI lista os nomes dos secrets, mas não exibe os valores completos.

## 7. Publicar a Edge Function

Na raiz do projeto, rode:

```bash
supabase functions deploy notify-rsvp
```

Se também quiser publicar ou atualizar a função de convite:

```bash
supabase functions deploy claim-invite
```

## 8. Testar

Depois do deploy:

1. Abra o site.
2. Entre como convidado.
3. Preencha o RSVP com um e-mail real.
4. Envie o formulário.
5. Confira se o convidado recebeu o e-mail de confirmação.
6. Confira se `ADMIN_EMAIL` recebeu a notificação administrativa.
7. Confira se o RSVP ficou salvo no painel admin.

## 9. Ver logs em caso de erro

Pela CLI:

```bash
supabase functions logs notify-rsvp
```

Ou pelo dashboard:

```text
Supabase Dashboard > Edge Functions > notify-rsvp > Logs
```

Erros comuns:

```text
Missing required RSVP notification environment variables.
```

Falta algum secret obrigatório.

```text
Invalid login
```

`SMTP_USER` ou `SMTP_PASS` está incorreto. Lembre que `SMTP_PASS` deve ser a senha de app, não a senha normal do Gmail.

```text
Connection timeout
```

Pode indicar bloqueio ou indisponibilidade de conexão SMTP no ambiente da Edge Function.

## 10. Configuração alternativa para Outlook

Para Outlook ou Hotmail, os valores geralmente são:

```text
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@outlook.com
SMTP_PASS=sua-senha-ou-senha-de-app
SMTP_FROM_EMAIL=Aniversário da Livia <seu-email@outlook.com>
```

## Checklist

```text
[ ] Verificação em duas etapas ativada no Gmail
[ ] Senha de app criada
[ ] ADMIN_EMAIL configurado
[ ] SMTP_HOST configurado
[ ] SMTP_PORT configurado
[ ] SMTP_SECURE configurado
[ ] SMTP_USER configurado
[ ] SMTP_PASS configurado
[ ] SMTP_FROM_EMAIL configurado
[ ] ALLOWED_ORIGINS configurado com a origem do site
[ ] notify-rsvp publicada
[ ] RSVP testado com e-mail real
```
