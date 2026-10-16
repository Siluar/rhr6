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
const STATE_SHIM = "\n;window.__state = () => ({ unidades, cargos, quadros, funcoesGratificadas, fgFunctionOptions, serverPersonalData, usuarios, tasks, fgServerRoster, requests, shownMonth, requestFilter, requestTypeFilter });\nwindow.__planServerImport = rows => planServerImport(rows);";

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

// Digita num campo de busca (o evento "input" dispara a renderização).
function typeIn(app, id, value) {
  const input = app.byId(id);
  assert.ok(input, `campo de busca não encontrado: ${id}`);
  input.value = value;
  input.dispatchEvent(new app.window.Event("input", { bubbles: true }));
  return input;
}

// As buscas usam debounce (150ms): espera o suficiente para elas rodarem.
const flushSearch = () => new Promise(resolve => setTimeout(resolve, 220));

// Inclui um servidor no cadastro de Função Gratificada escolhendo a função exercida.
function addFgServer(app, serverId, funcaoExercida = "Coordenador") {
  app.click('[data-view="server-fg"]');
  app.byId("server-fg-select").value = serverId;
  app.setValue(app.byId("server-fg-form"), "funcaoExercida", funcaoExercida);
  app.submit(app.byId("server-fg-form"));
  return funcaoExercida;
}

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
// Funções Gratificadas (a lista de funções em si, relacionada a todos os
// seletores: cadastro de F.G., Lançar férias e formulário de solicitação)
// =========================================================================

test("funções gratificadas: guia nova, CRUD e lista alimentando os seletores", async () => {
  await withApp({}, async app => {
    const { state } = app;
    const initial = state().funcoesGratificadas.length;
    assert.ok(initial >= 4, "a lista inicial deve trazer as 4 funções padrão");

    // A guia existe na barra lateral e abre a visão certa
    const navLink = app.$('[data-view="cadastro-fg-functions"]');
    assert.ok(navLink, "falta o item da barra lateral para Funções Gratificadas");
    app.click('[data-view="cadastro-fg-functions"]');
    assert.ok(app.byId("view-cadastro-fg-functions").classList.contains("active"));
    assert.ok(app.byId("fg-function-add"), "falta o botão de adicionar");
    assert.match(app.byId("cadastro-fg-functions-title").textContent, /Funções Gratificadas/);

    // CRIAR
    app.click("#fg-function-add");
    const form = app.byId("fg-function-form");
    app.setValue(form, "nome", "Chefe de Núcleo");
    app.submit(form);
    await app.settle();
    assert.equal(state().funcoesGratificadas.length, initial + 1);
    assert.match(app.byId("fg-functions-body").textContent, /Chefe de Núcleo/);
    assert.ok(app.sync._all("funcoesGratificadas").some(f => f.name === "Chefe de Núcleo"), "deveria subir para a nuvem");
    // Relação: o mesmo item aparece nos seletores
    assert.ok(state().fgFunctionOptions.includes("Chefe de Núcleo"), "fgFunctionOptions deve acompanhar o cadastro");

    // Nome repetido é recusado
    const before = state().funcoesGratificadas.length;
    app.click("#fg-function-add");
    app.setValue(form, "nome", "chefe de núcleo");
    app.submit(form);
    await app.settle();
    assert.equal(state().funcoesGratificadas.length, before, "nome repetido não deveria entrar");
    assert.ok(app.byId("fg-function-message").textContent.length > 0, "falta o aviso de nome repetido");
    app.click("#fg-function-cancel");
    await app.settle();

    // EDITAR (renomear propaga para quem já usa a função)
    const id = findId(state().funcoesGratificadas, f => f.name === "Chefe de Núcleo");
    app.click(`[data-edit-fg-function="${id}"]`);
    app.setValue(form, "nome", "Chefe de Área");
    app.submit(form);
    await app.settle();
    assert.ok(state().funcoesGratificadas.some(f => f.id === id && f.name === "Chefe de Área"));

    // EXCLUIR função sem uso
    app.click(`[data-remove-fg-function="${id}"]`);
    await app.settle();
    assert.ok(!state().funcoesGratificadas.some(f => f.id === id));
    assert.ok(!app.sync._all("funcoesGratificadas").some(f => f.id === id), "a exclusão deveria refletir na nuvem");
  });
});

