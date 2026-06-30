# Configuração Do CAPTCHA Com Cloudflare Turnstile

Este guia documenta a ativação do Cloudflare Turnstile nos logins
administrativo e de convidados. No ambiente atual, o frontend envia o token e
o Supabase Auth mantém a proteção habilitada nos dois fluxos.

## 1. Entender As Chaves

O Turnstile fornece duas chaves:

- **Site Key:** identificador público usado pelo widget no navegador.
- **Secret Key:** segredo usado pelo Supabase para validar os tokens.

A Site Key pode ficar em `js/captcha-config.js`. A Secret Key nunca deve ser
colocada no código, no Git ou em arquivos servidos pelo site.

## 2. Criar O Widget No Cloudflare

1. Acesse o painel do Cloudflare.
2. Abra **Turnstile**.
3. Crie um widget com um nome como `Site Casamento - Login`.
4. Selecione o modo **Managed**.
5. Cadastre somente os hostnames necessários, sem protocolo, porta ou caminho.

Exemplos para este projeto:

```text
localhost
127.0.0.1
192.168.18.18
messiasfl10.github.io
```

Ao usar um domínio próprio, cadastre também esse hostname. Não é necessário que
o site use o DNS ou o proxy do Cloudflare para utilizar o Turnstile.

Ao concluir, copie a Site Key e guarde a Secret Key em um gerenciador de senhas.

## 3. Testar Com As Chaves Oficiais De Desenvolvimento

O Cloudflare disponibiliza chaves fictícias que funcionam em qualquer domínio.
Para um teste controlado, podem ser usados temporariamente:

```text
Site Key que sempre aprova: 1x00000000000000000000AA
Secret Key que sempre aprova: 1x0000000000000000000000000000000AA
```

As duas chaves de teste devem ser usadas em conjunto. Uma Secret Key real não
aceita tokens gerados por uma Site Key de teste, e o inverso também não funciona.

## 4. Configurar A Site Key No Frontend

Edite `js/captcha-config.js`:

```js
window.CaptchaConfig = Object.freeze({
  enabled: true,
  provider: "turnstile",
  siteKey: "SUA_SITE_KEY_PUBLICA",
});
```

Essa configuração habilita o widget nas páginas `login.html` e
`admin-login.html`. O widget utiliza o modo responsivo e muda para o formato
compacto em telas muito estreitas.

## 5. Habilitar No Supabase

No projeto correto do Supabase:

1. Acesse **Authentication**.
2. Abra **Bot and Abuse Protection**.
3. Habilite **CAPTCHA Protection**.
4. Selecione **Cloudflare Turnstile**.
5. Informe a Secret Key correspondente à Site Key configurada no frontend.
6. Salve.

O Supabase fará a validação server-side. Não é necessário criar outra Edge
Function nem armazenar a Secret Key em `supabase/functions`.

## 6. Ordem Segura De Ativação

Para evitar indisponibilidade dos logins:

1. configure e publique a Site Key no frontend;
2. confirme que o widget aparece nos dois logins;
3. habilite o Turnstile no Supabase com a Secret Key correspondente;
4. teste imediatamente os dois fluxos.

Se o CAPTCHA for habilitado no Supabase antes de o frontend enviar o token, os
logins poderão falhar.

## 7. Validar

Antes dos testes de convidado, encerre a sessão ou limpe os dados locais do site
para garantir que uma nova sessão anônima seja criada.

Valide:

- login administrativo com credenciais corretas;
- rejeição de credenciais administrativas inválidas;
- login de convidado com código válido;
- rejeição de código de convite inválido;
- expiração e renovação do desafio;
- funcionamento em desktop e mobile;
- funcionamento no domínio definitivo.

Nos testes locais, abra o site por `http://`, nunca diretamente por `file://`.

## 8. Rollback

Se houver problema durante a ativação:

1. desabilite **CAPTCHA Protection** no Supabase;
2. altere `enabled` para `false` em `js/captcha-config.js`;
3. recarregue a página sem cache.

O rollback não altera usuários, sessões, códigos de convite, RLS ou dados do
banco.

## 9. Limites Da Proteção

O CAPTCHA reduz automações e a criação abusiva de contas anônimas, mas não
substitui:

- limitação de tentativas da Edge Function `claim-invite`;
- RLS e RPCs restritas;
- senha forte e MFA do administrador;
- monitoramento e limpeza periódica de contas anônimas.

Tokens do Turnstile expiram em cinco minutos e são de uso único. O frontend
reinicia o widget depois de cada tentativa de autenticação.
