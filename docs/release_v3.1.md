# Site de Casamento - L & M - v3.1

Esta release aprimora o planejamento do casamento, a experiência dos convidados
e a identidade visual do site. O painel passa a oferecer métricas específicas
para o buffet e atalhos operacionais, enquanto RSVP e Presentes recebem fluxos
mais claros para convites individuais e de casal.

## Funcionalidades

- Acesso dos convidados por código de convite.
- RSVP individual e para convites de casal, com confirmação separada dos membros.
- Cadastro de acompanhantes, crianças, restrições alimentares e mensagens.
- Idade das crianças padronizada com referência à data do casamento.
- Regra configurável de idade mínima pagante para o buffet.
- Lista de presentes com reservas individuais ou por cotas.
- Área de acompanhamento dos presentes do convite que ainda possuem ações pendentes.
- Formas de presentear por PIX, cartão via checkout externo, compra online e loja física.
- QR Code e PIX Copia e Cola gerados no frontend.
- Envio de comprovante via WhatsApp.
- Confirmação explícita antes de reservar presentes ou informar pagamentos e compras.
- Painel administrativo separado por Dashboard, Presentes, Convidados, RSVPs e Configurações.
- Dashboard com métricas de convites, pessoas planejadas, acompanhantes, buffet, presentes e financeiro.
- Gráficos de distribuição de convidados, buffet, presentes e valores.
- Métricas clicáveis no Dashboard com abertura da área correspondente e filtros aplicados.
- Filtros, ordenação, contadores e limpeza de filtros nas tabelas administrativas.
- Exportação CSV de convidados, RSVPs e presentes respeitando os filtros atuais.
- Relatórios consolidados com exportação CSV/XLSX, seleção de colunas e modos resumido ou detalhado.
- Identificação de crianças pagantes, não pagantes e sem idade válida nos relatórios.
- Referências visuais personalizadas nos logins e nas páginas públicas, com apresentação responsiva.
- Login administrativo com e-mail e senha pelo Supabase Auth.
- Login seguro dos convidados com sessão anônima e Edge Function.
- Cloudflare Turnstile nos logins administrativo e de convidados.
- Row Level Security e RPCs restritas para isolamento dos dados por convite.
- Limitação de tentativas inválidas no login por código.

## Novidades

- Adicionada configuração da idade mínima em que uma criança passa a ser pagante para o buffet.
- Adicionadas métricas de convidados pagantes, crianças pagantes, crianças não pagantes e crianças sem idade válida.
- Adicionado gráfico de distribuição do buffet no Dashboard.
- Adicionados filtros de buffet na página de RSVPs e nos relatórios consolidados.
- Padronizado o preenchimento da idade das crianças no RSVP do convidado e no RSVP administrativo.
- Adicionados indicadores de convites, convidados e acompanhantes planejados no Dashboard e na exportação de convidados.
- Adicionada navegação pelas métricas do Dashboard para as telas administrativas com filtros previamente aplicados.
- Adicionada uma seção de presentes do convite que ainda precisam de forma de pagamento ou confirmação.
- Adicionados modais de confirmação para reserva de presentes e informação de pagamento ou compra.
- Adicionadas referências visuais personalizadas e aleatórias nas telas de login.
- Adicionadas referências discretas nas laterais desktop e entre seções no mobile das páginas públicas.

## Melhorias

- Textos da área de Presentes adaptados automaticamente para convites individuais e de casal.
- Saudação dos convidados adaptada para singular e plural.
- Concordância corrigida nos indicadores de cotas confirmadas.
- Mensagens mais claras quando uma reserva individual ou por cotas deixa de estar disponível.
- Botões de pagamento e compra diferenciados das ações secundárias dos presentes.
- Organização dos assets por página e finalidade.
- Renomeado `login-watermarks.js` para `reference-decorations.js`, refletindo seu uso em diferentes páginas.
- README e documentos do Supabase atualizados com a regra de idade pagante do buffet.

## Segurança

- Mantido o login administrativo pelo Supabase Auth com validação em `admin_users`.
- Mantido o login dos convidados com sessão anônima e validação do código pela Edge Function `claim-invite`.
- Mantido o isolamento dos dados por convite com RLS e RPCs restritas.
- Mantida a limitação de tentativas inválidas por sessão e hash protegido do endereço de rede.
- Mantidos grants específicos da `service_role` para a Edge Function.
- Adicionado Cloudflare Turnstile aos logins administrativo e de convidados, com validação server-side pelo Supabase Auth.

## Documentação

- Adicionado SQL de migração da configuração de idade pagante do buffet.
- Atualizados os scripts de criação e reconstrução do Supabase com a nova configuração.
- Atualizados os documentos de modelagem do banco e dos dados de RSVP.
- Atualizado o documento de fluxos, limitações e relatórios consolidados.
- Documentada a nova organização das imagens em `assets/images/`.
- Adicionado guia de ativação, testes e rollback do Cloudflare Turnstile.

## Próximos Endurecimentos

- Automatizar a limpeza de contas anônimas e tentativas antigas.
- Revisar Content Security Policy, dependências CDN e usos de `innerHTML`.
- Rotacionar os códigos de convite antes da publicação definitiva.
