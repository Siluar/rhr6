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
- Lançamento das licenças prêmio, capacitação e médica e de outros tipos, com o
  mesmo formulário do lançamento de férias (aba **Solicitações** do painel).
- Cadastro de servidores, dados e funções gratificadas.
- Relatórios por mês, ano, unidade e servidor.
- Relatório de solicitações com filtros de categoria (Férias, Licenças e Outros), status, tipo, ano e servidor.
- Relatórios de licenças concedidas: prêmio, capacitação e médica.
- **Backup**: exportar/restaurar todos os dados em um arquivo `.json` (menu **Backup**).
- **Avisos**: sino no topo com a contagem de solicitações pendentes (clique abre a
  lista).
- **Calendário**: abre sempre no mês atual e a escala de plantão (equipes e
  rotação) é configurável em `config.js`, sem mexer no código.
- **Formulário de solicitação**: lista as unidades cadastradas na nuvem e avisa
  (sem bloquear) quando outra pessoa da mesma equipe já pediu o mesmo período.
  A pergunta **"Possui Função Gratificada?"** (Sim/Não) aparece em **todos os
  tipos** de solicitação — férias, licença prêmio, capacitação, médica e outras —
  e, com "Sim", pede a **Função exercida** (lista vinda do Cadastro de Funções
  Gratificadas, com reserva em `config.js`)
  e o **Substituto**.

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
| `escala` | Escala de plantão: `equipes` (ordem da rotação), `dataBase` (AAAA-MM-DD em que a 1ª equipe está de serviço) e `cicloDias` (ex.: `4` = 24h de serviço + 72h de descanso). Ajuste aqui quando a escala mudar |
| `notificationEmails` | Destinatários das solicitações (`To`). O solicitante vai em cópia (`CC`) |
| `fgFunctions` | Lista **reserva** das funções gratificadas (Coordenador, Diretor, Chefe Administrativo, Chefe de Segurança). Na prática a lista vem do **Cadastro de Funções Gratificadas** (coleção `funcoesGratificadas`); este valor só é usado enquanto o cadastro estiver vazio |
| `emailjs` | Chaves opcionais do EmailJS para envio automático de e-mail (vazio = só abre o rascunho) |
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
  disponíveis apenas no navegador onde foram anexados. O submenu traz
  **Lançar férias** e os lançamentos de **licença prêmio**, **capacitação**,
  **médica** e **outros** — todos com o mesmo formulário (servidor com busca,
  período, observação e bloco de Função Gratificada), mudando apenas o tipo
  gravado — seguidos dos filtros que listam as solicitações de cada tipo em
  qualquer situação.
- **Servidores** — o cadastro de dados dos servidores é sincronizado com a
  coleção `servidores`; o **Cadastro de Servidores com Função Gratificada** usa
  a coleção `fgServidores` (a guia "Cadastro de Login", obsoleta com o acesso
  só-Google, foi removida do menu). As tarefas do painel ficam em `tarefas`.
  O botão **"Importar Excel"** lê uma planilha `.xlsx`, `.xls` ou `.csv` e
  cadastra os servidores de uma vez: as colunas são reconhecidas **pelo título,
  em qualquer ordem** (Servidor, E-mail, CPF, RG, Telefone, Quadro, Função,
  Unidade e, se houver, Data de nascimento e Função Gratificada), procurando a
  linha de títulos no começo da planilha — pode haver um título antes.
  Unidades, funções e quadros que ainda não existirem são criados
  automaticamente, e quem já está cadastrado (mesmo CPF ou e-mail) é **pulado**.
  **Só o nome é obrigatório:** linhas com outros campos em branco entram mesmo
  assim e o que ficou faltando é listado em *"Ver o que precisa de atenção"*,
  para completar depois pela edição (o cadastro manual também só exige o nome).
  A busca do cadastro procura em nome, CPF, RG, e-mail, telefone, quadro,
  função e unidade.
  No **Cadastro de Servidores com Função Gratificada** cada entrada guarda a
  **Função exercida**, escolhida entre as funções do **Cadastro de Funções
  Gratificadas** (ver abaixo), que pode ser trocada direto na tabela; o painel
  tem busca na lista (nome, CPF, unidade ou função) e busca no seletor de
  servidores. A mesma lista alimenta o formulário de solicitações e o painel
  **Lançar período de férias**.

  A **Função exercida** aparece em todos os relatórios do painel — Protocolos
  F.G, licença prêmio, licença capacitação, licença médica e o Relatório de
  solicitações (todos os tipos) — inclusive nas exportações CSV/PDF, que saem
  da própria tabela. Quando a solicitação não traz a função, ela é buscada no
  cadastro de Função Gratificada (pelo CPF ou pelo nome), de modo que os pedidos
  antigos também aparecem classificados.
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
- **Cadastro de Funções Gratificadas** — item **Funções Gratificadas** na barra
  lateral para criar, editar e excluir as funções gratificadas (coleção
  `funcoesGratificadas`), com **observações** opcionais. Esta é a lista de
  referência que **alimenta todos os seletores de "Função exercida"**: o
  Cadastro de Servidores com Função Gratificada, o painel **Lançar período de
  férias** (e as demais telas de lançamento) e o formulário de solicitação (que lê a lista direto da coleção
  pública). A coluna **Em uso** mostra quantos servidores estão com aquela
  função; uma função em uso não pode ser excluída e **renomear atualiza em
  cascata** quem já a usa no cadastro de F.G. A ordem pode ser ajustada com as
  setas ↑↓ de cada linha e há importação em lote pelo botão **"Colar lista"**
  (uma função por linha). Na primeira abertura a lista vem pré-populada com
  Coordenador, Diretor, Chefe Administrativo e Chefe de Segurança (as mesmas de
  `config.js`, usadas só como reserva quando o cadastro está vazio).
