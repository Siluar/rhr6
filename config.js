/*
 * Configuração PÚBLICA (versionada).
 *
 * NÃO coloque segredos aqui — este arquivo vai para o repositório.
 * Use apenas valores que podem ser públicos, como o Client ID do Google
 * (que não é segredo: todo site com login Google expõe o dele).
 *
 * Observação: "config.local.js" NÃO é mais carregado pelas páginas (por não ser
 * versionado, gerava 404 no site publicado). O login administrativo é feito
 * pelo Google; não há mais senha padrão de administrador.
 */
window.RH_CONFIG = Object.assign({}, window.RH_CONFIG, {
  // Client ID do Google OAuth (tipo "Aplicativo da Web").
  googleClientId: "367687879133-t5cp1h2pgq64qqglv1405bpr3g1ikdcr.apps.googleusercontent.com",

  // E-mails do Google que entram como administrador (proprietários).
  googleAdminEmails: [
    "imc.sidnei@gmail.com",
    "sidnei@policiapenal.pr.gov.br"
  ],

  // Domínio institucional. Qualquer conta Google com este domínio entra no
  // formulário de solicitações SEM precisar de aprovação manual.
  accessDomain: "policiapenal.pr.gov.br",

  // Escala de trabalho (24h de serviço por 72h de descanso).
  // - equipes: ordem das equipes na rotação.
  // - dataBase: data (AAAA-MM-DD) em que a primeira equipe da lista está de serviço.
  // - cicloDias: de quantos em quantos dias a equipe muda (4 = 24h trabalhadas + 72h de descanso).
  // Ajuste estes valores quando a escala real mudar — não é mais necessário mexer no código.
  escala: {
    equipes: ["Bravo", "Charlie", "Delta", "Alfa"],
    dataBase: "2026-10-01",
    cicloDias: 4
  },

  // Funções gratificadas disponíveis no cadastro de Função Gratificada do
  // painel e no formulário de solicitações. Para incluir outra função, basta
  // acrescentar aqui.
  fgFunctions: [
    "Coordenador",
    "Diretor",
    "Chefe Administrativo",
    "Chefe de Segurança"
  ],

  // Configuracao do Firebase (Console > Configuracoes do projeto > Seus apps > Web).
  // Enquanto estiver null, o app usa apenas o armazenamento local do navegador.
  firebase: {
    apiKey: "AIzaSyAETanh8tzlMUA3yDV-ZrEH-KTkn4cecYo",
    authDomain: "rhr6-5b275.firebaseapp.com",
    projectId: "rhr6-5b275",
    storageBucket: "rhr6-5b275.firebasestorage.app",
    messagingSenderId: "1042158027390",
    appId: "1:1042158027390:web:f8d88c64722178d9704e2f",
    measurementId: "G-VDC22YZ20F"
  }

  // A senha inicial do administrador e valores locais NÃO são mais carregados:
  // as páginas não incluem "config.local.js" (ele 404 no site publicado). O
  // acesso administrativo é exclusivamente pelo login com Google.
});
