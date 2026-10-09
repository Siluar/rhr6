const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const formMessage = document.getElementById("form-message");
const passwordToggle = document.querySelector(".password-toggle");
const rememberEmail = document.querySelector('input[name="remember"]');
const signupToggle = document.getElementById("signup-toggle");
const signupForm = document.getElementById("signup-form");
const signupMessage = document.getElementById("signup-message");
const loginTitle = document.getElementById("login-title");
const loginDescription = document.getElementById("login-description");
const isIntranetPage = window.location.pathname.toLowerCase().endsWith("intranet.html");
const serverAccountsStorageKey = "brisa-server-accounts-v1";
const serverDataStorageKey = "brisa-server-personal-data-v1";
const adminPasswordStorageKey = "brisa-admin-password-v1";
const initialAdminPassword = (window.RH_CONFIG && window.RH_CONFIG.initialAdminPassword) || "";
const signupCargo = document.getElementById("signup-cargo");
const signupQuadro = document.getElementById("signup-quadro");

if (signupForm) signupForm.querySelectorAll("input, select, button").forEach(control => { control.disabled = true; });
if (isIntranetPage && signupToggle) signupToggle.hidden = true;

function getQuadroForCargo(cargo) {
  if (cargo === "Policial Penal") return "QPPP";
  if (cargo === "Agente de Execução" || cargo === "Agente Profissional") return "QPPE";
  return "";
}

function syncSignupQuadro() {
  const quadro = getQuadroForCargo(signupCargo.value);
  signupQuadro.value = quadro;
  signupQuadro.disabled = true;
}

if (signupCargo && signupQuadro) {
  signupCargo.addEventListener("change", syncSignupQuadro);
  syncSignupQuadro();
}

function toHex(bytes) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

async function hashServerPassword(password, saltHex) {
  if (!crypto.subtle) throw new Error("Criptografia segura indisponível neste navegador.");
  const salt = new Uint8Array(saltHex.match(/.{2}/g).map(value => Number.parseInt(value, 16)));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const digest = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" }, key, 256);
  return toHex(new Uint8Array(digest));
}

function readStoredArray(key, failureMessage) {
  const saved = localStorage.getItem(key);
  if (!saved) return [];
  const parsed = JSON.parse(saved);
  if (!Array.isArray(parsed)) throw new Error(failureMessage);
  return parsed.filter(item => item && typeof item === "object");
}

function setFormMessage(element, message, isError = false) {
  element.textContent = message;
  element.classList.toggle("error", isError);
}

function digitsOnly(value) {
  return value.replace(/\D/g, "");
}

function getAccountRole(account) {
  if (account?.role === "both") return "both";
  return account?.role === "admin" ? "admin" : "usuario";
}

function chooseAccessRole(role) {
  const selectedRole = role === "admin" ? "admin" : "usuario";
  try {
    sessionStorage.setItem("brisa-demo-user", selectedRole);
    const profile = JSON.parse(sessionStorage.getItem("brisa-demo-profile") || "null");
    if (profile && typeof profile === "object") {
      profile.role = selectedRole;
      sessionStorage.setItem("brisa-demo-profile", JSON.stringify(profile));
    }
  } catch {
    setFormMessage(formMessage, "Não foi possível salvar a opção de acesso nesta sessão.", true);
    return;
  }
  document.getElementById("access-choice-dialog")?.close();
  window.location.href = selectedRole === "admin" ? "index.html" : "solicitacao-ferias.html";
}

function getLocalDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

try {
  const savedCpf = localStorage.getItem("brisa-demo-email");
  if (savedCpf) {
    emailInput.value = savedCpf;
    rememberEmail.checked = true;
  }
} catch {}

passwordToggle.addEventListener("click", () => {
  const shouldShow = passwordInput.type === "password";
  passwordInput.type = shouldShow ? "text" : "password";
  passwordToggle.setAttribute("aria-label", shouldShow ? "Ocultar senha" : "Mostrar senha");
  passwordToggle.setAttribute("aria-pressed", String(shouldShow));
  passwordToggle.innerHTML = `<i data-lucide="${shouldShow ? "eye-off" : "eye"}"></i>`;
  if (window.lucide) window.lucide.createIcons();
});

