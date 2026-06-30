# Modelagem JSON E Payloads

Este documento descreve os objetos JSON usados pelo frontend e armazenados no Supabase.

## `guests.couple_members`

Usado em convites do tipo `couple`.

```json
[
  {
    "name": "Messias"
  },
  {
    "name": "Livia"
  }
]
```

## `rsvps.guest_data`

Snapshot completo do RSVP.

```json
{
  "name": "Messias Filho",
  "email": "messias@email.com",
  "phone": "(85) 99999-9999",
  "guest_count": 2,
  "members": [],
  "companions": []
}
```

O campo `companions[].age` armazena um valor padronizado, como `6 meses` ou
`4 anos`, e representa a idade que a criança terá na data do casamento. Novas
respostas usam uma lista controlada de `Menos de 1 mês`, `1` a `11 meses` e
`1` a `17 anos`. Valores antigos fora desse padrão continuam disponíveis ao
editar um RSVP existente.

### RSVP Individual

```json
{
  "name": "Messias Filho",
  "email": "messias@email.com",
  "phone": "(85) 99999-9999",
  "guest_count": 2,
  "members": [],
  "companions": [
    {
      "name": "João",
      "is_child": "Não",
      "age": ""
    },
    {
      "name": "Pedro",
      "is_child": "Sim",
      "age": "6 anos"
    }
  ]
}
```

### RSVP Casal

```json
{
  "name": "Messias e Livia",
  "email": "messias@email.com",
  "phone": "(85) 99999-9999",
  "guest_count": 1,
  "members": [
    {
      "name": "Messias",
      "presence": "Sim"
    },
    {
      "name": "Livia",
      "presence": "Sim"
    }
  ],
  "companions": [
    {
      "name": "Maria",
      "is_child": "Não",
      "age": ""
    }
  ]
}
```

## Estrutura De Acompanhante

```json
{
  "name": "Pedro",
  "is_child": "Sim",
  "age": "6 anos"
}
```

Campos:

- `name`: nome do acompanhante.
- `is_child`: `Sim` ou `Não`.
- `age`: idade quando for criança.

## `gifts.external_purchase_options`

Lista de opções de compra externa.

### Compra Online

```json
[
  {
    "type": "online",
    "store": "Amazon",
    "url": "https://amazon.com.br/produto",
    "notes": "Modelo branco 127V"
  },
  {
    "type": "online",
    "store": "Mercado Livre",
    "url": "https://mercadolivre.com.br/produto",
    "notes": "Modelo prata 220V"
  }
]
```

### Loja Física

```json
[
  {
    "type": "physical",
    "store": "Magazine Luiza",
    "notes": "Shopping Iguatemi, 2º piso. Modelo branco 127V."
  }
]
```

### Modelo Híbrido

```json
[
  {
    "type": "online",
    "store": "Amazon",
    "url": "https://amazon.com.br/produto",
    "notes": "Modelo branco 127V"
  },
  {
    "type": "physical",
    "store": "Magazine Luiza",
    "notes": "Shopping Iguatemi, 2º piso"
  }
]
```

## `gifts.selected_purchase_details`

Armazena a opção escolhida pelo convidado.

### Compra Online

```json
{
  "type": "online",
  "store": "Amazon",
  "url": "https://amazon.com.br/produto",
  "notes": "Modelo branco 127V"
}
```

### Loja Física

```json
{
  "type": "physical",
  "store": "Magazine Luiza",
  "notes": "Shopping Iguatemi, 2º piso"
}
```

### PIX

```json
{
  "type": "pix"
}
```

### Cartão

```json
{
  "type": "card",
  "url": "https://link-de-pagamento"
}
```

Observação: o frontend atual salva `type` e `url` em `selected_purchase_details`. Os campos `card_payment_provider` e `card_payment_reference` existem no schema para uso futuro ou integrações externas.

## `gifts.selected_purchase_method`

Valores possíveis:

```text
pix
card
online
physical
```

## Payload De RSVP

```json
{
  "guest_id": "uuid",
  "presence": "Sim",
  "email": "messias@email.com",
  "phone": "(85) 99999-9999",
  "food": "Vegetariano",
  "message": "Estamos ansiosos!",
  "updated_at": "2026-06-13T18:00:00Z",
  "guest_data": {
    "name": "Messias Filho",
    "email": "messias@email.com",
    "phone": "(85) 99999-9999",
    "guest_count": 1,
    "members": [],
    "companions": [
      {
        "name": "Pedro",
        "is_child": "Não",
        "age": ""
      }
    ]
  }
}
```

