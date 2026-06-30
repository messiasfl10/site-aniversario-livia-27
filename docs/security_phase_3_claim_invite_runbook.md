# Guia Da Edge Function `claim-invite`

Este guia prepara e publica a Edge Function responsável por validar códigos de
convite e vincular uma sessão anônima do Supabase Auth ao convidado correto.

## Limite Desta Etapa

A função pode ser preparada e publicada, mas o login anônimo ainda não deve ser
habilitado no projeto.

Usuários anônimos do Supabase Auth usam o papel PostgreSQL `authenticated`.
Neste momento, esse papel ainda possui permissões amplas transitórias para que
o painel administrativo funcione sem a RLS definitiva.

Antes de habilitar o login anônimo:

1. crie as políticas RLS definitivas;
2. remova os grants amplos transitórios;
3. teste a separação entre administrador e convidado.

## O Que A Função Faz

`claim-invite`:

- exige um JWT válido do Supabase Auth;
- aceita somente usuários com `is_anonymous = true`;
- recebe um código de convite;
- normaliza o código para letras maiúsculas;
- consulta o convite usando a chave privada da Edge Function;
- vincula `auth.uid()` ao convite em `guest_access_sessions`;
- impede a troca de convite dentro da mesma sessão;
- respeita sessões revogadas;
- atualiza `access_count` e `last_access`;
- retorna apenas os dados necessários do convidado;
- limita tentativas por usuário e por hash de rede;
- nunca devolve o código do convite na resposta.

## 1. Preparar O Banco

No SQL Editor do Supabase, execute:

```text
docs/security_phase_3_claim_invite_prepare.sql
```

O script cria:

- `invite_login_attempts`;
- índices para contagem das tentativas recentes;
- `register_guest_access(uuid)` para atualização atômica dos acessos.

A tabela de tentativas possui RLS habilitada e não concede acesso direto a
`anon` ou `authenticated`.

## 2. Verificar A Estrutura

Execute:

```text
docs/security_phase_3_claim_invite_verify.sql
```

Todas as linhas devem retornar:

```text
check_passed = true
```

## 3. Preparar O Supabase CLI

No Windows, a opção mais simples é usar o CLI por meio de `npx`.

1. Instale o Node.js 20 ou superior.
2. Feche e abra novamente o PowerShell.
3. Confirme a instalação:

```powershell
node --version
npm --version
npx --version
```

Não use `npm install -g supabase`, pois a instalação global pelo npm não é
suportada oficialmente.

Confirme o Supabase CLI:

```powershell
npx supabase --version
```

O primeiro uso pode solicitar confirmação para baixar temporariamente o
pacote. Responda `y`.

Na raiz do projeto, vincule o repositório ao projeto remoto:

```powershell
npx supabase login
npx supabase link --project-ref pzgrshdabbvlhdzxtteq
```

No login, o navegador pode ser aberto automaticamente. Como alternativa,
crie um Personal Access Token em:

```text
https://supabase.com/dashboard/account/tokens
```

e use:

```powershell
npx supabase login --token "SEU_PERSONAL_ACCESS_TOKEN"
```

O token é uma credencial pessoal e não deve ser colocado no repositório ou
compartilhado.

Durante o `link`, o CLI pode solicitar a senha do banco. Informe a senha do
projeto ou pressione Enter para ignorar quando essa validação não for
necessária.

Não execute `supabase init`: este projeto já contém `supabase/config.toml` e a
Edge Function preparada.

O diretório local temporário criado pelo CLI em `supabase/.temp/` está
ignorado pelo Git.

## 4. Configurar Os Secrets

O `INVITE_RATE_LIMIT_PEPPER` protege o hash do endereço de rede usado no limite
de tentativas. O endereço não é salvo diretamente: a função combina o pepper
com o endereço e armazena somente o resultado SHA-256.

Gere 32 bytes aleatórios no PowerShell:

```powershell
$bytes = New-Object byte[] 32
$generator = [Security.Cryptography.RandomNumberGenerator]::Create()
$generator.GetBytes($bytes)
[Convert]::ToBase64String($bytes)
$generator.Dispose()
```

Guarde o resultado em um gerenciador de senhas e use-o como
`INVITE_RATE_LIMIT_PEPPER`. Não use nomes, datas, códigos de convite ou valores
criados manualmente.