if (signupToggle && signupForm) {
  signupToggle.addEventListener("click", () => {
    const isSignup = signupForm.hidden;
    signupForm.hidden = !isSignup;
    loginForm.hidden = isSignup;
    loginForm.querySelectorAll("input, select, button").forEach(control => { control.disabled = isSignup; });
    signupForm.querySelectorAll("input, select, button").forEach(control => {
      control.disabled = !isSignup || control === signupQuadro;
    });
    signupToggle.textContent = isSignup ? "Já tem cadastro? Entrar" : "Não tem cadastro? Cadastre-se";
    signupToggle.setAttribute("aria-expanded", String(isSignup));
    loginTitle.textContent = isSignup ? "Criar cadastro" : "Entrar no sistema";
    loginDescription.textContent = isSignup ? "Preencha seus dados para criar sua conta." : "Informe suas credenciais institucionais.";
    setFormMessage(formMessage, "");
    setFormMessage(signupMessage, "");
  });
}

async function submitCredentials(username, password) {
  setFormMessage(formMessage, "Autenticando...");
  const normalizedUsername = username.toLowerCase();
  const cpfDigits = digitsOnly(username);
  let isAdmin = false;
  if (normalizedUsername === "centralrh") {
    try {
      const savedCredential = localStorage.getItem(adminPasswordStorageKey);
      if (savedCredential) {
        const credential = JSON.parse(savedCredential);
        isAdmin = Boolean(credential?.salt && credential?.passwordHash)
          && await hashServerPassword(password, credential.salt) === credential.passwordHash;
      } else {
        isAdmin = password === initialAdminPassword;
      }
    } catch {
      setFormMessage(formMessage, "Não foi possível validar a senha administrativa neste navegador.", true);
      return null;
    }
  }
  let serverAccount = null;

  if (!isAdmin && !isIntranetPage) {
    let accounts;
    try {
      accounts = readStoredArray(serverAccountsStorageKey, "O cadastro de usuários está inválido.");
      serverAccount = accounts.find(account => digitsOnly(String(account.cpf || "")) === cpfDigits) || null;
    } catch {
      setFormMessage(formMessage, "Não foi possível carregar o cadastro de usuários neste navegador.", true);
      return null;
    }

    if (!/^\d{11}$/.test(cpfDigits) || !serverAccount || !serverAccount.passwordHash || !serverAccount.salt) {
      serverAccount = null;
    } else {
      try {
        if (await hashServerPassword(password, serverAccount.salt) !== serverAccount.passwordHash) serverAccount = null;
      } catch {
        setFormMessage(formMessage, "Não foi possível validar a senha neste navegador.", true);
        return null;
      }
    }
  }

  if ((isIntranetPage && !isAdmin) || (!isAdmin && !serverAccount)) {
    setFormMessage(formMessage, "Credenciais inválidas.", true);
    return null;
  }

  const userRole = isAdmin ? "admin" : getAccountRole(serverAccount);

  try {
    sessionStorage.setItem("brisa-demo-user", userRole);
    if (serverAccount) {
      sessionStorage.setItem("brisa-demo-username", serverAccount.username);
      sessionStorage.setItem("brisa-demo-profile", JSON.stringify({ name: serverAccount.name, cpf: serverAccount.cpf, role: userRole }));
    } else if (isAdmin) {
      sessionStorage.setItem("brisa-demo-username", "centralrh");
      sessionStorage.removeItem("brisa-demo-profile");
    } else {
      sessionStorage.removeItem("brisa-demo-username");
      sessionStorage.removeItem("brisa-demo-profile");
    }
    if (rememberEmail.checked) localStorage.setItem("brisa-demo-email", username);
    else localStorage.removeItem("brisa-demo-email");
  } catch {
    setFormMessage(formMessage, "Não foi possível iniciar a sessão neste navegador.", true);
    return null;
  }

  return userRole;
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  const username = emailInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    setFormMessage(formMessage, "Informe CPF e senha.", true);
    return;
  }

  const loggedUser = await submitCredentials(username, password);
  if (!loggedUser) return;
  if (loggedUser === "both") {
    setFormMessage(formMessage, "Escolha como deseja acessar o sistema.");
    document.getElementById("access-choice-dialog")?.showModal();
    return;
  }

  setFormMessage(formMessage, loggedUser === "admin" ? "Acessando o painel administrativo..." : "Acessando o sistema...");
  window.location.href = loggedUser === "admin" ? "index.html" : "solicitacao-ferias.html";
});

