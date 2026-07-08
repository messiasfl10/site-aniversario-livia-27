# Release v2.3 - Aniversário da Livia - 27 Anos

Data: 2026-07-08

## Resumo

Esta release adiciona um controle administrativo para acompanhar quais convites já foram enviados. O status fica salvo em `guests.invite_sent` e aparece no painel de convidados para filtrar, ordenar, editar, marcar rapidamente e exportar em CSV.

## Destaques

- Novo campo `invite_sent` na tabela `guests`.
- Checkbox **Convite já enviado** no cadastro e edição de convidados.
- Nova coluna **Enviado** na tabela administrativa de convidados.
- Filtro **Convite** com opções de enviados e não enviados.
- Badge de envio no resumo dos detalhes do convidado.
- Ação rápida para marcar o convite como enviado ou não enviado.
- CSV de convidados agora inclui o status de envio.

## Banco de dados

A release inclui a migration:

```text
supabase/migrations/20260708000000_add_guest_invite_sent.sql
```

Ela adiciona a coluna `invite_sent`, atualiza as RPCs `create_guest_with_invite` e `update_guest_details`, e cria a RPC `set_guest_invite_sent`.

## Deploy

Após atualizar o código, aplique a migration:

```bash
supabase db push
```

Depois, valide o banco com:

```text
docs/supabase_verify.sql
```

O resumo deve mostrar `invite_sent_column_ok` e `invite_sent_rpc_ok` como `true`.

## Validação

- Criação de convidado com convite ainda não enviado.
- Edição de convidado marcando **Convite já enviado**.
- Ação rápida para alternar entre enviado e não enviado.
- Filtro e ordenação pela coluna **Enviado**.
- Exportação CSV com o status de envio.
- `node --check js/admin-guests.js`.

## Observações de publicação

- A release exige alteração no banco de dados.
- A release não exige novos secrets.
- A release não altera o fluxo público do convidado nem expõe `invite_sent` no perfil público do convite.
