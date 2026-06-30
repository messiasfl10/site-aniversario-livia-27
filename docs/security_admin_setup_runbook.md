# Guia Reproduzível Da Autenticação Administrativa

Este guia documenta todos os passos realizados para migrar o painel
administrativo do controle por código de convite e `localStorage` para
Supabase Auth com e-mail e senha.

O procedimento descrito aqui corresponde ao estado anterior à implementação da
Edge Function de login dos convidados e das políticas RLS definitivas.

## Resultado Esperado

Ao concluir este guia:

- convidados continuam entrando pelo código do convite;
- administradores entram por `admin-login.html` com e-mail e senha;
- páginas administrativas exigem uma sessão válida do Supabase Auth;
- a função `is_admin()` confirma a autorização no banco;
- abrir diretamente uma página administrativa redireciona para o login;
- depois do login, o administrador retorna à página originalmente solicitada;
- logout administrativo encerra a sessão do Supabase Auth;
- o dashboard e as demais telas administrativas continuam carregando os dados.

## Estado Inicial Necessário

Antes de começar:

1. Publique e valide uma versão estável do site.
2. Crie uma tag ou outro ponto de restauração no Git.
3. Faça um backup completo do banco no Supabase.
4. Confirme que as tabelas atuais existem:
   - `guests`;
   - `rsvps`;
   - `gifts`;
   - `gift_contributions`;
   - `settings`.
5. Confirme que o administrador já possui um registro em `public.guests`.

Na execução original, a versão de restauração utilizada foi a `v2.4`.

## 1. Preparar As Estruturas De Segurança

Abra o SQL Editor do Supabase e execute:

```text
docs/security_phase_2_prepare.sql
```

O script cria:

- `public.admin_users`;
- `public.guest_access_sessions`;
- `public.current_guest_id()`;
- `public.is_admin()`;
- índices para as sessões dos convidados.

As tabelas novas são criadas com RLS habilitada e sem acesso direto para
`anon` ou `authenticated`.

Esse script não habilita RLS e não altera as permissões das cinco tabelas
antigas do projeto.

## 2. Verificar A Preparação

Execute:

```text
docs/security_phase_2_verify.sql
```

Todas as linhas devem apresentar:

```text
check_passed = true
```

Não prossiga se alguma verificação retornar `false`.

## 3. Criar O Usuário Administrativo

No painel do Supabase:

1. Acesse **Authentication → Users**.
2. Crie um usuário com o e-mail administrativo.
3. Defina uma senha forte.
4. Confirme o e-mail no momento da criação, quando essa opção estiver
   disponível.
5. Copie o `User UID`.

Não armazene a senha no repositório.

## 4. Localizar O Convidado Administrador

Use a tabela `public.guests` ou uma consulta semelhante:

```sql
select id, name, invite_code
from public.guests
order by name;
```

Copie o `id` do registro que representa o administrador.

Não crie um segundo convidado. A conta do Supabase Auth deve ser vinculada ao
registro de convidado já existente.

## 5. Vincular A Conta Ao Convidado

Substitua os valores e execute:

```sql
insert into public.admin_users (user_id, guest_id)
values (
  '<USER UID DE AUTH.USERS>',
  '<ID DE PUBLIC.GUESTS>'
);
```

Para conferir o vínculo:

```sql
select
  auth_user.email,
  guest.name,
  administrator.active
from public.admin_users as administrator
inner join auth.users as auth_user
  on auth_user.id = administrator.user_id
inner join public.guests as guest
  on guest.id = administrator.guest_id;
```

O resultado deve mostrar o e-mail administrativo, o convidado correto e
`active = true`.

## 6. Implementar O Frontend Administrativo

Os seguintes arquivos formam o novo fluxo:

- `admin-login.html`: tela de login com e-mail e senha;
- `js/admin-login.js`: autenticação com `signInWithPassword()` e validação de
  `is_admin()`;
- `js/admin-bootstrap.js`: bloqueio e carregamento seguro das páginas
  administrativas;
- `js/admin-common.js`: logout pelo Supabase Auth e helpers comuns;
- `css/login.css`: estilos compartilhados dos dois logins;
- `css/admin.css`: oculta o conteúdo administrativo enquanto a sessão é
  validada.

As páginas abaixo devem carregar `js/admin-bootstrap.js`:

- `admin-dashboard.html`;
- `admin-guests.html`;
- `admin-rsvps.html`;
- `admin-gifts.html`;
- `admin-settings.html`.

Elas não devem mais carregar diretamente seus scripts principais nem usar
`js/auth.js` para autorizar o administrador.

O `js/admin-bootstrap.js` deve:

1. obter a sessão com `supabaseClient.auth.getSession()`;
2. chamar `supabaseClient.rpc("is_admin")`;
3. redirecionar usuários sem autorização para `admin-login.html`;
4. preservar a página solicitada no parâmetro `redirect`;
5. carregar os scripts específicos somente depois da autorização.

