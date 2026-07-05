# Changelog

Todas as mudanças relevantes deste projeto serão registradas aqui.

O formato segue uma adaptação simples do [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), com versionamento semântico quando fizer sentido para o projeto.

## [1.1] - 2026-07-03

### Adicionado

- Link do cardápio na mensagem personalizada, com texto adaptado para convites individuais e de casal.
- Metadados Open Graph para exibir título, descrição e imagem principal ao compartilhar o site.

- Geração de mensagem personalizada de convite no painel de convidados.
- Texto automático com variação para convite individual e convite de casal.
- Instruções de confirmação com link direto para o site principal, sem depender de `index.html` na URL.
- Modal administrativo para revisar, editar e copiar a mensagem antes de enviar por WhatsApp, Instagram ou outro canal.
- Política CSP nas páginas públicas e administrativas, sem depender de `unsafe-inline` para scripts.

### Alterado

- Renderização dinâmica das páginas públicas e administrativas migrada para APIs seguras do DOM, como `document.createElement`, `textContent`, `replaceChildren` e `addEventListener`.
- Navegação administrativa passou a ser construída sem `innerHTML`.
- Tabelas de convidados e RSVPs passaram a usar listeners em vez de `onclick` embutido.
- Campos dinâmicos do RSVP público e do RSVP manual administrativo passaram a preservar dados usando propriedades DOM, evitando interpolação direta em HTML.
- URLs dinâmicas de scripts, CAPTCHA e Google Maps passaram por validação de origem antes de serem aplicadas em `src` ou `href`.

### Segurança

- Removidos usos sensíveis de `innerHTML` com dados vindos do banco ou do usuário.
- Removidos handlers inline em HTML gerado dinamicamente.
- Reduzido risco de XSS em nomes de convidados, acompanhantes, mensagens e dados de RSVP.
- Adicionadas restrições CSP para scripts, estilos, fontes, imagens, conexões, frames, objetos, base URI e envio de formulários.

### Validado

- `node --check` nos JavaScripts alterados.
- Varredura por `innerHTML`, handlers inline e `javascript:`.
- `git diff --check`.
- Testes manuais em todas as páginas públicas e administrativas.

## [1.0] - Release inicial

### Adicionado

- Site público com informações do aniversário e contagem regressiva.
- Acesso privado por código de convite.
- RSVP para convites individuais e de casal.
- Painel administrativo com dashboard, convidados, confirmações e exportação CSV.
- Integração com Supabase, RLS, RPCs seguras, Edge Function de convite e Cloudflare Turnstile.
