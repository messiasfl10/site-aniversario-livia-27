# Fluxos de Negócio e Limitações

Este documento descreve os principais fluxos implementados no projeto e as limitações conhecidas.

## Arquitetura Atual Do Frontend

O projeto é uma aplicação HTML/CSS/JavaScript Vanilla integrada diretamente ao Supabase.

Páginas públicas:

- `index.html`
- `our-story.html`
- `login.html`
- `rsvp.html`
- `gifts.html`

Páginas administrativas:

- `admin-dashboard.html`
- `admin-gifts.html`
- `admin-guests.html`
- `admin-rsvps.html`
- `admin-settings.html`

Scripts compartilhados:

- `auth.js`: sessão local e validação do código de convite.
- `public-common.js`: navbar, logout e saudação das páginas públicas autenticadas.
- `admin-common.js`: autenticação admin, logout, toast e utilitários do painel.
- `pix.js`: geração de payload PIX e URL de QR Code.

CSS compartilhado:

- `tokens.css`: tokens globais de cores, fontes, sombras, raios e espaçamentos.

## Fluxo De Autenticação

O frontend público está preparado para dois modos.

Modo atual `legacy`:

1. O convidado acessa `login.html`.
2. Informa o código de convite.
3. O frontend consulta `guests.invite_code`.
4. A sessão é salva no `localStorage`.

Modo preparado `supabase`:

1. O Supabase Auth cria uma sessão anônima.
2. `claim-invite` valida o código.
3. `guest_access_sessions` vincula a sessão ao convite.
4. `guest-bootstrap.js` carrega a página após obter o perfil.
5. RSVP e presentes usam RLS e RPCs restritas.

A mudança de modo será feita somente durante o corte definitivo da RLS.

Páginas administrativas usam um fluxo separado:

```text
e-mail e senha
-> Supabase Auth
-> public.is_admin()
-> carregamento da página administrativa
```

Sem uma sessão administrativa válida, o usuário é redirecionado para
`admin-login.html`. O campo legado `guests.is_admin` permanece no cadastro
durante a migração, mas não autoriza mais o acesso às páginas administrativas.

## Fluxo RSVP Individual

1. O convidado acessa `rsvp.html`.
2. O sistema preenche o nome do convite.
3. O convidado escolhe `Sim` ou `Não`.
4. Pode informar e-mail, telefone, restrição alimentar e mensagem.
5. Se houver acompanhantes disponíveis, o sistema exibe a quantidade permitida.
6. Para cada acompanhante, são informados nome, se é criança e, quando
   aplicável, a idade que terá na data do casamento.
7. A idade da criança é selecionada em uma lista padronizada de meses ou anos,
   evitando respostas livres inconsistentes.
8. O RSVP é criado ou atualizado na tabela `rsvps`.
9. O campo `guests.confirmed` é atualizado.
10. Se já existir RSVP para o convite, o fluxo atualiza o registro existente em vez de criar outro.

## Fluxo RSVP Casal

1. O sistema lê `guests.couple_members`.
2. Cada membro do casal responde individualmente.
3. O RSVP geral fica como `Sim` se pelo menos um membro comparecer.
4. Se todos responderem `Não`, o RSVP geral fica como `Não`.
5. O dashboard considera membros confirmados, acompanhantes e total esperado.

## Fluxo De Reserva De Presente

1. O convidado acessa `gifts.html`.
2. Escolhe um presente disponível.
3. Opcionalmente deixa uma mensagem.
4. O presente recebe:

```text
status = Reservado
reserved_guest_id = guest.id
reserved_name = guest.name
payment_status = Pendente
```

5. O sistema abre a escolha da forma de presentear.
6. Se o convidado tiver presentes reservados sem forma de presentear ou confirmação de pagamento/compra, `gifts.html` exibe um atalho no topo da lista.

## Fluxo De Presentes Por Cotas

Presentes por cotas são usados apenas para contribuições financeiras via PIX.

1. O admin cadastra o presente com `gift_type = quota`.
2. O admin informa valor total e quantidade de cotas.
3. O sistema calcula `quota_value`.
4. O convidado escolhe uma ou mais cotas disponíveis.
5. O sistema cria uma contribuição em `gift_contributions`.
6. O PIX é gerado usando `gift_contributions.total_value`.
7. O convidado informa o pagamento da contribuição.

Atualização:

```text
gift_contributions.payment_status = Informado
gift_contributions.payment_reported_at = data atual
```

Presentes por cotas não usam `gifts.reserved_guest_id`, porque vários convidados podem contribuir para o mesmo presente.

O status agregado do presente por cotas é sincronizado a partir das contribuições:

```text
sem cotas reservadas -> Disponível
cotas parcialmente reservadas -> Parcial
todas as cotas reservadas -> Reservado
todas as cotas confirmadas -> Comprado
```

O `payment_status` agregado também pode assumir estados parciais:

