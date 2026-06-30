# Guia De Migração Do Frontend Público

O frontend público está preparado para funcionar em dois modos:

```js
window.GuestAuthConfig = Object.freeze({
  mode: "legacy",
});
```

- `legacy`: código de convite consultado diretamente e sessão em
  `localStorage`;
- `supabase`: sessão anônima, Edge Function `claim-invite`, RLS e RPCs.

O modo padrão continua como `legacy` para não interromper o site antes do
corte definitivo.

## Arquivos Da Nova Camada

- `js/guest-auth-config.js`: seleciona o modo.
- `js/guest-auth.js`: login, sessão, perfil e logout.
- `js/guest-data.js`: adaptador das operações de RSVP e presentes.
- `js/guest-bootstrap.js`: carrega a página somente após validar o convidado.

As páginas `login.html`, `rsvp.html` e `gifts.html` já carregam essa camada.

## Comportamento No Modo Seguro

### Login

1. Reutiliza uma sessão válida ou chama `signInAnonymously()`.
2. Envia o código para `claim-invite`.
3. A Edge Function vincula `auth.uid()` ao convite.
4. A sessão local antiga é removida.
5. O convidado é redirecionado para RSVP ou presentes.

### RSVP

- leitura direta apenas da própria linha, protegida pela RLS;
- gravação pelo RPC `save_current_rsvp(...)`;
- atualização de `guests.confirmed` por trigger.

### Presentes

- configurações lidas conforme a política RLS;
- catálogo carregado por `get_gift_catalog()`;
- reserva individual por `reserve_gift(...)`;
- forma de presentear por `set_gift_purchase_method(...)`;
- pagamento informado por `report_gift_payment(...)`;
- cotas reservadas por `reserve_gift_quotas(...)`;
- pagamento de cota por `report_gift_contribution_payment(...)`;
- status agregado das cotas atualizado por triggers.

## O Que Não Fazer Ainda

Enquanto `mode` estiver como `legacy`:

- não habilite Anonymous Sign-Ins;
- não execute `security_phase_4_rls_activate.sql`;
- não publique o modo `supabase`.

## Ordem Do Corte

1. Faça backup do banco.
2. Confirme que o login administrativo está funcionando.
3. Confirme que `claim-invite` está implantada e sem erros.
4. Confirme que a preparação da RLS passou em todas as verificações.
5. Altere localmente `js/guest-auth-config.js`:

```js
window.GuestAuthConfig = Object.freeze({
  mode: "supabase",
});
```

6. Execute:

```text
docs/security_phase_4_rls_activate.sql
```

7. Execute:

```text
docs/security_phase_4_rls_verify_active.sql
```

8. Confirme que o login administrativo ainda funciona.
9. Ative Anonymous Sign-Ins no painel do Supabase.
10. Publique imediatamente o frontend com `mode: "supabase"`.
11. Teste os fluxos abaixo.

Os passos 6 a 10 devem ocorrer na mesma janela de manutenção. Entre a ativação
da RLS e a publicação do novo frontend, o login legado não funcionará.

Não habilite Anonymous Sign-Ins antes da RLS. Enquanto as tabelas antigas
estiverem sem RLS, uma sessão anônima receberia o papel `authenticated` com
acesso transitório amplo.

## Smoke Test Do Corte

Validado:

- login administrativo após a ativação da RLS;
- criação da sessão anônima;
- login por código via `claim-invite`;
- vínculo da sessão com o convite.
- RSVP individual e de casal;
- catálogo completo de presentes;
- reserva, pagamento e liberação de presentes por cotas;
- logout e novo login.

Resultado do reteste:

Nenhuma. Os fluxos abaixo foram retestados e validados:

- reserva de presente individual;
- seleção da forma de presentear;
- informação de pagamento do presente individual.

### Administração

- login administrativo;
- dashboard e gráficos;
- convidados;
- RSVPs;
- presentes e cotas;
- configurações;
- relatórios e exportações;
- logout.

### Convidado

- código válido;
- código inválido;
- convite inativo;
- RSVP individual;
- RSVP de casal;
- acompanhantes no limite permitido;
- reserva de presente individual;
- seleção de PIX, cartão e compra externa;
- informação de pagamento;
- reserva de cotas;
- informação de pagamento de cota;
- logout e novo login.

### Isolamento

- um convidado não vê RSVP de outro;
- um convidado não vê mensagens ou nomes de reservas alheias;
- um convidado não altera preço, status ou pagamento confirmado;
- uma sessão não troca de convite;
- sessão revogada não recupera acesso;
- acesso sem sessão retorna ao login.

## Rollback

Se o corte falhar:

1. execute `security_phase_4_rls_activation_rollback.sql`;
2. restaure `mode: "legacy"`;
3. publique novamente o frontend legado;
4. desabilite Anonymous Sign-Ins;
5. preserve logs e dados para diagnóstico.

Não remova as tabelas ou RPCs preparadas durante um rollback emergencial.
