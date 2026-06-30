# Limpeza Dos Dados Do Supabase

Este guia remove os dados usados durante desenvolvimento e testes, preservando:

- o usuário administrativo em `auth.users`;
- o convidado vinculado ao administrador;
- o vínculo em `public.admin_users`;
- todos os registros de `public.settings`;
- tabelas, índices, funções, triggers, políticas RLS e Edge Functions.

Serão removidos:

- convidados que não sejam administradores ativos;
- RSVPs;
- presentes;
- contribuições e cotas;
- sessões de convidados;
- tentativas de login;
- usuários anônimos do Supabase Auth.

## 1. Fazer Backup Opcional

A limpeza é irreversível depois de confirmada. Para manter os dados atuais,
faça um backup antes de começar.

Na raiz do repositório vinculado ao projeto:

```powershell
New-Item -ItemType Directory -Force backups
npx supabase db dump --linked --data-only --use-copy --schema public `
  --file backups/public-data-before-cleanup.sql
```

A pasta `backups/` está ignorada pelo Git porque pode conter dados pessoais.

## 2. Confirmar O Projeto

No painel do Supabase, confira se o Project Ref é o esperado.

No terminal:

```powershell
Get-Content supabase/.temp/project-ref
```

Não continue se o painel ou o CLI estiver apontando para outro projeto.

## 3. Identificar O Administrador Preservado

Execute no SQL Editor:

```sql
select
  administrator.user_id,
  administrator.guest_id,
  administrator.active,
  guest.name,
  guest.invite_code,
  auth_user.email,
  auth_user.is_anonymous
from public.admin_users as administrator
inner join public.guests as guest
  on guest.id = administrator.guest_id
inner join auth.users as auth_user
  on auth_user.id = administrator.user_id
where administrator.active is true;
```

Confirme que:

- aparece exatamente o administrador que deve ser preservado;
- `active` está como `true`;
- o e-mail está correto;
- `is_anonymous` está como `false`.

Não continue se a consulta não retornar seu usuário administrativo.

## 4. Conferir Os Dados Que Serão Removidos

Execute:

```sql
select 'guests' as source, count(*) as total from public.guests
union all
select 'rsvps', count(*) from public.rsvps
union all
select 'gifts', count(*) from public.gifts
union all
select 'gift_contributions', count(*) from public.gift_contributions
union all
select 'guest_access_sessions', count(*) from public.guest_access_sessions
union all
select 'invite_login_attempts', count(*) from public.invite_login_attempts
union all
select 'settings', count(*) from public.settings
union all
select 'admin_users', count(*) from public.admin_users;
```

Confira também os usuários do Auth:

```sql
select
  id,
  email,
  is_anonymous,
  created_at,
  last_sign_in_at
from auth.users
order by created_at desc;
```

## 5. Remover Os Usuários Anônimos

No painel do Supabase:

1. acesse **Authentication → Users**;
2. remova filtros que possam esconder usuários;
3. identifique os usuários com tipo anônimo;
4. exclua somente os usuários anônimos;
5. preserve o usuário administrativo com e-mail.

Excluir um usuário anônimo também remove, por `ON DELETE CASCADE`, seus
registros correspondentes em:

- `public.guest_access_sessions`;
- `public.invite_login_attempts`.

Se existirem muitos usuários, a limpeza pode ser automatizada com a API
administrativa `deleteUser`. Essa API exige a chave `service_role` e deve ser
executada somente em um ambiente confiável, nunca no navegador.

## 6. Limpar As Tabelas Da Aplicação

Execute o bloco completo no SQL Editor:

```sql
begin;

delete from public.gift_contributions;
delete from public.gifts;
delete from public.rsvps;
delete from public.guest_access_sessions;
delete from public.invite_login_attempts;

delete from public.guests as guest
where not exists (
  select 1
  from public.admin_users as administrator
  where administrator.guest_id = guest.id
    and administrator.active is true
);

commit;
```

O SQL preserva qualquer convidado ligado a um administrador ativo. Ele não
altera `public.settings` nem `public.admin_users`.

Seu RSVP, reservas ou contribuições de teste também serão removidos.

## 7. Validar O Resultado

Execute:

```sql
select 'guests' as source, count(*) as total from public.guests
union all
select 'rsvps', count(*) from public.rsvps
union all
select 'gifts', count(*) from public.gifts
union all
select 'gift_contributions', count(*) from public.gift_contributions
union all
select 'guest_access_sessions', count(*) from public.guest_access_sessions
union all
select 'invite_login_attempts', count(*) from public.invite_login_attempts
union all
select 'settings', count(*) from public.settings
union all
select 'admin_users', count(*) from public.admin_users;
```

Resultado esperado:

- `guests`: somente o convidado administrador;
- `rsvps`: `0`;
- `gifts`: `0`;
- `gift_contributions`: `0`;
- `guest_access_sessions`: `0`;
- `invite_login_attempts`: `0`;
- `settings`: quantidade anterior preservada;
- `admin_users`: vínculo administrativo preservado.

Confira novamente o Auth:

```sql
select
  id,
  email,
  is_anonymous
from auth.users
order by created_at;
```

O resultado deve conter somente as contas permanentes que você decidiu
preservar, incluindo o administrador.

## 8. Testar O Acesso Administrativo

Depois da limpeza:

1. encerre qualquer sessão antiga;
2. entre novamente em `admin-login.html`;
3. confirme o carregamento do dashboard;
4. abra convidados, RSVPs, presentes e configurações;
5. confirme que `settings` ainda apresenta os dados esperados;
6. cadastre e remova um convidado de teste, se desejar validar o CRUD.

As tabelas vazias devem apresentar seus estados vazios normalmente.

## 9. Preparar Os Dados Definitivos

Após validar a limpeza:

1. cadastre os convidados definitivos;
2. cadastre os presentes definitivos;
3. revise PIX, WhatsApp e demais valores de `settings`;
4. teste um convite temporário;
5. remova o convite e a conta anônima usados no teste;
6. rotacione os códigos de convite antes da publicação definitiva.

## Cuidados

- Não exclua seu usuário administrativo em **Authentication → Users**.
- Não exclua o registro administrativo de `public.guests`.
- Não execute `truncate ... cascade`, pois isso aumenta o risco de apagar
  vínculos que devem ser preservados.
- Não apague `public.settings` se quiser manter PIX e WhatsApp configurados.
- Não coloque a chave `service_role` em scripts do frontend ou no Git.
- Se houver mais de um administrador ativo, o SQL preservará todos eles.