```text
Pendente
Parcialmente informado
Parcialmente confirmado
Confirmado
```

## Formas De Presentear

As opções exibidas dependem de `gifts.purchase_mode`.

Valores possíveis:

```text
money
external
hybrid
```

Regras de valor:

- `money`: exige valor maior que zero, pois gera pagamento financeiro interno.
- `external`: valor opcional; quando não informado, a página pública não mostra preço.
- `hybrid`: exige valor maior que zero, pois o convidado pode escolher PIX/cartão.
- `quota`: exige valor total maior que zero e quantidade de cotas maior que zero.

### PIX

1. O convidado seleciona PIX.
2. `gifts.selected_purchase_method` recebe `pix`.
3. `pix.js` gera o payload PIX.
4. `pix.js` gera a URL do QR Code.
5. O modal exibe QR Code e PIX Copia e Cola.
6. O convidado informa que realizou o pagamento.

Atualização:

```text
payment_status = Informado
payment_reported_at = data atual
```

### Cartão De Crédito

1. O convidado seleciona cartão.
2. O sistema registra `selected_purchase_method = card`.
3. O sistema salva `selected_purchase_details` com `type = card` e a URL configurada.
4. Se `card_payment_url` estiver configurado, o checkout externo é aberto.
5. O convidado informa que realizou o pagamento.

Atualização:

```text
payment_status = Informado
payment_reported_at = data atual
```

### Compra Online

1. O convidado seleciona uma loja online cadastrada.
2. O sistema salva:

```text
selected_purchase_method = online
selected_purchase_details = objeto da loja
```

3. A URL da loja é aberta quando disponível.
4. O convidado informa que realizou a compra.

### Loja Física

1. O convidado seleciona uma loja física cadastrada.
2. O sistema salva:

```text
selected_purchase_method = physical
selected_purchase_details = objeto da loja
```

3. O convidado usa as instruções exibidas e informa que realizou a compra.

## Fluxo Administrativo

O painel administrativo foi dividido em páginas.

### Dashboard

Arquivo:

```text
admin-dashboard.html
```

Exibe o "Resumo do Casamento" com:

- Total de convidados ativos.
- Confirmados.
- Acompanhantes.
- RSVP Sim.
- RSVP Não.
- Total esperado.
- Convidados pagantes conforme a idade mínima configurada.
- Total de crianças, crianças pagantes, não pagantes e sem idade válida.
- Gráfico de distribuição das pessoas confirmadas por categoria do buffet.
- Gráfico de distribuição de RSVPs entre confirmados, não comparecerão e pendentes.
- Métricas clicáveis para abrir Convidados, RSVP ou Presentes com filtros aplicados quando houver filtro equivalente.
- Presentes reservados.
- Pagamentos informados.
- Presentes comprados.
- Presentes parcialmente reservados por cotas.
- Gráfico de distribuição dos presentes por situação.
- Configurações de PIX e WhatsApp.
- Cotas disponíveis e cotas confirmadas.
- Valores financeiros da lista, reservados, disponíveis, informados, confirmados e pendentes, incluindo gráfico de distribuição.
- Relatórios consolidados exportáveis de presença/buffet, financeiro e pendências.

### Gestão De Presentes

Arquivo:

```text
admin-gifts.html
```

Permite:

- Criar presentes.
- Editar presentes.
- Excluir presentes.
- Configurar presentes individuais ou por cotas.
- Configurar modo de compra.
- Configurar link de pagamento por cartão.
- Cadastrar opções de compra online e loja física.
- Liberar reservas.
- Marcar presentes como comprados.
- Confirmar ou liberar contribuições por cota.
- Exportar CSV dos presentes filtrados e ordenados.
- Filtrar por busca textual, status, tipo, cotas, pagamento e forma de presentear.
- Ordenar por presente, categoria, convidado, status, forma, pagamento e data de reserva.
- Ver contador de resultados e limpar filtros.

### Configurações Do Admin

Arquivo:

```text
admin-settings.html
```

Permite editar:

- Chave PIX.
- Nome do recebedor usado no payload PIX.
- Cidade do recebedor usada no payload PIX.
- WhatsApp usado para envio de comprovantes.
- Idade mínima em que uma criança passa a ser pagante para o buffet.

### Gestão De Convidados

Arquivo:

```text
admin-guests.html
```

Permite:

- Criar convidados.
- Editar convidados.
- Ativar/desativar convidados.
- Definir administradores.
- Copiar código de convite.
- Preencher RSVP manual.
- Exportar CSV dos convidados filtrados e ordenados.
- Filtrar por busca textual, status, RSVP, tipo de convite e administrador.
- Ordenar por nome, tipo, acompanhantes, confirmado, status, admin, código, último acesso e acessos.
- Ver contador de resultados e limpar filtros.

### Gestão De RSVP

Arquivo:

```text
admin-rsvps.html
```

