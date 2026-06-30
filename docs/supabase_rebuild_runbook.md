# Reconstrução Completa Do Supabase

Este guia recria, em um projeto Supabase novo, a estrutura atualmente usada
pelo site: tabelas, Supabase Auth, administrador, login dos convidados, Edge
Function, permissões da `service_role`, RPCs, triggers e RLS.

O processo parte de um projeto vazio. Scripts de rollback, correções históricas
e permissões transitórias não fazem parte da instalação limpa.

## 1. Arquivos Necessários

Use os arquivos na seguinte ordem:

1. `docs/supabase_rebuild_01_base_schema.sql`
2. `docs/security_phase_2_prepare.sql`
3. `docs/security_phase_3_claim_invite_prepare.sql`
4. restauração opcional dos dados
5. `docs/security_phase_4_rls_prepare.sql`
6. `docs/security_edge_function_service_role_grants.sql`
7. `docs/security_phase_4_rls_activate.sql`
8. `docs/supabase_rebuild_verify_final.sql`

A Edge Function está em:

```text
supabase/functions/claim-invite/index.ts
```

O inventário de configurações que precisam ser copiadas ou conferidas está em:

```text
docs/supabase_rebuild_environment_inventory.md
```

## 2. O Que Não Deve Ser Executado

Em uma reconstrução nova, não execute:

- `docs/supabase_schema_full_setup.sql`;
- scripts com `rollback` no nome;
- `docs/security_admin_authenticated_access.sql`;
- `docs/security_fix_guest_gift_rpcs.sql`.

Esses arquivos registram etapas transitórias, rollback ou correções da
migração original. A correção dos RPCs de presentes já está incorporada ao
`security_phase_4_rls_prepare.sql`.

## 3. Preparar A Máquina

Pré-requisitos:

- Node.js 20 ou superior;
- npm e npx;
- Git;
- Docker Desktop somente se o Supabase local for utilizado.

Na raiz do repositório, confira o CLI:

```powershell
npx supabase --version
```

Se o npm acusar que a pasta global não existe:

```powershell
New-Item -ItemType Directory -Force "$env:APPDATA\npm"
npx supabase --version
```

Autentique o CLI:

```powershell
npx supabase login
```

O token pessoal do CLI, a senha do banco e qualquer chave privada não devem
ser salvos no repositório.

## 4. Fazer Backup Do Projeto Atual

Faça esta etapa antes de vincular o repositório ao projeto novo.

Para gerar um backup de dados do projeto atualmente vinculado:

```powershell
New-Item -ItemType Directory -Force backups
npx supabase db dump --linked --data-only --use-copy --schema public `
  --exclude public.admin_users,public.guest_access_sessions,public.invite_login_attempts `
  --file backups/public-data.sql
```

Revise o arquivo e confirme que ele contém somente `guests`, `rsvps`, `gifts`,
`gift_contributions` e `settings`. A pasta `backups/` está ignorada pelo Git
porque pode conter dados pessoais.

Se o repositório já estiver vinculado ao destino, use uma segunda cópia do
repositório vinculada ao projeto de origem ou vincule novamente à origem,
exporte os dados e só então volte ao destino.

## 5. Criar E Vincular O Projeto

1. Crie um projeto no painel do Supabase.
2. Guarde a senha do banco em um gerenciador de senhas.
3. Copie o novo Project Ref em **Project Settings → General**.
4. Na raiz do repositório, execute:

```powershell
npx supabase link --project-ref NOVO_PROJECT_REF
```

O repositório já possui `supabase/config.toml`; não execute `supabase init`.

## 6. Criar O Banco Base

Abra o **SQL Editor** do projeto novo e execute:

```text
docs/supabase_rebuild_01_base_schema.sql
```

O script cria:

- `guests`;
- `rsvps`;
- `gifts`;
- `gift_contributions`;
- `settings`.

Ele habilita RLS e mantém essas tabelas fechadas até a instalação das
políticas finais.

Depois execute:

```text
docs/security_phase_2_prepare.sql
docs/security_phase_3_claim_invite_prepare.sql
```

Esses scripts adicionam:

- `admin_users`;
- `guest_access_sessions`;
- `invite_login_attempts`;
- helpers de autorização;
- índices e estruturas usadas pela Edge Function.

## 7. Restaurar Dados Existentes

Pule esta seção quando o novo projeto começar sem convidados, presentes e
RSVPs.

Os dados persistentes são:

- `guests`;
- `gifts`;
- `settings`;
- `rsvps`;
- `gift_contributions`.

Não restaure:

- `admin_users`;
- `guest_access_sessions`;
- `invite_login_attempts`;
- usuários anônimos de `auth.users`.

