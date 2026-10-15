// Observação: o login por CPF/senha (fluxo legado) foi removido. O acesso ao
// sistema agora é feito exclusivamente com a conta Google (Firebase Auth).

function setFormMessage(element, message, isError = false) {
  element.textContent = message;
  element.classList.toggle("error", isError);
}

// Se o Firebase já tem uma sessão válida, redireciona automaticamente.
if (window.RH_SYNC && window.RH_SYNC.enabled) {
  window.RH_SYNC.waitForAuth().then(async user => {
    if (user && user.email) {
      const normalizedEmail = String(user.email).toLowerCase();
      const decision = await resolveGoogleRole(normalizedEmail, user.displayName);
      if (decision.allowed) {
        const role = decision.role;
        try {
          sessionStorage.setItem("brisa-demo-user", role);
          sessionStorage.setItem("brisa-demo-username", normalizedEmail);
          sessionStorage.setItem("brisa-demo-profile", JSON.stringify({ name: user.displayName || normalizedEmail, email: normalizedEmail, role }));
        } catch {}
        window.location.href = role === "admin" ? "index.html" : "solicitacao-ferias.html";
      }
    }
  }).catch(error => {
    console.warn("Não foi possível restaurar a sessão do Firebase:", error);
  });
}

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

async function registerPendingUser(email, name) {
  if (!window.RH_SYNC || !window.RH_SYNC.enabled) return false;
  try {
    await window.RH_SYNC.saveDocs("usuarios", [{
      id: email,
      name: name || email,
      email,
      perfil: "usuario",
      ativo: false,
      pendente: true,
      criadoEm: new Date().toISOString().slice(0, 10)
    }]);
    return true;
  } catch (error) {
    console.warn("Não foi possível registrar o acesso pendente:", error);
    return false;
  }
}

async function resolveGoogleRole(email, name) {
  const config = window.RH_CONFIG || {};
  const adminEmails = (config.googleAdminEmails || []).map(item => String(item).toLowerCase());
  if (adminEmails.includes(email)) return { role: "admin", allowed: true };
  if (!window.RH_SYNC || !window.RH_SYNC.enabled) return { role: "usuario", allowed: true };
  try {
    await window.RH_SYNC.waitForAuth();
    const match = window.RH_SYNC.getDoc
      ? await window.RH_SYNC.getDoc("usuarios", email)
      : (await window.RH_SYNC.loadDocs("usuarios")).find(user => String(user.email || user.id || "").toLowerCase() === email);
    if (match) {
      if (match.ativo === false) {
        return { role: "usuario", allowed: false, pending: match.pendente === true };
      }
      if (match.perfil === "admin") return { role: "admin", allowed: true };
      return { role: "usuario", allowed: true };
    }
    // E-mail novo: registra como pendente e bloqueia ate o administrador decidir.
    const registered = await registerPendingUser(email, name);
    return { role: "usuario", allowed: false, pending: true, registered };
  } catch (error) {
    console.warn("Falha ao consultar usuários no login:", error);
    return { role: "usuario", allowed: false, error: true };
  }
}

async function applyGoogleUser(email, verified, name) {
  const googleMessage = document.getElementById("google-message");
  const normalizedEmail = String(email || "").toLowerCase();
  if (!normalizedEmail || verified === false) {
    if (googleMessage) setFormMessage(googleMessage, "Não foi possível confirmar seu e-mail do Google.", true);
    return false;
  }
  const decision = await resolveGoogleRole(normalizedEmail, name);
  if (!decision.allowed) {
    // Encerra a sessão do Firebase para que um acesso pendente/bloqueado não
    // permaneça autenticado enquanto aguarda a decisão do administrador.
    if (window.RH_SYNC && window.RH_SYNC.enabled) {
      try { await window.RH_SYNC.signOut(); } catch { /* ignora */ }
    }
    if (googleMessage) {
      if (decision.pending) {
        setFormMessage(googleMessage, decision.registered === false
          ? "Sua solicitação de acesso não pôde ser enviada agora. Tente novamente em instantes."
          : "Solicitação enviada. Aguarde a aprovação do administrador para entrar.", true);
      } else if (decision.error) {
        setFormMessage(googleMessage, "Não foi possível verificar seu acesso agora. Tente novamente.", true);
      } else {
        setFormMessage(googleMessage, "Seu acesso está desativado. Fale com o administrador.", true);
      }
    }
    return false;
  }
  const role = decision.role;
  try {
    sessionStorage.setItem("brisa-demo-user", role);
    sessionStorage.setItem("brisa-demo-username", normalizedEmail);
    sessionStorage.setItem("brisa-demo-profile", JSON.stringify({ name: name || normalizedEmail, email: normalizedEmail, role }));
  } catch {
    if (googleMessage) setFormMessage(googleMessage, "Não foi possível iniciar a sessão neste navegador.", true);
    return false;
  }
  window.location.href = role === "admin" ? "index.html" : "solicitacao-ferias.html";
  return true;
}

async function handleGoogleCredential(response) {
  const googleMessage = document.getElementById("google-message");
  try {
    const payload = decodeJwtPayload(response.credential);
    const email = String(payload.email || "").toLowerCase();
    const verified = payload.email_verified === true || payload.email_verified === "true";
    if (window.RH_SYNC && window.RH_SYNC.enabled) {
      try {
        await window.RH_SYNC.signInWithGoogle(response.credential);
      } catch (error) {
        console.warn("Falha ao autenticar no Firebase:", error);
        if (googleMessage) setFormMessage(googleMessage, "Não foi possível autenticar no servidor. Tente novamente.", true);
        return;
      }
    }
    await applyGoogleUser(email, verified, payload.name);
  } catch {
    if (googleMessage) setFormMessage(googleMessage, "Falha ao processar o login do Google.", true);
  }
}

async function handleFirebasePopup() {
  const googleMessage = document.getElementById("google-message");
  if (googleMessage) setFormMessage(googleMessage, "Conectando ao Google...");
  try {
    const result = await window.RH_SYNC.signInWithPopup();
    const user = result.user || {};
    await applyGoogleUser(user.email, user.emailVerified !== false, user.displayName);
  } catch (error) {
    console.warn("Falha no login Google (Firebase):", error);
    const cancelled = error && (error.code === "auth/popup-closed-by-user" || error.code === "auth/cancelled-popup-request");
    if (googleMessage) setFormMessage(googleMessage, cancelled ? "" : "Não foi possível entrar com o Google. Tente novamente.", !cancelled);
  }
}

function setupGoogleSignIn() {
  const block = document.getElementById("google-block");
  const buttonHost = document.getElementById("google-signin-button");
  if (!block || !buttonHost) return;

  // Com o backend ativo, usa o login Google nativo do Firebase (popup).
  if (window.RH_SYNC && window.RH_SYNC.enabled) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "google-popup-button";
    button.innerHTML = '<span class="google-popup-icon" aria-hidden="true">G</span><span>Entrar com Google</span>';
    button.addEventListener("click", handleFirebasePopup);
    buttonHost.innerHTML = "";
    buttonHost.appendChild(button);
    block.hidden = false;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  // Sem Firebase: fluxo antigo via Google Identity Services.
  const clientId = (window.RH_CONFIG && window.RH_CONFIG.googleClientId) || "";
  if (!clientId) return;

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
