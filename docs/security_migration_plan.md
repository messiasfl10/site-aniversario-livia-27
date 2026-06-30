# Plano De Migração De Segurança

Este documento acompanha a migração do acesso direto e da sessão local para
Supabase Auth, Row Level Security (RLS) e Edge Functions.

## Estado De Partida

A versão `v2.4` representa o ponto de restauração anterior à migração.

Antes de iniciar esta fase:

- a release deve estar publicada e validada;
- deve existir um backup recente do banco;
- os códigos de convite atuais devem continuar funcionando.

## Fase 2: Preparação Do Banco

O arquivo `security_phase_2_prepare.sql` cria:

- `admin_users`, que relaciona uma conta do Supabase Auth ao convidado
  administrador;
- `guest_access_sessions`, que relaciona uma sessão autenticada anônima ao
  convite validado;
- `current_guest_id()`, que identifica o convite da sessão atual;
- `is_admin()`, que identifica uma conta administrativa ativa.

Para uma conta administrativa, `current_guest_id()` usa o convidado vinculado
em `admin_users`. Dessa forma, o login por e-mail e senha também permite usar
as funções normais de convidado.

Esta fase não altera as permissões de:

- `guests`;
- `rsvps`;
- `gifts`;
- `gift_contributions`;
- `settings`.

Portanto, aplicar o SQL preparatório isoladamente não muda o funcionamento do
site atual.

## Aplicação

1. Abra o SQL Editor do projeto no Supabase.
2. Execute `docs/security_phase_2_prepare.sql`.
3. Confirme a criação das tabelas `admin_users` e
   `guest_access_sessions`.
4. Confirme que ambas estão com RLS habilitada.
5. Não habilite RLS nas tabelas antigas nesta fase.

## Cadastro Inicial Do Administrador

O administrador deve ser criado pelo painel Authentication do Supabase usando
e-mail e senha. Depois, relacione os identificadores da conta e do convidado:

```sql
insert into public.admin_users (user_id, guest_id)
values (
  '<ID DO USUARIO EM AUTH.USERS>',
  '<ID DO CONVIDADO EM PUBLIC.GUESTS>'
);
```

Não coloque a senha, a service role key ou qualquer outro segredo no
repositório.

## Verificação

Execute `docs/security_phase_2_verify.sql`. Todas as linhas retornadas devem
apresentar `check_passed = true`.

As tabelas novas não devem possuir políticas de acesso direto para `anon` ou
`authenticated`. Elas serão manipuladas pela futura Edge Function e por
operações administrativas confiáveis.

## Rollback

Antes de a nova autenticação entrar em uso, a preparação pode ser removida com:

```text
docs/security_phase_2_rollback.sql
```

Depois que sessões ou administradores forem vinculados, faça um backup das
duas tabelas antes de executar o rollback.

## Próximas Fases

Concluído:

- login administrativo com e-mail e senha pelo Supabase Auth;
- verificação de `is_admin()` antes de carregar as páginas administrativas;
- logout administrativo pelo Supabase Auth;
- redirecionamento para a página originalmente solicitada.

## Acesso Transitório Do Administrador

Depois do login, o cliente Supabase usa o papel `authenticated`. Execute
`docs/security_admin_authenticated_access.sql` para manter as telas
administrativas funcionando antes da ativação das políticas RLS.

Valide o resultado com
`docs/security_admin_authenticated_access_verify.sql`. Todas as linhas devem
retornar `check_passed = true`.

Essas permissões são transitórias. Elas devem ser revogadas ou substituídas
pelas políticas RLS antes de habilitar sessões anônimas do Supabase Auth para
convidados.

Próximos passos:

Em andamento:

Concluído:

- frontend local em `mode: "supabase"`;
- RLS ativa e papel `anon` sem acesso direto;
- painel administrativo validado após a ativação;
- Anonymous Sign-Ins habilitado;
- login por código validado pela Edge Function.

Concluído:

- RSVP individual e de casal;
- lista de presentes;
- reserva de presente individual;
- seleção da forma de presentear;
- informação de pagamento;
- reserva, pagamento e liberação de cotas;
- logout e novo login;
- isolamento por convite aplicado pela RLS.
- Cloudflare Turnstile nos logins administrativo e de convidados.

Próximos endurecimentos:

- limpeza periódica de contas anônimas e tentativas antigas;
- revisão de Content Security Policy e dependências CDN;
- auditoria de usos de `innerHTML`;
- rotação dos códigos de convite antes da publicação definitiva.
