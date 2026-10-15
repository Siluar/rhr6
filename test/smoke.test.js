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
  assert.ok(html.includes("imc.sidnei@gmail.com"), "a lista de destinatários padrão deve incluir imc.sidnei@gmail.com");
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
