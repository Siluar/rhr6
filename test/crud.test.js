"use strict";
/*
 * Testes de CRUD ponta a ponta.
 *
 * Em vez de testar funções isoladas, este arquivo carrega o index.html de
 * verdade dentro do jsdom, injeta um Firestore falso em memória (mesma API do
 * window.RH_SYNC usado em produção) e interage com a tela como um usuário:
 * clica em "adicionar", preenche o formulário, salva, confere a tabela, edita
 * e remove. Assim cobrimos criar, ler, atualizar e excluir de cada cadastro,
 * além do envio para a "nuvem" e do backup.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const nodeCrypto = require("node:crypto");
const { JSDOM, VirtualConsole } = require("jsdom");

const root = path.join(__dirname, "..");
const readSource = file => fs.readFileSync(path.join(root, file), "utf8");

// `let`/`const` de topo do app.js ficam presos ao escopo do eval. Este trecho é
// anexado só nos testes para conseguirmos ler o estado interno do app.
const STATE_SHIM = "\n;window.__state = () => ({ unidades, cargos, quadros, serverPersonalData, usuarios, tasks, fgServerRoster, requests, shownMonth, requestFilter, requestTypeFilter });\nwindow.__planServerImport = rows => planServerImport(rows);";

const DEFAULT_ESCALA = { equipes: ["Bravo", "Charlie", "Delta", "Alfa"], dataBase: "2026-10-01", cicloDias: 4 };

// ---- Firestore falso em memória (mesma superfície do firebase-sync.js) ----
function createFakeSync() {
  const store = new Map(); // coleção -> Map(id -> doc)
  const col = name => {
    if (!store.has(name)) store.set(name, new Map());
    return store.get(name);
  };
  const makeId = () => "fake-" + nodeCrypto.randomUUID();
  const withId = (doc, id) => Object.assign({}, doc, { id: doc.id || id });
  const put = (name, doc) => {
    const id = doc.id || makeId();
    const stored = withId(doc, id);
    col(name).set(id, stored);
    return stored;
  };
  return {
    enabled: true,
    _store: store,
    _all: name => [...col(name).values()],
    _seed(name, docs) { docs.forEach(doc => put(name, doc)); },
    waitForAuth: () => Promise.resolve({ email: "admin@teste" }),
    loadRequests: () => Promise.resolve([...col("requests").values()]),
    addRequest(request) { return Promise.resolve(put("requests", request)); },
    saveRequests(list) { list.forEach(request => put("requests", request)); return Promise.resolve(); },
    subscribeRequests() { return () => {}; },
    loadDocs: name => Promise.resolve([...col(name).values()]),
    getDoc: (name, id) => Promise.resolve(col(name).get(id) || null),
    saveDocs(name, docs) { docs.forEach(doc => put(name, doc)); return Promise.resolve(); },
    deleteDoc(name, id) { col(name).delete(id); return Promise.resolve(); },
    subscribeDocs() { return () => {}; }
  };
}

// ---- Sobe uma cópia nova do app dentro do jsdom ----
async function bootApp(options = {}) {
  const virtualConsole = new VirtualConsole();
  // jsdom não implementa navegação/download; os testes capturam os dados antes.
  virtualConsole.on("jsdomError", () => {});

  const dom = new JSDOM(readSource("index.html"), {
    url: "https://rhr6.test/index.html",
    runScripts: "outside-only",
    pretendToBeVisual: true,
    virtualConsole
  });
  const { window } = dom;
  const doc = window.document;
  const downloads = [];

  window.lucide = { createIcons() {} };
  window.RH_CONFIG = {
    googleAdminEmails: ["admin@teste"],
    notificationEmails: ["dest@teste"],
    escala: DEFAULT_ESCALA,
    firebase: null
  };
  const sync = createFakeSync();
  window.RH_SYNC = sync;
  if (options.seed) {
    for (const [name, docs] of Object.entries(options.seed)) sync._seed(name, docs);
  }
  window.confirm = () => true;
  window.alert = () => {};
  window.URL.createObjectURL = blob => {
    downloads.push(blob);
    return "blob:test";
  };
  window.URL.revokeObjectURL = () => {};

  const dialogProto = window.HTMLDialogElement && window.HTMLDialogElement.prototype;
  if (dialogProto) {
    dialogProto.showModal = function () { this.setAttribute("open", ""); };
    dialogProto.close = function () { this.removeAttribute("open"); };
  }
  if (window.crypto && !window.crypto.randomUUID) {
    Object.defineProperty(window.crypto, "randomUUID", { value: () => nodeCrypto.randomUUID(), configurable: true });
  }

  window.sessionStorage.setItem("brisa-demo-user", "admin");
  window.sessionStorage.setItem("brisa-demo-username", "centralrh");

  window.eval(readSource("logic.js"));
  window.eval(readSource("app.js") + STATE_SHIM);

  const app = {
    dom, window, doc, sync, downloads,
    async settle(times = 8) {
      for (let i = 0; i < times; i++) await new Promise(resolve => setTimeout(resolve, 0));
    },
    state() { return window.__state(); },
    $(selector) { return doc.querySelector(selector); },
    $$(selector) { return [...doc.querySelectorAll(selector)]; },
    byId(id) { return doc.getElementById(id); },
    click(target) {
      const element = typeof target === "string" ? doc.querySelector(target) : target;
      assert.ok(element, `elemento não encontrado para clicar: ${target}`);
      element.click();
      return element;
    },
    submit(form) {
      assert.ok(form, "formulário não encontrado para enviar");
      form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
    },
    setValue(form, name, value) {
      const element = form.elements.namedItem(name);
      assert.ok(element, `campo "${name}" não existe no formulário`);
      element.value = value;
      return element;
    },
    toggle(element, checked = true) {
      element.checked = checked;
      element.dispatchEvent(new window.Event("change", { bubbles: true }));
    },
    close() { window.close(); }
  };
  await app.settle();
  return app;
}

// Roda um bloco de teste garantindo que a janela seja fechada no fim.
async function withApp(options, fn) {
  const app = await bootApp(options);
  try {
    await fn(app);
  } finally {
    app.close();
  }
}

// Preenche e envia o formulário de cadastro de servidor (dados pessoais).
function createServer(app, overrides = {}) {
  const data = Object.assign({
    name: "Servidor Teste",
    cpf: "12345678909",
    rg: "1234567",
    birthDate: "1990-05-10",
    phone: "44999990000",
    email: "servidor.teste@pp.pr.gov.br",
    unidadePenal: "CP Umuarama",
    cargo: "Policial Penal",
    quadro: "QPPP"
  }, overrides);
  const form = app.byId("server-data-form");
  for (const [name, value] of Object.entries(data)) app.setValue(form, name, value);
  app.submit(form);
  return data;
}

const findId = (list, predicate) => (list.find(predicate) || {}).id;

// =========================================================================
// Referências: unidades, cargos e quadros
// =========================================================================

test("unidades: criar, ler, editar e excluir (ida e volta para a nuvem)", async () => {
  await withApp({}, async app => {
    const { doc, state } = app;
    const initial = state().unidades.length;

    // CRIAR
    app.click("#unidade-add");
    const form = app.byId("unidade-form");
    assert.ok(app.byId("unidade-dialog").hasAttribute("open"), "o diálogo deveria abrir");
    app.setValue(form, "nome", "Unidade Teste A");
    app.submit(form);
    await app.settle();

    assert.equal(state().unidades.length, initial + 1);
    assert.ok(app.byId("unidade-dialog").open === false, "o diálogo deveria fechar após salvar");
    assert.match(doc.getElementById("unidades-body").textContent, /Unidade Teste A/);
    assert.ok(app.sync._all("unidades").some(u => u.name === "Unidade Teste A"), "deveria subir para a nuvem");

    // LER (pelo id, que vem da tabela)
    const id = findId(state().unidades, u => u.name === "Unidade Teste A");
    assert.ok(id, "a unidade criada precisa ter id");
    assert.ok(doc.querySelector(`[data-remove-unidade="${id}"]`), "deveria haver botão de excluir para o id");

    // ATUALIZAR
    app.click(`[data-edit-unidade="${id}"]`);
    assert.equal(form.elements.nome.value, "Unidade Teste A", "o diálogo deveria vir preenchido");
    app.setValue(form, "nome", "Unidade Teste B");
    app.submit(form);
    await app.settle();
    assert.ok(state().unidades.some(u => u.id === id && u.name === "Unidade Teste B"));
    assert.ok(!state().unidades.some(u => u.name === "Unidade Teste A"));
    assert.ok(app.sync._all("unidades").some(u => u.id === id && u.name === "Unidade Teste B"), "a edição deveria subir");

    // EXCLUIR
    app.click(`[data-remove-unidade="${id}"]`);
    await app.settle();
    assert.ok(!state().unidades.some(u => u.id === id));
    assert.equal(state().unidades.length, initial);
    assert.ok(!app.sync._all("unidades").some(u => u.id === id), "a exclusão deveria refletir na nuvem");
  });
});

test("unidades: não permite nome repetido e permite reordenar", async () => {
  await withApp({}, async app => {
    const { state } = app;
    const form = app.byId("unidade-form");

    app.click("#unidade-add");
    app.setValue(form, "nome", "CP Umuarama"); // já existe no seed
    app.submit(form);
    await app.settle();
    assert.match(app.byId("unidade-message").textContent, /já existe/i, "deveria recusar nome repetido");
    assert.ok(app.byId("unidade-dialog").hasAttribute("open"), "o diálogo deveria permanecer aberto no erro");
    app.byId("unidade-cancel").click();

    // Reordenação
    for (const [nome] of [["AAA Ordenacao"], ["BBB Ordenacao"]]) {
      app.click("#unidade-add");
      app.setValue(form, "nome", nome);
      app.submit(form);
      await app.settle();
    }
    const idA = findId(state().unidades, u => u.name === "AAA Ordenacao");
    const idB = findId(state().unidades, u => u.name === "BBB Ordenacao");
    const indexOf = id => state().unidades.findIndex(u => u.id === id);
    assert.ok(indexOf(idA) < indexOf(idB), "BBB deveria estar depois de AAA");

    app.click(`[data-move-unidade="${idB}"][data-direction="-1"]`);
    await app.settle();
    assert.ok(indexOf(idB) < indexOf(idA), "após mover, BBB deveria vir antes de AAA");
  });
});

test("cargos: criar, ler, editar e excluir; bloqueia cargo em uso", async () => {
  await withApp({}, async app => {
    const { state } = app;
    const initial = state().cargos.length;

    // CRIAR
    app.click("#cargo-add");
    const form = app.byId("cargo-form");
    app.setValue(form, "nome", "Cargo Teste");
    app.setValue(form, "quadro", "QPPP");
    app.setValue(form, "observacoes", "criado no teste");
    app.submit(form);
    await app.settle();
    assert.equal(state().cargos.length, initial + 1);
    assert.match(app.byId("cargos-body").textContent, /Cargo Teste/);

    const id = findId(state().cargos, c => c.name === "Cargo Teste");

    // ATUALIZAR
    app.click(`[data-edit-cargo="${id}"]`);
    assert.equal(form.elements.nome.value, "Cargo Teste");
    app.setValue(form, "nome", "Cargo Teste Editado");
    app.submit(form);
    await app.settle();
    assert.ok(state().cargos.some(c => c.id === id && c.name === "Cargo Teste Editado"));

    // EXCLUIR
    app.click(`[data-remove-cargo="${id}"]`);
    await app.settle();
    assert.ok(!state().cargos.some(c => c.id === id));

    // BLOQUEIO: cargo em uso por um servidor não pode ser excluído
    const seedCargo = state().cargos.find(c => c.name === "Policial Penal");
    createServer(app, { name: "Usa Cargo", cpf: "98765432100", email: "usacargo@pp.pr.gov.br" });
    await app.settle();
    app.click(`[data-remove-cargo="${seedCargo.id}"]`);
    await app.settle();
    assert.ok(state().cargos.some(c => c.id === seedCargo.id), "cargo em uso não deveria ser excluído");
  });
});

test("quadros: criar, ler, editar e excluir; bloqueia quadro usado por cargo", async () => {
  await withApp({}, async app => {
    const { state } = app;

    app.click("#quadro-add");
    const form = app.byId("quadro-form");
    app.setValue(form, "nome", "Quadro Teste");
    app.submit(form);
    await app.settle();
    assert.ok(state().quadros.some(q => q.name === "Quadro Teste"));
    assert.match(app.byId("quadros-body").textContent, /Quadro Teste/);

    const id = findId(state().quadros, q => q.name === "Quadro Teste");
    app.click(`[data-edit-quadro="${id}"]`);
    app.setValue(form, "nome", "Quadro Teste Editado");
    app.submit(form);
    await app.settle();
    assert.ok(state().quadros.some(q => q.id === id && q.name === "Quadro Teste Editado"));

    app.click(`[data-remove-quadro="${id}"]`);
    await app.settle();
    assert.ok(!state().quadros.some(q => q.id === id));

    // QPPP é usado pelo cargo Policial Penal (seed) → não pode sair
    const qppp = state().quadros.find(q => q.name === "QPPP");
    app.click(`[data-remove-quadro="${qppp.id}"]`);
    await app.settle();
    assert.ok(state().quadros.some(q => q.id === qppp.id), "quadro em uso não deveria ser excluído");
  });
});

// =========================================================================
// Servidores (dados pessoais)
// =========================================================================

test("servidores: criar, ler, editar e excluir", async () => {
  await withApp({}, async app => {
    const { state } = app;
    const initial = state().serverPersonalData.length;

    createServer(app, { name: "Fulano de Teste", cpf: "11122233344", email: "fulano.teste@pp.pr.gov.br" });
    await app.settle();
    assert.equal(state().serverPersonalData.length, initial + 1);
    assert.match(app.byId("server-data-body").textContent, /Fulano de Teste/);
    assert.ok(app.sync._all("servidores").some(s => s.name === "Fulano de Teste"), "deveria ir para a nuvem");

    const id = findId(state().serverPersonalData, s => s.name === "Fulano de Teste");

    // ATUALIZAR
    app.click(`[data-edit-server-data="${id}"]`);
    const form = app.byId("server-data-form");
    assert.equal(form.elements.name.value, "Fulano de Teste", "o formulário deveria vir preenchido para edição");
    app.setValue(form, "name", "Fulano Editado");
    app.submit(form);
    await app.settle();
    assert.ok(state().serverPersonalData.some(s => s.id === id && s.name === "Fulano Editado"));

    // EXCLUIR
    app.click(`[data-remove-server-data="${id}"]`);
    await app.settle();
    assert.ok(!state().serverPersonalData.some(s => s.id === id));
    assert.ok(!app.sync._all("servidores").some(s => s.id === id), "a exclusão deveria refletir na nuvem");
  });
});

test("servidores: recusa CPF repetido e quadro incompatível com o cargo", async () => {
  await withApp({}, async app => {
    const { state } = app;
    createServer(app, { name: "Primeiro", cpf: "55566677788", email: "primeiro@pp.pr.gov.br" });
    await app.settle();
    const totalAfterFirst = state().serverPersonalData.length;

    // CPF repetido
    createServer(app, { name: "Segundo", cpf: "55566677788", email: "segundo@pp.pr.gov.br" });
    await app.settle();
    assert.equal(state().serverPersonalData.length, totalAfterFirst, "não deveria cadastrar CPF repetido");

    // Quadro incompatível (Policial Penal exige QPPP)
    createServer(app, { name: "Terceiro", cpf: "99988877766", email: "terceiro@pp.pr.gov.br", quadro: "QPPE" });
    await app.settle();
    assert.equal(state().serverPersonalData.length, totalAfterFirst, "não deveria aceitar quadro incompatível");
  });
});

test("servidores: colunas na ordem pedida e Função Gratificada na última coluna", async () => {
  await withApp({}, async app => {
    createServer(app, { name: "Servidor Sem Fg", cpf: "11122233344", email: "sem.fg@pp.pr.gov.br" });
    createServer(app, { name: "Servidor Com Fg", cpf: "22233344455", email: "com.fg@pp.pr.gov.br" });
    await app.settle();

    // Abre o cadastro de Função Gratificada (recarrega o seletor) e inclui um deles.
    app.click('[data-view="server-fg"]');
    await app.settle();
    const fgSelect = app.byId("server-fg-select");
    const option = [...fgSelect.options].find(item => item.textContent.includes("Servidor Com Fg"));
    assert.ok(option, "o servidor deveria aparecer no seletor de Função Gratificada");
    fgSelect.value = option.value;
    app.submit(app.byId("server-fg-form"));
    await app.settle();

    // Volta para a tabela de servidores.
    app.click('[data-view="server-data"]');
    await app.settle();

    // Cabeçalhos, na ordem pedida, com "Função Gratificada" no fim.
    const headers = app.$$("#view-server-data thead th").map(th => th.textContent.trim());
    assert.deepEqual(headers, [
      "Servidor", "E-mail", "CPF", "RG", "Telefone", "Quadro", "Função", "Unidade", "Função Gratificada", "Ação"
    ]);

    const cellsOf = name => {
      const row = app.$$("#server-data-body tr").find(item => item.textContent.includes(name));
      assert.ok(row, `deveria existir uma linha para ${name}`);
      return [...row.querySelectorAll("td")].map(td => td.textContent.trim());
    };

    const comFg = cellsOf("Servidor Com Fg");
    assert.equal(comFg[0], "Servidor Com Fg", "1ª coluna: servidor");
    assert.equal(comFg[1], "com.fg@pp.pr.gov.br", "2ª coluna: e-mail");
    assert.equal(comFg[2], "22233344455", "3ª coluna: CPF");
    assert.equal(comFg[5], "QPPP", "6ª coluna: quadro");
    assert.equal(comFg[6], "Policial Penal", "7ª coluna: função");
    assert.equal(comFg[7], "CP Umuarama", "8ª coluna: unidade");
    assert.equal(comFg[8], "Sim", "9ª coluna: possui Função Gratificada");

    const semFg = cellsOf("Servidor Sem Fg");
    assert.equal(semFg[8], "Não", "quem não tem Função Gratificada deve mostrar Não");
  });
});

test("importação: valida as linhas, pula quem já existe e cria o que falta", async () => {
  await withApp({}, async app => {
    // Já existe um servidor com este CPF.
    createServer(app, { name: "Já Existe", cpf: "11122233344", email: "ja.existe@pp.pr.gov.br" });
    await app.settle();

    const rows = [
      ["Servidor", "E-mail", "CPF", "RG", "Telefone", "Quadro", "Função", "Unidade", "Função Gratificada"],
      ["Novo Servidor", "novo@pp.pr.gov.br", "123.456.789-09", "9988776", "(44) 98888-7777", "QPPP", "Policial Penal", "CP Umuarama", "Sim"],
      ["Já Existe", "outro@pp.pr.gov.br", "11122233344", "111", "44999990000", "QPPP", "Policial Penal", "CP Umuarama", "Não"],
      ["Sem CPF", "semcpf@pp.pr.gov.br", "123", "222", "44999990000", "QPPP", "Policial Penal", "CP Umuarama", ""],
      ["Novo Lugar", "lugar@pp.pr.gov.br", "98765432100", "333", "44999991111", "QPPE", "Agente de Execução", "Unidade Inédita", "Não"],
      ["Sem E-mail", "", "55566677788", "444", "44999992222", "QPPP", "Policial Penal", "CP Umuarama", ""]
    ];
    const plan = app.window.__planServerImport(rows);

    assert.equal(plan.records.length, 2, "só as duas linhas válidas");
    assert.equal(plan.skipped.length, 1, "uma linha com CPF repetido");
    assert.equal(plan.errors.length, 2, "CPF inválido e e-mail faltando");
    assert.equal(plan.newUnidades.map(item => item.name).join("|"), "Unidade Inédita", "cria a unidade inédita");
    assert.equal(plan.newCargos.length, 0, "a função já existe no cadastro");
    assert.equal(plan.newQuadros.length, 0, "o quadro já existe no cadastro");
    assert.equal(plan.fgAdds.length, 1, "só quem diz Sim entra no cadastro de Função Gratificada");
    assert.equal(plan.fgAdds[0].name, "Novo Servidor");

    const novo = plan.records.find(record => record.email === "novo@pp.pr.gov.br");
    assert.ok(novo, "a linha válida deveria virar registro");
    assert.equal(novo.cpf, "12345678909", "CPF guardado só com dígitos");
    assert.equal(novo.phone, "44988887777", "telefone guardado só com dígitos");
    assert.equal(novo.birthDate, "", "sem data de nascimento na planilha, fica em branco");
    assert.equal(novo.quadro, "QPPP");
    assert.equal(novo.unidadePenal, "CP Umuarama");

    assert.ok(plan.skipped[0].startsWith("Já Existe"), "mensagem aponta a linha repetida");
    assert.ok(plan.errors.some(item => item.startsWith("Sem CPF")), "aponta o CPF inválido");
    assert.ok(plan.errors.some(item => item.startsWith("Sem E-mail")), "aponta o e-mail faltando");
  });
});

test("importação: lê um arquivo .csv, cadastra e mostra na tabela", async () => {
  await withApp({}, async app => {
    const { window } = app;
    const csv = [
      "Servidor;E-mail;CPF;RG;Telefone;Quadro;Função;Unidade",
      "Importado Um;importado.um@pp.pr.gov.br;123.456.789-09;1234567;(44) 99999-0000;QPPP;Policial Penal;CP Umuarama",
      "Importado Dois;importado.dois@pp.pr.gov.br;987.654.321-00;7654321;(44) 98888-1111;QPPE;Agente de Execução;Unidade Inédita"
    ].join("\r\n");
    const file = new window.File([csv], "servidores.csv", { type: "text/csv" });
    const input = app.byId("server-data-import-file");
    Object.defineProperty(input, "files", { value: [file], configurable: true });

    app.submit(app.byId("server-data-import-form"));
    await app.settle();

    const state = app.state();
    const um = state.serverPersonalData.find(item => item.email === "importado.um@pp.pr.gov.br");
    const dois = state.serverPersonalData.find(item => item.email === "importado.dois@pp.pr.gov.br");
    assert.ok(um, "o primeiro importado deveria estar no cadastro");
    assert.ok(dois, "o segundo importado deveria estar no cadastro");
    assert.equal(um.cpf, "12345678909");
    assert.equal(um.birthDate, "", "data de nascimento em branco");
    assert.equal(dois.unidadePenal, "Unidade Inédita");

    // A unidade inédita foi criada no cadastro de unidades.
    assert.ok(state.unidades.some(item => item.name === "Unidade Inédita"), "unidade inédita criada");
    // E os dois aparecem na tabela.
    const body = app.byId("server-data-body").textContent;
    assert.ok(body.includes("Importado Um") && body.includes("Importado Dois"), "importados aparecem na tabela");
    // Também foram gravados na nuvem.
    assert.equal(app.sync._all("servidores").length >= 2, true, "gravou na coleção de servidores");

    // Importar o mesmo arquivo de novo não duplica: tudo é ignorado como já cadastrado.
    app.submit(app.byId("server-data-import-form"));
    await app.settle();
    const secondMessage = app.byId("server-data-import-message").textContent;
    assert.equal(app.state().serverPersonalData.length, 2, "nenhum duplicado no segundo envio");
    assert.ok(secondMessage.includes("ignorado"), `a mensagem deve explicar: ${secondMessage}`);
  });
});

// =========================================================================
// Usuários & acessos
// =========================================================================

test("usuarios: criar, editar perfil, editar cadastro e remover", async () => {
  await withApp({}, async app => {
    const { state } = app;
    const initial = state().usuarios.length;

    app.click("#usuario-add");
    const form = app.byId("usuario-form");
    app.setValue(form, "nome", "Usuário Teste");
    app.setValue(form, "email", "usuario.teste@pp.pr.gov.br");
    app.setValue(form, "perfil", "usuario");
    app.setValue(form, "ativo", "ativo");
    app.submit(form);
    await app.settle();
    assert.equal(state().usuarios.length, initial + 1);
    assert.match(app.byId("usuarios-body").textContent, /Usuário Teste/);

    const id = "usuario.teste@pp.pr.gov.br";
    assert.ok(state().usuarios.some(u => u.id === id && u.perfil === "usuario"));

    // Alterar perfil inline (select na tabela)
    const perfilSelect = app.$(`[data-usuario-perfil="${id}"]`);
    assert.ok(perfilSelect, "deveria haver o select de perfil");
    perfilSelect.value = "admin";
    app.toggle(perfilSelect);
    await app.settle();
    assert.ok(state().usuarios.some(u => u.id === id && u.perfil === "admin"), "o perfil deveria virar admin");

    // Editar cadastro
    app.click(`[data-edit-usuario="${id}"]`);
    assert.equal(form.elements.nome.value, "Usuário Teste");
    app.setValue(form, "nome", "Usuário Teste Editado");
    app.submit(form);
    await app.settle();
    assert.ok(state().usuarios.some(u => u.id === id && u.name === "Usuário Teste Editado"));

    // Remover
    app.click(`[data-remove-usuario="${id}"]`);
    await app.settle();
    assert.ok(!state().usuarios.some(u => u.id === id));
  });
});

test("usuarios: aprova acesso pendente e nega o outro", async () => {
  const seed = {
    usuarios: [
      { id: "pendente.aprovar@pp.pr.gov.br", name: "Pendente Aprovar", email: "pendente.aprovar@pp.pr.gov.br", perfil: "usuario", ativo: false, pendente: true },
      { id: "pendente.negar@pp.pr.gov.br", name: "Pendente Negar", email: "pendente.negar@pp.pr.gov.br", perfil: "usuario", ativo: false, pendente: true }
    ]
  };
  await withApp({ seed }, async app => {
    const { state } = app;
    assert.equal(state().usuarios.filter(u => u.pendente).length, 2, "deveria carregar os dois pendentes");
    assert.ok(app.$('[data-approve-usuario="pendente.aprovar@pp.pr.gov.br"]'), "deveria mostrar botão de aprovar");
    assert.ok(app.$('[data-deny-usuario="pendente.negar@pp.pr.gov.br"]'), "deveria mostrar botão de negar");

    app.click('[data-approve-usuario="pendente.aprovar@pp.pr.gov.br"]');
    await app.settle();
    const aprovado = state().usuarios.find(u => u.id === "pendente.aprovar@pp.pr.gov.br");
    assert.equal(aprovado.pendente, false);
    assert.equal(aprovado.ativo, true);

    app.click('[data-deny-usuario="pendente.negar@pp.pr.gov.br"]');
    await app.settle();
    const negado = state().usuarios.find(u => u.id === "pendente.negar@pp.pr.gov.br");
    assert.equal(negado.pendente, false);
    assert.equal(negado.ativo, false);
  });
});

// =========================================================================
// Tarefas
// =========================================================================

test("tarefas: criar, concluir e remover", async () => {
  await withApp({}, async app => {
    const { state } = app;
    const initial = state().tasks.length;

    const form = app.byId("task-entry-form");
    app.setValue(form, "task", "Tarefa de teste");
    app.setValue(form, "date", "2026-10-20");
    app.submit(form);
    await app.settle();
    assert.equal(state().tasks.length, initial + 1);
    assert.match(app.byId("task-list").textContent, /Tarefa de teste/);

    const id = findId(state().tasks, t => t.title === "Tarefa de teste");

    // Concluir (checkbox)
    const checkbox = app.$(`[data-task-toggle="${id}"]`);
    assert.ok(checkbox, "deveria haver checkbox de concluir");
    app.toggle(checkbox, true);
    await app.settle();
    assert.equal(state().tasks.find(t => t.id === id).completed, true);

    // Remover
    app.click(`[data-task-remove="${id}"]`);
    await app.settle();
    assert.ok(!state().tasks.some(t => t.id === id));
    assert.equal(state().tasks.length, initial);
  });
});

// =========================================================================
// Função gratificada
// =========================================================================

test("função gratificada: incluir, listar e remover", async () => {
  await withApp({}, async app => {
    const { state } = app;
    createServer(app, { name: "Servidor FG", cpf: "32132132100", email: "servidor.fg@pp.pr.gov.br" });
    await app.settle();
    const serverId = findId(state().serverPersonalData, s => s.name === "Servidor FG");

    // Abre a tela que popula o select de servidores disponíveis
    app.click('[data-view="server-fg"]');
    await app.settle();
    const select = app.byId("server-fg-select");
    assert.ok([...select.options].some(o => o.value === serverId), "o servidor deveria aparecer no select");
    select.value = serverId;
    app.submit(app.byId("server-fg-form"));
    await app.settle();

    assert.ok(state().fgServerRoster.some(entry => entry.id === serverId), "deveria entrar no cadastro de FG");
    assert.match(app.byId("server-fg-body").textContent, /Servidor FG/);
    assert.ok(app.sync._all("fgServidores").length >= 1, "deveria subir para a nuvem");

    app.click('[data-remove-fg-server="0"]');
    await app.settle();
    assert.equal(state().fgServerRoster.length, 0, "deveria remover do cadastro de FG");
  });
});

// =========================================================================
// Solicitações (lançamento pelo administrador)
// =========================================================================

test("solicitações: lançar, listar, editar e excluir", async () => {
  await withApp({}, async app => {
    const { state } = app;
    const initial = state().requests.length;
    createServer(app, { name: "Servidor Ferias", cpf: "74185296300", email: "servidor.ferias@pp.pr.gov.br" });
    await app.settle();
    const serverId = findId(state().serverPersonalData, s => s.name === "Servidor Ferias");

    // Lançar férias
    const launchForm = app.byId("vacation-launch-form");
    app.byId("vacation-launch-server").value = serverId;
    launchForm.elements["vacation-launch-start"].value = "2026-11-10";
    launchForm.elements["vacation-launch-end"].value = "2026-11-20";
    app.submit(launchForm);
    await app.settle();
    assert.equal(state().requests.length, initial + 1);

    const request = state().requests.find(r => r.person === "Servidor Ferias");
    assert.ok(request, "a solicitação deveria ser criada");
    assert.equal(request.status, "approved");
    assert.equal(request.days, 11);
    assert.ok(app.sync._all("requests").some(r => r.id === request.id), "deveria ir para a nuvem");

    // Listar as aprovadas (a lista "full" renderiza as ações de editar/excluir)
    app.click('#requests-submenu [data-request-filter="approved"]');
    await app.settle();
    assert.equal(state().requestFilter, "approved");
    assert.ok(app.$(`[data-request-edit="${request.id}"]`), "deveria aparecer o botão de editar");
    assert.ok(app.$(`[data-request-remove="${request.id}"]`), "deveria aparecer o botão de excluir");

    // Editar
    app.click(`[data-request-edit="${request.id}"]`);
    const editForm = app.byId("request-edit-form");
    assert.equal(editForm.elements.person.value, "Servidor Ferias");
    app.setValue(editForm, "note", "Observação alterada");
    app.submit(editForm);
    await app.settle();
    assert.equal(state().requests.find(r => r.id === request.id).note, "Observação alterada");

    // Excluir
    app.click(`[data-request-remove="${request.id}"]`);
    await app.settle();
    assert.ok(!state().requests.some(r => r.id === request.id));
    assert.equal(state().requests.length, initial);
    assert.ok(!app.sync._all("requests").some(r => r.id === request.id), "a exclusão deveria refletir na nuvem");
  });
});

test("solicitações: recusa período inválido e férias sobrepostas do mesmo servidor", async () => {
  await withApp({}, async app => {
    const { state } = app;
    createServer(app, { name: "Servidor Conflito", cpf: "15975345600", email: "servidor.conflito@pp.pr.gov.br" });
    await app.settle();
    const serverId = findId(state().serverPersonalData, s => s.name === "Servidor Conflito");
    const launchForm = app.byId("vacation-launch-form");
    const set = (start, end) => {
      app.byId("vacation-launch-server").value = serverId;
      launchForm.elements["vacation-launch-start"].value = start;
      launchForm.elements["vacation-launch-end"].value = end;
      app.submit(launchForm);
    };

    const before = state().requests.length;

    // término antes do início
    set("2026-12-20", "2026-12-10");
    await app.settle();
    assert.equal(state().requests.length, before, "não deveria aceitar término antes do início");

    // primeiro período válido
    set("2026-12-01", "2026-12-10");
    await app.settle();
    assert.equal(state().requests.length, before + 1);

    // segundo período sobreposto do mesmo servidor
    set("2026-12-05", "2026-12-15");
    await app.settle();
    assert.equal(state().requests.length, before + 1, "não deveria aceitar sobreposição");
  });
});

// =========================================================================
// Sino de notificações
// =========================================================================

test("sino: mostra a quantidade de pendentes e abre a fila", async () => {
  const pendente = (id, person) => ({
    id, person, initials: "TT", color: "#728e70",
    start: "2026-11-01", end: "2026-11-05", days: 5,
    status: "pending", type: "férias", created: "01/11", note: "teste"
  });
  const seed = { requests: [pendente("pend-1", "Ana Teste"), pendente("pend-2", "Bruno Teste")] };
  await withApp({ seed }, async app => {
    const { state } = app;
    assert.equal(state().requests.filter(r => r.status === "pending").length, 2);

    const badge = app.byId("notification-badge");
    assert.equal(badge.textContent, "2");
    assert.equal(badge.hidden, false);
    assert.equal(app.byId("nav-pending-count").textContent, "2");
    assert.equal(app.byId("pending-stat").textContent, "2");

    // Clicar no sino abre a fila de pendentes
    app.click("#notification-button");
    await app.settle();
    assert.equal(state().requestFilter, "pending");
    assert.ok(app.byId("view-requests").classList.contains("active"), "a tela de solicitações deveria ficar ativa");
    assert.match(app.byId("full-requests").textContent, /Ana Teste/);
  });
});

// =========================================================================
// Filtro por tipo em "Solicitações"
// =========================================================================

test("solicitações: filtro por tipo mostra todas as situações daquele tipo", async () => {
  const req = (id, person, type, status) => ({
    id, person, initials: "TT", color: "#728e70",
    start: "2026-11-01", end: "2026-11-05", days: 5,
    status, type, created: "01/11", note: ""
  });
  const seed = {
    requests: [
      req("r-ferias", "Ana Ferias", "férias", "pending"),
      req("r-premio", "Bruno Premio", "licença prêmio", "approved"),
      req("r-premio2", "Caio Premio", "Licença Prêmio", "rejected"),
      req("r-cap", "Dora Capacitacao", "licença capacitação", "pending"),
      req("r-med", "Elis Medica", "licença médica", "approved"),
      req("r-outros", "Fabio Outros", "licença para tratar de interesses particulares", "pending")
    ]
  };
  await withApp({ seed }, async app => {
    const { state } = app;
    const list = () => app.byId("full-requests").textContent;

    // Prêmio: todas as situações (aprovada + recusada) e mais nada.
    app.click('#requests-submenu [data-request-type-filter="premio"]');
    await app.settle();
    assert.equal(state().requestTypeFilter, "premio");
    assert.match(list(), /Bruno Premio/, "deveria listar a licença prêmio aprovada");
    assert.match(list(), /Caio Premio/, "deveria listar a licença prêmio recusada também");
    assert.doesNotMatch(list(), /Ana Ferias/, "não deveria listar férias");
    assert.doesNotMatch(list(), /Elis Medica/, "não deveria listar licença médica");

    // Capacitação
    app.click('#requests-submenu [data-request-type-filter="capacitacao"]');
    await app.settle();
    assert.equal(state().requestTypeFilter, "capacitacao");
    assert.match(list(), /Dora Capacitacao/);
    assert.doesNotMatch(list(), /Bruno Premio/);

    // Médica
    app.click('#requests-submenu [data-request-type-filter="medica"]');
    await app.settle();
    assert.match(list(), /Elis Medica/);
    assert.doesNotMatch(list(), /Dora Capacitacao/);

    // Outros: só o tipo livre (nem férias nem as licenças nomeadas)
    app.click('#requests-submenu [data-request-type-filter="outros"]');
    await app.settle();
    assert.match(list(), /Fabio Outros/);
    assert.doesNotMatch(list(), /Ana Ferias/);
    assert.doesNotMatch(list(), /Bruno Premio/);

    // Um item de situação limpa o filtro por tipo
    app.click('#requests-submenu [data-request-filter="pending"]');
    await app.settle();
    assert.equal(state().requestTypeFilter, "", "a situação deveria limpar o filtro por tipo");
    assert.equal(state().requestFilter, "pending");
    assert.match(list(), /Ana Ferias/);
    assert.doesNotMatch(list(), /Bruno Premio/, "aprovada não entra na lista de pendentes");
  });
});

// =========================================================================
// Calendário
// =========================================================================

test("calendário: abre no mês atual, alinha o 1º dia e navega entre meses", async () => {
  await withApp({}, async app => {
    const { state } = app;
    const hoje = new Date();
    assert.equal(state().shownMonth.getFullYear(), hoje.getFullYear());
    assert.equal(state().shownMonth.getMonth(), hoje.getMonth());

    // Rótulo do mês (visão geral)
    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    assert.equal(app.byId("overview-month-label").textContent, `${meses[hoje.getMonth()]} ${hoje.getFullYear()}`);

    // Alinhamento do primeiro dia do mês na coluna correta (D=0)
    const primeiroDiaSemana = new Date(hoje.getFullYear(), hoje.getMonth(), 1).getDay();
    assert.equal(app.$$("#overview-calendar .calendar-empty").length, primeiroDiaSemana);

    // Avança um mês e volta
    app.click('[data-month-shift="1"]');
    await app.settle();
    const proximo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
    assert.equal(state().shownMonth.getFullYear(), proximo.getFullYear());
    assert.equal(state().shownMonth.getMonth(), proximo.getMonth());

    app.click('[data-month-shift="-1"]');
    await app.settle();
    assert.equal(state().shownMonth.getMonth(), hoje.getMonth());

    // Botão "hoje" volta para o mês corrente
    app.click('[data-month-shift="1"]');
    await app.settle();
    app.click("[data-month-today]");
    await app.settle();
    assert.equal(state().shownMonth.getMonth(), hoje.getMonth());
  });
});

// =========================================================================
// Backup
// =========================================================================

test("backup: exporta um JSON com os dados e restaura na nuvem", async () => {
  await withApp({}, async app => {
    // EXPORTAR
    app.click("#export-backup");
    await app.settle();
    assert.match(app.byId("backup-message").textContent, /Backup gerado com \d+ registros/);
    assert.equal(app.downloads.length, 1, "deveria ter gerado um arquivo");
    const payload = JSON.parse(await app.downloads[0].text());
    assert.equal(payload.aplicativo, "Central de RH Umuarama");
    assert.ok(Array.isArray(payload.dados.unidades));
    assert.ok(payload.dados.unidades.length >= 12, "o backup deveria conter as unidades");
    assert.ok(Array.isArray(payload.dados.requests));

    // RESTAURAR: manda uma unidade nova pela nuvem
    const restaurado = {
      aplicativo: "Central de RH Umuarama",
      versao: 1,
      dados: {
        unidades: [...payload.dados.unidades, { id: "unidade-backup-1", name: "Unidade Restaurada" }]
      }
    };
    const file = new app.window.File([JSON.stringify(restaurado)], "backup.json", { type: "application/json" });
    await app.window.importBackup(file);
    await app.settle();
    assert.match(app.byId("backup-message").textContent, /Restauração concluída/);
    assert.ok(app.sync._all("unidades").some(u => u.name === "Unidade Restaurada"), "a unidade restaurada deveria ir para a nuvem");
  });
});