Se o pepper for trocado, o histórico de limitação por rede será efetivamente
reiniciado, mas os códigos de convite e as contas não serão alterados.

Configure também as origens que podem chamar a função pelo navegador:

```powershell
npx supabase secrets set `
  INVITE_RATE_LIMIT_PEPPER="VALOR_ALEATORIO_LONGO" `
  ALLOWED_ORIGINS="https://seu-dominio.com"
```

Para homologação ou desenvolvimento, informe as origens adicionais separadas
por vírgula:

```text
https://seu-dominio.com,http://127.0.0.1:8000,http://localhost:8000
```

Não inclua `/` no final das origens.

As variáveis `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já são fornecidas
automaticamente pelo ambiente hospedado do Supabase.

Nunca coloque o pepper ou a service role key no frontend ou no Git.

## 5. Publicar A Função

Execute:

```powershell
npx supabase functions deploy claim-invite
```

A verificação de JWT deve permanecer habilitada. Não use
`--no-verify-jwt`.

O arquivo `supabase/config.toml` também mantém
`functions.claim-invite.verify_jwt = true`.

## 6. Conferir O Deploy

No painel do Supabase:

1. abra **Edge Functions**;
2. confirme que `claim-invite` foi publicada;
3. confirme que a verificação de JWT está habilitada;
4. revise os logs e confirme a ausência de erros de inicialização;
5. confirme que os secrets foram configurados.

Uma chamada sem JWT deve retornar `401`.

Uma conta administrativa autenticada também deve receber `401`, porque a
função aceita somente sessões anônimas.

O roteiro de testes está em:

```text
docs/security_phase_3_claim_invite_smoke_test.md
```

## Contrato Da Função

Requisição:

```http
POST /functions/v1/claim-invite
Authorization: Bearer <JWT DA SESSAO ANONIMA>
Content-Type: application/json

{
  "inviteCode": "CODIGO"
}
```

Resposta de sucesso:

```json
{
  "guest": {
    "id": "uuid",
    "name": "Nome do convite",
    "max_guests": 2,
    "confirmed": false,
    "active": true,
    "invite_type": "individual",
    "couple_members": null
  }
}
```

Possíveis respostas:

- `200`: convite validado e sessão vinculada;
- `401`: JWT ausente, conta não anônima ou código inválido;
- `403`: origem não permitida ou sessão revogada;
- `405`: método diferente de `POST`;
- `429`: limite de tentativas atingido;
- `500`: falha interna sem exposição de detalhes.

## Limitação De Tentativas

O limite inicial é de oito tentativas inválidas em quinze minutos:

- por usuário anônimo;
- por hash do endereço de rede.

O endereço de rede não é armazenado diretamente. A função salva um SHA-256
combinado com `INVITE_RATE_LIMIT_PEPPER`.

Esse controle reduz tentativas automatizadas, mas não substitui CAPTCHA,
monitoramento e limites externos de infraestrutura.

## Rollback

Para remover apenas a estrutura desta fase:

```text
docs/security_phase_3_claim_invite_rollback.sql
```

Para remover a função publicada:

```powershell
npx supabase functions delete claim-invite
```

Antes do rollback, confirme que o frontend ainda não chama a função.

## Ponto De Parada

Depois do deploy, não faça ainda:

- habilitação de Anonymous Sign-Ins;
- alteração de `js/login.js`;
- remoção da sessão local dos convidados;
- revogação dos grants atuais;
- ativação parcial de RLS sem testar todas as tabelas.

O próximo passo é criar as políticas RLS e substituir o acesso transitório do
papel `authenticated`. Só depois o login por código poderá usar
`signInAnonymously()` e chamar `claim-invite`.

## Referências Oficiais

- [Securing Edge Functions](https://supabase.com/docs/guides/functions/auth)
- [Function Configuration](https://supabase.com/docs/guides/functions/function-configuration)
- [Anonymous Sign-Ins](https://supabase.com/docs/guides/auth/auth-anonymous)

O Supabase recomenda revisar a RLS antes de habilitar usuários anônimos, pois
eles usam o papel `authenticated`. A documentação também recomenda CAPTCHA ou
Cloudflare Turnstile para reduzir abuso na criação dessas contas.