As sessões anônimas pertencem ao projeto antigo. O administrador deve ser
recriado no novo Auth e vinculado novamente.

Use o arquivo gerado antes da troca de vínculo do CLI. Revise novamente o dump
antes da importação.

Para uma migração manual, importe os dados nesta ordem:

1. `guests`;
2. `gifts`;
3. `settings`;
4. `rsvps`;
5. `gift_contributions`.

Preserve os UUIDs para manter as chaves estrangeiras. Faça a importação pelo
SQL Editor ou por uma conexão PostgreSQL administrativa.

## 8. Instalar RPCs, Triggers E RLS

Execute no SQL Editor:

```text
docs/security_phase_4_rls_prepare.sql
docs/security_edge_function_service_role_grants.sql
docs/security_phase_4_rls_activate.sql
```

Essa sequência instala as operações seguras do convidado, sincronizações,
políticas administrativas e permissões internas da Edge Function.

Não coloque a chave `service_role` no frontend. Ela é fornecida
automaticamente ao ambiente confiável da Edge Function.

## 9. Configurar O Supabase Auth

No painel do Supabase:

1. habilite o provedor **Email/Password**;
2. habilite **Anonymous Sign-Ins**;
3. configure **Site URL** e **Redirect URLs**;
4. confira confirmação de e-mail, rate limits, CAPTCHA e SMTP;
5. registre os valores não secretos no inventário do ambiente.

As URLs devem incluir o endereço definitivo do site e, enquanto necessário,
as origens locais, como:

```text
http://127.0.0.1:5500
```

Para habilitar o CAPTCHA nos logins, siga
`docs/captcha_turnstile_setup.md`. O guia documenta a criação do widget no
Cloudflare, a Site Key pública do frontend, a Secret Key configurada no
Supabase, os testes e o rollback.

## 10. Criar O Administrador

Primeiro confirme que o convidado que representa o administrador existe em
`public.guests`.

Em **Authentication → Users**:

1. crie o usuário administrativo com e-mail e senha forte;
2. marque o e-mail como confirmado;
3. copie o UID do novo usuário.

Depois vincule o usuário ao convidado:

```sql
insert into public.admin_users (user_id, guest_id)
values (
  '<UID DE AUTH.USERS>',
  '<ID DE PUBLIC.GUESTS>'
);
```

Não reutilize o UID do projeto anterior, pois os usuários do Auth pertencem ao
projeto em que foram criados.

### Configurar Os Dados Globais

Entre no painel administrativo e abra **Editar Dados Globais**. Cadastre e
salve:

- chave PIX;
- nome do recebedor;
- cidade do recebedor;
- número de WhatsApp no formato `55 + DDD + número`.

A criação da tabela `settings` não cria automaticamente um registro. Sem esses
dados, o site consegue listar e reservar presentes, mas não consegue gerar o
PIX. A compra online e em loja física continuam disponíveis, porém o envio de
comprovante por WhatsApp depende do número configurado.

Confirme no SQL Editor:

```sql
select
  id,
  pix_key,
  merchant_name,
  merchant_city,
  whatsapp_number
from public.settings;
```

Deve existir exatamente um registro com os campos preenchidos.

## 11. Configurar E Publicar A Edge Function

### Para Que Serve O Pepper

O `INVITE_RATE_LIMIT_PEPPER` é um segredo usado pela `claim-invite` para
proteger o endereço de rede empregado no controle de tentativas de login.

A função não grava o endereço diretamente. Ela combina o pepper com o endereço
e armazena somente o resultado SHA-256 em `invite_login_attempts.network_hash`.
Isso permite limitar tentativas originadas da mesma rede sem manter o endereço
original no banco.

O pepper:

- não é o código de convite;
- não é uma senha de convidado ou administrador;
- não deve aparecer no frontend, no Git ou em arquivos públicos;
- deve ter pelo menos 32 bytes gerados aleatoriamente;
- deve ser guardado em um gerenciador de senhas para permitir a reconstrução.

Sem esse secret, a Edge Function não inicia corretamente. Caso ele seja
trocado, os novos hashes deixarão de coincidir com os anteriores e o histórico
de limitação por rede será efetivamente reiniciado. Os códigos de convite e as
contas não são alterados.

### Como Gerar

No PowerShell, gere 32 bytes com um gerador criptograficamente seguro:

```powershell
$bytes = New-Object byte[] 32
$generator = [Security.Cryptography.RandomNumberGenerator]::Create()
$generator.GetBytes($bytes)
[Convert]::ToBase64String($bytes)
$generator.Dispose()
```

O comando imprime um valor Base64. Cadastre esse valor como um item secreto no
gerenciador de senhas, por exemplo:

