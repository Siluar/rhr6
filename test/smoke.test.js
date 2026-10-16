/*
 * Teste de "fumaça": verifica invariantes do projeto (arquivos, marcações e
 * sintaxe dos scripts) que quebrariam silenciosamente numa alteração futura.
 * Não substitui um teste no navegador — é uma rede de segurança rápida.
 *
 * Rode com:  node --test test/smoke.test.js
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const exists = file => fs.existsSync(path.join(root, file));

test("scripts JavaScript passam na verificação de sintaxe do Node", () => {
  const scripts = ["app.js", "config.js", "config.local.example.js", "firebase-sync.js", "logic.js", "login.js"];
  for (const script of scripts) {
    assert.doesNotThrow(
      () => execFileSync(process.execPath, ["--check", path.join(root, script)], { stdio: "pipe" }),
      `${script} tem erro de sintaxe`
    );
  }
});

test("o login legado por CPF/senha foi removido", () => {
  const login = read("login.js");
  assert.ok(!login.includes("submitCredentials"), "login.js ainda tem submitCredentials");
  assert.ok(!login.includes("hashServerPassword"), "login.js ainda tem hashServerPassword");
  assert.ok(!login.includes("intranet.html"), "login.js ainda referencia intranet.html");
  assert.ok(!exists("intranet.html"), "intranet.html ainda existe");
});

test("a alteração de senha (fluxo legado) foi removida das páginas", () => {
  const app = read("app.js");
  assert.ok(!app.includes("hashServerPassword"), "app.js ainda tem hashServerPassword");
  assert.ok(!app.includes("adminPasswordStorageKey"), "app.js ainda guarda a senha do admin");
  assert.ok(!app.includes("open-password-change"), "app.js ainda trata o botão de senha");
  // A classe .account-password-dialog é reaproveitada por outros diálogos, então
  // conferimos os identificadores próprios do fluxo de senha em cada página.
  for (const file of ["index.html", "recusada.html", "solicitacao-ferias.html"]) {
    const html = read(file);
    assert.ok(!html.includes('id="account-password-dialog"'), `${file} ainda tem o diálogo de senha`);
    assert.ok(!html.includes('id="account-password-form"'), `${file} ainda tem o formulário de senha`);
    assert.ok(!html.includes('id="open-password-change"'), `${file} ainda tem o botão "Alterar senha"`);
    assert.ok(!html.includes('id="account-current-password"'), `${file} ainda tem o campo de senha atual`);
  }
});

test("o calendário abre no mês atual", () => {
  const app = read("app.js");
  assert.ok(app.includes("let shownMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);"),
    "shownMonth deve iniciar no mês atual");
  assert.ok(!app.includes("let shownMonth = new Date(2026, 9, 1);"),
    "shownMonth não deve mais ficar fixo em outubro/2026");
});

test("a escala é configurável (config.js) e usada por logic.js", () => {
  const config = read("config.js");
  const logic = read("logic.js");
  const app = read("app.js");
  assert.ok(config.includes("escala:"), "config.js deve expor a escala");
  assert.ok(config.includes("dataBase:"), "config.js deve expor a data-base da escala");
  assert.ok(logic.includes("getShiftTeamForDate"), "logic.js deve definir getShiftTeamForDate");
  assert.ok(app.includes("window.RH_LOGIC && window.RH_LOGIC.getShiftTeamForDate"),
    "app.js deve delegar a escala para logic.js");
});

test("logic.js é carregado no painel antes do app.js", () => {
  const html = read("index.html");
  const logicIndex = html.indexOf('src="logic.js"');
  const appIndex = html.indexOf('src="app.js"');
  assert.ok(logicIndex > -1, "index.html deve incluir logic.js");
  assert.ok(appIndex > -1 && logicIndex < appIndex, "logic.js deve vir antes de app.js");
});

test("o painel tem a guarda baseada no Firebase", () => {
  const html = read("index.html");
  assert.ok(html.includes("RH_SYNC.waitForAuth"), "index.html deve verificar a sessão do Firebase");
});

test("o painel tem a área de backup e o sino com contagem", () => {
  const html = read("index.html");
  const app = read("app.js");
  assert.ok(html.includes('id="view-backup"'), "falta o painel view-backup");
  assert.ok(html.includes('id="export-backup"'), "falta o botão export-backup");
  assert.ok(html.includes('id="import-backup"'), "falta o input import-backup");
  assert.ok(html.includes('id="notification-badge"'), "falta o badge do sino");
  assert.ok(app.includes("function exportBackup") && app.includes("function importBackup"),
    "app.js deve implementar export/import de backup");
  assert.ok(app.includes("backupCollections"), "app.js deve definir backupCollections");
});

test("o formulário usa as unidades da nuvem e avisa sobre conflitos", () => {
  const html = read("solicitacao-ferias.html");
  assert.ok(html.includes("populateUnidades"), "falta a carga dinâmica de unidades");
  assert.ok(html.includes("loadUnidadesFromCache"), "falta a reserva local das unidades");
  assert.ok(html.includes("checkScheduleConflict"), "falta o aviso de conflito");
  assert.ok(html.includes('id="conflict-warning"'), "falta o elemento de aviso de conflito");
  // O envio de e-mail foi removido: a solicitação só é registrada no sistema.
  assert.ok(!html.includes("mailto:"), "o formulário não deve mais abrir rascunho de e-mail (mailto:)");
  assert.ok(!html.includes("submit-fallback"), "não deve haver mais o bloco de fallback de e-mail");
  assert.ok(!html.includes("emailjs"), "não deve haver mais o envio automático por EmailJS");
  assert.ok(html.includes("Solicitação registrada com sucesso"), "deve confirmar o registro na tela");
});

test("as regras do Firestore aplicam as melhorias de segurança", () => {
  const rules = read("firestore.rules");
  assert.ok(rules.includes("isValidRequest"), "requests devem ter validação de criação");
  assert.ok(rules.includes("optionalBoundedString"), "falta o limitador de tamanho de campos");
  assert.ok(rules.includes("email == request.auth.token.email || isOwner()"),
    "o get de usuarios deve ser restrito ao próprio usuário ou dono");
  // E-mail institucional: qualquer conta @policiapenal.pr.gov.br entra no
  // formulário de solicitações sem aprovação manual.
  assert.ok(rules.includes("function isDomainUser()"),
    "falta reconhecer o e-mail institucional");
  assert.ok(rules.includes("@policiapenal"),
    "falta o domínio institucional nas regras");
  assert.ok(rules.includes("canUseRequests"),
    "requests devem aceitar o e-mail institucional sem aprovação");
  assert.ok(rules.includes("isOwner() || isDomainUser() || isActiveUser()"),
    "o acesso a requests deve ser: dono, institucional ou aprovado");
  const requestsBlock = rules.slice(rules.indexOf("match /requests/"));
  assert.ok(requestsBlock.slice(0, 400).includes("allow create: if canUseRequests() && isValidRequest();"),
    "a criação de solicitações continua passando por validação");
  // Um e-mail institucional não pode se autoprovar administrador.
  assert.ok(rules.includes("request.resource.data.get('perfil', 'usuario') != 'admin'"),
    "o self-registration não pode virar admin");
  // A configuração do domínio institucional vive no config.js.
  assert.ok(read("config.js").includes("accessDomain"),
    "config.js deve expor o domínio institucional");
  // A leitura de unidades é pública: o formulário precisa listar as unidades
  // independente da sessão. A escrita continua só para admin.
  const unidadesBlock = rules.slice(rules.indexOf("match /unidades/"));
  assert.ok(unidadesBlock.slice(0, 120).includes("allow read, list: if true;"),
    "unidades deve ter leitura pública");
  assert.ok(unidadesBlock.slice(0, 200).includes("allow create, update, delete: if isAdmin();"),
    "a escrita de unidades continua restrita ao admin");
  // As funções gratificadas seguem o mesmo desenho: leitura pública (o
  // formulário monta o campo "Função exercida" com essa lista) e escrita admin.
  const fgFunctionsBlock = rules.slice(rules.indexOf("match /funcoesGratificadas/"));
  assert.ok(fgFunctionsBlock.slice(0, 120).includes("allow read, list: if true;"),
    "funcoesGratificadas deve ter leitura pública");
  assert.ok(fgFunctionsBlock.slice(0, 200).includes("allow create, update, delete: if isAdmin();"),
    "a escrita de funcoesGratificadas continua restrita ao admin");
});

test("o submenu \"Solicitações\" oferece filtro por tipo de licença", () => {
  const html = read("index.html");
  const app = read("app.js");
  // Os quatro itens de tipo no submenu "Solicitações" do painel.
  const requestsSubmenu = html.slice(html.indexOf('id="requests-submenu"'), html.indexOf("</div>", html.indexOf('id="requests-submenu"')));
  for (const tipo of ["premio", "capacitacao", "medica", "outros"]) {
    assert.ok(requestsSubmenu.includes(`data-request-type-filter="${tipo}"`),
      `o submenu Solicitações deve ter o filtro "${tipo}"`);
  }
  // O rótulo visível que o usuário pediu.
  assert.ok(requestsSubmenu.includes(">Licença prêmio<"), "falta o item Licença prêmio");
  assert.ok(requestsSubmenu.includes(">Licença capacitação<"), "falta o item Licença capacitação");
  assert.ok(requestsSubmenu.includes(">Licença médica<"), "falta o item Licença médica");
  assert.ok(requestsSubmenu.includes(">Outros<"), "falta o item Outros");
  // A lógica de filtragem vive no app.js.
  assert.ok(app.includes("matchesRequestTypeFilter"), "app.js deve filtrar por tipo");
  assert.ok(app.includes("requestTypeFilter"), "app.js deve manter o filtro por tipo");
});

test("cadastro de servidores: colunas na ordem pedida, com Função Gratificada no fim", () => {
  const html = read("index.html");
  const bodyIndex = html.indexOf('id="server-data-body"');
  assert.ok(bodyIndex > -1, "a tabela de servidores deve existir");
  const thead = html.slice(html.lastIndexOf("<thead>", bodyIndex), bodyIndex);
  const headers = [...thead.matchAll(/<th[^>]*>([^<]*)<\/th>/g)].map(match => match[1].trim());
  assert.deepEqual(headers, [
    "Servidor", "E-mail", "CPF", "RG", "Telefone", "Quadro", "Função", "Unidade", "Função Gratificada", "Ação"
  ]);
  // A data de nascimento saiu da tabela.
  assert.ok(!headers.includes("Nascimento"), "a coluna Nascimento não deve mais estar na tabela");
  // O app preenche a última coluna a partir do cadastro de Função Gratificada.
  assert.ok(read("app.js").includes("isServerInFgRoster(record)"),
    "a tabela deve indicar quem possui Função Gratificada");
  // As exportações seguem a mesma ordem e incluem a Função Gratificada.
  const app = read("app.js");
  assert.ok(app.includes("serverDataExportColumns"), "as exportações devem compartilhar as colunas da tabela");
  assert.ok(app.includes('["Função Gratificada", record => (isServerInFgRoster(record) ? "Sim" : "Não")]'),
    "a exportação deve trazer a Função Gratificada");
});

test("cadastro de função gratificada: busca na lista, seletor de função e coluna nova", () => {
  const html = read("index.html");
  // A coluna "Função exercida" fica antes de "Ação".
  const bodyIndex = html.indexOf('id="server-fg-body"');
  assert.ok(bodyIndex > -1, "a tabela de Função Gratificada deve existir");
  const thead = html.slice(html.lastIndexOf("<thead>", bodyIndex), bodyIndex);
  const headers = [...thead.matchAll(/<th[^>]*>([^<]*)<\/th>/g)].map(match => match[1].trim());
  assert.deepEqual(headers, ["Servidor", "CPF", "Unidade", "Função exercida", "Ação"]);
  // Busca da lista e busca do seletor de servidores.
  assert.ok(html.includes('id="server-fg-search"'), "deve haver busca na lista de Função Gratificada");
  assert.ok(html.includes('id="server-fg-server-search"'), "deve haver busca no seletor de servidores");
  // As funções ficam no config.js — a mesma lista é usada pelo painel e pelo
  // formulário de solicitações.
  assert.ok(html.includes('id="server-fg-function"'), "deve haver o seletor de função exercida");
  const config = read("config.js");
  const configFunctions = config.slice(config.indexOf("fgFunctions"), config.indexOf("]", config.indexOf("fgFunctions")));
  for (const funcao of ["Coordenador", "Diretor", "Chefe Administrativo", "Chefe de Segurança"]) {
    assert.ok(configFunctions.includes(funcao), `a função "${funcao}" deveria estar no config.js`);
  }
  const app = read("app.js");
  assert.ok(app.includes("RH_CONFIG.fgFunctions"), "o painel deve ler a lista de funções do config.js");
  assert.ok(app.includes("fillFgFunctionSelect"), "os seletores de função devem ser montados a partir de uma única lista");
  // A busca da lista usa o mesmo componente dos outros cadastros.
  assert.ok(html.includes('class="table-search server-registry-search"><i data-lucide="search"></i><input id="server-fg-search"'),
    "a busca deve seguir o padrão dos outros cadastros");
});

test("cadastro de funções gratificadas: guia nova, CRUD e relação com os seletores", () => {
  const html = read("index.html");
  const app = read("app.js");
  // Guia na barra lateral + visão + diálogos de cadastro e importação.
  assert.ok(html.includes('data-view="cadastro-fg-functions"'), "falta a guia Funções Gratificadas na barra lateral");
  assert.ok(html.includes('id="view-cadastro-fg-functions"'), "falta a visão do cadastro de funções gratificadas");
  assert.ok(html.includes('id="fg-function-dialog"'), "falta o diálogo de cadastro");
  assert.ok(html.includes('id="fg-function-import-dialog"'), "falta o diálogo de importação");
  assert.ok(html.includes('id="fg-functions-body"'), "falta a tabela do cadastro");
  assert.ok(html.includes('id="fg-functions-search"'), "falta a busca do cadastro");
  // A coluna "Em uso" mostra a relação com o cadastro de servidores com F.G.
  const bodyIndex = html.indexOf('id="fg-functions-body"');
  const thead = html.slice(html.lastIndexOf("<thead>", bodyIndex), bodyIndex);
  const headers = [...thead.matchAll(/<th[^>]*>([^<]*)<\/th>/g)].map(match => match[1].trim());
  assert.deepEqual(headers, ["Função Gratificada", "Em uso", "Observações", "Ação"]);

  // O painel guarda a lista em uma coleção própria e a usa como fonte dos
  // seletores (relação): cadastro de F.G., lançamento de férias e relatórios.
  assert.ok(app.includes('funcoesGratificadas = '), "o app deve manter a lista de funções gratificadas");
  assert.ok(app.includes("function refreshFgFunctionOptions()"), "as opções dos seletores devem sair do cadastro");
  assert.ok(app.includes("function refreshFgFunctionViews()"), "mudanças no cadastro devem atualizar as telas relacionadas");
  assert.ok(app.includes('collectionSyncSources') && app.includes("funcoesGratificadas: () => funcoesGratificadas"),
    "a coleção deve ser sincronizada com a nuvem");
  assert.ok(app.includes('"funcoesGratificadas"'), "a coleção deve ser lida/gravada no Firestore");
  assert.ok(app.includes('backupCollections') && app.includes('"funcoesGratificadas"'),
    "a coleção deve entrar no backup");
  // Seed vem do config.js (mesma lista padrão) com reserva nas quatro funções.
  assert.ok(app.includes("function seedFgFunctions()"), "deve haver a lista inicial de funções gratuitas");
  // Renomear uma função propaga para quem já a usa no cadastro de F.G.
  assert.ok(app.includes("previousName !== name") && app.includes("funcaoExercida: name"),
    "a renomeação deve acompanhar o cadastro de F.G.");

  // O formulário público lê a mesma lista da coleção pública.
  const form = read("solicitacao-ferias.html");
  assert.ok(form.includes("funcoesGratificadas"), "o formulário deve ler as funções gratificadas da nuvem");
  assert.ok(form.includes("loadFuncoesFromCloud"), "o formulário deve carregar as funções da nuvem");
});

test("formulário de solicitações: Função exercida é lista com as funções e vale em todos os tipos", () => {
  const html = read("solicitacao-ferias.html");
  const selectStart = html.indexOf('<select id="funcao-exercida"');
  assert.ok(selectStart > -1, "'Função exercida' deve ser uma lista suspensa, não texto livre");
  const selectMarkup = html.slice(selectStart, html.indexOf("</select>", selectStart));
  for (const funcao of ["Coordenador", "Diretor", "Chefe Administrativo", "Chefe de Segurança"]) {
    assert.ok(selectMarkup.includes(funcao), `a função "${funcao}" deveria aparecer no formulário`);
  }
  // Mesma lista do painel, vinda do config.js.
  assert.ok(html.includes("RH_CONFIG.fgFunctions"), "o formulário deve usar a mesma lista do painel");
  // O bloco de Função Gratificada não é mais escondido fora das férias e a
  // função/substituto são recolhidos em qualquer tipo de solicitação.
  assert.ok(!html.includes("fgFlagField.classList.toggle('hidden'"), "a pergunta de FG deve aparecer em todos os tipos");
  assert.ok(!html.includes("usesPeriod ? functionInput.value.trim()"), "a função exercida deve ser recolhida em todos os tipos");
  // O painel "Lançar férias" usa a mesma lista.
  assert.ok(read("index.html").includes('<select id="vacation-launch-function"'), "o painel de lançamento também deve usar a lista");
});

test("painel: submenu de Solicitações traz as 5 telas de lançamento (férias + 4 licenças/tipos)", () => {
  const html = read("index.html");
  const app = read("app.js");
  // Os itens do submenu.
  for (const view of ["vacation-launch", "vacation-launch-premio", "vacation-launch-capacitacao", "vacation-launch-medica", "vacation-launch-outros"]) {
    assert.ok(html.includes(`data-view="${view}"`), `o submenu deve ter o item [${view}]`);
  }
  // "Lançar férias" vem antes dos filtros de tipo (mais usado no dia a dia).
  const lancarFerias = html.indexOf('data-view="vacation-launch"');
  const filtrarPremio = html.indexOf('data-request-type-filter="premio"');
  assert.ok(lancarFerias > -1 && filtrarPremio > -1, "os itens devem existir");
  assert.ok(lancarFerias < filtrarPremio, "'Lançar férias' deve vir antes dos filtros de tipo");
  // Cada view nova reutiliza o MESMO painel (view-vacation-launch).
  assert.ok((html.match(/id="view-vacation-launch"/g) || []).length === 1, "só deve haver um painel de lançamento");
  // O app.js mapeia cada view para um tipo e a aplica no formulário.
  assert.ok(app.includes("vacationLaunchViewConfigs"), "o app.js deve mapear as views de lançamento");
  for (const tipo of ["Licença prêmio", "Licença capacitação", "Licença médica", "Outros"]) {
    assert.ok(app.includes(`"${tipo}"`), `o tipo "${tipo}" deve estar nos configs de lançamento`);
  }
  assert.ok(app.includes("applyVacationLaunchConfig"), "o app.js deve aplicar título/textos do tipo");
  // O tipo escolhido é o que vai para a solicitação gravada.
  assert.ok(/type:\s*vacationLaunchType/.test(app), "a solicitação gravada deve usar o tipo do lançamento");
  // Licenças concedidas por ciclo (prêmio/capacitação) têm seletor de ciclo.
  assert.ok(html.includes('id="vacation-launch-cycle"'), "o painel deve ter o seletor de ciclo");
  assert.ok(/vacation-launch-cycle-field\[hidden\]/.test(read("styles.css")), "o campo de ciclo deve poder ser ocultado");
  assert.ok(/premio:\s*\{[\s\S]*?cycle:\s*true/.test(app), "licença prêmio deve exigir ciclo");
  assert.ok(/capacitacao:\s*\{[\s\S]*?cycle:\s*true/.test(app), "licença capacitação deve exigir ciclo");
  assert.ok(app.includes("if (cycle) request.ciclo = cycle;"), "o ciclo escolhido deve ser gravado na solicitação");
});

test("relatórios e protocolos: coluna Função exercida em todos os tipos de solicitação", () => {
  const html = read("index.html");
  const tables = [
    ["protocols-fg-body", ["Servidor solicitante", "CPF do solicitante", "Função exercida", "Substituto", "CPF do substituto", "Mês", "Ano", "Início", "Fim", "Dias de fruição", "Status do protocolo", "Número do protocolo", "Conferido"]],
    ["report-premio-body", ["Servidor", "Função exercida", "Mês", "Unidade", "Período"]],
    ["report-capacitacao-body", ["Servidor", "Função exercida", "Mês", "Unidade", "Período"]],
    ["report-medica-body", ["Servidor", "Função exercida", "Mês", "Unidade", "Período"]],
    ["report-requests-body", ["Servidor", "CPF", "Função exercida", "Categoria", "Tipo", "Unidade", "Período", "Justificativa"]]
  ];
  for (const [bodyId, expected] of tables) {
    const bodyIndex = html.indexOf(`id="${bodyId}"`);
    assert.ok(bodyIndex > -1, `a tabela ${bodyId} deve existir`);
    const thead = html.slice(html.lastIndexOf("<thead>", bodyIndex), bodyIndex);
    const headers = [...thead.matchAll(/<th[^>]*>([^<]*)<\/th>/g)].map(match => match[1].trim());
    assert.deepEqual(headers, expected, `colunas de ${bodyId}`);
  }
  const app = read("app.js");
  assert.ok(app.includes("getRequestFuncaoExercida"), "os relatórios devem mostrar a função exercida do pedido");
  // As exportações (CSV/PDF) leem a própria tabela, então seguem as colunas novas.
  assert.ok(app.includes("getReportTableData"), "as exportações devem sair da tabela exibida");
});

test("cadastro de servidores: importação de planilha do Excel está disponível", () => {
  const html = read("index.html");
  assert.ok(html.includes('id="server-data-import"'), "deve haver o botão de importar planilha");
  assert.ok(html.includes('id="server-data-import-dialog"'), "deve haver o diálogo de importação");
  assert.ok(html.includes('accept=".xlsx,.xls,.csv'), "deve aceitar arquivos do Excel");
  assert.ok(/cdnjs\.cloudflare\.com\/ajax\/libs\/xlsx\/[^"]+xlsx\.full\.min\.js/.test(html),
    "a biblioteca de leitura de .xlsx deve ser carregada");
  // A biblioteca precisa ser carregada antes do app.js.
  assert.ok(html.indexOf("xlsx.full.min.js") < html.indexOf("app.js"),
    "a biblioteca do Excel deve ser carregada antes do app.js");
  const app = read("app.js");
  assert.ok(app.includes("function readSpreadsheetRows("), "deve ler o arquivo escolhido");
  assert.ok(app.includes("function planServerImport("), "deve validar as linhas antes de gravar");
});

test("importação de férias aprovadas: botão, diálogo e colunas reconhecidas", () => {
  const html = read("index.html");
  const app = read("app.js");
  const styles = read("styles.css");

  assert.ok(html.includes('id="vacation-import-open"'), "deve haver o botão de importar no painel de lançamento");
  assert.ok(html.includes('id="vacation-import-dialog"'), "deve haver o diálogo de importação de férias");
  assert.ok(html.includes('id="vacation-import-paste"'), "deve dar para colar a lista, além de anexar o arquivo");
  assert.ok(html.includes('accept=".xlsx,.xls,.csv'), "deve aceitar arquivos do Excel");
  // O botão fica no cabeçalho do painel de lançamento e some fora de férias.
  assert.ok(/vacation-launch-import\[hidden\]/.test(styles), "o botão deve poder ser ocultado");
  assert.ok(app.includes('importButton.hidden = normalizeTypeText(config.type) !== "ferias"'), "o botão só aparece quando o tipo é férias");

  // As colunas que a importação reconhece são as do relatório de férias.
  const columns = /const vacationImportColumns = \[([\s\S]*?)\];/.exec(app);
  assert.ok(columns, "deve existir a lista de colunas reconhecidas");
  for (const nome of ["gratificada", "^mes$", "equipe", "unidade", "^funcao$", "substituto", "inicio", "fim", "^ano$", "servidor"]) {
    assert.ok(columns[1].includes(nome), `a coluna ${nome} deve ser reconhecida`);
  }
  // Planeja antes de gravar e cada férias importada entra aprovada.
  assert.ok(app.includes("function planVacationImport("), "deve validar as linhas antes de gravar");
  assert.ok(app.includes('type: "férias"'), "as importadas entram como férias");
  assert.ok(app.includes('status: "approved"'), "as importadas entram já aprovadas");
});

test("relatórios: exportação em Excel (.xlsx) está disponível", () => {
  const html = read("index.html");
  const app = read("app.js");
  // A biblioteca de Excel já é carregada para a importação; a exportação usa a mesma.
  assert.ok(/cdnjs\.cloudflare\.com\/ajax\/libs\/xlsx\/[^"]+xlsx\.full\.min\.js/.test(html),
    "a biblioteca do Excel deve ser carregada na página");
  // O botão de Excel entra nas ações de exportação dos relatórios e do cadastro.
  assert.ok(app.includes('data-report-export="xlsx"'), "os relatórios devem ter o botão de Excel");
  assert.ok(html.includes('id="server-data-export-xlsx"'), "o cadastro de servidores deve ter o botão de Excel");
  // A função de exportação usa o SheetJS e cai para CSV se ele faltar.
  assert.ok(app.includes("function downloadReportXlsx("), "deve existir a exportação em .xlsx");
  assert.ok(app.includes("xlsx.utils.aoa_to_sheet"), "deve montar a planilha com o SheetJS");
  assert.ok(app.includes("xlsx.writeFile("), "deve baixar o arquivo .xlsx");
  assert.ok(/Biblioteca do Excel indisponível[\s\S]{0,80}downloadReportCsv/.test(app),
    "sem a biblioteca, deve cair para CSV em vez de falhar");
});