## Payload De Reserva De Presente

```json
{
  "status": "Reservado",
  "reserved_guest_id": "uuid",
  "reserved_name": "Messias Filho",
  "reservation_message": "Parabéns aos noivos!",
  "reserved_at": "2026-06-13T18:00:00Z",
  "payment_status": "Pendente",
  "payment_reported_at": null
}
```

Para presentes individuais, a reserva também mantém o presente vinculado ao convidado por `reserved_guest_id`. Para presentes por cotas, a reserva é criada em `gift_contributions`, não em `gifts.reserved_guest_id`.

## Payload De Pagamento Informado

### PIX

```json
{
  "payment_status": "Informado",
  "payment_reported_at": "2026-06-13T18:00:00Z",
  "selected_purchase_method": "pix",
  "selected_purchase_details": {
    "type": "pix"
  }
}
```

### Cartão

```json
{
  "payment_status": "Informado",
  "payment_reported_at": "2026-06-13T18:00:00Z",
  "selected_purchase_method": "card",
  "selected_purchase_details": {
    "type": "card",
    "url": "https://link-de-pagamento"
  }
}
```

### Compra Online

```json
{
  "payment_status": "Informado",
  "payment_reported_at": "2026-06-13T18:00:00Z",
  "selected_purchase_method": "online",
  "selected_purchase_details": {
    "type": "online",
    "store": "Amazon",
    "url": "https://amazon.com.br/produto",
    "notes": "Modelo branco 127V"
  }
}
```

### Loja Física

```json
{
  "payment_status": "Informado",
  "payment_reported_at": "2026-06-13T18:00:00Z",
  "selected_purchase_method": "physical",
  "selected_purchase_details": {
    "type": "physical",
    "store": "Magazine Luiza",
    "notes": "Shopping Iguatemi, 2º piso"
  }
}
```

## Payload De Liberação De Reserva

Quando um administrador libera uma reserva:

```json
{
  "status": "Disponível",
  "reserved_guest_id": null,
  "reserved_name": null,
  "reservation_message": null,
  "reserved_at": null,
  "payment_status": null,
  "payment_reported_at": null,
  "selected_purchase_method": null,
  "selected_purchase_details": null
}
```

Para presentes individuais, a liberação limpa a reserva e também remove a forma de presentear escolhida. Para presentes por cotas, o admin libera uma contribuição específica removendo o registro em `gift_contributions`; depois o status agregado do presente é recalculado.

## `gift_contributions`

Contribuições em presentes por cotas são registradas em uma tabela própria.

Exemplo:

```json
{
  "gift_id": "uuid-do-presente",
  "guest_id": "uuid-do-convidado",
  "contributor_name": "João Silva",
  "message": "Com muito carinho!",
  "quota_quantity": 3,
  "quota_value": 200,
  "total_value": 600,
  "payment_status": "Pendente",
  "payment_method": "pix",
  "payment_reported_at": null
}
```

Quando o convidado informa o pagamento:

```json
{
  "payment_status": "Informado",
  "payment_reported_at": "2026-06-15T15:00:00.000Z"
}
```

O PIX de cotas é gerado a partir do valor total da contribuição, não do valor total do presente.

Quando o admin confirma uma contribuição por cota:

```json
{
  "payment_status": "Confirmado"
}
```

Após confirmar ou liberar cotas, o sistema sincroniza o presente relacionado:

```json
{
  "status": "Parcial",
  "payment_status": "Parcialmente informado"
}
```

Os valores agregados possíveis são:

```text
status: Disponível, Parcial, Reservado, Comprado
payment_status: Pendente, Informado, Parcialmente informado, Parcialmente confirmado, Confirmado
```

## Payload PIX Gerado No Frontend

O payload PIX não é salvo no banco. Ele é gerado em tempo de exibição por `js/pix.js`, a partir de:

- `settings.pix_key`
- `settings.merchant_name`
- `settings.merchant_city`
- `gift.id`
- `gift.name`
- `gift.price`

O QR Code também é derivado desse payload:

```js
PixPayment.generatePayload(settings, gift);
PixPayment.getQrCodeUrl(payload);
```

Para contribuições por cotas, o objeto usado para gerar PIX é montado em tempo de execução com:

```json
{
  "id": "uuid-da-contribuicao",
  "name": "Nome do presente (3 cotas)",
  "price": 600
}
```
