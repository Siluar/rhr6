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
- Relatório de solicitações com filtros de categoria (Férias, Licenças e Outros), status, tipo, ano e servidor.
- Relatórios de licenças concedidas: prêmio, capacitação e médica.

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

Toda a configuração fica em `config.js` (versionado):

| Chave | Descrição |
|---|---|
| `googleClientId` | Client ID do Google OAuth (Web). Usado só no fluxo antigo do Google Identity Services, quando o Firebase não está configurado |
| `googleAdminEmails` | E-mails do Google com acesso de administrador (proprietários) |
| `firebase` | Objeto `firebaseConfig`; quando preenchido, liga o backend (Auth + Firestore) |

> `config.local.js` **não é mais carregado automaticamente** pelas páginas: por
> não ser versionado, ele retornava 404 no site publicado. O login
> administrativo é feito exclusivamente pelo Google. O arquivo
> `config.local.example.js` fica apenas como referência.

### Entrar com Google

- **Com Firebase configurado** (recomendado): o botão usa o login Google nativo
  do Firebase (popup, `signInWithPopup`), o que dispensa o Client ID do GIS e
  evita o erro `origin_mismatch`.
- **Sem Firebase**: usa o **Google Identity Services** (fluxo client-side) com o
  `googleClientId`.

Após o login, o e-mail verificado é comparado com `googleAdminEmails`: se estiver
na lista, a sessão vira administrador; caso contrário, valem a coleção `usuarios`
do Firestore (perfil e situação). Quando o Firebase está ativo, um e-mail que
**entra pela primeira vez** é gravado como **pendente** (inativo) e a sessão é
encerrada na hora: a pessoa só acessa depois que um administrador **permite** o
acesso em *Usuários & Acessos*. Se o administrador **negar**, o e-mail fica
bloqueado. Para funcionar, é preciso:

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
   Alternativa por linha de comando (com o Firebase CLI autenticado): o projeto
   já inclui `firebase.json` e `.firebaserc`, então basta rodar
   `firebase deploy --only firestore:rules --project rhr6-5b275` (o
   `--project` evita publicar no projeto que o CLI tenha como ativo na máquina).
7. Em **Authentication → Configurações → Domínios autorizados**, adicione os
   domínios do site (ex.: `siluar.github.io`, `rhr6.vercel.app`, `localhost`).

Depois disso:
- O login com Google também autentica no Firebase.
- O acesso administrativo passa a ser **exclusivamente pelo Google**: a senha do
  usuário `centralrh` deixa de valer e a tela orienta a usar "Entrar com Google".
- As solicitações são gravadas na coleção `requests`.
- O painel do admin lê em tempo real (`onSnapshot`): o que o usuário envia
  aparece para o administrador.

### CRUD no painel do administrador

Com o Firebase ativo, o painel ganha uma gestão **completa** (criar, ler,
editar e excluir), persistida nas coleções do Firestore:

- **Solicitações** — além de aprovar/recusar, o admin pode **editar** os dados
  de um pedido ou **excluí-lo** (coleção `requests`). O arquivo anexado na
  recusa é gravado na coleção `anexos` (em base64, até **700 KB** por arquivo)
  e recuperado de lá em qualquer computador; arquivos maiores continuam
  disponíveis apenas no navegador onde foram anexados.
- **Servidores** — o cadastro de dados dos servidores é sincronizado com a
  coleção `servidores`; o **Cadastro de Servidores com Função Gratificada** usa
  a coleção `fgServidores` (a guia "Cadastro de Login", obsoleta com o acesso
  só-Google, foi removida do menu). As tarefas do painel ficam em `tarefas`.
- **Cadastro de Unidades** — item **Unidades** próprio na barra lateral para
  criar, editar e excluir as unidades penais (coleção `unidades`). As unidades
  cadastradas alimentam o select "Unidade Penal" do formulário de dados dos
  servidores e aparecem nos relatórios. Vem pré-populada com as unidades da
  região. Unidades em uso não podem ser excluídas, e renomear atualiza em
  cascata os servidores.
  A ordem da lista pode ser ajustada com as setas ↑↓ de cada linha, e há
  importação em lote pelo botão **"Colar lista"** (uma unidade por linha).
- **Cadastro de Cargos** — item **Cargos** próprio na barra lateral para criar,
  editar e excluir os cargos (coleção `cargos`). Cada cargo pode indicar o
  **quadro padrão** (escolhido entre os quadros do Cadastro de Quadros), que
  preenche automaticamente o campo Quadro no formulário de dados, e
  **observações** opcionais. O select "Cargo" do formulário passa a ser
  alimentado por este cadastro. Vale a mesma proteção:
  cargos em uso não podem ser excluídos e renomear atualiza os servidores.
  A ordem da lista pode ser ajustada com as setas ↑↓ de cada linha, e há
  importação em lote pelo botão **"Colar lista"** (formato opcional
  `Nome;Quadro`).
- **Cadastro de Quadros** — item **Quadros** na barra lateral para criar,
  editar e excluir os quadros (coleção `quadros`), com **observações**
  opcionais. Os quadros cadastrados alimentam o select "Quadro" do formulário
  de dados dos servidores e o select "Quadro padrão" dos cargos. Um quadro em
  uso por algum cargo não pode ser excluído; renomear atualiza em cascata os
  cargos e os servidores. A ordem também pode ser ajustada com as setas ↑↓ e há
  importação em lote pelo botão **"Colar lista"**.
