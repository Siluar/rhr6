# Central de Recursos Humanos Umuarama — Gestão de Férias

Aplicação web estática (HTML, CSS e JavaScript, sem backend) para gestão de
férias e solicitações da Central de Recursos Humanos da Polícia Penal do
Paraná — Unidade Regional de Umuarama.

## Visão geral

O sistema permite:

- Entrada com conta Google (proprietários entram como administradores).
- Painel com visão geral, calendário de férias e tarefas.
- Solicitações de férias (pendentes, aprovadas e recusadas).
- Lançamento de férias e controle de saldos.
- Cadastro de servidores, dados e funções gratificadas.
- Relatórios por mês, ano, unidade e servidor.
- Licença-capacitação e licença especial.

Por padrão, os dados são mantidos no navegador (`localStorage` / `sessionStorage`).
Com o backend opcional do **Firebase** (seção abaixo), as solicitações são
compartilhadas entre todos os usuários via Firestore.

## Tecnologias

- HTML5, CSS3 e JavaScript (vanilla, sem framework/build).
- [Lucide](https://lucide.dev/) (ícones, via CDN).
- Google Fonts (DM Sans e Fraunces).

## Como executar

1. Dê duplo clique em `run-site.bat` (abre o `login.html` no navegador), **ou**
2. Abra `login.html` diretamente no navegador.

> Dica: como não há backend, um servidor local simples também funciona, por
> exemplo `python -m http.server` na pasta do projeto.

## Configuração

As configurações vêm de dois arquivos, carregados nesta ordem:

| Arquivo | Versionado? | Conteúdo |
|---|---|---|
| `config.js` | Sim | Valores públicos: `googleClientId`, `googleAdminEmails` |
| `config.local.js` | Não (`.gitignore`) | Segredos/overrides: `initialAdminPassword`, etc. |

| Chave | Onde | Descrição |
|---|---|---|
| `initialAdminPassword` | `config.local.js` | Senha inicial do administrador (usuário `centralrh`) |
| `googleClientId` | `config.js` | Client ID do Google OAuth (Web). Sem ele, o botão "Entrar com Google" não aparece |
| `googleAdminEmails` | `config.js` | E-mails do Google com acesso de administrador (proprietários) |

1. Copie `config.local.example.js` para `config.local.js`.
2. Ajuste os valores necessários.

Sem `config.local.js`, o login administrativo com senha padrão fica
desabilitado (não há senha padrão) — o acesso de admin continua possível pelo
login com Google.

### Entrar com Google

O botão usa o **Google Identity Services** (fluxo client-side, sem backend).
Após o login, o e-mail verificado é comparado com `googleAdminEmails`: se
estiver na lista, a sessão vira administrador; caso contrário, usuário comum.

Para funcionar, é preciso:

- Um **Client ID OAuth** (tipo "Aplicativo da Web") no Google Cloud Console.
- As **Origens JavaScript autorizadas** com a URL onde o site é servido
  (ex.: `http://localhost:8000`, `https://siluar.github.io`).

## Backend opcional (Firebase)

Por padrão o app funciona só com o armazenamento local do navegador — ou seja,
cada navegador vê apenas os seus próprios dados. Para que as **solicitações
enviadas por outras pessoas cheguem ao painel do administrador**, é preciso um
backend compartilhado. O projeto já vem com suporte ao **Firebase (Auth +
Firestore)**, ativado apenas quando `window.RH_CONFIG.firebase` está preenchido
em `config.js`. Sem essa configuração, tudo continua funcionando localmente.

Como ativar:

1. Crie um projeto no **https://console.firebase.google.com/**.
2. **Build → Firestore Database → Criar banco de dados** (modo produção).
3. **Build → Authentication → Vamos começar → Google** (habilitar provedor).
4. **Configurações do projeto → Seus apps → Web** e copie o `firebaseConfig`.
5. Cole esse objeto em `config.js`, na chave `firebase`.
6. Em **Firestore → Regras**, cole o conteúdo de `firestore.rules` e publique.
7. Em **Authentication → Configurações → Domínios autorizados**, adicione os
   domínios do site (ex.: `siluar.github.io`, `rhr6.vercel.app`, `localhost`).

Depois disso:
- O login com Google também autentica no Firebase.
- O acesso administrativo passa a ser **exclusivamente pelo Google**: a senha do
  usuário `centralrh` deixa de valer e a tela orienta a usar "Entrar com Google".
- As solicitações são gravadas na coleção `requests`.
- O painel do admin lê em tempo real (`onSnapshot`): o que o usuário envia
  aparece para o administrador.

> Regras (`firestore.rules`): qualquer usuário autenticado pode ler/criar
> solicitações; apenas os e-mails de `isAdmin()` (proprietários) podem aprovar,
> editar ou apagar.

## Publicação (GitHub Pages)

O site pode ser publicado diretamente do repositório via **GitHub Pages**
(branch `main`, raiz `/`):

- URL: `https://siluar.github.io/rhr6/`
- O login com Google exige que a origem `https://siluar.github.io` esteja nas
  **Origens JavaScript autorizadas** do Client ID no Google Cloud.
- Nesse modo **não** há senha padrão de administrador (`config.local.js` não é
  publicado); o acesso admin é pelo login com Google do e-mail autorizado.

## Estrutura

| Arquivo | Descrição |
|---|---|
| `login.html`, `login.css`, `login.js` | Tela e lógica de autenticação |
| `index.html`, `styles.css`, `app.js` | Aplicação principal (painel/gestão) |
| `solicitacao-ferias.html` | Fluxo de solicitação de férias |
| `recusada.html` | Tela de solicitação recusada |
| `intranet.html` | Página da intranet |
| `brasao_ok.png` | Brasão institucional |
| `config.js` | Configuração pública (Client ID do Google, e-mails admin, Firebase) |
| `config.local.js` | Configuração local/secreta: senha do admin (não versionada) |
| `config.local.example.js` | Modelo da configuração local |
| `firebase-sync.js` | Camada de sincronização com o Firestore (backend opcional) |
| `firestore.rules` | Regras de segurança do Firestore |
| `run-site.bat` | Atalho para iniciar o site no Windows |
| `VS- CODE.code-workspace` | Workspace do VS Code |

## Aviso

Projeto de uso interno/institucional. A autenticação é **local e de
demonstração** e não deve ser usada como controle de segurança em produção.
O login com Google confirma o e-mail, mas o perfil (admin/usuário) é decidido
no navegador, portanto não é um controle de acesso seguro.
