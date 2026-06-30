# Site de Casamento - L & M - v3.0

Esta release conclui a migração de segurança do site para Supabase Auth, Edge
Functions e Row Level Security. Administradores e convidados agora possuem
fluxos de autenticação separados, com isolamento dos dados por convite e
operações sensíveis protegidas no banco.

## Funcionalidades

- Acesso dos convidados por código de convite.
- RSVP individual e para convites de casal.
- Cadastro de acompanhantes, crianças e restrições alimentares.
- Lista de presentes com reserva individual ou por cotas.
- Formas de presentear por PIX, cartão via checkout externo, compra online e loja física.
- QR Code e PIX Copia e Cola gerados no frontend.
- Envio de comprovante via WhatsApp.
- Painel administrativo separado por áreas.
- Gestão de convidados, RSVPs, presentes e configurações globais.
- Dashboard com resumo do casamento, presentes e financeiro.
- Gráficos de distribuição de convidados, presentes e valores.
- Filtros, ordenação, contadores e limpeza de filtros nas tabelas administrativas.
- Exportação CSV de convidados, RSVPs e presentes.
- Relatórios consolidados com exportação CSV/XLSX e seleção de colunas.
- Modos resumido e detalhado para a lista de confirmados.
- Total esperado geral, identificação de crianças e agrupamento por convite nos relatórios.
- Login administrativo com e-mail e senha pelo Supabase Auth.
- Login seguro dos convidados com sessão anônima e Edge Function.
- Row Level Security e RPCs restritas para isolamento dos dados por convite.
- Limitação de tentativas inválidas no login por código.

## Novidades

- Adicionado login administrativo com e-mail e senha pelo Supabase Auth.
- Adicionado login de convidados com sessão anônima do Supabase Auth.
- Adicionada Edge Function `claim-invite` para validação segura dos códigos.
- Adicionado vínculo entre a sessão autenticada e o convite correspondente.
- Adicionada limitação de tentativas inválidas por usuário e rede.
- Adicionado redirecionamento correto entre login administrativo e login de convidados.

## Segurança

- Ativada Row Level Security nas tabelas da aplicação.
- Adicionadas políticas de isolamento dos dados por convidado.
- Adicionadas políticas administrativas baseadas em `is_admin()`.
- Operações de RSVP e presentes migradas para RPCs restritas.
- Removido o acesso direto do papel `anon` às tabelas da aplicação.
- Adicionados grants específicos da `service_role` para a Edge Function.
- Mantida a verificação de JWT na `claim-invite`.
- Protegido o endereço de rede usado no rate limit com SHA-256 e pepper secreto.

## Fluxos Validados

- Login e logout administrativo.
- Carregamento do dashboard administrativo.
- Login de convidado com código válido.
- RSVP individual e de casal.
- Carregamento da lista de presentes.
- Reserva de presente individual.
- Seleção da forma de presentear e informação de pagamento.
- Reserva, pagamento e liberação de presentes por cotas.
- Logout e novo login dos convidados.
- Isolamento dos dados entre convites diferentes.

## Documentação

- Adicionado guia completo para reconstrução do Supabase em um projeto novo.
- Adicionado SQL fechado para criação das tabelas base.
- Adicionado inventário das configurações do ambiente.
- Adicionado SQL de verificação final de tabelas, funções, políticas e grants.
- Documentada a geração e a finalidade do `INVITE_RATE_LIMIT_PEPPER`.
- Marcado o antigo setup público do Supabase como legado.

## Próximos Endurecimentos

- Adicionar CAPTCHA ou Cloudflare Turnstile ao login por convite.
- Automatizar a limpeza de contas anônimas e tentativas antigas.
- Revisar Content Security Policy, dependências CDN e usos de `innerHTML`.
- Rotacionar os códigos de convite antes da publicação definitiva.