document.querySelectorAll("[data-access-role]").forEach(button => {
  button.addEventListener("click", () => chooseAccessRole(button.dataset.accessRole));
});

if (signupForm) signupForm.addEventListener("submit", async event => {
  event.preventDefault();
  setFormMessage(signupMessage, "Criando seu cadastro...");

  const formData = new FormData(signupForm);
  const name = String(formData.get("name") || "").trim();
  const cpf = String(formData.get("cpf") || "").trim();
  const cpfDigits = digitsOnly(cpf);
  const rg = String(formData.get("rg") || "").trim();
  const birthDate = String(formData.get("birthDate") || "");
  const phone = String(formData.get("phone") || "").trim();
  const phoneDigits = digitsOnly(phone);
  const email = String(formData.get("email") || "").trim();
  const unidadePenal = String(formData.get("unidadePenal") || "").trim();
  const cargo = String(formData.get("cargo") || "").trim();
  const quadro = getQuadroForCargo(cargo);
  const password = String(formData.get("password") || "");
  const passwordConfirm = String(formData.get("passwordConfirm") || "");

  if (!quadro) {
    setFormMessage(signupMessage, "Selecione um cargo válido para definir o quadro correspondente.", true);
    return;
  }
  if (!/^\d{11}$/.test(cpfDigits)) {
    setFormMessage(signupMessage, "Informe um CPF com 11 dígitos.", true);
    return;
  }
  if (!/^\d{10,11}$/.test(phoneDigits)) {
    setFormMessage(signupMessage, "Informe um telefone celular com DDD.", true);
    return;
  }
  if (birthDate > getLocalDateKey()) {
    setFormMessage(signupMessage, "A data de nascimento não pode ser futura.", true);
    return;
  }
  if (password !== passwordConfirm) {
    setFormMessage(signupMessage, "As senhas informadas não coincidem.", true);
    return;
  }

  let accounts;
  let personalData;
  let previousAccounts;
  let previousPersonalData;
  try {
    previousAccounts = localStorage.getItem(serverAccountsStorageKey);
    previousPersonalData = localStorage.getItem(serverDataStorageKey);
    accounts = readStoredArray(serverAccountsStorageKey, "O cadastro de usuários está inválido.");
    personalData = readStoredArray(serverDataStorageKey, "O cadastro de dados dos servidores está inválido.");
  } catch {
    setFormMessage(signupMessage, "Não foi possível carregar os cadastros neste navegador.", true);
    return;
  }

  const existingAccountIndex = accounts.findIndex(account => digitsOnly(String(account.cpf || "")) === cpfDigits);
  const existingAccount = existingAccountIndex >= 0 ? accounts[existingAccountIndex] : null;
  if (existingAccount?.passwordHash) {
    setFormMessage(signupMessage, "Já existe uma conta cadastrada com esse CPF. Faça login com sua senha.", true);
    return;
  }
  if (personalData.some(record => String(record.email || "").toLocaleLowerCase("pt-BR") === email.toLocaleLowerCase("pt-BR") && digitsOnly(String(record.cpf || "")) !== cpfDigits)) {
    setFormMessage(signupMessage, "Esse e-mail institucional já está vinculado a outro CPF.", true);
    return;
  }

  try {
    const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
    const passwordHash = await hashServerPassword(password, salt);
    const userRole = getAccountRole(existingAccount);
    const account = { ...(existingAccount || {}), username: cpfDigits, name, cpf, role: userRole, salt, passwordHash };
    const personalRecord = { id: crypto.randomUUID(), name, cpf, rg, birthDate, phone, email, unidadePenal, cargo, quadro };
    const existingPersonalRecordIndex = personalData.findIndex(record => digitsOnly(String(record.cpf || "")) === cpfDigits);

    if (existingAccountIndex >= 0) accounts[existingAccountIndex] = account;
    else accounts.push(account);
    if (existingPersonalRecordIndex >= 0) personalData[existingPersonalRecordIndex] = { ...personalData[existingPersonalRecordIndex], ...personalRecord };
    else personalData.push(personalRecord);

    localStorage.setItem(serverAccountsStorageKey, JSON.stringify(accounts));
    localStorage.setItem(serverDataStorageKey, JSON.stringify(personalData));
  } catch {
    try {
      if (previousAccounts === null) localStorage.removeItem(serverAccountsStorageKey);
      else localStorage.setItem(serverAccountsStorageKey, previousAccounts);
      if (previousPersonalData === null) localStorage.removeItem(serverDataStorageKey);
      else localStorage.setItem(serverDataStorageKey, previousPersonalData);
    } catch {
      setFormMessage(signupMessage, "O cadastro falhou e não foi possível restaurar os dados anteriores. Verifique os dados salvos neste navegador.", true);
      return;
    }
    setFormMessage(signupMessage, "Não foi possível salvar seu cadastro neste navegador.", true);
    return;
  }

  try {
    const userRole = getAccountRole(existingAccount);
    sessionStorage.setItem("brisa-demo-user", userRole);
    sessionStorage.setItem("brisa-demo-username", cpfDigits);
    sessionStorage.setItem("brisa-demo-profile", JSON.stringify({ name, cpf, role: userRole, rg, birthDate, phone, email, unidadePenal, cargo, quadro }));
    if (rememberEmail.checked) localStorage.setItem("brisa-demo-email", cpf);
    else localStorage.removeItem("brisa-demo-email");
  } catch {
    setFormMessage(signupMessage, "Cadastro salvo. Não foi possível iniciar a sessão; entre com seu CPF e senha.", true);
    return;
  }

  const userRole = getAccountRole(existingAccount);
  if (userRole === "both") {
    setFormMessage(signupMessage, "Cadastro concluído. Escolha como deseja acessar o sistema.");
    document.getElementById("access-choice-dialog")?.showModal();
    return;
  }
  setFormMessage(signupMessage, userRole === "admin" ? "Cadastro concluído. Acessando o painel administrativo..." : "Cadastro concluído. Acessando o sistema...");
  window.location.href = userRole === "admin" ? "index.html" : "solicitacao-ferias.html";
});