- **Usuários & Acessos** — nova seção no menu (reproduz o item "GESTÃO") para
  gerenciar quem pode entrar com o Google: nome, e-mail, perfil (usuário ou
  administrador) e situação (ativo/inativo/pendente), na coleção `usuarios`.
  Quem entra pela primeira vez aparece como **Pendente** e pode ser liberado
  (**Permitir**) ou barrado (**Negar**) com um clique; um e-mail **inativo** é
  bloqueado no login. Todos os usuários — inclusive os e-mails proprietários —
  podem ser editados, ter o perfil trocado ou ser removidos. A segurança de fundo
  continua firme: os proprietários (`googleAdminEmails`) sempre são tratados
  como administradores pelo login e pelas regras do Firestore.
- **Backup** — item na barra lateral para **exportar** todos os dados
  (solicitações, servidores, usuários, unidades, cargos, quadros, funções
  gratificadas, função gratificada e tarefas) num único arquivo `.json`, e **restaurar** a partir
  desse arquivo. A restauração **atualiza/mescla** os registros com o mesmo
  identificador — ela não apaga o que não estiver no backup. Guarde o arquivo em
  local seguro (Drive, e-mail, pendrive).
- **Avisos no topo** — o sino mostra a quantidade de solicitações **pendentes** e,
  ao ser clicado, abre a lista de pendentes. O número some quando não há nada
  pendente.

> Regras (`firestore.rules`): a leitura/criação de solicitações é liberada apenas
> para **usuários aprovados** (`isApproved()` = proprietário **ou** usuário ativo
> na coleção `usuarios`); apenas `isAdmin()` (proprietários **ou** usuários com
> perfil `admin` e ativos) pode aprovar, editar, apagar ou gerenciar os
> cadastros. A **criação** de solicitações ainda passa por validação
> (`isValidRequest()`): exige o campo `person` e limita o tamanho dos campos
> livres, evitando documentos gigantes ou malformados. As coleções `unidades` e
> `funcoesGratificadas` podem
> ser **lidas por qualquer pessoa** (o formulário de solicitação precisa das
> listas mesmo antes do login), mas só o admin escreve. O `get` de `usuarios` é restrito ao **próprio
> e-mail** (necessário no login) ou a um proprietário — um usuário comum não lê o
> cadastro alheio. A autoinscrição é permitida somente para o próprio e-mail e
> apenas como `ativo: false` / `pendente: true` / perfil `usuario` — ninguém
> consegue se auto-aprovar. As coleções `servidores`, `unidades`, `cargos`,
> `funcoesGratificadas`, `usuarios`, `fgServidores`, `tarefas`, `anexos` e
> `contasLegado` são
> protegidas. **Publique estas regras** (console ou `firebase deploy --only
> firestore:rules`) para que a validação, a leitura de `unidades` e o bloqueio
> por situação funcionem na nuvem.

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
cargos, quadros, funções gratificadas e contas legadas são relidos/gravados a cada abertura e em cada
edição. Ícones e listas de referência são atualizados uma única vez por ciclo de
renderização, e as buscas usam *debounce*.

> Na página de solicitação, se a gravação na nuvem falhar, o usuário recebe um
> aviso em vermelho (a solicitação continua registrada no navegador e é enviada
> para a nuvem na próxima abertura do painel).

### Acesso ao painel (guarda do cliente)

O painel (`index.html`) tem duas barreiras de acesso:

