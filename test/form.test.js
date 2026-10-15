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

function baseSync(overrides = {}) {
  return Object.assign({
    enabled: true,
    waitForAuth: () => Promise.resolve({ email: "admin@teste" }),
    loadRequests: () => Promise.resolve([]),
    addRequest: request => Promise.resolve(request),
    saveRequests: () => Promise.resolve(),
    loadDocs: () => Promise.resolve(cloudUnits),
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