- **Usuários & Acessos** — nova seção no menu (reproduz o item "GESTÃO") para
  gerenciar quem pode entrar com o Google: nome, e-mail, perfil (usuário ou
  administrador) e situação (ativo/inativo/pendente), na coleção `usuarios`.
  Quem entra pela primeira vez aparece como **Pendente** e pode ser liberado
  (**Permitir**) ou barrado (**Negar**) com um clique; um e-mail **inativo** é
  bloqueado no login. Todos os usuários — inclusive os e-mails proprietários —
  podem ser editados, ter o perfil trocado ou ser removidos. A segurança de fundo
  continua firme: os proprietários (`googleAdminEmails`) sempre são tratados
  como administradores pelo login e pelas regras do Firestore.

> Regras (`firestore.rules`): a leitura/criação de solicitações é liberada apenas
> para **usuários aprovados** (`isApproved()` = proprietário **ou** usuário ativo
> na coleção `usuarios`); apenas `isAdmin()` (proprietários **ou** usuários com
> perfil `admin` e ativos) pode aprovar, editar, apagar ou gerenciar os
> cadastros. A autoinscrição é permitida somente para o próprio e-mail e apenas
> como `ativo: false` / `pendente: true` / perfil `usuario` — ninguém consegue se
> auto-aprovar. As coleções `servidores`, `unidades`, `cargos`, `quadros`,
> `usuarios`, `fgServidores`, `tarefas`, `anexos` e `contasLegado` são
> protegidas. **Publique estas regras no console** para que a autoinscrição de
> pendentes e o bloqueio por situação funcionem na nuvem.

As gravações no Firestore são **imediatas e incrementais**: cada alteração feita
no painel é enviada na hora (somente os documentos que mudaram, em lotes de até
400 escritas — o que evita o limite de 500 por batch e reduz o tráfego).
Exclusões também chegam à nuvem (o documento é apagado quando o item sai da
lista no painel). O cabeçalho mostra o estado da nuvem: *Salvando na nuvem…*,
*Salvo na nuvem às HH:MM* ou *Sem conexão com a nuvem — tentando de novo…*.

Se um envio falhar (sem internet, por exemplo), **nada é perdido**: a coleção
entra numa fila e é reenviada sozinha quando a conexão volta, quando a aba volta
ao foco e a cada 15 segundos. O retrato do que já foi gravado fica salvo no
navegador (`brisa-firestore-sync-state-v1`), o que também permite distinguir
"nunca subiu" (precisa enviar) de "foi excluído em outro computador" (precisa
sair daqui também).

Solicitações, usuários, cadastro de servidores, tarefas e Função Gratificada
ficam **ligados ao Firestore em tempo real** (`onSnapshot`): o que muda em outro
computador aparece na tela na hora, sem recarregar. Ao abrir o painel, os
cadastros da nuvem são unidos ao que existir apenas naquele navegador — nada é
descartado só porque o outro computador ainda não tinha o registro. Unidades,
cargos, quadros e contas legadas são relidos/gravados a cada abertura e em cada
edição. Ícones e listas de referência são atualizados uma única vez por ciclo de
renderização, e as buscas usam *debounce*.

> Na página de solicitação, se a gravação na nuvem falhar, o usuário recebe um
> aviso em vermelho (a solicitação continua registrada no navegador e é enviada
> para a nuvem na próxima abertura do painel).

> As contas antigas de **CPF/senha** (`contasLegado`) e a senha administrativa
> local seguem sendo dados legados: as contas ficam na nuvem apenas como cópia de
> segurança (a cópia local tem prioridade, porque é nela que a senha é alterada) e
> a senha administrativa continua apenas no navegador, já que o acesso
> administrativo é exclusivamente pelo Google. Tarefas, anexos e o cadastro de
> Função Gratificada agora também vão para a nuvem.

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
| `intranet.html` | Página da intranet (legado) |
| `brasao_ok.png` | Brasão institucional |
| `config.js` | Configuração pública (Client ID do Google, e-mails admin, Firebase) |
| `config.local.js` | Configuração local/secreta, **não carregada** pelas páginas (não versionada) |
| `config.local.example.js` | Modelo da configuração local (referência) |
| `firebase-sync.js` | Camada de sincronização com o Firestore (backend opcional) |
| `firestore.rules` | Regras de segurança do Firestore |
| `run-site.bat` | Atalho para iniciar o site no Windows |
| `VS- CODE.code-workspace` | Workspace do VS Code |

## Legado

Com o acesso **exclusivamente pelo Google**, alguns trechos antigos são mantidos
apenas por compatibilidade e **não** fazem parte do fluxo atual:

- `intranet.html` (órfã, nenhuma página aponta para ela) usa o login por
  CPF/senha de `login.js` (`submitCredentials` + `serverAccounts`). Com o
  Firebase ativo esse caminho é bloqueado.
- O botão/diálogo **Alterar senha** no painel é legado: compara a senha atual com
  `window.RH_CONFIG.initialAdminPassword` (hoje vazio) ou com um hash salvo no
  navegador.
- A visão **Equipe** é montada a partir dos servidores cadastrados (não há mais
  nomes fictícios); como não há item no menu, ela é acessível pela busca global.

## Aviso

Projeto de uso interno/institucional. A autenticação é **local e de
demonstração** e não deve ser usada como controle de segurança em produção.
O login com Google confirma o e-mail, mas o perfil (admin/usuário) é decidido
no navegador, portanto não é um controle de acesso seguro.