1. Uma verificação rápida em `sessionStorage` (evita um "piscar" da tela).
2. Com o Firebase ativo, uma **verificação real**: espera a sessão do Google e
   confere no Firestore se o e-mail tem perfil `admin` (ou é um proprietário).
   Só então o painel aparece; caso contrário, redireciona para a solicitação ou
   para o login.

> **Importante:** isso é uma barreira de **conveniência**. Como o app é estático,
> qualquer verificação no navegador pode ser burlada por quem editar o código.
> A **proteção real** dos dados está nas **regras do Firestore** (`firestore.rules`),
> que valem independentemente do que o cliente faz. Não confie na guarda do
> cliente como controle de segurança.

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
| `login.html`, `login.css`, `login.js` | Tela e lógica de autenticação (somente Google) |
| `index.html`, `styles.css`, `app.js` | Aplicação principal (painel/gestão) |
| `solicitacao-ferias.html` | Fluxo de solicitação de férias |
| `recusada.html` | Tela de solicitação recusada |
| `logic.js` | Funções puras (datas, escala de plantão, sobreposição) usadas pelo painel e testáveis |
| `brasao_ok.png` | Brasão institucional |
| `config.js` | Configuração pública (Google, e-mails, escala, Firebase) |
| `config.local.js` | Configuração local/secreta, **não carregada** pelas páginas (não versionada) |
| `config.local.example.js` | Modelo da configuração local (referência) |
| `firebase-sync.js` | Camada de sincronização com o Firestore (backend opcional) |
| `firestore.rules` | Regras de segurança do Firestore |
| `package.json` | Scripts de teste (dependência de desenvolvimento: `jsdom`) |
| `package-lock.json` | Versões travadas das dependências de teste |
| `test/` | Testes automatizados (`node --test`) |
| `.github/workflows/test.yml` | CI: instala as dependências e roda os testes a cada push/PR |
| `run-site.bat` | Atalho para iniciar o site no Windows |
| `VS- CODE.code-workspace` | Workspace do VS Code |

## Testes

A única dependência é o **`jsdom`** (apenas para desenvolvimento — não vai para o
site). Com o **Node.js 22+** (o `jsdom` exige Node 22.22+/24+):

```bash
npm install     # instala o jsdom (uma vez)
npm test        # ou: node --test test/logic.test.js test/smoke.test.js test/crud.test.js
```

- `test/logic.test.js` — funções puras (formatação de datas, escala de plantão e
  detecção de sobreposição de períodos).
- `test/smoke.test.js` — verifica a sintaxe dos scripts e invariantes do projeto
  (ex.: o calendário abre no mês atual; o login legado foi removido; as regras do
  Firestore aplicam as melhorias).
- `test/crud.test.js` — testes **ponta a ponta** do CRUD. Carrega o `index.html`
  real dentro do `jsdom`, injeta um Firestore falso em memória (mesma API do
  `window.RH_SYNC`) e interage com a tela como um usuário: cria, lê, edita e
  exclui **unidades, cargos, quadros, funções gratificadas, servidores, usuários,
  tarefas e Função
  Gratificada**, lança/edita/exclui **solicitações**, confere o **sino** de
  pendentes, o **calendário** (mês atual e alinhamento do 1º dia) e o
  **backup** (exportar/restaurar). Também valida as travas (não excluir
  unidade/cargo/quadro/função gratificada em uso; recusar CPF repetido, quadro
  incompatível, período
  inválido e férias sobrepostas).

> Estes testes rodam sem navegador e sem o Firebase de verdade. O login do Google
> e a gravação real no Firestore continuam exigindo um teste manual no navegador.

O workflow em `.github/workflows/test.yml` roda os testes automaticamente no
GitHub a cada `push`/`pull request` para a branch `main`.

## Legado

Com o acesso **exclusivamente pelo Google**:

- O **login por CPF/senha** (`submitCredentials` + `serverAccounts`) foi
  **removido** de `login.js`, e o arquivo `intranet.html` (órfão) foi **excluído**.
  Restou apenas o fluxo do Google.
- O botão/diálogo **Alterar senha** no painel é o último vestígio do fluxo antigo:
  compara a senha atual com `window.RH_CONFIG.initialAdminPassword` (hoje vazio)
  ou com um hash salvo no navegador. Não afeta o login por Google e pode ser
  removido numa limpeza futura.
- A visão **Equipe** é montada a partir dos servidores cadastrados (não há mais
  nomes fictícios); como não há item no menu, ela é acessível pela busca global.

## Aviso

Projeto de uso interno/institucional. A autenticação é feita pelo **Google**, mas
o perfil (admin/usuário) é decidido no cliente (com apoio das regras do
Firestore, que são o controle efetivo). A guarda do painel é uma barreira de
conveniência, não um controle de segurança absoluto.