Permite:

- Visualizar confirmações.
- Consultar acompanhantes.
- Consultar restrições e mensagens.
- Remover RSVP.
- Exportar CSV dos RSVPs filtrados e ordenados.
- Filtrar por busca textual, presença, acompanhantes e categorias do buffet.
- Ordenar por convidado, presença, quantidade de acompanhantes e data de atualização.
- Ver contador de resultados e limpar filtros.

### Comportamento Dos Filtros E Ordenação Administrativos

Os filtros e a ordenação do admin são aplicados no frontend, em memória, sobre os dados já carregados do Supabase.

Isso evita novas consultas a cada tecla digitada ou clique de ordenação e preserva os controles após operações que recarregam a tabela.

### Exportação CSV

As páginas de Presentes, Convidados e RSVP possuem exportação CSV. O arquivo baixado respeita os filtros e a ordenação aplicados na tabela no momento do clique.

O Dashboard também possui relatórios consolidados exportáveis:

- Presença e buffet: convites confirmados, pessoas do convite, acompanhantes, crianças, convidados pagantes, crianças pagantes, não pagantes e sem idade válida, além da regra de idade aplicada, com seleção de colunas e CSV/XLSX resumido ou detalhado por pessoa.
- Financeiro: presentes individuais e cotas com convidado, status, valor e data, com seleção de colunas e CSV/XLSX.
- Pendências: RSVPs sem resposta, reservas e pagamentos que ainda precisam de ação, com seleção de colunas e CSV/XLSX.

Cada área possui:

- Campo de busca.
- Selects para filtros específicos da tela.
- Cabeçalhos clicáveis nas principais colunas de dados.
- Indicador visual de ordenação ascendente ou descendente.
- Contador no formato `N itens` ou `N de T itens`.
- Botão `Limpar filtros`.

O fluxo de exibição é:

```text
dados carregados -> filtros -> ordenação -> renderização da tabela
```

As tabelas exibem uma mensagem de estado vazio quando nenhum registro corresponde aos filtros selecionados.

## Segurança Atual

O sistema usa:

- Supabase Auth com sessão anônima para convidados.
- Edge Function `claim-invite` para validar o código e vincular a sessão ao convite.
- Supabase Auth com e-mail e senha para administradores.
- Controle administrativo por `admin_users` e `is_admin()`.
- RLS para isolamento dos dados por convidado e proteção das operações administrativas.
- RPCs restritas para RSVP, reservas, cotas e informações de pagamento.
- Limitação de tentativas por sessão anônima e hash protegido do endereço de rede.
- Cloudflare Turnstile validado pelo Supabase Auth nos logins administrativo e de convidados.

## Limitações Atuais

- Contas anônimas e tentativas antigas ainda não possuem limpeza periódica automatizada.
- A Content Security Policy e as dependências externas ainda precisam de revisão final.
- Os códigos de convite ainda devem ser rotacionados antes da publicação definitiva.
- Comprovantes são enviados por WhatsApp, não armazenados no sistema.
- O provedor de cartão ainda depende de URL externa configurada manualmente.
- O QR Code PIX depende do serviço externo `api.qrserver.com`.
- A confirmação final de pagamentos ainda depende de conferência administrativa.

## Melhorias Futuras

- Automatizar a limpeza de contas anônimas e tentativas antigas.
- Revisar CSP, dependências CDN e usos de `innerHTML`.
- Upload de comprovantes no sistema.
- Relatórios avançados por período ou fornecedor.
- Indicadores financeiros avançados por período ou forma de pagamento.
- Integração real com gateway de pagamento.

## Status Atual

Concluído:

- Autenticação por convite.
- RSVP individual e casal.
- Acompanhantes e crianças.
- Lista de presentes.
- Presentes por cotas via PIX.
- PIX com payload e QR Code.
- Compra online e loja física.
- Painel administrativo separado.
- Dashboard administrativo com gráfico de distribuição de RSVPs.
- Dashboard com métricas de pagantes e crianças para o buffet.
- Dashboard financeiro com valores da lista, reservados, disponíveis, informados, confirmados e pendentes, incluindo gráficos de distribuição.
- Filtros administrativos com ordenação, contadores e limpeza.
- Exportação CSV de presentes, convidados e RSVPs.
- Relatórios consolidados no dashboard.
- Login administrativo com e-mail e senha pelo Supabase Auth.
- Login de convidados com sessão anônima e Edge Function.
- RLS e RPCs restritas para isolamento por convite.
- Limitação de tentativas no login por código.
- Guia completo de reconstrução do ambiente Supabase.
- Helpers `admin-common.js` e `public-common.js`.
- Módulo `pix.js`.
- CSS com tokens globais.

Em desenvolvimento:

- Endurecimentos adicionais de segurança antes da publicação definitiva.
- Relatórios avançados por período ou fornecedor.
- Upload interno de comprovantes.
