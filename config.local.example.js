/*
 * Modelo de configuração local (NÃO versionada).
 *
 * Copie este arquivo para "config.local.js" e ajuste os valores.
 * Ele SOBRESCREVE o que estiver em config.js (configuração pública).
 * "config.local.js" está no .gitignore e NÃO deve ser enviado ao repositório.
 */
window.RH_CONFIG = Object.assign({}, window.RH_CONFIG, {
  // Senha inicial do administrador (usuário "centralrh").
  // Deixe de fora (ou vazio) para não haver senha padrão.
  initialAdminPassword: "defina-uma-senha-forte"

  // Opcional: sobrescrever valores públicos (normalmente definidos em config.js)
  // googleClientId: "SEU-CLIENT-ID.apps.googleusercontent.com",
  // googleAdminEmails: ["voce@exemplo.com"]
});