```text
Nome: Site de Casamento - INVITE_RATE_LIMIT_PEPPER
Projeto: NOVO_PROJECT_REF
Valor: resultado gerado pelo comando
```

Também é possível usar o gerador do próprio gerenciador de senhas, escolhendo
uma senha aleatória com pelo menos 43 caracteres e letras, números e símbolos.

Não use nomes, datas, códigos de convite, UUIDs ou textos criados manualmente
como pepper.

### Como Configurar

Substitua `VALOR_ALEATORIO_LONGO` somente no terminal:

```powershell
npx supabase secrets set `
  INVITE_RATE_LIMIT_PEPPER="VALOR_ALEATORIO_LONGO" `
  ALLOWED_ORIGINS="https://seu-dominio.example,http://127.0.0.1:5500"
```

Depois de configurado, o valor não precisa ficar em nenhum arquivo local. O
Supabase o armazena como secret da Edge Function.

Publique a função:

```powershell
npx supabase functions deploy claim-invite
```

A verificação de JWT deve permanecer habilitada. Não use
`--no-verify-jwt`.

Confira o deploy:

```powershell
npx supabase functions list
```

## 12. Apontar O Frontend Para O Projeto Novo

Em `js/supabase.js`, substitua:

- `SUPABASE_URL`;
- `SUPABASE_ANON_KEY`, usando a publishable key do projeto novo.

Mantenha em `js/guest-auth-config.js`:

```js
mode: "supabase"
```

A URL e a publishable key são próprias para o frontend. A chave
`service_role`, a senha do banco e o pepper são secretos.

## 13. Verificação Técnica

O schema base já cria `settings.buffet_paying_age` com valor padrão `7`. Em um
projeto existente criado antes dessa funcionalidade, execute uma única vez:

```text
docs/buffet_paying_age_migration.sql
```

Depois, ajuste a idade na página `admin-settings.html` conforme o contrato do
buffet.

Execute:

```text
docs/supabase_rebuild_verify_final.sql
```

Todas as linhas devem retornar `check_passed = true`.

Também podem ser usados:

```powershell
npx supabase db lint --linked
npx supabase db push --dry-run
```

O `db push --dry-run` é útil apenas quando os SQLs forem convertidos em
migrations dentro de `supabase/migrations`.

## 14. Teste Funcional

Valide, nesta ordem:

1. login administrativo por e-mail e senha;
2. carregamento do dashboard e das tabelas administrativas;
3. criação e edição de convidados;
4. login de convidado com código válido;
5. rejeição de código inválido;
6. RSVP individual;
7. RSVP de casal;
8. carregamento da lista de presentes;
9. reserva de presente individual;
10. seleção da forma de presentear;
11. informação de pagamento;
12. reserva e pagamento de cotas;
13. liberação administrativa de presentes e cotas;
14. logout e novo login;
15. isolamento entre dois convidados diferentes;
16. bloqueio das páginas administrativas para convidados.

Nos logs da `claim-invite`, confirme que não existem erros de grants, RLS ou
acesso às tabelas internas.

## 15. Supabase Local Opcional

O ambiente local completo requer Docker Desktop:

```powershell
npx supabase start
npx supabase status
```

Para encerrar:

```powershell
npx supabase stop
```

O site também pode continuar usando o projeto remoto durante o desenvolvimento
via Live Server. Nesse caso, inclua a origem local em `ALLOWED_ORIGINS` e nas
URLs permitidas do Auth.

## 16. Backup E Manutenção

Antes de uma publicação importante:

1. exporte os dados persistentes;
2. guarde o dump fora do repositório;
3. registre as configurações do Auth no inventário;
4. confirme que o pepper está no gerenciador de senhas;
5. valide o deploy da Edge Function;
6. execute o SQL de verificação final.

Se os códigos de convite forem rotacionados, atualize `guests.invite_code` e
comunique os novos códigos por um canal privado.

## 17. Informações Que Ainda Precisam Ser Inventariadas

Para uma reprodução fiel do projeto atual, registre:

- Site URL e Redirect URLs;
- confirmação de e-mail obrigatória ou dispensada;
- rate limit de login anônimo;
- CAPTCHA/Turnstile habilitado ou não;
- SMTP customizado, se existir;
- origens definitivas aceitas pela Edge Function;
- decisão de migrar ou não os dados atuais;
- e-mail administrativo, sem registrar a senha;
- política de backup e limpeza de usuários anônimos.

Não é necessário compartilhar nem documentar em texto aberto:

- senha do administrador;
- senha do banco;
- chave `service_role`;
- Personal Access Token do Supabase CLI;
- valor do `INVITE_RATE_LIMIT_PEPPER`.