test("funções gratificadas: não sai do cadastro enquanto um servidor a usa", async () => {
  await withApp({}, async app => {
    const { state } = app;
    createServer(app, { name: "Servidor FG", cpf: "99988877766", email: "servidorfg@pp.pr.gov.br" });
    await app.settle();
    const servidor = state().serverPersonalData.find(s => s.name === "Servidor FG");
    addFgServer(app, servidor.id, "Diretor");
    await app.settle();
    assert.ok(state().fgServerRoster.some(e => e.funcaoExercida === "Diretor"));

    app.click('[data-view="cadastro-fg-functions"]');
    const diretor = state().funcoesGratificadas.find(f => f.name === "Diretor");
    assert.ok(diretor, "o Diretor deveria existir no cadastro de funções");
    app.click(`[data-remove-fg-function="${diretor.id}"]`);
    await app.settle();
    assert.ok(state().funcoesGratificadas.some(f => f.id === diretor.id), "função em uso não deveria ser excluída");

    // Renomear propaga para o cadastro de F.G.
    app.click(`[data-edit-fg-function="${diretor.id}"]`);
    const form = app.byId("fg-function-form");
    app.setValue(form, "nome", "Diretor Geral");
    app.submit(form);
    await app.settle();
    assert.ok(state().fgServerRoster.some(e => e.funcaoExercida === "Diretor Geral"), "a renomeação deve seguir para o cadastro de F.G.");
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
    app.setValue(app.byId("server-fg-form"), "funcaoExercida", "Diretor");
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

test("servidores: só o nome é obrigatório, e o resto pode ser completado depois", async () => {
  await withApp({}, async app => {
    const { state } = app;
    app.click('[data-view="server-data"]');
    await app.settle();
    const form = app.byId("server-data-form");

    // Sem nome não cadastra (e avisa em vez de ficar calado).
    app.setValue(form, "name", "");
    app.submit(form);
    await app.settle();
    assert.equal(state().serverPersonalData.length, 0, "linha sem nome não deve ser cadastrada");

    // Só com o nome, o cadastro entra com o resto em branco.
    app.setValue(form, "name", "Só o Nome");
    app.submit(form);
    await app.settle();
    const soNome = state().serverPersonalData.find(record => record.name === "Só o Nome");
    assert.ok(soNome, "o cadastro só com o nome deveria entrar");
    assert.equal(soNome.cpf, "");
    assert.equal(soNome.rg, "");
    assert.equal(soNome.birthDate, "");
    assert.equal(soNome.phone, "");
    assert.equal(soNome.email, "");
    assert.equal(soNome.unidadePenal, "");
    assert.equal(soNome.cargo, "");
    assert.equal(soNome.quadro, "");
    assert.match(app.byId("server-data-body").textContent, /Só o Nome/, "deve aparecer na tabela");

    // Depois dá para completar pela edição, aos poucos.
    app.click(`[data-edit-server-data="${soNome.id}"]`);
    await app.settle();
    assert.equal(form.hidden, false, "o formulário deve abrir preenchido para edição");
    app.setValue(form, "cpf", "123.456.789-09");
    app.setValue(form, "unidadePenal", "CP Umuarama");
    app.setValue(form, "cargo", "Policial Penal");
    app.setValue(form, "quadro", "QPPP");
    app.submit(form);
    await app.settle();

    const atualizado = state().serverPersonalData.find(record => record.id === soNome.id);
    assert.equal(atualizado.cpf, "123.456.789-09", "o CPF foi completado");
    assert.equal(atualizado.unidadePenal, "CP Umuarama");
    assert.equal(atualizado.quadro, "QPPP");
    assert.equal(atualizado.birthDate, "", "o que ainda não foi preenchido continua em branco");
    assert.equal(state().serverPersonalData.length, 1, "editar não pode duplicar");
  });
});

test("importação: linha com dados faltando entra mesmo assim, e o que falta fica listado", async () => {
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
      ["Sem E-mail", "", "55566677788", "444", "44999992222", "QPPP", "Policial Penal", "CP Umuarama", ""],
      ["Só o Nome", "", "", "", "", "", "", "", ""]
    ];
    const plan = app.window.__planServerImport(rows);

    assert.equal(plan.total, 6, "contei as seis linhas de dados");
    assert.equal(plan.headerFound, true, "reconheci a linha de títulos");
    assert.equal(plan.records.length, 5, "todas as linhas com nome entram");
    assert.equal(plan.skipped.length, 1, "uma linha com CPF repetido");
    assert.equal(plan.errors.length, 0, "nenhuma linha recusada");
    assert.equal(plan.incomplete.length, 3, "três entraram com dados faltando");
    assert.equal(plan.newUnidades.map(item => item.name).join("|"), "Unidade Inédita", "cria a unidade inédita");
    assert.equal(plan.newCargos.length, 0, "a função já existe no cadastro");
    assert.equal(plan.newQuadros.length, 0, "o quadro já existe no cadastro");
    assert.equal(plan.fgAdds.length, 1, "só quem diz Sim entra no cadastro de Função Gratificada");
    assert.equal(plan.fgAdds[0].name, "Novo Servidor");

    const novo = plan.records.find(record => record.email === "novo@pp.pr.gov.br");
    assert.ok(novo, "a linha completa deveria virar registro");
    assert.equal(novo.cpf, "12345678909", "CPF guardado só com dígitos");
    assert.equal(novo.phone, "44988887777", "telefone guardado só com dígitos");
    assert.equal(novo.birthDate, "", "sem data de nascimento na planilha, fica em branco");
    assert.equal(novo.quadro, "QPPP");
    assert.equal(novo.unidadePenal, "CP Umuarama");

    // A linha só com o nome entra com o resto em branco, sem quebrar nada.
    const soNome = plan.records.find(record => record.name === "Só o Nome");
    assert.ok(soNome, "a linha só com o nome deveria entrar");
    assert.equal(soNome.cpf, "");
    assert.equal(soNome.email, "");
    assert.equal(soNome.rg, "");
    assert.equal(soNome.phone, "");
    assert.equal(soNome.unidadePenal, "");
    assert.equal(soNome.cargo, "");
    assert.equal(soNome.quadro, "");

    assert.ok(plan.skipped[0].startsWith("Já Existe"), "mensagem aponta a linha repetida");
    assert.ok(plan.incomplete.some(item => item.startsWith("Sem CPF")), "aponta o CPF incompleto");
    assert.ok(plan.incomplete.some(item => item.startsWith("Sem E-mail")), "aponta o e-mail faltando");
    assert.ok(plan.incomplete.some(item => item.startsWith("Só o Nome")), "aponta a linha só com o nome");
  });
});

test("importação: linha sem nome é recusada (é o único campo obrigatório)", async () => {
  await withApp({}, async app => {
    const plan = app.window.__planServerImport([
      ["Servidor", "E-mail", "CPF", "RG", "Telefone", "Quadro", "Função", "Unidade"],
      ["", "so.email@pp.pr.gov.br", "12345678909", "123", "44999998888", "QPPP", "Policial Penal", "CP Umuarama"]
    ]);
    assert.equal(plan.records.length, 0, "sem nome não entra");
    assert.equal(plan.errors.length, 1, "explica que falta o nome");
    assert.ok(plan.errors[0].includes("sem o nome"), plan.errors[0]);
    assert.ok(plan.errors[0].startsWith("so.email@pp.pr.gov.br"), "identifica a linha pelo e-mail");
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

test("importação: acha a linha de títulos mesmo com um título antes dela", async () => {
  await withApp({}, async app => {
    const rows = [
      ["RELAÇÃO DE SERVIDORES - CR-6 UMUARAMA"],
      [],
      ["NOME DO SERVIDOR", "E-MAIL", "CPF", "RG", "TELEFONE", "QUADRO", "FUNÇÃO", "UNIDADE"],
      ["Com Título Antes", "titulo@pp.pr.gov.br", "123.456.789-09", "12345", "44999998888", "QPPP", "Policial Penal", "CP Umuarama"]
    ];
    const plan = app.window.__planServerImport(rows);

    assert.equal(plan.headerFound, true, "deveria achar a linha de títulos");
    assert.equal(plan.records.length, 1, "a única linha de dados deveria entrar");
    assert.equal(plan.errors.length, 0, "o título e o cabeçalho não podem virar erro");
    assert.equal(plan.incomplete.length, 0, "a linha está completa");
    const record = plan.records[0];
    assert.equal(record.name, "Com Título Antes");
    assert.equal(record.email, "titulo@pp.pr.gov.br", "as colunas não podem trocar de lugar");
    assert.equal(record.cpf, "12345678909");
    assert.equal(record.phone, "44999998888");
    assert.equal(record.quadro, "QPPP");
    assert.equal(record.cargo, "Policial Penal");
    assert.equal(record.unidadePenal, "CP Umuarama");
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
    app.setValue(app.byId("server-fg-form"), "funcaoExercida", "Chefe Administrativo");
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

test("função gratificada: coluna Função exercida, troca na tabela e busca na lista", async () => {
  await withApp({}, async app => {
    const { state } = app;
    createServer(app, { name: "Ana Souza Fg", cpf: "11111111111", email: "ana.souza@pp.pr.gov.br", unidadePenal: "CP Umuarama" });
    createServer(app, { name: "Bruno Lima Fg", cpf: "22222222222", email: "bruno.lima@pp.pr.gov.br", unidadePenal: "Coordenação Regional CR-6" });
    await app.settle();

    app.click('[data-view="server-fg"]');
    await app.settle();

    // A coluna nova fica antes de "Ação".
    assert.deepEqual(app.$$("#view-server-fg thead th").map(th => th.textContent.trim()),
      ["Servidor", "CPF", "Unidade", "Função exercida", "Ação"]);

    // As funções pedidas estão no seletor do formulário.
    assert.deepEqual([...app.byId("server-fg-function").options].map(option => option.textContent.trim()), [
      "Selecione a função exercida", "Coordenador", "Diretor", "Chefe Administrativo", "Chefe de Segurança"
    ]);

    // Sem escolher a função exercida, não inclui.
    const anaId = findId(state().serverPersonalData, s => s.name === "Ana Souza Fg");
    app.byId("server-fg-select").value = anaId;
    app.submit(app.byId("server-fg-form"));
    await app.settle();
    assert.equal(state().fgServerRoster.length, 0, "sem a função exercida o servidor não deveria entrar");

    // Inclui os dois, cada um com a sua função.
    addFgServer(app, anaId, "Coordenador");
    await app.settle();
    addFgServer(app, findId(state().serverPersonalData, s => s.name === "Bruno Lima Fg"), "Chefe de Segurança");
    await app.settle();

    const functionSelects = () => app.$$("#server-fg-body [data-fg-function-index]");
    assert.equal(functionSelects().length, 2, "os dois servidores deveriam estar na lista");
    assert.equal(functionSelects()[0].value, "Coordenador", "a função da Ana deveria ficar salva");
    assert.equal(functionSelects()[1].value, "Chefe de Segurança", "a função do Bruno deveria ficar salva");
    assert.ok(state().fgServerRoster.every(entry => entry.funcaoExercida), "toda entrada deveria ter a função exercida");
    assert.ok(app.sync._all("fgServidores").some(doc => doc.funcaoExercida === "Coordenador"), "a função deveria subir para a nuvem");

    // Troca a função direto na tabela (também serve para entradas antigas).
    functionSelects()[0].value = "Diretor";
    functionSelects()[0].dispatchEvent(new app.window.Event("change", { bubbles: true }));
    await app.settle();
    assert.equal(state().fgServerRoster.find(entry => entry.id === anaId).funcaoExercida, "Diretor", "a troca na tabela deveria ser salva");

    // Busca da lista: por nome, unidade e função exercida.
    typeIn(app, "server-fg-search", "bruno");
    await flushSearch();
    assert.equal(app.$$("#server-fg-body tr").length, 1, "a busca por nome deveria mostrar só o Bruno");
    assert.match(app.byId("server-fg-body").textContent, /Bruno Lima Fg/);

    typeIn(app, "server-fg-search", "coordenação regional");
    await flushSearch();
    assert.match(app.byId("server-fg-body").textContent, /Bruno Lima Fg/, "a busca deveria achar pela unidade");
    assert.equal(app.$$("#server-fg-body tr").length, 1);

    typeIn(app, "server-fg-search", "diretor");
    await flushSearch();
    assert.equal(app.$$("#server-fg-body tr").length, 1, "a busca deveria achar pela função exercida");
    assert.match(app.byId("server-fg-body").textContent, /Ana Souza Fg/);

    typeIn(app, "server-fg-search", "ninguem com esse nome");
    await flushSearch();
    assert.match(app.byId("server-fg-body").textContent, /Nenhum servidor corresponde à busca/);

    typeIn(app, "server-fg-search", "");
    await flushSearch();
    assert.equal(app.$$("#server-fg-body tr").length, 2, "sem busca a lista volta completa");
  });
});

test("servidores: a busca procura em nome, CPF, e-mail, unidade e função", async () => {
  await withApp({}, async app => {
    createServer(app, { name: "Carlos Pereira", cpf: "11122233344", rg: "9998887", phone: "44988887777", email: "carlos.pereira@pp.pr.gov.br", unidadePenal: "CP Umuarama", cargo: "Policial Penal", quadro: "QPPP" });
    createServer(app, { name: "Daniela Rocha", cpf: "55566677788", rg: "1112223", phone: "44977776666", email: "daniela.rocha@pp.pr.gov.br", unidadePenal: "Coordenação Regional CR-6", cargo: "Agente de Execução", quadro: "QPPE" });
    await app.settle();
    app.click('[data-view="server-data"]');
    await app.settle();

    const rows = () => app.$$("#server-data-body tr");
    const firstName = () => rows()[0].querySelectorAll("td")[0].textContent.trim();
    assert.equal(rows().length, 2, "os dois servidores deveriam estar na tabela");

    typeIn(app, "server-data-search", "daniela");
    await flushSearch();
    assert.equal(rows().length, 1, "busca por nome");
    assert.equal(firstName(), "Daniela Rocha");

    typeIn(app, "server-data-search", "11122233344");
    await flushSearch();
    assert.equal(rows().length, 1, "busca por CPF");
    assert.equal(firstName(), "Carlos Pereira");

    typeIn(app, "server-data-search", "daniela.rocha@");
    await flushSearch();
    assert.equal(rows().length, 1, "busca por e-mail");
    assert.equal(firstName(), "Daniela Rocha");

    typeIn(app, "server-data-search", "coordenação regional");
    await flushSearch();
    assert.equal(rows().length, 1, "busca por unidade");
    assert.equal(firstName(), "Daniela Rocha");

    typeIn(app, "server-data-search", "agente de execução");
    await flushSearch();
    assert.equal(rows().length, 1, "busca por função");
    assert.equal(firstName(), "Daniela Rocha");

    typeIn(app, "server-data-search", "");
    await flushSearch();
    assert.equal(rows().length, 2, "limpar a busca mostra todos de novo");
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

test("relatórios: a função exercida aparece nos protocolos F.G e nos relatórios de licença", async () => {
  const req = (id, person, type, extra = {}) => Object.assign({
    id, person, initials: "TT", color: "#728e70",
    start: "2026-11-01", end: "2026-11-05", days: 5,
    status: "approved", type, created: "01/11", note: "", month: "novembro", year: "2026"
  }, extra);
  const seed = {
    requests: [
      // Férias de um servidor do cadastro de FG, sem a função no próprio pedido
      // (a função deve vir do cadastro).
      req("r-ferias-fg", "Ana Souza Fg", "férias", { cpf: "11111111111" }),
      // Licenças com a função registrada na solicitação.
      req("r-premio", "Bruno Premio", "licença prêmio", { funcaoExercida: "Diretor", ciclo: "A" }),
      req("r-cap", "Dora Capacitacao", "licença capacitação", { funcaoExercida: "Chefe de Segurança", ciclo: "B" }),
      req("r-med", "Elis Medica", "licença médica", { funcaoExercida: "Chefe Administrativo" }),
      // Sem função gratificada em lugar nenhum.
      req("r-outros", "Fabio Outros", "licença para tratar de interesses particulares", {})
    ],
    fgServidores: [
      { id: "fg-ana", name: "Ana Souza Fg", cpf: "11111111111", funcaoExercida: "Coordenador" }
    ]
  };

  await withApp({ seed }, async app => {
    // Protocolos F.G: a função da Ana vem do cadastro de Função Gratificada.
    app.click('[data-view="protocols-fg"]');
    await app.settle();
    // O filtro de período começa no mês atual: limpa para ver o pedido semeado.
    for (const id of ["protocols-fg-month-filter", "protocols-fg-year-filter"]) {
      const select = app.byId(id);
      select.value = "";
      select.dispatchEvent(new app.window.Event("change", { bubbles: true }));
    }
    await app.settle();
    const protocolRows = app.$$("#protocols-fg-body tr");
    assert.equal(protocolRows.length, 1, "deveria haver o protocolo da Ana");
    const protocolCells = [...protocolRows[0].children].map(cell => cell.textContent.trim());
    assert.equal(protocolCells[0], "Ana Souza Fg");
    assert.equal(protocolCells[2], "Coordenador", "a coluna Função exercida deveria vir do cadastro de FG");

    // Relatório de licença prêmio: função registrada na própria solicitação.
    app.click('[data-view="report-premio"]');
    await app.settle();
    assert.match(app.byId("report-premio-body").textContent, /Bruno Premio[\s\S]*Diretor/,
      "o relatório de prêmio deveria mostrar a função exercida");

    // Relatório de licença capacitação.
    app.click('[data-view="report-capacitacao"]');
    await app.settle();
    assert.match(app.byId("report-capacitacao-body").textContent, /Dora Capacitacao[\s\S]*Chefe de Segurança/,
      "o relatório de capacitação deveria mostrar a função exercida");

    // Relatório de licença médica.
    app.click('[data-view="report-medica"]');
    await app.settle();
    assert.match(app.byId("report-medica-body").textContent, /Elis Medica[\s\S]*Chefe Administrativo/,
      "o relatório de licença médica deveria mostrar a função exercida");

    // Relatório de solicitações (todos os tipos) também traz a função.
    app.click('[data-view="report-requests"]');
    await app.settle();
    const requestsTable = app.byId("report-requests-body").textContent;
    assert.match(requestsTable, /Diretor/, "o relatório de solicitações deveria mostrar a função exercida");
    assert.match(requestsTable, /Fabio OutrosCPF não informadoNão informado/,
      "quem não tem função gratificada deveria aparecer como Não informado");
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
