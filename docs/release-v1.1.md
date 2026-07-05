# Release v1.1 - Aniversário da Livia - 27 Anos

Data: 2026-07-05

## Resumo

Esta release adiciona a geração de mensagens personalizadas de convite no painel administrativo e reforça a segurança do frontend contra XSS, removendo renderizações HTML sensíveis, handlers inline e preparando o site para CSP sem `unsafe-inline` em scripts.

## Destaques

- Nova opção **Criar mensagem** nos detalhes do convidado.
- Mensagem automática personalizada por convidado.
- Tratamento textual para convite individual e convite de casal.
- Link direto para a página principal do site.
- Instruções curtas para acessar o site, usar o código de convite e confirmar presença.
- Link do cardápio, com orientação sobre opções e preços adaptada para convite individual ou de casal.
- Prévia de compartilhamento do site com título, descrição e imagem principal via Open Graph.
- Modal para revisar, editar e copiar a mensagem antes do envio.
- Renderização dinâmica migrada para APIs seguras do DOM.
- CSP adicionada às páginas públicas e administrativas.

## Segurança

- Removidos usos sensíveis de `innerHTML` com dados dinâmicos.
- Removidos `onclick` embutidos em HTML gerado.
- Eventos migrados para `addEventListener`.
- Dados dinâmicos renderizados com `textContent` ou propriedades DOM.
- URLs dinâmicas validadas antes de uso em `src` e `href`.
- Scripts dinâmicos restritos à própria origem do site ou a origens explicitamente permitidas.

## Validação

- Testes manuais em todas as páginas públicas e administrativas.
- `node --check` nos JavaScripts alterados.
- Varredura por `innerHTML`, handlers inline e `javascript:`.
- `git diff --check`.

## Observações de publicação

- A release não exige mudanças no banco de dados.
- A release não exige novas variáveis de ambiente.
- Em hospedagem estática no GitHub Pages, a CSP foi configurada via `<meta http-equiv="Content-Security-Policy">`.
- Em uma hospedagem com controle de servidor, prefira enviar a CSP como header HTTP.
