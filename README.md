# Aniversário da Livia

Site de convite e confirmação de presença desenvolvido para a comemoração dos **27 anos da Livia**.

## Sobre o projeto

O projeto oferece uma experiência privada para os convidados, com acesso por código individual, confirmação de presença e um painel administrativo para acompanhar a organização do evento.

O foco do site está nas informações da festa, no controle dos convites e no RSVP.

## Principais funcionalidades

- Página inicial responsiva com informações e contagem regressiva para a festa.
- Dados do evento centralizados em um único arquivo de configuração.
- Acesso privado por código de convite.
- Convites individuais e para casais.
- Controle da quantidade máxima de acompanhantes.
- Identificação de acompanhantes como criança ou não criança, sem classificação por idade.
- Confirmação ou recusa de presença.
- Cadastro de telefone, e-mail, restrições alimentares e mensagem para a aniversariante.
- Proteção do login com Cloudflare Turnstile e limitação de tentativas.
- Painel administrativo com dashboard, indicadores e atalhos.
- Gerenciamento de convidados, códigos, limites e status dos convites.
- Geração criptográfica dos códigos de convite diretamente no Supabase.
- Consulta, filtragem, ordenação e exclusão de RSVPs.
- Exportação de convidados e confirmações em CSV.
- Layout responsivo para computadores e dispositivos móveis.

## Tecnologias

- HTML5
- CSS3
- JavaScript Vanilla
- Supabase PostgreSQL
- Supabase Authentication
- Row Level Security (RLS)
- Funções RPC do PostgreSQL
- Supabase Edge Functions
- Cloudflare Turnstile

O projeto não depende de framework frontend nem de etapa de compilação.

## Páginas

| Arquivo | Finalidade |
| --- | --- |
| `index.html` | Apresentação do aniversário e informações da festa |
| `login.html` | Entrada do código de convite |
| `rsvp.html` | Confirmação de presença do convidado |
| `admin-login.html` | Autenticação administrativa |
| `admin-dashboard.html` | Visão geral e indicadores do evento |
| `admin-guests.html` | Gerenciamento dos convidados |
| `admin-rsvps.html` | Gerenciamento das confirmações |

## Configuração central do evento

As informações que podem mudar entre eventos ficam centralizadas em:

```text
js/event-config.js
```

Nesse arquivo podem ser alterados:

- Nome da aniversariante.
- Data de nascimento.
- Data e horário da festa.
- Fuso e deslocamento UTC.
- Prazo para confirmação.
- Nome e endereço do local.
- Cidade, estado e CEP.

A idade comemorada é calculada automaticamente a partir da data de nascimento e da data da festa. O mesmo arquivo também alimenta a página inicial, a contagem regressiva, o Google Maps e a identificação exibida no painel administrativo.

## Estrutura principal

```text
css/                         Estilos públicos, RSVP, login e Admin
docs/                        Scripts e instruções do Supabase
js/                          Configuração e lógica do frontend
supabase/functions/          Edge Function de acesso por convite
admin-*.html                 Páginas do painel administrativo
index.html                   Página inicial
login.html                   Acesso do convidado
rsvp.html                    Confirmação de presença
```

## Configuração do ambiente

1. Crie um projeto no Supabase.
2. Execute as instruções de [`docs/rebuild_runbook.md`](docs/rebuild_runbook.md).
3. Ative o login anônimo em **Authentication > Providers > Anonymous**.
4. Informe a URL do projeto e a chave pública em `js/supabase.js`.
5. Configure os secrets da função `claim-invite` usando `supabase/functions/.env.example` como referência.
6. Publique a Edge Function `claim-invite`.
7. Configure o Cloudflare Turnstile conforme [`docs/turnstile_setup.md`](docs/turnstile_setup.md).
8. Informe a Site Key pública em `js/captcha-config.js`.
9. Crie o usuário administrativo no Supabase Auth e vincule-o à tabela `admin_users`.
10. Confira a configuração do evento em `js/event-config.js`.

Para validar a instalação do banco, utilize [`docs/supabase_verify.sql`](docs/supabase_verify.sql).

## Execução local

Como o projeto é estático, ele pode ser servido por qualquer servidor HTTP local. Por exemplo:

```bash
npx serve .
```

Depois, acesse o endereço informado pelo servidor no navegador.

Abrir os arquivos diretamente com `file://` pode impedir alguns recursos de autenticação e requisições. Por isso, recomenda-se sempre usar um servidor HTTP.

## Segurança

- Nunca publique a `SUPABASE_SERVICE_ROLE_KEY` no frontend.
- Nunca exponha o secret do Cloudflare Turnstile.
- Nunca publique o pepper usado na limitação de tentativas.
- Apenas a chave pública `anon` do Supabase deve ficar no navegador.
- As permissões de acesso são protegidas por RLS e funções específicas do banco.
- O código de convite é validado pela Edge Function, sem acesso direto a operações privilegiadas.
- Novos códigos são gerados no banco por uma RPC restrita a administradores.

## Manutenção

Ao mudar a aniversariante, data, horário, prazo ou local, edite primeiro `js/event-config.js`. As informações visíveis do evento serão atualizadas automaticamente.

Alterações na estrutura do banco devem ser refletidas em:

- `docs/supabase_setup.sql`
- `docs/supabase_verify.sql`
- `docs/rebuild_runbook.md`

## Desenvolvedor

Desenvolvido por **Messias D. P. de M. Filho**.

GitHub: [@messiasfl10](https://github.com/messiasfl10/)

## Licença

Projeto de uso pessoal, desenvolvido especialmente para o aniversário de 27 anos da Livia, meu amor.
