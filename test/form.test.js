/*
 * Testes do formulário de solicitação (solicitacao-ferias.html).
 *
 * O formulário guarda todo o seu comportamento num script inline. Um erro em
 * nível de topo nesse script (por exemplo, uma variável usada sem ser declarada)
 * interrompe TODO o restante da execução — inclusive o carregamento das
 * unidades. Isso já aconteceu e passou despercebido por muito tempo porque a
 * lista de unidades era fixa no HTML. Estes testes carregam o arquivo de
 * verdade no jsdom e garantem que o script roda sem erro e preenche o campo
 * "Unidade de Lotação".
 *
 * Rode com:  node --test test/form.test.js
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM, VirtualConsole } = require("jsdom");

const root = path.join(__dirname, "..");
const formHtml = fs.readFileSync(path.join(root, "solicitacao-ferias.html"), "utf8");

// Pega o conteúdo do único <script> sem atributos (o script do formulário).
const inlineScript = [...formHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)]
  .map(match => match[1])
  .join("\n");

// Monta o formulário no jsdom com um window.RH_SYNC falso (mesma API da produção)
// e devolve o que precisamos para inspecionar o resultado.
function loadForm({ sync, cache } = {}) {
  const virtualConsole = new VirtualConsole();
  const jsdomErrors = [];
  virtualConsole.on("jsdomError", error => jsdomErrors.push(String((error && error.message) || error)));

  const dom = new JSDOM(formHtml, {
    url: "https://rhr6.test/solicitacao-ferias.html?tipo=ferias",
    runScripts: "outside-only",
    pretendToBeVisual: true,
    virtualConsole
  });
  const { window } = dom;

  window.lucide = { createIcons() {} };
  window.RH_CONFIG = {
    googleAdminEmails: ["admin@teste"],
    notificationEmails: ["destino@teste"],
    escala: null,
    firebase: null
  };
  window.RH_SYNC = sync || { enabled: false };
  window.sessionStorage.setItem("brisa-demo-user", "admin");
  window.sessionStorage.setItem("brisa-demo-profile", JSON.stringify({ name: "Servidor Teste", email: "admin@teste" }));
  if (cache) window.localStorage.setItem("brisa-unidades-v2", JSON.stringify(cache));

  let thrown = null;
  try {
    window.eval(inlineScript);
  } catch (error) {
    thrown = error;
  }

  const select = window.document.getElementById("unidade");
  const options = select ? [...select.options].map(option => option.value).filter(Boolean) : null;
  return { window, thrown, jsdomErrors, options };
}

const cloudUnits = [
  { id: "1", name: "UNIDADE DA NUVEM A" },
  { id: "2", name: "UNIDADE DA NUVEM B" }
];

// Lista de funções gratificadas "da nuvem" (coleção pública própria).
const cloudFgFunctions = [
  { id: "f1", name: "Coordenador" },
  { id: "f2", name: "Diretor" },
  { id: "f3", name: "Chefe Administrativo" },
  { id: "f4", name: "Chefe de Segurança" }
];

function baseSync(overrides = {}) {
  return Object.assign({
    enabled: true,
    waitForAuth: () => Promise.resolve({ email: "admin@teste" }),
    loadRequests: () => Promise.resolve([]),
    addRequest: request => Promise.resolve(request),
    saveRequests: () => Promise.resolve(),
    loadDocs: collection => Promise.resolve(collection === "funcoesGratificadas" ? cloudFgFunctions : cloudUnits),
    getDoc: () => Promise.resolve(null),
    saveDocs: () => Promise.resolve(),
    deleteDoc: () => Promise.resolve()
  }, overrides);
}

test("o script do formulário roda sem erro em nível de topo", () => {
  const { thrown, jsdomErrors } = loadForm({ sync: baseSync() });
  assert.equal(thrown, null, `o script inline lançou: ${thrown && (thrown.stack || thrown.message)}`);
  assert.deepEqual(jsdomErrors, [], "o script gerou jsdomError");
});

test("as unidades vêm da nuvem pelo subscribeDocs (mesmo mecanismo do painel)", () => {
  const sync = baseSync({
    subscribeDocs: (collection, onData) => {
      if (collection === "unidades") onData(cloudUnits);
      return () => {};
    },
    subscribeRequests: () => () => {}
  });
  const { thrown, options } = loadForm({ sync });
  assert.equal(thrown, null);
  assert.deepEqual(options, ["UNIDADE DA NUVEM A", "UNIDADE DA NUVEM B"]);
});

test("as unidades caem para a reserva local quando a nuvem não responde", () => {
  const { thrown, options } = loadForm({
    sync: baseSync({ enabled: false }),
    cache: [{ id: "x", name: "UNIDADE DO CACHE" }]
  });
  assert.equal(thrown, null);
  assert.deepEqual(options, ["UNIDADE DO CACHE"]);
});

test("o campo de unidade existe e nunca fica preso a uma lista fixa", () => {
  const { window } = loadForm({ sync: baseSync({ enabled: false }) });
  const select = window.document.getElementById("unidade");
  assert.ok(select, "o select #unidade precisa existir");
  // A lista fixa de unidades foi removida: sem nuvem nem cache, começa vazio.
  assert.deepEqual([...select.options].map(o => o.value).filter(Boolean), []);
});

test("a pergunta de Função Gratificada é uma lista suspensa Sim/Não", () => {
  const { window, thrown } = loadForm({ sync: baseSync() });
  assert.equal(thrown, null);
  const select = window.document.getElementById("possui-fg");
  assert.ok(select, "o campo #possui-fg precisa existir");
  assert.equal(select.tagName, "SELECT", "#possui-fg deve ser um <select>, não um checkbox");
  assert.deepEqual([...select.options].map(option => option.value), ["", "sim"],
    "as opções devem ser Não (valor vazio) e Sim");
  assert.equal(select.options[0].textContent, "Não");
  assert.equal(select.options[1].textContent, "Sim");
  // Por padrão vem como "Não".
  assert.equal(select.value, "");
});

test("escolher 'Sim' na FG revela função exercida e substituto", () => {
  const { window, thrown } = loadForm({ sync: baseSync() });
  assert.equal(thrown, null);
  const select = window.document.getElementById("possui-fg");
  const functionField = window.document.getElementById("function-field");
  const substituteField = window.document.getElementById("substitute-field");
  const functionInput = window.document.getElementById("funcao-exercida");

  // Com "Não", os campos ficam ocultos e não obrigatórios.
  assert.ok(functionField.classList.contains("hidden"), "'Função exercida' deve começar oculta");
  assert.ok(substituteField.classList.contains("hidden"), "'Substituto' deve começar oculto");
  assert.equal(functionInput.required, false);

  select.value = "sim";
  select.dispatchEvent(new window.Event("change", { bubbles: true }));
  assert.ok(!functionField.classList.contains("hidden"), "ao escolher Sim, 'Função exercida' deve aparecer");
  assert.ok(!substituteField.classList.contains("hidden"), "ao escolher Sim, 'Substituto' deve aparecer");
  assert.equal(functionInput.required, true, "'Função exercida' deve ficar obrigatória");

  select.value = "";
  select.dispatchEvent(new window.Event("change", { bubbles: true }));
  assert.ok(functionField.classList.contains("hidden"), "voltar para Não deve ocultar de novo");
  assert.ok(substituteField.classList.contains("hidden"), "voltar para Não deve ocultar de novo");
  assert.equal(functionInput.required, false);
});

test("a função exercida é uma lista suspensa com as funções gratificadas", () => {
  const { window, thrown } = loadForm({ sync: baseSync() });
  assert.equal(thrown, null);
  const select = window.document.getElementById("funcao-exercida");
  assert.ok(select, "o campo #funcao-exercida precisa existir");
  assert.equal(select.tagName, "SELECT", "'Função exercida' deve ser uma lista, não texto livre");
  assert.deepEqual([...select.options].map(option => option.value),
    ["", "Coordenador", "Diretor", "Chefe Administrativo", "Chefe de Segurança"]);
});

test("a lista de funções gratificadas vem do cadastro da nuvem", () => {
  const lista = [
    { id: "x1", name: "Coordenador" },
    { id: "x2", name: "Chefe de Núcleo" },
    { id: "x3", name: "Diretor" }
  ];
  const sync = baseSync({
    subscribeDocs: (collection, onData) => {
      if (collection === "funcoesGratificadas") onData(lista);
      if (collection === "unidades") onData(cloudUnits);
      return () => {};
    },
    subscribeRequests: () => () => {}
  });
  const { window, thrown } = loadForm({ sync });
  assert.equal(thrown, null);
  const select = window.document.getElementById("funcao-exercida");
  assert.deepEqual([...select.options].map(option => option.value),
    ["", "Coordenador", "Chefe de Núcleo", "Diretor"]);
});

test("o bloco de Função Gratificada aparece em todos os tipos de solicitação", () => {
  const { window, thrown } = loadForm({ sync: baseSync() });
  assert.equal(thrown, null);
  const doc = window.document;
  for (const option of ["premio", "capacitacao", "medica", "outros"]) {
    doc.querySelector(`[data-option="${option}"]`).click();
    assert.ok(!doc.getElementById("fg-flag-field").classList.contains("hidden"),
      `a pergunta de FG deve aparecer no tipo "${option}"`);
  }

  // Com "Sim", a função exercida e o substituto aparecem mesmo fora das férias.
  const fg = doc.getElementById("possui-fg");
  fg.value = "sim";
  fg.dispatchEvent(new window.Event("change", { bubbles: true }));
  assert.ok(!doc.getElementById("function-field").classList.contains("hidden"));
  assert.ok(!doc.getElementById("substitute-field").classList.contains("hidden"));
  assert.equal(doc.getElementById("funcao-exercida").required, true);
});

test("solicitação de licença prêmio de quem tem FG grava a função exercida", () => {
  const added = [];
  const { window, thrown } = loadForm({
    sync: baseSync({ addRequest: request => { added.push(request); return Promise.resolve(request); } })
  });
  assert.equal(thrown, null);
  const doc = window.document;
  doc.querySelector('[data-option="premio"]').click();
  doc.getElementById("ciclo").value = "A";
  const fg = doc.getElementById("possui-fg");
  fg.value = "sim";
  fg.dispatchEvent(new window.Event("change", { bubbles: true }));
  doc.getElementById("funcao-exercida").value = "Diretor";
  doc.getElementById("substituto").value = "Maria Substituta";
  doc.getElementById("vacation-form").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));

  const saved = JSON.parse(window.localStorage.getItem("brisa-vacation-requests-v1") || "[]");
  assert.equal(saved.length, 1, "a solicitação deveria ser registrada");
  assert.equal(saved[0].funcaoExercida, "Diretor", "a função exercida deveria ir na solicitação");
  assert.equal(saved[0].substituto, "Maria Substituta");
  assert.equal(saved[0].temFG, true);
  assert.match(saved[0].type, /prêmio|premio/, "o tipo deveria ser a licença prêmio");
  assert.equal(saved[0].ciclo, "A");
});
