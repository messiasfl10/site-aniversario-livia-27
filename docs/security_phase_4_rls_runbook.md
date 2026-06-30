# Guia De Preparação E Ativação Da RLS

Este guia separa a criação das políticas da ativação efetiva da Row Level
Security.

## Objetivo

Depois da ativação:

- `anon` não acessa diretamente as tabelas do casamento;
- administradores autenticados mantêm acesso completo;
- convidados acessam somente o próprio perfil e RSVP;
- o catálogo de presentes não revela reservas e mensagens de terceiros;
- convidados não alteram diretamente preços, status ou campos financeiros;
- reservas, cotas e pagamentos passam por RPCs restritas;
- configurações podem ser lidas por convidados vinculados e alteradas somente
  por administradores.

## Arquivos

- `security_phase_4_rls_prepare.sql`: cria políticas, RPCs e triggers sem
  ativar RLS.
- `security_phase_4_rls_verify_prepare.sql`: verifica a preparação.
- `security_phase_4_rls_activate.sql`: ativa a proteção no corte definitivo.
- `security_phase_4_rls_verify_active.sql`: verifica a ativação.
- `security_phase_4_rls_activation_rollback.sql`: restaura temporariamente o
  acesso legado em uma emergência.
- `security_phase_4_rls_prepare_rollback.sql`: remove a preparação antes do
  corte.

## 1. Preparar Sem Interromper O Site

Execute no SQL Editor:

```text
docs/security_phase_4_rls_prepare.sql
```

O script:

- não habilita RLS nas cinco tabelas atuais;
- não revoga o acesso usado pelo frontend atual;
- cria as políticas que serão aplicadas posteriormente;
- cria um índice único de RSVP por convidado;
- interrompe e desfaz a transação se encontrar RSVPs duplicados;
- cria os RPCs públicos autenticados;
- cria triggers para sincronizar confirmação e presentes por cotas.

## 2. Verificar A Preparação

Execute:

```text
docs/security_phase_4_rls_verify_prepare.sql
```

Todas as linhas devem retornar:

```text
check_passed = true
```

Nesta etapa, as cinco tabelas antigas devem continuar aparecendo com RLS
desabilitada. Isso é intencional.

## RPCs Preparadas

### Perfil E Catálogo

- `get_current_guest_profile()`
- `get_gift_catalog()`

O catálogo retorna dados públicos dos presentes, dados privados apenas da
reserva atual e somente as contribuições do próprio convidado.

### RSVP

- `save_current_rsvp(...)`

Valida:

- vínculo da sessão;
- presença `Sim` ou `Não`;
- quantidade máxima de acompanhantes;
- quantidade informada e array de acompanhantes;
- tamanhos máximos dos campos.

O campo `guests.confirmed` passa a ser sincronizado por trigger.

### Presentes

- `reserve_gift(uuid, text)`
- `set_gift_purchase_method(uuid, text, jsonb)`
- `report_gift_payment(uuid)`
- `reserve_gift_quotas(uuid, text, integer)`
- `report_gift_contribution_payment(uuid)`

Essas funções derivam o convidado de `current_guest_id()` e não aceitam um
`guest_id` enviado pelo navegador.

## 3. Ponto Obrigatório Antes Da Ativação

Não execute ainda:

```text
docs/security_phase_4_rls_activate.sql
```

Primeiro, o frontend público precisa ser alterado para:

1. usar a sessão do Supabase Auth;
2. chamar `claim-invite`;
3. carregar o perfil com `get_current_guest_profile()`;
4. salvar RSVP com `save_current_rsvp(...)`;
5. carregar presentes com `get_gift_catalog()`;
6. usar os RPCs de reserva e pagamento.

## 4. Ordem Do Corte Definitivo

Faça o corte em uma janela controlada:

1. confirme backup recente;
2. deixe o novo frontend pronto para publicação;
3. execute `security_phase_4_rls_activate.sql`;
4. execute `security_phase_4_rls_verify_active.sql`;
5. valide imediatamente o login e o dashboard administrativo;
6. habilite Anonymous Sign-Ins no Supabase somente após confirmar a RLS;
7. publique imediatamente o novo frontend;
8. teste convite, RSVP, presentes individuais e cotas;
9. confira os logs da Edge Function e do banco.

O login legado dos convidados deixa de funcionar assim que a RLS é ativada.
Por isso, os passos finais devem ser executados em sequência.

## 5. Rollback De Emergência

Se o novo frontend falhar durante o corte, execute:

```text
docs/security_phase_4_rls_activation_rollback.sql
```

Esse script:

- desabilita RLS nas tabelas antigas;
- restaura as permissões de `anon`;
- mantém políticas e RPCs preparadas para uma nova tentativa.

Depois, restaure a versão anterior do frontend.

## Segurança Importante

Ter grants de tabela para `authenticated` é necessário porque administradores
e convidados usam o mesmo papel PostgreSQL base. A separação real é feita
pelas políticas:

- `is_admin()` libera acesso administrativo completo;
- `current_guest_id()` limita cada convidado ao próprio convite;
- ações sensíveis de presentes não possuem políticas diretas de escrita e
passam exclusivamente pelos RPCs.

## Próxima Etapa

Depois de executar apenas a preparação e a verificação, o próximo trabalho é
adaptar o frontend público. A ativação da RLS fica reservada para o corte
definitivo.

## Referências Oficiais

- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Database Functions](https://supabase.com/docs/guides/database/functions)
- [Securing Your API](https://supabase.com/docs/guides/database/secure-data)
