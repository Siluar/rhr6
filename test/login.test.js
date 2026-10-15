/*
 * Testes da decisão de acesso no login (login.js).
 *
 * Regra nova: qualquer conta Google com e-mail do domínio institucional
 * (@policiapenal.pr.gov.br) entra no formulário de solicitações SEM aprovação
 * manual. Contas de outros domínios continuam precisando de aprovação.
 *
 * Rode com:  node --test test/login.test.js
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const root = path.join(__dirname, "..");
const loginSource = fs.readFileSync(path.join(root, "login.js"), "utf8");

// Carrega login.js num jsdom limpo. O RH_SYNC é definido DEPOIS do eval para
// que o bloco de restauração de sessão do topo não interfira nos testes.
function loadLogin(config) {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "https://rhr6.test/login.html",
    runScripts: "outside-only"
  });
  const { window } = dom;
  window.RH_CONFIG = config || {
    googleAdminEmails: ["imc.sidnei@gmail.com"],
    accessDomain: "policiapenal.pr.gov.br"
  };
  window.eval(loginSource);
  return window;
}

function fakeSync({ doc = null, throwOnGet = false } = {}) {
  const saved = [];
  return {
    saved,
    sync: {
      enabled: true,
      waitForAuth: () => Promise.resolve({ email: "quem@teste" }),
      getDoc: () => {
        if (throwOnGet) return Promise.reject(new Error("sem rede"));
        return Promise.resolve(doc);
      },
      loadDocs: () => Promise.resolve(doc ? [doc] : []),
      saveDocs: (collection, docs) => {
        saved.push({ collection, docs });
        return Promise.resolve();
      },
      signOut: () => Promise.resolve()
    }
  };
}

test("isInstitutionalEmail reconhece o domínio institucional (sem diferenciar maiúsculas)", () => {
  const window = loadLogin();
  assert.equal(window.isInstitutionalEmail("fulano@policiapenal.pr.gov.br"), true);
  assert.equal(window.isInstitutionalEmail("FULANO@PoliciaPenal.PR.GOV.BR"), true);
  assert.equal(window.isInstitutionalEmail("  beltrano@policiapenal.pr.gov.br  "), true);
  assert.equal(window.isInstitutionalEmail("fulano@gmail.com"), false);
  assert.equal(window.isInstitutionalEmail("fulano@policiapenal.pr.gov.br.evil.com"), false);
  assert.equal(window.isInstitutionalEmail(""), false);
  assert.equal(window.isInstitutionalEmail(null), false);
});

test("e-mail administrador continua entrando como admin", async () => {
  const window = loadLogin();
  const { sync } = fakeSync();
  window.RH_SYNC = sync;
  const decision = await window.resolveGoogleRole("imc.sidnei@gmail.com", "Sidnei");
  // Nota: o objeto vem do realm do jsdom, então comparamos campo a campo.
  assert.equal(decision.role, "admin");
  assert.equal(decision.allowed, true);
});

test("e-mail institucional novo entra como usuário, SEM aprovação, e fica ativo no cadastro", async () => {
  const window = loadLogin();
  const { sync, saved } = fakeSync({ doc: null });
  window.RH_SYNC = sync;

  const decision = await window.resolveGoogleRole("novato@policiapenal.pr.gov.br", "Novato");

  assert.equal(decision.role, "usuario");
  assert.equal(decision.allowed, true, "e-mail institucional não deve ficar pendente");
  assert.equal(saved.length, 1, "deve registrar o cadastro para o painel");
  assert.equal(saved[0].collection, "usuarios");
  assert.equal(saved[0].docs[0].ativo, true, "o cadastro institucional deve nascer ativo");
  assert.equal(saved[0].docs[0].pendente, false);
  assert.equal(saved[0].docs[0].perfil, "usuario");
});

test("e-mail institucional que estava pendente é liberado e reativado", async () => {
  const window = loadLogin();
  const { sync, saved } = fakeSync({
    doc: { id: "antigo@policiapenal.pr.gov.br", email: "antigo@policiapenal.pr.gov.br", ativo: false, pendente: true }
  });
  window.RH_SYNC = sync;

  const decision = await window.resolveGoogleRole("antigo@policiapenal.pr.gov.br", "Antigo");

  assert.equal(decision.allowed, true);
  assert.equal(saved.length, 1, "deve reativar o cadastro pendente");
  assert.equal(saved[0].docs[0].ativo, true);
});

test("e-mail institucional já ativo não regrava o cadastro", async () => {
  const window = loadLogin();
  const { sync, saved } = fakeSync({
    doc: { id: "ativo@policiapenal.pr.gov.br", email: "ativo@policiapenal.pr.gov.br", ativo: true, pendente: false, perfil: "usuario" }
  });
  window.RH_SYNC = sync;

  const decision = await window.resolveGoogleRole("ativo@policiapenal.pr.gov.br", "Ativo");

  assert.equal(decision.allowed, true);
  assert.equal(saved.length, 0, "não deve regravar quem já está ativo");
});

test("perfil admin cadastrado no painel vale mesmo fora do domínio", async () => {
  const window = loadLogin();
  const { sync } = fakeSync({ doc: { id: "chefe@gmail.com", email: "chefe@gmail.com", perfil: "admin", ativo: true } });
  window.RH_SYNC = sync;

  const decision = await window.resolveGoogleRole("chefe@gmail.com", "Chefe");
  assert.equal(decision.role, "admin");
  assert.equal(decision.allowed, true);
});

test("e-mail de fora do domínio continua aguardando aprovação", async () => {
  const window = loadLogin();
  const { sync, saved } = fakeSync({ doc: null });
  window.RH_SYNC = sync;

  const decision = await window.resolveGoogleRole("estranho@gmail.com", "Estranho");

  assert.equal(decision.allowed, false, "fora do domínio precisa de aprovação");
  assert.equal(decision.pending, true);
  assert.equal(saved[0].docs[0].ativo, false, "cadastro externo nasce inativo/pendente");
});

test("e-mail de fora do domínio inativo continua bloqueado", async () => {
  const window = loadLogin();
  const { sync } = fakeSync({ doc: { id: "bloqueado@gmail.com", email: "bloqueado@gmail.com", ativo: false, pendente: false } });
  window.RH_SYNC = sync;

  const decision = await window.resolveGoogleRole("bloqueado@gmail.com", "Bloqueado");
  assert.equal(decision.allowed, false);
});

test("falha de rede não barra o e-mail institucional", async () => {
  const window = loadLogin();
  const { sync } = fakeSync({ throwOnGet: true });
  window.RH_SYNC = sync;

  const decision = await window.resolveGoogleRole("fulano@policiapenal.pr.gov.br", "Fulano");
  assert.equal(decision.allowed, true);
});

test("sem Firebase habilitado todo mundo entra (modo local)", async () => {
  const window = loadLogin();
  window.RH_SYNC = { enabled: false };
  const decision = await window.resolveGoogleRole("qualquer@gmail.com", "Qualquer");
  assert.equal(decision.role, "usuario");
  assert.equal(decision.allowed, true);
});
