# Changelog

Todas as mudanças relevantes deste projeto serão registradas aqui.

O formato segue uma adaptação simples do [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), com versionamento semântico quando fizer sentido para o projeto.

## [1.3] - 2026-07-08

### Adicionado

- Campo administrativo `invite_sent` para indicar se o convite já foi enviado.
- Filtro, coluna, ordenação e badge de envio na gestão de convidados.
- Checkbox de envio no modal de criação e edição de convidados.
- Ação rápida nos detalhes do convidado para marcar o convite como enviado ou não enviado.
- Exportação do status de envio no CSV de convidados.
- Migration `20260708000000_add_guest_invite_sent.sql`.
- Documento de release em `docs/release-v1.3.md`.

### Alterado

- RPCs administrativas de criação e edição de convidados passaram a receber `guest_invite_sent`.
- Scripts de instalação, atualização e verificação do Supabase passaram a contemplar a coluna `invite_sent` e a RPC `set_guest_invite_sent`.
- README e runbook de reconstrução passaram a documentar o controle de envio de convites.

### Validado

- `node --check js/admin-guests.js`.
- Revisão dos scripts SQL de setup, migration e verificação.

## [1.2] - 2026-07-06

### Adicionado

- Edge Function `notify-rsvp` para enviar notificações de RSVP por e-mail.
- Confirmação por e-mail para o convidado após criação ou atualização do RSVP.
- Notificação administrativa por e-mail para `ADMIN_EMAIL`.
- Suporte a SMTP com configuração por secrets do Supabase.
- Documentação completa em `docs/rsvp_email_notifications.md`.
- Documento de release em `docs/release-v1.2.md`.

### Alterado

- Fluxo público de RSVP passou a chamar `notify-rsvp` após salvar a resposta com sucesso.
- Mensagens de e-mail agora usam concordância diferente para convite individual e convite de casal.
- Assuntos e corpos dos e-mails receberam coração roxo para combinar com o tom do convite.
- E-mail administrativo passou a exibir tipo de convite e respostas dos membros quando o convite é de casal.
- `supabase/functions/.env.example` passou a listar os secrets SMTP necessários.
- README passou a documentar a existência das notificações de RSVP e apontar para o guia completo.

### Segurança

- Credenciais SMTP ficam restritas aos secrets do Supabase.
- A Edge Function valida a sessão do convidado antes de enviar e-mails.
- O RSVP enviado para notificação é conferido contra o convidado autenticado.
- Conteúdo dinâmico dos e-mails HTML passa por escape antes da renderização.

### Validado

- Testes manuais de criação e atualização de RSVP.
- Testes manuais de e-mail para convite individual e convite de casal.
- Recebimento de e-mail pelo convidado e pelo administrador.
- `node --check js/guest-data.js`.
- `node --check js/rsvp.js`.

## [1.1] - 2026-07-05

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
