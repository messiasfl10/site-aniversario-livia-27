# Smoke Test Da Edge Function `claim-invite`

Execute estes testes somente depois do deploy da função e antes de conectá-la
ao frontend.

## Pré-Requisitos

- `security_phase_3_claim_invite_prepare.sql` executado;
- `security_phase_3_claim_invite_verify.sql` retornando apenas `true`;
- função publicada com verificação de JWT;
- secrets `INVITE_RATE_LIMIT_PEPPER` e `ALLOWED_ORIGINS` configurados;
- Anonymous Sign-Ins ainda desabilitado.

## 1. Requisição Sem JWT

Faça uma chamada `POST` sem o cabeçalho `Authorization`.

Resultado esperado:

```text
HTTP 401
```

## 2. Requisição Com Conta Administrativa

Use temporariamente o JWT da sessão administrativa em uma ferramenta local de
teste. Não salve ou compartilhe esse token.

Resultado esperado:

```text
HTTP 401
```

A função aceita somente usuários anônimos.

## 3. Origem Não Permitida

Envie a requisição com um cabeçalho `Origin` que não esteja em
`ALLOWED_ORIGINS`.

Resultado esperado:

```text
HTTP 403
```

## 4. Método Incorreto

Envie uma requisição `GET`.

Resultado esperado:

```text
HTTP 405
```

## 5. Testes Com Sessão Anônima

Estes testes ficam bloqueados até a conclusão da RLS e a revogação dos grants
transitórios de `authenticated`.

Depois dessa etapa, validar:

- código válido retorna `200`;
- código inválido retorna `401`;
- resposta não contém `invite_code`;
- vínculo aparece em `guest_access_sessions`;
- `access_count` e `last_access` são atualizados;
- a mesma sessão não pode trocar de convite;
- sessão revogada retorna `403`;
- oito erros recentes levam a `429`;
- nenhum dado de outro convidado fica acessível.
