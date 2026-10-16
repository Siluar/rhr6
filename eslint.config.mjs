import globals from "globals";

// Regra central: pegar variáveis não declaradas (ReferenceError em produção).
// O bug real foi uma variável usada sem declaração — o linter pega esse tipo
// de erro antes de chegar no navegador.
const baseRules = {
  "no-undef": "error",
  "no-unused-vars": ["warn", { args: "none", varsIgnorePattern: "^_", caughtErrors: "none" }],
  "no-empty": ["error", { allowEmptyCatch: true }]
};

export default [
  {
    ignores: ["node_modules/**", "**/*.min.js", "eslint.config.mjs"]
  },
  {
    files: ["app.js", "config.js", "config.local.example.js", "config.local.js", "logic.js", "login.js", "firebase-sync.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        ...globals.browser,
        firebase: "readonly",
        module: "readonly",
        lucide: "readonly",
        XLSX: "readonly",
        emailjs: "readonly"
      }
    },
    rules: baseRules
  },
  {
    files: ["test/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        ...globals.node
      }
    },
    rules: baseRules
  }
];
