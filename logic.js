/*
 * Funções puras (sem DOM) usadas pelo painel e pela página de solicitação.
 *
 * Este arquivo funciona tanto no navegador (define window.RH_LOGIC) quanto no
 * Node.js (module.exports), o que permite testá-lo automaticamente em
 * `tests/logic.test.js` sem precisar de navegador.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.RH_LOGIC = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  // Data no formato AAAA-MM-DD usando o fuso local (evita o deslocamento de
  // toISOString, que converte para UTC).
  function dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  // Equipe de plantão em uma data, conforme a rotação configurada.
  // escala = { equipes: [...], dataBase: "AAAA-MM-DD", cicloDias: n }
  function getShiftTeamForDate(dateString, escala) {
    const cfg = escala || {};
    const teams = Array.isArray(cfg.equipes) && cfg.equipes.length
      ? cfg.equipes
      : ["Bravo", "Charlie", "Delta", "Alfa"];
    const ciclo = Number(cfg.cicloDias) > 0 ? Math.floor(Number(cfg.cicloDias)) : teams.length;
    const base = String(cfg.dataBase || "2026-10-01");
    const startDate = new Date(`${base}T12:00:00`);
    const targetDate = new Date(`${dateString}T12:00:00`);

    if (Number.isNaN(targetDate.getTime()) || Number.isNaN(startDate.getTime()) || ciclo <= 0) {
      return "Escala";
    }

    const diffDays = Math.floor((targetDate - startDate) / 86400000);
    return teams[((diffDays % ciclo) + ciclo) % ciclo];
  }

  // Quantas células vazias antecedem o dia 1 para alinhar o calendário à
  // coluna correta do dia da semana (0 = domingo).
  function calendarLeadingEmptyCells(year, month) {
    return new Date(year, month, 1).getDay();
  }

  // Detecta sobreposição entre dois períodos (strings AAAA-MM-DD).
  function periodsOverlap(startA, endA, startB, endB) {
    if (!startA || !endA || !startB || !endB) return false;
    return startA <= endB && startB <= endA;
  }

  return { dateKey, getShiftTeamForDate, calendarLeadingEmptyCells, periodsOverlap };
});
