/*
 * Testes das funções puras (logic.js). Rodam com o test runner nativo do Node
 * (sem dependências):  node --test test/logic.test.js
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const logic = require("../logic.js");

test("dateKey usa o fuso local (não UTC)", () => {
  assert.equal(logic.dateKey(new Date(2026, 9, 15)), "2026-10-15");
  assert.equal(logic.dateKey(new Date(2026, 0, 1)), "2026-01-01");
  assert.equal(logic.dateKey(new Date(2026, 11, 31)), "2026-12-31");
  assert.equal(logic.dateKey(new Date(2026, 8, 9)), "2026-09-09");
});

test("calendarLeadingEmptyCells alinha o dia 1 ao dia da semana", () => {
  // 1º de outubro de 2026 é quinta-feira (4).
  assert.equal(logic.calendarLeadingEmptyCells(2026, 9), 4);
  // 1º de novembro de 2026 é domingo (0).
  assert.equal(logic.calendarLeadingEmptyCells(2026, 10), 0);
  // 1º de setembro de 2026 é terça-feira (2).
  assert.equal(logic.calendarLeadingEmptyCells(2026, 8), 2);
});

test("getShiftTeamForDate segue a rotação de 4 dias", () => {
  const escala = { equipes: ["Bravo", "Charlie", "Delta", "Alfa"], dataBase: "2026-10-01", cicloDias: 4 };
  assert.equal(logic.getShiftTeamForDate("2026-10-01", escala), "Bravo");
  assert.equal(logic.getShiftTeamForDate("2026-10-02", escala), "Charlie");
  assert.equal(logic.getShiftTeamForDate("2026-10-03", escala), "Delta");
  assert.equal(logic.getShiftTeamForDate("2026-10-04", escala), "Alfa");
  assert.equal(logic.getShiftTeamForDate("2026-10-05", escala), "Bravo");
  assert.equal(logic.getShiftTeamForDate("2026-10-15", escala), "Delta");
});

test("getShiftTeamForDate aceita datas antes da base (módulo positivo)", () => {
  const escala = { equipes: ["Bravo", "Charlie", "Delta", "Alfa"], dataBase: "2026-10-01", cicloDias: 4 };
  assert.equal(logic.getShiftTeamForDate("2026-09-30", escala), "Alfa");
  assert.equal(logic.getShiftTeamForDate("2026-09-29", escala), "Delta");
});

test("getShiftTeamForDate usa o padrão quando não há configuração", () => {
  assert.equal(logic.getShiftTeamForDate("2026-10-01"), "Bravo");
  assert.equal(logic.getShiftTeamForDate("data-invalida"), "Escala");
});

test("getShiftTeamForDate respeita uma escala diferente (3 equipes)", () => {
  const escala = { equipes: ["A", "B", "C"], dataBase: "2026-01-01", cicloDias: 3 };
  assert.equal(logic.getShiftTeamForDate("2026-01-01", escala), "A");
  assert.equal(logic.getShiftTeamForDate("2026-01-04", escala), "A");
  assert.equal(logic.getShiftTeamForDate("2026-01-05", escala), "B");
});

test("periodsOverlap detecta sobreposição de períodos", () => {
  assert.equal(logic.periodsOverlap("2026-10-01", "2026-10-10", "2026-10-05", "2026-10-15"), true);
  assert.equal(logic.periodsOverlap("2026-10-01", "2026-10-10", "2026-10-11", "2026-10-15"), false);
  assert.equal(logic.periodsOverlap("2026-10-01", "2026-10-10", "2026-09-01", "2026-09-30"), false);
  assert.equal(logic.periodsOverlap("2026-10-05", "2026-10-05", "2026-10-05", "2026-10-05"), true);
  assert.equal(logic.periodsOverlap("", "2026-10-10", "2026-10-01", "2026-10-05"), false);
});