// ---- Login com Google (Google Identity Services) ----

function decodeJwtPayload(token) {
  const part = String(token || "").split(".")[1];
  if (!part) throw new Error("Token inválido.");
  const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const json = decodeURIComponent(
    Array.from(binary, char => "%" + char.charCodeAt(0).toString(16).padStart(2, "0")).join("")
  );
  return JSON.parse(json);
}

function handleGoogleCredential(response) {
  const googleMessage = document.getElementById("google-message");
  try {
    const payload = decodeJwtPayload(response.credential);
    const email = String(payload.email || "").toLowerCase();
    const verified = payload.email_verified === true || payload.email_verified === "true";
    if (!email || !verified) {
      if (googleMessage) setFormMessage(googleMessage, "Não foi possível confirmar seu e-mail do Google.", true);
      return;
    }
    const config = window.RH_CONFIG || {};
    const adminEmails = (config.googleAdminEmails || []).map(item => String(item).toLowerCase());
    const role = adminEmails.includes(email) ? "admin" : "usuario";
    try {
      sessionStorage.setItem("brisa-demo-user", role);
      sessionStorage.setItem("brisa-demo-username", email);
      sessionStorage.setItem("brisa-demo-profile", JSON.stringify({ name: payload.name || email, email, role }));
    } catch {
      if (googleMessage) setFormMessage(googleMessage, "Não foi possível iniciar a sessão neste navegador.", true);
      return;
    }
    window.location.href = role === "admin" ? "index.html" : "solicitacao-ferias.html";
  } catch {
    if (googleMessage) setFormMessage(googleMessage, "Falha ao processar o login do Google.", true);
  }
}

function setupGoogleSignIn() {
  const block = document.getElementById("google-block");
  const buttonHost = document.getElementById("google-signin-button");
  const clientId = (window.RH_CONFIG && window.RH_CONFIG.googleClientId) || "";
  if (!block || !buttonHost || !clientId) return;

  const tryRender = () => {
    if (!(window.google && window.google.accounts && window.google.accounts.id)) {
      window.setTimeout(tryRender, 150);
      return;
    }
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleCredential
    });
    window.google.accounts.id.renderButton(buttonHost, {
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "rectangular",
      width: 320
    });
    block.hidden = false;
    if (window.lucide) window.lucide.createIcons();
  };
  tryRender();
}

setupGoogleSignIn();

if (window.lucide) window.lucide.createIcons();