## 7. Conceder Acesso Transitório Ao Papel `authenticated`

Após o login pelo Supabase Auth, o cliente deixa de operar como `anon` e passa
a operar como `authenticated`.

Antes das políticas RLS definitivas, execute:

```text
docs/security_admin_authenticated_access.sql
```

Esse script concede temporariamente ao papel `authenticated` acesso às tabelas:

- `guests`;
- `rsvps`;
- `gifts`;
- `gift_contributions`;
- `settings`.

Essa etapa é necessária para que o painel continue funcionando enquanto a RLS
definitiva ainda não foi implementada.

## 8. Verificar O Acesso Transitório

Execute:

```text
docs/security_admin_authenticated_access_verify.sql
```

Todas as linhas devem apresentar:

```text
check_passed = true
```

## 9. Testar O Fluxo

Faça os seguintes testes:

1. Abra `admin-login.html`.
2. Entre com o e-mail e a senha administrativos.
3. Confirme o redirecionamento para `admin-dashboard.html`.
4. Confirme que métricas, gráficos e relatórios carregam.
5. Abra cada página administrativa:
   - convidados;
   - RSVPs;
   - presentes;
   - configurações.
6. Confirme que os dados aparecem e as operações continuam funcionando.
7. Faça logout e confirme o retorno para a página inicial.
8. Sem sessão, abra diretamente `admin-guests.html`.
9. Confirme o redirecionamento para:

```text
admin-login.html?redirect=admin-guests.html
```

10. Entre novamente e confirme o retorno para `admin-guests.html`.
11. Confirme que o login normal por código de convite continua funcionando.

## Diagnóstico De Problemas

### Login Funciona, Mas O Dashboard Fica Vazio

Causa provável: o papel `authenticated` não possui permissão nas tabelas
atuais.

Solução:

1. execute `docs/security_admin_authenticated_access.sql`;
2. execute `docs/security_admin_authenticated_access_verify.sql`;
3. confirme que todas as verificações retornam `true`;
4. recarregue o dashboard.

### Conta Não Possui Acesso Administrativo

Verifique o vínculo:

```sql
select *
from public.admin_users
where user_id = '<USER UID>';
```

Confirme:

- `user_id` corresponde ao usuário de `auth.users`;
- `guest_id` corresponde ao convidado correto;
- `active` está como `true`.

### Página Administrativa Não Redireciona

Confirme que a página:

- possui a classe `admin-auth-pending` no `body`;
- carrega `js/supabase.js`;
- carrega `js/admin-common.js`;
- carrega `js/admin-bootstrap.js`;
- não carrega diretamente seu script administrativo principal.

### Mensagem De Sucesso Aparece Vermelha

O seletor de sucesso precisa ter especificidade suficiente:

```css
#loginError.success {
  color: var(--color-success);
}
```

## Estado Transitório E Cuidados

> Registro histórico: esta seção descreve o estado intermediário da fase 2.
> O projeto atual já concluiu a Edge Function, o login anônimo e a RLS
> definitiva. Não reproduza estas permissões transitórias em uma instalação
> nova; use `docs/supabase_rebuild_runbook.md`.

Naquele momento:

- administradores usam Supabase Auth;
- convidados ainda usam código de convite e sessão em `localStorage`;
- as tabelas antigas ainda não possuem a RLS definitiva;
- `authenticated` possui permissões amplas temporárias;
- `guest_access_sessions` ainda não é utilizada pelo frontend;
- nenhuma Edge Function de convite foi implantada.

Não habilite sessões anônimas do Supabase Auth para convidados enquanto as
permissões amplas do papel `authenticated` estiverem ativas. Fazer isso
permitiria que uma sessão de convidado herdasse o acesso transitório do
administrador.

Antes de migrar os convidados, substitua essas permissões por políticas RLS
que usem `is_admin()` e `current_guest_id()`.

## Rollback

O arquivo:

```text
docs/security_phase_2_rollback.sql
```

remove:

- `admin_users`;
- `guest_access_sessions`;
- `current_guest_id()`;
- `is_admin()`.

Não execute esse rollback em um ambiente em uso sem:

1. fazer backup das tabelas novas;
2. restaurar o frontend administrativo anterior;
3. revisar as permissões do papel `authenticated`;
4. confirmar que o painel antigo poderá autenticar novamente.

Depois que vínculos e sessões reais existirem, o rollback deixa de ser uma
operação simples.

## Próximo Passo

O estágio que sucedeu esta fase está documentado em:

```text
docs/security_phase_3_claim_invite_runbook.md
```

A Edge Function será responsável por:

1. criar ou validar uma sessão autenticada do convidado;
2. receber o código do convite;
3. localizar um convite ativo usando acesso confiável;
4. vincular `auth.uid()` ao convite em `guest_access_sessions`;
5. retornar somente os dados necessários;
6. aplicar limitação de tentativas e respostas genéricas.

Antes de liberar esse fluxo no frontend, será necessário preparar e testar a
RLS definitiva.
