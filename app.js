const monthNames = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const weekdays = ["D", "S", "T", "Q", "Q", "S", "S"];
const calendarScale = { width: 24, height: 72 };
const calendarMaxMonth = new Date(2028, 0, 1);
const avatarColors = ["#728e70", "#bd785e", "#718da0", "#a58a58", "#8a7798", "#5f917f", "#c38174", "#7c8764", "#a77b57", "#688b98", "#a06a69", "#8b9369"];
const people = [
  { id: "luiza", name: "Luiza Martins", initials: "LM", role: "Design", balance: 18, next: "05 out – 09 out", status: "Férias", color: avatarColors[0] },
  { id: "caio", name: "Caio Almeida", initials: "CA", role: "Produto", balance: 12, next: "28 set – 02 out", status: "Férias", color: avatarColors[1] },
  { id: "marina", name: "Marina Costa", initials: "MC", role: "Engenharia", balance: 22, next: "12 out – 16 out", status: "Ativa", color: avatarColors[2] },
  { id: "pedro", name: "Pedro Nunes", initials: "PN", role: "Marketing", balance: 15, next: "A definir", status: "Ativa", color: avatarColors[3] },
  { id: "sofia", name: "Sofia Rocha", initials: "SR", role: "Design", balance: 20, next: "19 out – 23 out", status: "Ativa", color: avatarColors[4] },
  { id: "rafael", name: "Rafael Lima", initials: "RL", role: "Engenharia", balance: 8, next: "A definir", status: "Ativa", color: avatarColors[5] },
  { id: "bia", name: "Beatriz Souza", initials: "BS", role: "Produto", balance: 25, next: "02 nov – 06 nov", status: "Ativa", color: avatarColors[6] },
  { id: "davi", name: "Davi Ferreira", initials: "DF", role: "Marketing", balance: 14, next: "A definir", status: "Ativa", color: avatarColors[7] },
  { id: "helena", name: "Helena Prado", initials: "HP", role: "Design", balance: 19, next: "09 nov – 13 nov", status: "Ativa", color: avatarColors[8] },
  { id: "igor", name: "Igor Mendes", initials: "IM", role: "Engenharia", balance: 11, next: "A definir", status: "Ativa", color: avatarColors[9] },
  { id: "nina", name: "Nina Carvalho", initials: "NC", role: "Produto", balance: 17, next: "A definir", status: "Ativa", color: avatarColors[10] },
  { id: "enzo", name: "Enzo Barros", initials: "EB", role: "Engenharia", balance: 21, next: "A definir", status: "Ativa", color: avatarColors[11] }
];
const seedRequests = [
  { id: "r0", person: "Bravo", initials: "BR", color: avatarColors[0], start: "2026-10-01", end: "2026-10-01", days: 1, note: "24h de trabalho • 72h de descanso", created: "Turno ativo", status: "approved" },
  { id: "r1", person: "Charlie", initials: "CH", color: avatarColors[1], start: "2026-10-02", end: "2026-10-02", days: 1, note: "24h de trabalho • 72h de descanso", created: "Turno ativo", status: "pending" },
  { id: "r2", person: "Delta", initials: "DE", color: avatarColors[2], start: "2026-10-03", end: "2026-10-03", days: 1, note: "24h de trabalho • 72h de descanso", created: "Turno ativo", status: "approved" },
  { id: "r3", person: "Alfa", initials: "AL", color: avatarColors[3], start: "2026-10-04", end: "2026-10-04", days: 1, note: "24h de trabalho • 72h de descanso", created: "Turno ativo", status: "pending" },
  { id: "r4", person: "Bravo", initials: "BR", color: avatarColors[0], start: "2026-10-12", end: "2026-10-12", days: 1, note: "Cobertura de plantão", created: "Escala semanal", status: "pending" },
  { id: "r5", person: "Alpha", initials: "AL", color: avatarColors[3], start: "2026-10-19", end: "2026-10-19", days: 1, note: "Cobertura de plantão", created: "Escala semanal", status: "pending" },
  { id: "r6", person: "Charlie", initials: "CH", color: avatarColors[1], start: "2026-11-09", end: "2026-11-09", days: 1, note: "Cobertura de plantão", created: "Escala semanal", status: "pending" },
  { id: "r7", person: "Delta", initials: "DE", color: avatarColors[2], start: "2026-10-05", end: "2026-10-05", days: 1, note: "Cobertura de plantão", created: "Escala semanal", status: "approved" },
  { id: "r8", person: "Bravo", initials: "BR", color: avatarColors[0], start: "2026-11-02", end: "2026-11-02", days: 1, note: "Cobertura de plantão", created: "Escala semanal", status: "approved" }
];
const storageKey = "brisa-vacation-requests-v1";
const taskStorageKey = "brisa-tasks-v1";
const fgRosterStorageKey = "brisa-fg-server-roster-v1";
const serverAccountsStorageKey = "brisa-server-accounts-v1";
const adminPasswordStorageKey = "brisa-admin-password-v1";
const initialAdminPassword = (window.RH_CONFIG && window.RH_CONFIG.initialAdminPassword) || "";
const serverDataStorageKey = "brisa-server-personal-data-v1";
const usuariosStorageKey = "brisa-usuarios-v1";
const requestAttachmentsDatabaseName = "brisa-request-attachments-v1";
const requestAttachmentsStoreName = "attachments";
let requests = [];
let tasks = loadTasks();
let fgServerRoster = loadFgServerRoster();
let serverAccounts = loadServerAccounts();
let serverPersonalData = loadServerPersonalData();
let usuarios = loadLocalUsuarios();
let editingUsuarioId = null;
let editingRequestId = null;
let shownMonth = new Date(2026, 9, 1);
let shownTaskMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let selectedTaskDate = null;
let selectedDate = null;
let requestFilter = "pending";
let selectedReportYear = String(new Date().getFullYear());
let selectedReportUnit = "";
let selectedVacationMonth = String(new Date().getMonth());
let selectedVacationYear = String(new Date().getFullYear());
let selectedCapacitacaoMonth = "";
let selectedEspecialMonth = "";
let toastTimer;

function loadRequests() {
  if (window.RH_SYNC && window.RH_SYNC.enabled) {
    return window.RH_SYNC.loadRequests()
      .then(list => (list.length ? list : legacyLoadRequests()).map(normalizeRequest))
      .catch(error => {
        console.warn("Falha ao carregar as solicitações do Firestore:", error);
        showToast("Não foi possível carregar as solicitações online.");
        return legacyLoadRequests();
      });
  }
  return Promise.resolve(legacyLoadRequests());
}

function saveRequests() {
  let localFailed = false;
  try {
    localStorage.setItem(storageKey, JSON.stringify(requests));
  } catch {
    localFailed = true;
  }
  if (window.RH_SYNC && window.RH_SYNC.enabled) {
    window.RH_SYNC.saveRequests(requests).catch(error => {
      console.warn("Falha ao salvar no Firestore:", error);
      showToast("Falha ao salvar online. Verifique a conexão e as regras do Firestore.");
    });
    return true;
  }
  if (localFailed) {
    showToast("Não foi possível salvar neste navegador.");
    return false;
  }
  return true;
}

function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(taskStorageKey) || "[]");
    return Array.isArray(saved)
      ? saved.filter(task => task && typeof task.id === "string" && typeof task.title === "string").map(task => ({ ...task, date: isIsoDate(task.date) ? task.date : "", completed: Boolean(task.completed) }))
      : [];
  } catch {
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(taskStorageKey, JSON.stringify(tasks));
    return true;
  } catch {
    showToast("Não foi possível salvar as tarefas neste navegador.");
    return false;
  }
}

function renderTasks() {
  const list = document.getElementById("task-list");
  const count = document.getElementById("task-count");
  if (!list || !count) return;
  const visibleTasks = selectedTaskDate ? tasks.filter(task => task.date === selectedTaskDate) : tasks;
  const pendingCount = visibleTasks.filter(task => !task.completed).length;
  count.textContent = `${pendingCount} ${pendingCount === 1 ? "tarefa pendente" : "tarefas pendentes"}`;
  const selectedDateToolbar = document.getElementById("task-selected-date-toolbar");
  if (selectedDateToolbar) selectedDateToolbar.hidden = !selectedTaskDate;
  if (selectedTaskDate) {
    document.getElementById("task-selected-date-label").textContent = `Tarefas de ${formatDate(selectedTaskDate, { day: "2-digit", month: "2-digit", year: "numeric" })}`;
  }
  list.innerHTML = visibleTasks.length
    ? visibleTasks.map(task => `<li class="task-item${task.completed ? " is-completed" : ""}"><label><input type="checkbox" data-task-toggle="${escapeHtml(task.id)}"${task.completed ? " checked" : ""}><span>${escapeHtml(task.title)}<small>${task.date ? escapeHtml(formatDate(task.date, { day: "numeric", month: "short", year: "numeric" })) : "Sem data"}</small></span></label><button class="action-icon reject" type="button" data-task-remove="${escapeHtml(task.id)}" aria-label="Remover tarefa: ${escapeHtml(task.title)}" title="Remover tarefa"><i data-lucide="trash-2"></i></button></li>`).join("")
    : `<li class="task-list-empty">${selectedTaskDate ? "Nenhuma tarefa nesta data." : "Nenhuma tarefa registrada."}</li>`;
  renderTaskCalendar();
  refreshIcons();
}

function renderTaskCalendar() {
  const grid = document.getElementById("task-calendar");
  const monthLabel = document.getElementById("task-calendar-month-label");
  if (!grid || !monthLabel) return;

  const year = shownTaskMonth.getFullYear();
  const month = shownTaskMonth.getMonth();
  const monthStart = new Date(year, month, 1);
  const dayCount = new Date(year, month + 1, 0).getDate();
  monthLabel.textContent = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(monthStart);
  const weekdaysMarkup = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
    .map(day => `<span class="task-calendar-weekday">${day}</span>`).join("");
  const emptyDays = Array.from({ length: monthStart.getDay() }, () => `<span class="task-calendar-empty" aria-hidden="true"></span>`).join("");
  const today = dateKey(new Date());
  const daysMarkup = Array.from({ length: dayCount }, (_, index) => {
    const date = dateKey(new Date(year, month, index + 1));
    const dayTasks = tasks.filter(task => task.date === date);
    const events = dayTasks.map(task => `<li class="task-calendar-event${task.completed ? " is-completed" : ""}" title="${escapeHtml(task.title)}">${escapeHtml(task.title)}</li>`).join("");
    return `<div class="task-calendar-day${date === today ? " is-today" : ""}${date === selectedTaskDate ? " is-selected" : ""}" role="button" tabindex="0" data-task-calendar-date="${date}" aria-pressed="${date === selectedTaskDate}" aria-label="${index + 1} de ${monthNames[month]} de ${year}, ${dayTasks.length} tarefas"><span class="task-calendar-day-number">${index + 1}</span>${events ? `<ul>${events}</ul>` : ""}</div>`;
  }).join("");
  grid.innerHTML = `${weekdaysMarkup}${emptyDays}${daysMarkup}`;
}

function shiftTaskCalendar(monthOffset) {
  shownTaskMonth = new Date(shownTaskMonth.getFullYear(), shownTaskMonth.getMonth() + monthOffset, 1);
  selectedTaskDate = null;
  renderTasks();
}

function addTask(event) {
  event.preventDefault();
  const input = document.getElementById("task-entry");
  const dateInput = document.getElementById("task-date");
  const title = input.value.trim();
  const date = dateInput.value;
  if (!title || !isIsoDate(date)) return;
  tasks.unshift({ id: crypto.randomUUID(), title, date, completed: false });
  if (!saveTasks()) {
    tasks.shift();
    return;
  }
  input.value = "";
  dateInput.value = "";
  const [year, month] = date.split("-").map(Number);
  shownTaskMonth = new Date(year, month - 1, 1);
  renderTasks();
  input.focus();
}

function updateTask(taskId, completed) {
  const task = tasks.find(item => item.id === taskId);
  if (!task) return;
  const previousCompleted = task.completed;
  task.completed = completed;
  if (!saveTasks()) task.completed = previousCompleted;
  renderTasks();
}

function removeTask(taskId) {
  const taskIndex = tasks.findIndex(task => task.id === taskId);
  if (taskIndex < 0) return;
  const [removedTask] = tasks.splice(taskIndex, 1);
  if (!saveTasks()) tasks.splice(taskIndex, 0, removedTask);
  renderTasks();
}

function openRequestAttachmentsDatabase() {
  return new Promise((resolve, reject) => {
    const openRequest = indexedDB.open(requestAttachmentsDatabaseName, 2);
    openRequest.onupgradeneeded = () => {
      if (!openRequest.result.objectStoreNames.contains(requestAttachmentsStoreName)) {
        openRequest.result.createObjectStore(requestAttachmentsStoreName, { keyPath: "requestId" });
      }
    };
    openRequest.onsuccess = () => resolve(openRequest.result);
    openRequest.onerror = () => reject(openRequest.error || new Error("Não foi possível abrir o armazenamento de anexos."));
    openRequest.onblocked = () => reject(new Error("O armazenamento de anexos está ocupado em outra aba."));
  });
}

async function getRequestAttachment(requestId) {
  const database = await openRequestAttachmentsDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(requestAttachmentsStoreName, "readonly");
    const getRequest = transaction.objectStore(requestAttachmentsStoreName).get(requestId);
    getRequest.onsuccess = () => resolve(getRequest.result || null);
    getRequest.onerror = () => reject(getRequest.error || new Error("Não foi possível localizar o anexo."));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error || new Error("Não foi possível ler o anexo."));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error || new Error("A leitura do anexo foi cancelada."));
    };
  });
}

async function storeRequestAttachment(requestId, file) {
  const database = await openRequestAttachmentsDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(requestAttachmentsStoreName, "readwrite");
    transaction.objectStore(requestAttachmentsStoreName).put({
      requestId,
      blob: file,
      name: file.name,
      type: file.type,
      size: file.size
    });
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error || new Error("Não foi possível salvar o anexo."));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error || new Error("O armazenamento do anexo foi cancelado."));
    };
  });
}

async function restoreRequestAttachment(requestId, attachment) {
  const database = await openRequestAttachmentsDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(requestAttachmentsStoreName, "readwrite");
    const store = transaction.objectStore(requestAttachmentsStoreName);
    if (attachment) store.put(attachment);
    else store.delete(requestId);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error || new Error("Não foi possível restaurar o anexo."));
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error || new Error("A restauração do anexo foi cancelada."));
    };
  });
}

function loadServerAccounts() {
  try {
    const saved = JSON.parse(localStorage.getItem(serverAccountsStorageKey) || "[]");
    return Array.isArray(saved) ? saved.filter(account => account && typeof account === "object") : [];
  } catch {
    return [];
  }
}

function saveServerAccounts() {
  try {
    localStorage.setItem(serverAccountsStorageKey, JSON.stringify(serverAccounts));
  } catch {
    showToast("Não foi possível salvar o cadastro neste navegador.");
    return false;
  }
  syncServerDataToFirestore("contas", serverAccounts, account => String(account.cpf || account.username || "").replace(/\D/g, ""));
  return true;
}

function loadServerPersonalData() {
  try {
    const saved = JSON.parse(localStorage.getItem(serverDataStorageKey) || "[]");
    return Array.isArray(saved) ? saved.filter(record => record && typeof record === "object") : [];
  } catch {
    return [];
  }
}

function saveServerPersonalData() {
  try {
    localStorage.setItem(serverDataStorageKey, JSON.stringify(serverPersonalData));
  } catch {
    showToast("Não foi possível salvar os dados do servidor neste navegador.");
    return false;
  }
  syncServerDataToFirestore("servidores", serverPersonalData);
  return true;
}

function syncServerDataToFirestore(collection, docs, idFor) {
  if (!window.RH_SYNC || !window.RH_SYNC.enabled) return;
  const normalized = docs.map(doc => {
    const id = idFor ? idFor(doc) : doc.id;
    return Object.assign({}, doc, { id: id || undefined });
  });
  window.RH_SYNC.saveDocs(collection, normalized)
    .then(() => {})
    .catch(error => {
      const detail = error instanceof Error ? ` ${error.message}` : "";
      console.warn(`Falha ao sincronizar ${collection} no Firestore:`, error);
      showToast(`Cadastro salvo apenas neste navegador.${detail}`);
    });
}

function loadLocalUsuarios() {
  try {
    const saved = JSON.parse(localStorage.getItem(usuariosStorageKey) || "[]");
    if (Array.isArray(saved) && saved.length > 0) return saved.map(normalizeUsuario);
  } catch {
    // Ignora e usa a lista inicial abaixo.
  }
  return seedUsuarios();
}

function seedUsuarios() {
  const config = window.RH_CONFIG || {};
  const ownerEmails = Array.isArray(config.googleAdminEmails) ? config.googleAdminEmails : [];
  return ownerEmails.map(email => ({
    id: String(email).toLowerCase(),
    name: String(email).toLowerCase().startsWith("imc.") ? "Sidnei (IMC)" : "Sidnei (Polícia Penal)",
    email: String(email).toLowerCase(),
    perfil: "admin",
    ativo: true,
    criadoEm: dateKey(new Date())
  }));
}

function normalizeUsuario(raw) {
  return {
    id: String(raw.id || raw.email || "").toLowerCase(),
    name: String(raw.name || ""),
    email: String(raw.email || raw.id || "").toLowerCase(),
    perfil: raw.perfil === "admin" ? "admin" : "usuario",
    ativo: raw.ativo !== false,
    criadoEm: raw.criadoEm || dateKey(new Date())
  };
}

function isOwnerEmail(email) {
  const config = window.RH_CONFIG || {};
  const owners = Array.isArray(config.googleAdminEmails) ? config.googleAdminEmails.map(value => String(value).toLowerCase()) : [];
  return owners.includes(String(email || "").toLowerCase());
}

function saveUsuarios() {
  try {
    localStorage.setItem(usuariosStorageKey, JSON.stringify(usuarios));
  } catch {
    showToast("Não foi possível salvar os usuários neste navegador.");
  }
  if (!window.RH_SYNC || !window.RH_SYNC.enabled) return;
  window.RH_SYNC.saveDocs("usuarios", usuarios)
    .then(() => {})
    .catch(error => {
      const detail = error instanceof Error ? ` ${error.message}` : "";
      console.warn("Falha ao salvar usuários no Firestore:", error);
      showToast(`Usuários salvos apenas neste navegador.${detail}`);
    });
}

function renderUsuarios() {
  const container = document.getElementById("usuarios-body");
  if (!container) return;
  const query = (document.getElementById("usuarios-search")?.value || "").trim().toLocaleLowerCase("pt-BR");
  const filtered = usuarios
    .filter(user => `${user.name} ${user.email}`.toLocaleLowerCase("pt-BR").includes(query))
    .sort((a, b) => String(a.name).localeCompare(String(b.name), "pt-BR"));
  if (filtered.length === 0) {
    container.innerHTML = `<tr><td colspan="5" class="team-empty">Nenhum usuário encontrado.</td></tr>`;
    refreshIcons();
    return;
  }
  container.innerHTML = filtered.map(user => {
    const roleLabel = user.perfil === "admin" ? "Administrador" : "Usuário";
    const statusLabel = user.ativo ? "Ativo" : "Inativo";
    const statusClass = user.ativo ? "status-approved" : "status-rejected";
    const ownerBadge = isOwnerEmail(user.email) ? "<small>Proprietário</small>" : "";
    const locked = isOwnerEmail(user.email);
    const perfilCell = locked
      ? `<span class="status-pill status-away">${roleLabel}</span>`
      : `<select class="usuario-perfil-select" data-usuario-perfil="${escapeHtml(user.id)}" aria-label="Perfil de ${escapeHtml(user.name)}"><option value="usuario"${user.perfil === "usuario" ? " selected" : ""}>Usuário</option><option value="admin"${user.perfil === "admin" ? " selected" : ""}>Administrador</option></select>`;
    return `<tr><td><div class="person-cell"><span><strong>${escapeHtml(user.name)}</strong>${ownerBadge}</span></div></td><td>${escapeHtml(user.email)}</td><td>${perfilCell}</td><td><span class="status-pill ${statusClass}">${statusLabel}</span></td><td><div class="request-actions">${locked
      ? `<span class="status-pill status-approved">--</span>`
      : `<button class="action-icon approve" type="button" data-edit-usuario="${escapeHtml(user.id)}" aria-label="Editar usuário ${escapeHtml(user.name)}" title="Editar"><i data-lucide="pencil"></i></button><button class="action-icon reject" type="button" data-remove-usuario="${escapeHtml(user.id)}" aria-label="Remover usuário ${escapeHtml(user.name)}" title="Remover"><i data-lucide="trash-2"></i></button>`}</div></td></tr>`;
  }).join("");
  refreshIcons();
}

function setUsuarioMessage(message, isError) {
  const element = document.getElementById("usuario-message");
  if (!element) return;
  element.textContent = message || "";
  element.classList.toggle("error", Boolean(isError));
}

function openUsuarioDialog(user) {
  const dialog = document.getElementById("usuario-dialog");
  const title = document.getElementById("usuario-dialog-title");
  const form = document.getElementById("usuario-form");
  if (user) {
    editingUsuarioId = user.id;
    title.textContent = "Editar usuário";
    document.getElementById("usuario-nome").value = user.name || "";
    document.getElementById("usuario-email").value = user.email || "";
    document.getElementById("usuario-perfil").value = user.perfil === "admin" ? "admin" : "usuario";
    document.getElementById("usuario-ativo").value = user.ativo ? "ativo" : "inativo";
  } else {
    editingUsuarioId = null;
    title.textContent = "Adicionar usuário";
    form.reset();
    document.getElementById("usuario-perfil").value = "usuario";
    document.getElementById("usuario-ativo").value = "ativo";
  }
  setUsuarioMessage("");
  dialog.showModal();
  refreshIcons();
}

function setRequestEditMessage(message, isError) {
  const element = document.getElementById("request-edit-message");
  if (!element) return;
  element.textContent = message || "";
  element.classList.toggle("error", Boolean(isError));
}

function openRequestEditDialog(requestId) {
  const request = requests.find(item => item.id === requestId);
  if (!request) {
    showToast("Não foi possível localizar os dados desta solicitação.");
    return;
  }
  editingRequestId = requestId;
  document.getElementById("request-edit-person").value = request.person || "";
  document.getElementById("request-edit-start").value = request.start || "";
  document.getElementById("request-edit-end").value = request.end || "";
  document.getElementById("request-edit-note").value = request.note || "";
  setRequestEditMessage("");
  document.getElementById("request-edit-dialog").showModal();
  refreshIcons();
}

async function removeRequest(requestId) {
  const request = requests.find(item => item.id === requestId);
  if (!request) return;
  if (!window.confirm(`Excluir a solicitação de ${request.person || "servidor"}? Esta ação não pode ser desfeita.`)) return;
  const previousRequests = requests;
  requests = requests.filter(item => item.id !== requestId);
  if (!saveRequests()) {
    requests = previousRequests;
    renderAll();
    return;
  }
  if (window.RH_SYNC && window.RH_SYNC.enabled) {
    window.RH_SYNC.deleteDoc("requests", requestId).catch(error => {
      const detail = error instanceof Error ? ` ${error.message}` : "";
      console.warn("Falha ao excluir a solicitação no Firestore:", error);
      showToast(`Solicitação excluída apenas deste navegador.${detail}`);
    });
  }
  const dialog = document.getElementById("request-details-dialog");
  if (dialog?.open) dialog.close();
  renderAll();
  showToast("Solicitação excluída.");
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

function renderServerAccounts() {
  const body = document.getElementById("server-registry-body");
  if (!body) return;
  const searchTerm = document.getElementById("server-registry-search").value.trim().toLocaleLowerCase("pt-BR");
  const cpfSearchTerm = searchTerm.replace(/\D/g, "");
  const roleFilter = document.getElementById("server-registry-role-filter").value;
  const sortedRecords = serverPersonalData
    .filter(record => {
      const cpf = String(record.cpf || "");
      const account = serverAccounts.find(item => String(item.cpf || "").replace(/\D/g, "") === cpf.replace(/\D/g, ""));
      const role = account?.role === "both" ? "both" : account?.role === "admin" ? "admin" : "usuario";
      const nameMatches = String(record.name || "").toLocaleLowerCase("pt-BR").includes(searchTerm);
      const cpfMatches = cpfSearchTerm && cpf.replace(/\D/g, "").includes(cpfSearchTerm);
      return (!searchTerm || nameMatches || cpfMatches) && (!roleFilter || role === roleFilter);
    })
    .sort((left, right) => String(left.name).localeCompare(String(right.name), "pt-BR"));
  body.innerHTML = sortedRecords.length
    ? sortedRecords.map(record => {
      const cpfDigits = String(record.cpf || "").replace(/\D/g, "");
      const account = serverAccounts.find(item => String(item.cpf || "").replace(/\D/g, "") === cpfDigits);
      const role = account?.role === "both" ? "both" : account?.role === "admin" ? "admin" : "usuario";
      return `<tr><td>${escapeHtml(record.name)}</td><td>${escapeHtml(record.cpf)}</td><td><select data-server-account-role data-server-cpf="${escapeHtml(cpfDigits)}" aria-label="Tipo de acesso de ${escapeHtml(record.name)}"><option value="usuario"${role === "usuario" ? " selected" : ""}>Usuário</option><option value="admin"${role === "admin" ? " selected" : ""}>Administrador</option><option value="both"${role === "both" ? " selected" : ""}>Usuário e administrador</option></select></td></tr>`;
    }).join("")
    : `<tr><td class="detailed-report-empty" colspan="3">${serverPersonalData.length ? "Nenhum servidor corresponde aos filtros selecionados." : "Nenhum servidor cadastrado. Cadastre os dados em “Cadastro de Dados dos Servidores”."}</td></tr>`;
}

function getFilteredServerPersonalData() {
  const searchTerm = document.getElementById("server-data-search").value.trim().toLocaleLowerCase("pt-BR");
  const cpfSearchTerm = searchTerm.replace(/\D/g, "");
  return serverPersonalData.filter(record => {
    const nameMatches = String(record.name || "").toLocaleLowerCase("pt-BR").includes(searchTerm);
    const cpfMatches = cpfSearchTerm && String(record.cpf || "").replace(/\D/g, "").includes(cpfSearchTerm);
    return !searchTerm || nameMatches || cpfMatches;
  });
}

function renderServerPersonalData() {
  const body = document.getElementById("server-data-body");
  if (!body) return;
  const filteredRecords = getFilteredServerPersonalData();
  body.innerHTML = filteredRecords.length
    ? filteredRecords.map(record => {
      const birthDate = new Date(`${record.birthDate}T12:00:00`);
      const formattedBirthDate = Number.isNaN(birthDate.getTime())
        ? "Data inválida"
        : new Intl.DateTimeFormat("pt-BR").format(birthDate);
      return `<tr><td>${escapeHtml(record.name)}</td><td>${escapeHtml(record.cpf)}</td><td>${escapeHtml(record.rg)}</td><td>${escapeHtml(formattedBirthDate)}</td><td>${escapeHtml(record.phone)}</td><td>${escapeHtml(record.email)}</td><td>${escapeHtml(record.unidadePenal || "Não informado")}</td><td>${escapeHtml(record.cargo || "Não informado")}</td><td>${escapeHtml(record.quadro || "Não informado")}</td><td><div class="request-actions"><button class="action-icon approve" type="button" data-edit-server-data="${escapeHtml(record.id)}" aria-label="Editar dados de ${escapeHtml(record.name)}" title="Editar"><i data-lucide="pencil"></i></button><button class="action-icon reject" type="button" data-remove-server-data="${escapeHtml(record.id)}" aria-label="Remover dados de ${escapeHtml(record.name)}" title="Remover"><i data-lucide="trash-2"></i></button></div></td></tr>`;
    }).join("")
    : `<tr><td class="detailed-report-empty" colspan="10">${serverPersonalData.length ? "Nenhum servidor corresponde ao filtro informado." : "Nenhum dado de servidor cadastrado."}</td></tr>`;
  renderServerDirectoryReport();
  refreshIcons();
}

function renderServerDirectoryReport() {
  const body = document.getElementById("report-servers-body");
  const serverSelect = document.getElementById("report-servers-select");
  const unitSelect = document.getElementById("report-servers-unit");
  if (!body || !serverSelect || !unitSelect) return;

  const records = [...serverPersonalData].sort((left, right) =>
    String(left.name || "").localeCompare(String(right.name || ""), "pt-BR")
  );
  const countBody = document.getElementById("report-units-count-body");
  if (countBody) {
    const counts = new Map();
    records.forEach(record => {
      const unit = String(record.unidadePenal || "").trim() || "Não informado";
      counts.set(unit, (counts.get(unit) || 0) + 1);
    });
    countBody.innerHTML = [...counts].sort((left, right) => left[0].localeCompare(right[0], "pt-BR"))
      .map(([unit, total]) => `<tr><td>${escapeHtml(unit)}</td><td>${total}</td></tr>`).join("") || `<tr><td class="detailed-report-empty" colspan="2">Nenhum dado de servidor cadastrado.</td></tr>`;
    document.getElementById("report-units-count-total").textContent = records.length;
  }
  const roleBody = document.getElementById("report-roles-count-body");
  if (roleBody) {
    const roleCounts = new Map();
    records.forEach(record => {
      const role = String(record.cargo || "").trim() || "Não informado";
      roleCounts.set(role, (roleCounts.get(role) || 0) + 1);
    });
    roleBody.innerHTML = [...roleCounts].sort((left, right) => left[0].localeCompare(right[0], "pt-BR"))
      .map(([role, total]) => `<tr><td>${escapeHtml(role)}</td><td>${total}</td></tr>`).join("") || `<tr><td class="detailed-report-empty" colspan="2">Nenhum dado de servidor cadastrado.</td></tr>`;
    document.getElementById("report-roles-count-total").textContent = records.length;
  }
  const quadroBody = document.getElementById("report-quadros-count-body");
  if (quadroBody) {
    const quadroCounts = new Map();
    records.forEach(record => {
      const quadro = String(record.quadro || "").trim() || "Não informado";
      quadroCounts.set(quadro, (quadroCounts.get(quadro) || 0) + 1);
    });
    quadroBody.innerHTML = [...quadroCounts].sort((left, right) => left[0].localeCompare(right[0], "pt-BR"))
      .map(([quadro, total]) => `<tr><td>${escapeHtml(quadro)}</td><td>${total}</td></tr>`).join("") || `<tr><td class="detailed-report-empty" colspan="2">Nenhum dado de servidor cadastrado.</td></tr>`;
    document.getElementById("report-quadros-count-total").textContent = records.length;
  }
  const serverTerm = serverSelect.value.trim().toLocaleLowerCase("pt-BR");
  const selectedUnit = unitSelect.value;
  const units = [...new Set(records.map(record => String(record.unidadePenal || "").trim()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, "pt-BR"));
  unitSelect.innerHTML = `<option value="">Todas as unidades</option>${units.map(unit => `<option value="${escapeHtml(unit)}">${escapeHtml(unit)}</option>`).join("")}`;
  if (units.includes(selectedUnit)) unitSelect.value = selectedUnit;

  const unitRecords = unitSelect.value
    ? records.filter(record => String(record.unidadePenal || "").trim() === unitSelect.value)
    : records;
  const countMode = document.getElementById("view-report-servers")?.dataset.countMode;
  const showRole = countMode === "role";
  const showQuadro = countMode === "quadro";
  document.getElementById("report-servers-second-head").textContent = showRole ? "Cargo" : showQuadro ? "Quadro" : "Unidade";
  const filteredRecords = serverTerm
    ? unitRecords.filter(record => String(record.name || "").toLocaleLowerCase("pt-BR").includes(serverTerm))
    : unitRecords;
  body.innerHTML = filteredRecords.length
    ? filteredRecords.map(record => `<tr><td>${escapeHtml(record.name || "Não informado")}</td><td>${escapeHtml((showRole ? record.cargo : showQuadro ? record.quadro : record.unidadePenal) || "Não informado")}</td></tr>`).join("")
    : `<tr><td class="detailed-report-empty" colspan="2">Nenhum dado de servidor cadastrado.</td></tr>`;
}

function clampShownMonth(date) {
  const minimumMonth = new Date(2026, 8, 1);
  const maximumMonth = new Date(calendarMaxMonth.getFullYear(), calendarMaxMonth.getMonth(), 1);
  const next = new Date(date.getFullYear(), date.getMonth(), 1);
  if (next < minimumMonth) return minimumMonth;
  if (next > maximumMonth) return maximumMonth;
  return next;
}

function isIsoDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeRequest(request) {
  if (!request || typeof request !== "object") return request;
  const normalized = { ...request };
  if (!normalized.month && typeof normalized.start === "string" && normalized.start.trim() && !isIsoDate(normalized.start) && !normalized.end) normalized.month = normalized.start.trim();
  if (!normalized.month && typeof normalized.end === "string" && normalized.end.trim() && !isIsoDate(normalized.end) && !normalized.start) normalized.month = normalized.end.trim();
  return normalized;
}

function legacyLoadRequests() {
  try {
    const saved = localStorage.getItem(storageKey);
    const parsed = saved ? JSON.parse(saved) : seedRequests.map(request => ({ ...request }));
    return (Array.isArray(parsed) ? parsed : seedRequests.map(request => ({ ...request }))).map(normalizeRequest);
  } catch {
    return seedRequests.map(request => ({ ...request }));
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function formatDate(dateString, options = { day: "numeric", month: "short" }) {
  if (!dateString || !isIsoDate(String(dateString))) return String(dateString || "Período");
  const date = new Date(`${dateString}T12:00:00`);
  if (Number.isNaN(date.getTime())) return String(dateString || "Período");
  return new Intl.DateTimeFormat("pt-BR", options).format(date).replace(" de ", " ");
}

function formatRange(start, end) {
  if (!isIsoDate(String(start || "")) || !isIsoDate(String(end || ""))) return getMonthLabel({ month: start || end }) || "Período selecionado";
  return `${formatDate(start)} – ${formatDate(end)}`;
}

function getMonthLabel(request) {
  const monthValue = request?.month || request?.start || request?.end;
  if (!monthValue || isIsoDate(String(monthValue))) return "";
  return String(monthValue).charAt(0).toUpperCase() + String(monthValue).slice(1);
}

function formatRequestPeriod(request) {
  const monthLabel = getMonthLabel(request);
  if (monthLabel) return `Mês de férias: ${monthLabel}`;
  if (isIsoDate(String(request?.start || "")) && isIsoDate(String(request?.end || ""))) return `${formatRange(request.start, request.end)} · ${request.days || 1} dias`;
  return request?.note ? String(request.note) : "Período selecionado";
}

function getRequestMonthDisplay(request) {
  const cycleMonths = {
    A: ["março", "abril", "maio"],
    B: ["junho", "julho", "agosto"],
    C: ["setembro", "outubro", "novembro"]
  };
  const cycle = String(request?.ciclo || "").trim().toUpperCase();
  if (cycleMonths[cycle]) return cycleMonths[cycle].map(month => `${month.charAt(0).toLocaleUpperCase("pt-BR")}${month.slice(1)}`).join(", ");

  const monthValue = String(request?.month || request?.start || request?.end || "").trim();
  if (isIsoDate(monthValue)) {
    return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(`${monthValue}T12:00:00`));
  }
  return monthValue ? `${monthValue.charAt(0).toLocaleUpperCase("pt-BR")}${monthValue.slice(1)}` : "Não informado";
}

function hasRequestCycle(request) {
  return ["A", "B", "C"].includes(String(request?.ciclo || "").trim().toUpperCase());
}

function getRequestMonthCycleDisplay(request) {
  const month = getRequestMonthDisplay(request);
  const cycle = String(request?.ciclo || "").trim().toUpperCase();
  return hasRequestCycle(request) ? `${month} - Ciclo ${cycle}` : month;
}

function getRequestPeriodDisplay(request) {
  if (hasRequestCycle(request)) return "";
  if (isIsoDate(String(request?.start || "")) && isIsoDate(String(request?.end || ""))) {
    const dateOptions = { day: "2-digit", month: "2-digit", year: "numeric" };
    return `${formatDate(request.start, dateOptions)} a ${formatDate(request.end, dateOptions)}`;
  }
  const monthLabel = getMonthLabel(request);
  if (monthLabel) return `Mês de férias: ${monthLabel}`;
  const period = String(request?.period || request?.periodo || "").trim();
  return period || "Não informado";
}

function formatReportPeriod(request, fallbackYear = String(new Date().getFullYear()), fallbackMonth = null) {
  if (isIsoDate(String(request?.start || "")) && isIsoDate(String(request?.end || ""))) {
    const dateOptions = { day: "2-digit", month: "2-digit", year: "numeric" };
    return `${formatDate(request.start, dateOptions)} a ${formatDate(request.end, dateOptions)}`;
  }

  const monthValue = String(request?.month || request?.start || request?.end || "").trim().toLocaleLowerCase("pt-BR");
  const monthIndex = fallbackMonth === null ? monthNames.indexOf(monthValue) : Number(fallbackMonth);
  if (monthIndex < 0 || monthIndex > 11) return "Período não informado";
  const year = Number(request?.year || request?.ano || fallbackYear);
  const start = dateKey(new Date(year, monthIndex, 1));
  const end = dateKey(new Date(year, monthIndex + 1, 0));
  const dateOptions = { day: "2-digit", month: "2-digit", year: "numeric" };
  return `${formatDate(start, dateOptions)} a ${formatDate(end, dateOptions)}`;
}

function avatar(initials, color, className = "") {
  return `<span class="avatar ${className}" style="background:${escapeHtml(color)}">${escapeHtml(initials)}</span>`;
}

function getPendingRequests() { return requests.filter(request => request.status === "pending"); }

function getApprovedVacationRequests() {
  return requests.filter(request => {
    if (request.status !== "approved") return false;
    const type = String(request.type || "").trim().toLocaleLowerCase("pt-BR");
    return !type || type === "férias" || type === "ferias";
  });
}

function loadFgServerRoster() {
  try {
    const saved = JSON.parse(localStorage.getItem(fgRosterStorageKey) || "[]");
    return Array.isArray(saved)
      ? saved.filter(entry => (typeof entry === "string" && entry.trim()) || (entry && typeof entry === "object" && typeof entry.name === "string" && entry.name.trim()))
      : [];
  } catch {
    return [];
  }
}

function saveFgServerRoster() {
  try {
    localStorage.setItem(fgRosterStorageKey, JSON.stringify(fgServerRoster));
    return true;
  } catch {
    showToast("Não foi possível salvar o cadastro de servidores com Função Gratificada neste navegador.");
    return false;
  }
}

function getFgRosterName(entry) {
  if (typeof entry === "string") return entry.trim();
  const currentRecord = serverPersonalData.find(record => record.id === entry?.id);
  return String(currentRecord?.name || entry?.name || "").trim();
}

function getFgRosterCpf(entry) {
  if (typeof entry === "string") return "";
  const currentRecord = serverPersonalData.find(record => record.id === entry?.id);
  return String(currentRecord?.cpf || entry?.cpf || "");
}

function renderFgServerRoster() {
  const body = document.getElementById("server-fg-body");
  const select = document.getElementById("server-fg-select");
  if (!body || !select) return;

  const enrolledCpfs = new Set(fgServerRoster.map(entry => getFgRosterCpf(entry).replace(/\D/g, "")).filter(Boolean));
  const enrolledNames = new Set(fgServerRoster.map(entry => getFgRosterName(entry).toLocaleLowerCase("pt-BR")));
  const availableServers = serverPersonalData
    .filter(record => !enrolledCpfs.has(String(record.cpf || "").replace(/\D/g, "")) && !enrolledNames.has(String(record.name || "").trim().toLocaleLowerCase("pt-BR")))
    .sort((left, right) => String(left.name).localeCompare(String(right.name), "pt-BR"));

  select.innerHTML = `<option value="">${availableServers.length ? "Selecione um servidor" : "Nenhum servidor disponível"}</option>${availableServers.map(record => `<option value="${escapeHtml(record.id)}">${escapeHtml(record.name)} — CPF ${escapeHtml(record.cpf)}${record.unidadePenal ? ` — ${escapeHtml(record.unidadePenal)}` : ""}</option>`).join("")}`;
  select.disabled = availableServers.length === 0;
  body.innerHTML = fgServerRoster.length
    ? fgServerRoster.map((entry, index) => {
      const name = getFgRosterName(entry);
      const cpf = getFgRosterCpf(entry) || serverPersonalData.find(record => String(record.name || "").trim().toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"))?.cpf || "Não informado";
      const cpfDigits = String(cpf).replace(/\D/g, "");
      const registered = serverPersonalData.find(record => (entry?.id && record.id === entry.id) || (cpfDigits && String(record.cpf || "").replace(/\D/g, "") === cpfDigits) || String(record.name || "").trim().toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"));
      return `<tr><td>${escapeHtml(name)}</td><td>${escapeHtml(cpf)}</td><td>${escapeHtml(registered?.unidadePenal || "Não informado")}</td><td><div class="request-actions"><button class="action-icon reject" type="button" data-remove-fg-server="${index}" aria-label="Remover ${escapeHtml(name)} do cadastro de Função Gratificada" title="Remover"><i data-lucide="trash-2"></i></button></div></td></tr>`;
    }).join("")
    : `<tr><td class="detailed-report-empty" colspan="4">${serverPersonalData.length ? "Nenhum servidor com Função Gratificada cadastrado." : "Cadastre os dados do servidor antes de incluí-lo nesta lista."}</td></tr>`;
  refreshIcons();
}

function renderVacationLaunch() {
  if (!document.getElementById("vacation-launch-server")) return;
  const hiddenId = document.getElementById("vacation-launch-server");
  if (!serverPersonalData.some(record => record.id === hiddenId.value)) {
    hiddenId.value = "";
    document.getElementById("vacation-launch-server-search").value = "";
  }
  refreshIcons();
}

function normalizeSearchText(value) {
  return String(value || "").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function isServerInFgRoster(server) {
  if (!server) return false;
  const cpfDigits = String(server.cpf || "").replace(/\D/g, "");
  const name = String(server.name || "").trim().toLocaleLowerCase("pt-BR");
  return fgServerRoster.some(entry =>
    (cpfDigits && getFgRosterCpf(entry).replace(/\D/g, "") === cpfDigits) ||
    getFgRosterName(entry).trim().toLocaleLowerCase("pt-BR") === name);
}

function syncVacationLaunchFg() {
  const checkbox = document.getElementById("vacation-launch-fg");
  const server = serverPersonalData.find(record => record.id === document.getElementById("vacation-launch-server").value);
  const alreadyFg = isServerInFgRoster(server);
  if (alreadyFg) checkbox.checked = true;
  checkbox.disabled = alreadyFg;
  checkbox.title = alreadyFg ? "Servidor já cadastrado com Função Gratificada" : "";
  const show = checkbox.checked;
  document.querySelectorAll(".vacation-launch-fg-field").forEach(field => { field.hidden = !show; });
  document.getElementById("vacation-launch-function").required = show;
  document.getElementById("vacation-launch-substitute").required = show;
}

function renderVacationSuggestions() {
  const input = document.getElementById("vacation-launch-server-search");
  const hiddenId = document.getElementById("vacation-launch-server");
  const list = document.getElementById("vacation-launch-suggestions");
  const term = normalizeSearchText(input.value.trim());
  const matches = term
    ? serverPersonalData.filter(record => normalizeSearchText(record.name).includes(term))
      .sort((left, right) => String(left.name).localeCompare(String(right.name), "pt-BR")).slice(0, 8)
    : [];
  const exact = serverPersonalData.find(record => normalizeSearchText(record.name) === term);
  hiddenId.value = exact ? exact.id : "";
  list.innerHTML = term && !matches.length
    ? `<li class="vacation-launch-empty">Nenhum servidor encontrado.</li>`
    : matches.map(record => `<li role="option" tabindex="-1" data-server-id="${escapeHtml(record.id)}">${escapeHtml(record.name)}${record.unidadePenal ? ` <small>— ${escapeHtml(record.unidadePenal)}</small>` : ""}</li>`).join("");
  list.hidden = !term;
  input.setAttribute("aria-expanded", String(Boolean(term)));
  syncVacationLaunchFg();
}

function addVacationLaunch(event) {
  event.preventDefault();
  const server = serverPersonalData.find(record => record.id === document.getElementById("vacation-launch-server").value);
  const start = document.getElementById("vacation-launch-start").value;
  const end = document.getElementById("vacation-launch-end").value;
  const note = document.getElementById("vacation-launch-note").value.trim();
  if (!server) {
    showToast("Selecione um servidor cadastrado.");
    return;
  }
  if (!isIsoDate(start) || !isIsoDate(end) || end < start) {
    showToast("Informe um período válido: o término não pode ser anterior ao início.");
    return;
  }
  const overlaps = getApprovedVacationRequests().some(request =>
    String(request.person || "").trim().toLocaleLowerCase("pt-BR") === String(server.name || "").trim().toLocaleLowerCase("pt-BR")
    && isIsoDate(request.start) && isIsoDate(request.end) && request.start <= end && request.end >= start);
  if (overlaps) {
    showToast("Esse servidor já possui férias aprovadas neste período.");
    return;
  }

  const isFg = document.getElementById("vacation-launch-fg").checked;
  const functionName = document.getElementById("vacation-launch-function").value.trim();
  const substitute = document.getElementById("vacation-launch-substitute").value.trim();
  if (isFg && (!functionName || !substitute)) {
    showToast("Informe a função exercida e o substituto.");
    return;
  }

  const days = Math.round((new Date(`${end}T12:00:00`) - new Date(`${start}T12:00:00`)) / 86400000) + 1;
  const initials = String(server.name).split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0].toLocaleUpperCase("pt-BR")).join("") || "SV";
  const request = {
    id: `launch-${Date.now()}`,
    person: server.name,
    initials,
    color: avatarColors[requests.length % avatarColors.length],
    start,
    end,
    days,
    note: note || "Lançado pelo administrador",
    created: "Lançamento do administrador",
    status: "approved",
    type: "férias",
    cpf: server.cpf,
    unidade: server.unidadePenal || "",
    launchedByAdmin: true
  };
  if (isFg) {
    request.funcaoExercida = functionName;
    request.substituto = substitute;
  }
  const addedToRoster = isFg && !isServerInFgRoster(server);
  if (addedToRoster) {
    fgServerRoster.push({ id: server.id, name: server.name, cpf: server.cpf });
    if (!saveFgServerRoster()) {
      fgServerRoster.pop();
      return;
    }
  }
  requests.unshift(request);
  if (!saveRequests()) {
    requests.shift();
    if (addedToRoster) {
      fgServerRoster.pop();
      saveFgServerRoster();
    }
    return;
  }
  event.currentTarget.reset();
  document.getElementById("vacation-launch-server").value = "";
  document.getElementById("vacation-launch-suggestions").hidden = true;
  syncVacationLaunchFg();
  const [startYear, startMonth] = start.split("-").map(Number);
  shownMonth = new Date(startYear, startMonth - 1, 1);
  selectedDate = start;
  selectedVacationMonth = String(startMonth - 1);
  selectedVacationYear = String(startYear);
  renderAll();
  renderVacationLaunch();
  showToast(`Férias de ${server.name} lançadas com sucesso.`);
}

function addFgServerFromForm(event) {
  event.preventDefault();
  const serverId = document.getElementById("server-fg-select").value;
  const server = serverPersonalData.find(record => record.id === serverId);
  if (!server) {
    showToast("Selecione um servidor cadastrado.");
    return;
  }

  const cpfDigits = String(server.cpf || "").replace(/\D/g, "");
  const normalizedName = String(server.name || "").trim().toLocaleLowerCase("pt-BR");
  if (fgServerRoster.some(entry =>
    (cpfDigits && getFgRosterCpf(entry).replace(/\D/g, "") === cpfDigits) ||
    getFgRosterName(entry).toLocaleLowerCase("pt-BR") === normalizedName
  )) {
    showToast("Esse servidor já está cadastrado com Função Gratificada.");
    return;
  }

  fgServerRoster.push({ id: server.id, name: server.name, cpf: server.cpf });
  if (!saveFgServerRoster()) {
    fgServerRoster.pop();
    return;
  }

  renderFgServerRoster();
  showToast(`${server.name} foi incluído no cadastro de Função Gratificada.`);
}

function removeFgServer(indexValue) {
  const index = Number(indexValue);
  if (!Number.isInteger(index) || index < 0 || index >= fgServerRoster.length) return;
  const [removedServer] = fgServerRoster.splice(index, 1);
  if (!saveFgServerRoster()) {
    fgServerRoster.splice(index, 0, removedServer);
    renderFgServerRoster();
    return;
  }
  renderFgServerRoster();
  showToast(`${getFgRosterName(removedServer)} foi removido do cadastro de Função Gratificada.`);
}

function renderReportFg() {
  const reportBody = document.getElementById("fg-vacation-report");
  if (!reportBody) return;

  const monthIndex = Number(selectedVacationMonth);
  const yearNumber = Number(selectedVacationYear);
  const monthName = monthNames[monthIndex];
  const monthStart = dateKey(new Date(yearNumber, monthIndex, 1));
  const monthEnd = dateKey(new Date(yearNumber, monthIndex + 1, 0));
  const fgNames = new Set(fgServerRoster.map(entry => getFgRosterName(entry).trim().toLocaleLowerCase("pt-BR")));

  const matchingRequests = getApprovedVacationRequests()
    .filter(request => {
      if (!fgNames.has(String(request.person || "").trim().toLocaleLowerCase("pt-BR"))) return false;
      if (isIsoDate(request.start) && isIsoDate(request.end)) return request.start <= monthEnd && request.end >= monthStart;
      const requestMonth = String(request.month || request.start || request.end || "").trim().toLocaleLowerCase("pt-BR");
      const requestYear = String(request.year || request.ano || new Date().getFullYear());
      return requestMonth === monthName && requestYear === selectedVacationYear;
    })
    .sort((left, right) => String(left.person || "").localeCompare(String(right.person || ""), "pt-BR") || String(left.start || left.month || "").localeCompare(String(right.start || right.month || "")));

  reportBody.innerHTML = matchingRequests.length
    ? matchingRequests.map(request => {
      const functionName = request.funcaoExercida || request.functionExercised || request.funcao || request.function || request.cargo || "Não informado";
      const person = String(request.person || "Não identificado");
      const substitute = String(request.substituto || request.substitute || "Não informado");
      const personCpf = request.cpf || findServerCpfByName(person);
      const substituteCpf = request.substituteCpf || request.cpfSubstituto || findServerCpfByName(substitute);
      const month = `${monthName.charAt(0).toLocaleUpperCase("pt-BR")}${monthName.slice(1)}`;
      return `<tr><td>${escapeHtml(formatCpfLabel(personCpf))} — ${escapeHtml(person)}</td><td>${escapeHtml(request.unidade || request.unit || "Não informada")}</td><td>${escapeHtml(month)}</td><td>${escapeHtml(functionName)}</td><td>${escapeHtml(formatCpfLabel(substituteCpf))} — ${escapeHtml(substitute)}</td><td>${escapeHtml(formatReportPeriod(request, selectedVacationYear, selectedVacationMonth))}</td></tr>`;
    }).join("")
    : `<tr><td class="current-vacations-empty" colspan="6">Nenhum servidor com Função Gratificada com férias aprovadas neste mês.</td></tr>`;
}

function findServerCpfByName(name) {
  const normalizedName = String(name || "").trim().toLocaleLowerCase("pt-BR");
  return serverPersonalData.find(record => String(record.name || "").trim().toLocaleLowerCase("pt-BR") === normalizedName)?.cpf || "";
}

function formatCpfLabel(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!/^\d{11}$/.test(digits)) return "CPF não informado";
  return `CPF ${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function renderReportCapacitacao() {
  const reportBody = document.getElementById("report-capacitacao-body");
  const monthSelect = document.getElementById("report-capacitacao-month");
  const nameSearch = document.getElementById("report-capacitacao-name");
  if (!reportBody || !monthSelect || !nameSearch) return;

  const cycleMonths = {
    A: ["março", "abril", "maio"],
    B: ["junho", "julho", "agosto"],
    C: ["setembro", "outubro", "novembro"]
  };
  const approvedRequests = requests
    .filter(request => {
      const requestType = String(request.type || "").trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return request.status === "approved" && requestType === "licenca capacitacao";
    })
    .sort((left, right) => String(left.person || "").localeCompare(String(right.person || ""), "pt-BR"));

  const getRequestCycle = request => {
    const cycle = String(request.ciclo || "").trim().toUpperCase();
    if (cycleMonths[cycle]) return cycle;
    const month = String(request.month || "").trim().toLocaleLowerCase("pt-BR");
    return Object.keys(cycleMonths).find(key => cycleMonths[key].includes(month)) || "";
  };
  const availableCycles = new Set(approvedRequests.map(getRequestCycle).filter(Boolean));
  monthSelect.innerHTML = `<option value="">Todos os ciclos</option>${Object.keys(cycleMonths).filter(cycle => availableCycles.has(cycle)).map(cycle => `<option value="${cycle}">Ciclo ${cycle} — ${cycleMonths[cycle].join(", ")}</option>`).join("")}`;
  if (selectedCapacitacaoMonth && !availableCycles.has(selectedCapacitacaoMonth)) selectedCapacitacaoMonth = "";
  monthSelect.value = selectedCapacitacaoMonth;

  const nameQuery = nameSearch.value.trim().toLocaleLowerCase("pt-BR");
  const filteredRequests = approvedRequests.filter(request => {
    const name = String(request.person || "Não identificado").toLocaleLowerCase("pt-BR");
    return name.includes(nameQuery) && (!selectedCapacitacaoMonth || getRequestCycle(request) === selectedCapacitacaoMonth);
  });

  reportBody.innerHTML = filteredRequests.length
    ? filteredRequests.map(request => {
      const cycle = String(request.ciclo || "").trim().toUpperCase();
      const months = cycleMonths[cycle] || [String(request.month || "").trim().toLocaleLowerCase("pt-BR")].filter(Boolean);
      const monthLabels = months.length
        ? months.map(month => `${month.charAt(0).toLocaleUpperCase("pt-BR")}${month.slice(1)}`).join(", ")
        : "Não informado";
      const period = cycleMonths[cycle] ? `Ciclo ${cycle}` : "Não informado";
      return `<tr><td>${escapeHtml(request.person || "Não identificado")}</td><td>${escapeHtml(monthLabels)}</td><td>${escapeHtml(request.unidade || request.unit || "Não informada")}</td><td>${escapeHtml(period)}</td></tr>`;
    }).join("")
    : `<tr><td class="detailed-report-empty" colspan="4">Nenhuma licença-capacitação aprovada.</td></tr>`;
}

function renderReportEspecial() {
  const reportBody = document.getElementById("report-especial-body");
  const monthSelect = document.getElementById("report-especial-month");
  const nameSearch = document.getElementById("report-especial-name");
  if (!reportBody || !monthSelect || !nameSearch) return;

  const cycleMonths = {
    A: ["março", "abril", "maio"],
    B: ["junho", "julho", "agosto"],
    C: ["setembro", "outubro", "novembro"]
  };
  const approvedRequests = requests
    .filter(request => {
      const requestType = String(request.type || "").trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return request.status === "approved" && requestType === "licenca especial";
    })
    .sort((left, right) => String(left.person || "").localeCompare(String(right.person || ""), "pt-BR"));

  const getRequestCycle = request => {
    const cycle = String(request.ciclo || "").trim().toUpperCase();
    if (cycleMonths[cycle]) return cycle;
    const month = String(request.month || "").trim().toLocaleLowerCase("pt-BR");
    return Object.keys(cycleMonths).find(key => cycleMonths[key].includes(month)) || "";
  };
  const availableCycles = new Set(approvedRequests.map(getRequestCycle).filter(Boolean));
  monthSelect.innerHTML = `<option value="">Todos os ciclos</option>${Object.keys(cycleMonths).filter(cycle => availableCycles.has(cycle)).map(cycle => `<option value="${cycle}">Ciclo ${cycle} — ${cycleMonths[cycle].join(", ")}</option>`).join("")}`;
  if (selectedEspecialMonth && !availableCycles.has(selectedEspecialMonth)) selectedEspecialMonth = "";
  monthSelect.value = selectedEspecialMonth;

  const nameQuery = nameSearch.value.trim().toLocaleLowerCase("pt-BR");
  const filteredRequests = approvedRequests.filter(request => {
    const name = String(request.person || "Não identificado").toLocaleLowerCase("pt-BR");
    return name.includes(nameQuery) && (!selectedEspecialMonth || getRequestCycle(request) === selectedEspecialMonth);
  });

  reportBody.innerHTML = filteredRequests.length
    ? filteredRequests.map(request => {
      const cycle = String(request.ciclo || "").trim().toUpperCase();
      const months = cycleMonths[cycle] || [String(request.month || "").trim().toLocaleLowerCase("pt-BR")].filter(Boolean);
      const monthLabels = months.length
        ? months.map(month => `${month.charAt(0).toLocaleUpperCase("pt-BR")}${month.slice(1)}`).join(", ")
        : "Não informado";
      const period = cycleMonths[cycle] ? `Ciclo ${cycle}` : "Não informado";
      return `<tr><td>${escapeHtml(request.person || "Não identificado")}</td><td>${escapeHtml(monthLabels)}</td><td>${escapeHtml(request.unidade || request.unit || "Não informada")}</td><td>${escapeHtml(period)}</td></tr>`;
    }).join("")
    : `<tr><td class="detailed-report-empty" colspan="4">Nenhuma licença especial aprovada.</td></tr>`;
}

function getAvailableReportYears(approvedRequests, currentYear) {
  const years = new Set([currentYear]);
  approvedRequests.forEach(request => {
    if (isIsoDate(request.start) && isIsoDate(request.end)) {
      const firstYear = Number(request.start.slice(0, 4));
      const lastYear = Number(request.end.slice(0, 4));
      for (let year = firstYear; year <= lastYear; year += 1) years.add(String(year));
    } else {
      years.add(currentYear);
    }
  });
  return Array.from(years).sort((left, right) => Number(right) - Number(left));
}

function renderReportYear() {
  const body = document.getElementById("report-year-body");
  const yearSelect = document.getElementById("report-year-select");
  if (!body || !yearSelect) return;

  const currentYear = String(new Date().getFullYear());
  const approvedRequests = getApprovedVacationRequests();
  const years = getAvailableReportYears(approvedRequests, currentYear);
  if (!years.includes(selectedReportYear)) selectedReportYear = currentYear;
  yearSelect.innerHTML = years.map(year => `<option value="${year}">${year}</option>`).join("");
  yearSelect.value = selectedReportYear;

  const yearStart = `${selectedReportYear}-01-01`;
  const yearEnd = `${selectedReportYear}-12-31`;
  const requestsInYear = approvedRequests.filter(request => isIsoDate(request.start) && isIsoDate(request.end)
    ? request.start <= yearEnd && request.end >= yearStart
    : selectedReportYear === currentYear);
  if (requestsInYear.length === 0) {
    body.innerHTML = `<tr><td class="detailed-report-empty" colspan="4">Nenhum servidor tirou férias em ${selectedReportYear}.</td></tr>`;
    return;
  }
  body.innerHTML = requestsInYear
    .slice()
    .sort((left, right) => String(left.person || "").localeCompare(String(right.person || ""), "pt-BR") || String(left.start || left.month || "").localeCompare(String(right.start || right.month || "")))
    .map(request => {
      const person = String(request.person || "Não identificado");
      const unit = String(request.unidade || request.unit || "Não informada").trim();
      const period = formatReportPeriod(request, selectedReportYear);
      return `<tr><td>${escapeHtml(person)}</td><td>${escapeHtml(unit)}</td><td>${escapeHtml(period)}</td><td>${Number(request.days) || 1}</td></tr>`;
    }).join("");
}

function renderReportUnit() {
  const body = document.getElementById("report-unit-body");
  const unitSelect = document.getElementById("report-unit-select");
  const personSearch = document.getElementById("report-unit-person-search");
  if (!body || !unitSelect || !personSearch) return;

  const approvedRequests = getApprovedVacationRequests();
  const units = Array.from(new Set(approvedRequests.map(request => String(request.unidade || request.unit || "Não informada").trim())))
    .sort((left, right) => left.localeCompare(right, "pt-BR"));
  if (selectedReportUnit && !units.includes(selectedReportUnit)) selectedReportUnit = "";
  unitSelect.innerHTML = `<option value="">Todas as unidades</option>${units.map(unit => `<option value="${escapeHtml(unit)}">${escapeHtml(unit)}</option>`).join("")}`;
  unitSelect.value = selectedReportUnit;

  const filteredRequests = approvedRequests.filter(request => {
    const unit = String(request.unidade || request.unit || "Não informada").trim();
    const person = String(request.person || "Não identificado").toLocaleLowerCase("pt-BR");
    const matchesUnit = !selectedReportUnit || unit === selectedReportUnit;
    const matchesPerson = person.includes(personSearch.value.trim().toLocaleLowerCase("pt-BR"));
    return matchesUnit && matchesPerson;
  });

  if (filteredRequests.length === 0) {
    body.innerHTML = `<tr><td class="detailed-report-empty" colspan="3">Nenhum servidor encontrado com esses filtros.</td></tr>`;
    return;
  }
  body.innerHTML = filteredRequests
    .slice()
    .sort((left, right) => String(left.person || "").localeCompare(String(right.person || ""), "pt-BR") || String(left.start || left.month || "").localeCompare(String(right.start || right.month || "")))
    .map(request => `<tr><td>${escapeHtml(request.person || "Não identificado")}</td><td>${escapeHtml(request.unidade || request.unit || "Não informada")}</td><td>${escapeHtml(formatReportPeriod(request))}</td></tr>`)
    .join("");
}

function renderReportPerson() {
  const body = document.getElementById("report-person-body");
  const search = document.getElementById("report-person-search");
  if (!body || !search) return;

  const filteredRequests = getApprovedVacationRequests().filter(request => {
    const person = String(request.person || "Não identificado");
    return person.toLocaleLowerCase("pt-BR").includes(search.value.trim().toLocaleLowerCase("pt-BR"));
  });
  if (filteredRequests.length === 0) {
    body.innerHTML = `<tr><td class="detailed-report-empty" colspan="3">Nenhum servidor encontrado.</td></tr>`;
    return;
  }
  body.innerHTML = filteredRequests
    .slice()
    .sort((left, right) => String(left.person || "").localeCompare(String(right.person || ""), "pt-BR") || String(left.start || left.month || "").localeCompare(String(right.start || right.month || "")))
    .map(request => `<tr><td>${escapeHtml(request.person || "Não identificado")}</td><td>${escapeHtml(request.unidade || request.unit || "Não informada")}</td><td>${escapeHtml(formatReportPeriod(request))}</td><td>${Number(request.days) || 1}</td></tr>`)
    .join("");
}

function renderCurrentMonthVacations() {
  const monthLabel = document.getElementById("current-month-label");
  const container = document.getElementById("current-month-vacations");
  const vacationCount = document.getElementById("monthly-vacation-count");
  const vacationCountUnit = document.getElementById("monthly-vacation-unit");
  const searchInput = document.getElementById("current-vacation-search");
  const monthSelect = document.getElementById("current-vacation-month");
  const yearSelect = document.getElementById("current-vacation-year");
  const fgToggle = document.getElementById("current-vacation-fg");
  if (!monthLabel || !container || !vacationCount || !vacationCountUnit || !searchInput || !monthSelect || !yearSelect) return;
  renderReportFg();

  const now = new Date();
  const currentYear = String(now.getFullYear());
  const approvedRequests = getApprovedVacationRequests();
  const availableYears = getAvailableReportYears(approvedRequests, currentYear);
  if (!availableYears.includes(selectedVacationYear)) selectedVacationYear = currentYear;
  monthSelect.innerHTML = monthNames.map((month, index) => `<option value="${index}">${month.charAt(0).toUpperCase()}${month.slice(1)}</option>`).join("");
  monthSelect.value = selectedVacationMonth;
  yearSelect.innerHTML = availableYears.map(year => `<option value="${year}">${year}</option>`).join("");
  yearSelect.value = selectedVacationYear;

  const monthIndex = Number(selectedVacationMonth);
  const monthName = monthNames[monthIndex] || monthNames[now.getMonth()];
  const selectedYearNumber = Number(selectedVacationYear);
  const monthStart = dateKey(new Date(selectedYearNumber, monthIndex, 1));
  const monthEnd = dateKey(new Date(selectedYearNumber, monthIndex + 1, 0));
  monthLabel.textContent = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(selectedYearNumber, monthIndex, 1));

  const fgNames = new Set(fgServerRoster.map(entry => getFgRosterName(entry).trim().toLocaleLowerCase("pt-BR")));
  const includeFg = !fgToggle || fgToggle.checked;
  const matchingRequests = approvedRequests.filter(request => {
    if (!includeFg && fgNames.has(String(request.person || "").trim().toLocaleLowerCase("pt-BR"))) return false;
    if (isIsoDate(request.start) && isIsoDate(request.end)) {
      return request.start <= monthEnd && request.end >= monthStart;
    }
    const requestMonth = String(request.month || request.start || request.end || "").trim().toLocaleLowerCase("pt-BR");
    const requestYear = String(request.year || request.ano || currentYear);
    return requestMonth === monthName && requestYear === selectedVacationYear;
  });

  const serverNames = new Set(matchingRequests.map(request => String(request.person || "Não identificado")));
  vacationCount.textContent = String(serverNames.size);
  vacationCountUnit.textContent = serverNames.size === 1 ? "servidor" : "servidores";
  const fgCount = Array.from(serverNames).filter(name => fgNames.has(name.trim().toLocaleLowerCase("pt-BR"))).length;
  const regularCountEl = document.getElementById("monthly-vacation-count-regular");
  const fgCountEl = document.getElementById("monthly-vacation-count-fg");
  if (regularCountEl) regularCountEl.textContent = String(serverNames.size - fgCount);
  if (fgCountEl) fgCountEl.textContent = String(fgCount);

  const titlesBox = document.getElementById("current-vacation-group-titles");
  if (titlesBox) titlesBox.innerHTML = "";
  if (matchingRequests.length === 0) {
    container.innerHTML = `<tr><td class="current-vacations-empty" colspan="4">Nenhum servidor com férias aprovadas neste mês.</td></tr>`;
    return;
  }

  const searchTerm = searchInput.value.trim().toLocaleLowerCase("pt-BR");
  const visibleRequests = matchingRequests.filter(request => String(request.person || "Não identificado").toLocaleLowerCase("pt-BR").includes(searchTerm));
  if (visibleRequests.length === 0) {
    container.innerHTML = `<tr><td class="current-vacations-empty" colspan="4">Nenhum servidor encontrado com esse nome.</td></tr>`;
    return;
  }

  const sortedRequests = visibleRequests
    .slice()
    .sort((left, right) => String(left.person || "").localeCompare(String(right.person || ""), "pt-BR") || String(left.start || left.month || "").localeCompare(String(right.start || right.month || "")));
  const renderRow = request => {
    const person = String(request.person || "Não identificado");
    const unit = String(request.unidade || request.unit || "Não informada").trim();
    const period = formatReportPeriod(request, selectedVacationYear, selectedVacationMonth);
    const monthText = `${monthName.charAt(0).toLocaleUpperCase("pt-BR")}${monthName.slice(1)}`;
    return `<tr class="current-vacation-item"><td>${escapeHtml(person)}</td><td>${escapeHtml(unit)}</td><td>${escapeHtml(monthText)}</td><td>${escapeHtml(period)}</td></tr>`;
  };
  const isFgRequest = request => fgNames.has(String(request.person || "").trim().toLocaleLowerCase("pt-BR"));
  const groups = [
    ["Servidores sem Função Gratificada", sortedRequests.filter(request => !isFgRequest(request))],
    ["Servidores com Função Gratificada", sortedRequests.filter(isFgRequest)]
  ];
  const groupTitles = document.getElementById("current-vacation-group-titles");
  if (groupTitles) groupTitles.innerHTML = groups.filter(([, items]) => items.length).map(([title, items]) => `<strong>${title}</strong>`).join("");
  container.innerHTML = groups
    .filter(([, items]) => items.length)
    .map(([title, items]) => `<tr class="current-vacation-group"><th scope="colgroup" colspan="4">${title} (${items.length})</th></tr>${items.map(renderRow).join("")}`)
    .join("");
}

function renderAll() {
  renderCalendar("overview-calendar", true);
  renderCalendar("full-calendar", false);
  renderRequests("overview-requests", true);
  renderRequests("full-requests", false);
  renderMeta4();
  renderFgProtocols();
  renderTeam("overview-team", 4);
  renderTeam("full-team", people.length);
  renderCurrentMonthVacations();
  renderServerAccounts();
  renderServerPersonalData();
  renderReportYear();
  renderReportUnit();
  renderReportPerson();
  renderReportFg();
  renderUsuarios();
  updateCounts();
  updateSelectedDay();
  refreshIcons();
}
function renderCalendar(elementId, compact) {
  const grid = document.getElementById(elementId);
  if (!grid) return;
  const cellHeight = compact ? Math.round(calendarScale.height * 0.7) : calendarScale.height;
  grid.style.setProperty("--calendar-scale-width", `${calendarScale.width}px`);
  grid.style.setProperty("--calendar-scale-height", `${cellHeight}px`);
  const year = shownMonth.getFullYear();
  const month = shownMonth.getMonth();
  const monthLabel = `${monthNames[month][0].toUpperCase()}${monthNames[month].slice(1)} ${year}`;
  document.getElementById(compact ? "overview-month-label" : "full-month-label").textContent = monthLabel;
  const todayKey = dateKey(new Date());
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weekdaysMarkup = weekdays.map(day => `<span class="calendar-weekday">${day}</span>`).join("");
  const daysMarkup = Array.from({ length: daysInMonth }, (_, index) => {
    const day = new Date(year, month, index + 1);
    const key = dateKey(day);
    const events = requests.filter(request => {
      if (request.status === "rejected") return false;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(request.start || "")) || !/^\d{4}-\d{2}-\d{2}$/.test(String(request.end || ""))) return false;
      return key >= request.start && key <= request.end;
    });
    const classes = ["calendar-day", key === todayKey ? "is-today" : "", selectedDate === key ? "is-selected" : ""].filter(Boolean).join(" ");
    const teamName = getShiftTeamForDate(key);
    const teamDisplay = teamName.toUpperCase();
    const isAlfa = teamName === "Alfa";
    const isBravo = teamName === "Bravo";
    const isCharlie = teamName === "Charlie";
    const isDelta = teamName === "Delta";
    const teamClass = isAlfa ? "team-alfa" : isBravo ? "team-bravo" : isCharlie ? "team-charlie" : isDelta ? "team-delta" : "";
    const eventMarkup = compact ? `<span class="calendar-day-shift compact-shift ${teamClass}">${teamDisplay}</span><span class="day-dots">${events.slice(0, 3).map(item => `<i class="${item.status === "pending" ? "dot-peach" : "dot-green"}"></i>`).join("")}</span>` : `<span class="calendar-day-shift ${teamClass}">${teamDisplay}</span><span class="calendar-day-events">${events.slice(0, 2).map(item => `<span class="calendar-entry ${item.status === "pending" ? "entry-pending" : "entry-approved"} ${isAlfa ? "team-entry-alfa" : isBravo ? "team-entry-bravo" : isCharlie ? "team-entry-charlie" : isDelta ? "team-entry-delta" : ""}">${escapeHtml(item.person.split(" ")[0].toUpperCase())}</span>`).join("")}</span>`;
    return `<button class="${classes} ${teamClass}" data-date="${key}" aria-label="${day.getDate()} de ${monthNames[day.getMonth()]}, equipe ${teamDisplay} em escala"><span class="calendar-day-number">${day.getDate()}</span>${eventMarkup}</button>`;
  }).join("");
  grid.innerHTML = weekdaysMarkup + daysMarkup;
}
function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function getShiftTeamForDate(dateString) {
  const teams = ["Bravo", "Charlie", "Delta", "Alfa"];
  const startDate = new Date("2026-10-01T12:00:00");
  const targetDate = new Date(`${dateString}T12:00:00`);

  if (Number.isNaN(targetDate.getTime())) {
    return "Escala";
  }

  const diffDays = Math.floor((targetDate - startDate) / (1000 * 60 * 60 * 24));
  return teams[((diffDays % teams.length) + teams.length) % teams.length];
}
function renderRequests(elementId, compact) {
  const container = document.getElementById(elementId);
  if (!container) return;
  const list = compact ? getPendingRequests().slice(0, 3) : requests.filter(request => request.status === requestFilter);
  if (list.length === 0) {
    const emptyMessages = {
      pending: ["Tudo em dia por aqui", "Não há solicitações pendentes para revisar."],
      approved: ["Nenhuma solicitação aprovada", "As solicitações aprovadas aparecerão nesta lista."],
      rejected: ["Nenhuma solicitação recusada", "As solicitações recusadas aparecerão nesta lista."]
    };
    const [title, message] = emptyMessages[requestFilter] || emptyMessages.pending;
    container.innerHTML = `<div class="empty-state"><i data-lucide="inbox"></i><strong>${title}</strong><span>${message}</span></div>`;
    return;
  }
  container.innerHTML = list.map(request => {
    const statusLabel = { pending: "Pendente", approved: "Aprovada", rejected: "Recusada" }[request.status];
    const actions = request.status === "pending" ? `<div class="request-actions"><button class="action-icon approve" data-request-action="approve" data-request-id="${escapeHtml(request.id)}" aria-label="Aprovar ${escapeHtml(request.person)}" title="Aprovar"><i data-lucide="check"></i></button><button class="action-icon reject" data-request-action="reject" data-request-id="${escapeHtml(request.id)}" aria-label="Recusar ${escapeHtml(request.person)}" title="Recusar"><i data-lucide="x"></i></button></div>` : "";
    if (compact) {
      const summary = formatRequestPeriod(request);
      return `<article class="request-item">${avatar(request.initials, request.color, "request-person-avatar")}<div class="request-copy"><strong>${escapeHtml(request.person)}</strong><span>${escapeHtml(summary)}</span>${request.note ? `<small>“${escapeHtml(request.note)}”</small>` : ""}</div>${actions}</article>`;
    }
    const unit = String(request.unidade || request.unit || "Não informada");
    const monthLabel = hasRequestCycle(request) ? "Mês - Ciclo" : "Mês";
    const monthValue = hasRequestCycle(request) ? getRequestMonthCycleDisplay(request) : getRequestMonthDisplay(request);
    const period = getRequestPeriodDisplay(request);
    const details = `<span class="request-details"><span><strong>Unidade:</strong> ${escapeHtml(unit)}</span><span><strong>${monthLabel}:</strong> ${escapeHtml(monthValue)}</span>${period ? `<span><strong>Período:</strong> ${escapeHtml(period)}</span>` : ""}</span>`;
    return `<article class="request-item"><button class="request-detail-trigger" type="button" data-request-details="${escapeHtml(request.id)}" aria-label="Abrir solicitação de ${escapeHtml(request.person || "servidor")}"><span>${avatar(request.initials, request.color, "request-person-avatar")}</span><span class="request-copy"><strong>${escapeHtml(request.person || "Não identificado")}</strong>${details}</span><span class="request-status-wrap"><span class="status-pill status-${request.status}">${statusLabel}</span></span></button>${actions}</article>`;
  }).join("");
}

function getRequestYearMonthKeys(request) {
  if (isIsoDate(request.start)) {
    const start = new Date(`${request.start}T12:00:00`);
    const end = isIsoDate(request.end) && request.end >= request.start
      ? new Date(`${request.end}T12:00:00`)
      : start;
    const keys = [];
    for (let date = new Date(start.getFullYear(), start.getMonth(), 1, 12); date <= end; date.setMonth(date.getMonth() + 1)) {
      keys.push({ year: date.getFullYear(), month: date.getMonth() });
    }
    return keys;
  }

  const fallbackYear = Number(request.year || request.ano || new Date().getFullYear());
  const monthValue = String(request.month || request.start || request.end || "").trim().toLocaleLowerCase("pt-BR");
  const namedMonth = monthNames.indexOf(monthValue);
  if (namedMonth >= 0) return [{ year: fallbackYear, month: namedMonth }];
  const cycleMonths = { A: [2, 3, 4], B: [5, 6, 7], C: [8, 9, 10] };
  return (cycleMonths[String(request.ciclo || "").trim().toUpperCase()] || []).map(month => ({ year: fallbackYear, month }));
}

function updateRequestPeriodFilters(monthSelect, yearSelect, items) {
  const currentYear = String(new Date().getFullYear());
  const years = [...new Set([currentYear, ...items.flatMap(getRequestYearMonthKeys).map(key => String(key.year))])]
    .sort((left, right) => Number(right) - Number(left));
  const previousYear = yearSelect.dataset.initialized ? yearSelect.value : currentYear;
  yearSelect.innerHTML = `<option value="">Todos os anos</option>${years.map(year => `<option value="${year}">${year}</option>`).join("")}`;
  yearSelect.value = years.includes(previousYear) ? previousYear : currentYear;

  const previousMonth = monthSelect.dataset.initialized ? monthSelect.value : String(new Date().getMonth());
  monthSelect.innerHTML = `<option value="">Todos os meses</option>${monthNames.map((month, index) => `<option value="${index}">${month.charAt(0).toLocaleUpperCase("pt-BR")}${month.slice(1)}</option>`).join("")}`;
  monthSelect.value = previousMonth === "" || (Number(previousMonth) >= 0 && Number(previousMonth) <= 11)
    ? previousMonth
    : String(new Date().getMonth());
  monthSelect.dataset.initialized = "true";
  yearSelect.dataset.initialized = "true";
  return {
    year: yearSelect.value === "" ? null : Number(yearSelect.value),
    month: monthSelect.value === "" ? null : Number(monthSelect.value)
  };
}

function getRequestYearLabel(request) {
  const years = [...new Set(getRequestYearMonthKeys(request).map(key => key.year))];
  return years.length ? years.join(" / ") : "Não informado";
}

function renderMeta4() {
  const body = document.getElementById("meta4-body");
  const count = document.getElementById("meta4-count");
  const monthSelect = document.getElementById("meta4-month-filter");
  const yearSelect = document.getElementById("meta4-year-filter");
  const launchFilter = document.getElementById("meta4-launch-filter");
  if (!body || !count || !monthSelect || !yearSelect || !launchFilter) return;
  const nameFilter = normalizeSearchText(document.getElementById("meta4-search")?.value || "");
  const userRequests = requests
    .filter(request => {
      const isUserRequest = request.source === "user" || String(request.id || "").startsWith("user-");
      const isAdminLaunch = request.launchedByAdmin === true || String(request.id || "").startsWith("launch-");
      const isFgServer = isServerInFgRoster({ name: request.person, cpf: request.cpf });
      const nameMatches = normalizeSearchText(request.person || "").includes(nameFilter);
      return (isUserRequest || isAdminLaunch) && !isFgServer && nameMatches;
    })
    .slice()
    .sort((left, right) => String(right.createdAt || right.id || "").localeCompare(String(left.createdAt || left.id || ""), "pt-BR"));
  const selectedPeriod = updateRequestPeriodFilters(monthSelect, yearSelect, userRequests);
  const filteredRequests = userRequests.filter(request => getRequestYearMonthKeys(request).some(key =>
    (selectedPeriod.year === null || key.year === selectedPeriod.year)
    && (selectedPeriod.month === null || key.month === selectedPeriod.month))
    && (!launchFilter.value || (request.meta4Launch === "sim" ? "sim" : "nao") === launchFilter.value));
  count.textContent = `${filteredRequests.length} ${filteredRequests.length === 1 ? "pedido" : "pedidos"}`;
  body.innerHTML = filteredRequests.length
    ? filteredRequests.map(request => {
      const monthValue = request.month || (isIsoDate(request.start)
        ? new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date(`${request.start}T12:00:00`))
        : hasRequestCycle(request) ? `Ciclo ${String(request.ciclo).trim().toUpperCase()}` : "Não informado");
      const year = getRequestYearLabel(request);
      const start = isIsoDate(request.start) ? formatDate(request.start, { day: "2-digit", month: "2-digit", year: "numeric" }) : "Não informado";
      const end = isIsoDate(request.end) ? formatDate(request.end, { day: "2-digit", month: "2-digit", year: "numeric" }) : "Não informado";
      const launchValue = request.meta4Launch === "sim" ? "sim" : "nao";
      const launchDate = launchValue === "sim" ? (isIsoDate(request.meta4LaunchDate) ? request.meta4LaunchDate : dateKey(new Date())) : "";
      return `<tr><td>${escapeHtml(request.person || "Não identificado")}</td><td>${escapeHtml(request.cpf || "Não informado")}</td><td>${escapeHtml(monthValue)}</td><td>${escapeHtml(year)}</td><td>${escapeHtml(start)}</td><td>${escapeHtml(end)}</td><td><select data-meta4-launch data-request-id="${escapeHtml(request.id)}" aria-label="Lançamento de ${escapeHtml(request.person || "servidor")}"><option value="nao"${launchValue === "nao" ? " selected" : ""}>Não</option><option value="sim"${launchValue === "sim" ? " selected" : ""}>Sim</option></select></td><td><input data-meta4-launch-date data-request-id="${escapeHtml(request.id)}" type="date" value="${escapeHtml(launchDate)}"${launchValue === "nao" ? " disabled" : ""} aria-label="Data M4 de ${escapeHtml(request.person || "servidor")}"></td></tr>`;
    }).join("")
    : `<tr><td class="detailed-report-empty" colspan="8">Nenhum pedido enviado por usuários.</td></tr>`;
}

function renderFgProtocols() {
  const body = document.getElementById("protocols-fg-body");
  const count = document.getElementById("protocols-fg-count");
  const monthSelect = document.getElementById("protocols-fg-month-filter");
  const yearSelect = document.getElementById("protocols-fg-year-filter");
  const statusFilter = document.getElementById("protocols-fg-status-filter");
  if (!body || !count || !monthSelect || !yearSelect || !statusFilter) return;
  const nameFilter = normalizeSearchText(document.getElementById("protocols-fg-search")?.value || "");
  const protocolRequests = requests
    .filter(request => {
      const requestType = String(request.type || "").trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const isVacation = !requestType || requestType.includes("ferias");
      const nameMatches = normalizeSearchText(`${request.person || ""} ${request.substituto || request.substitute || ""}`).includes(nameFilter);
      return request.status !== "rejected" && isVacation && nameMatches
        && isServerInFgRoster({ name: request.person, cpf: request.cpf });
    })
    .slice()
    .sort((left, right) => String(left.start || left.month || "").localeCompare(String(right.start || right.month || ""))
      || String(left.person || "").localeCompare(String(right.person || ""), "pt-BR"));
  const selectedPeriod = updateRequestPeriodFilters(monthSelect, yearSelect, protocolRequests);
  const filteredRequests = protocolRequests.filter(request => getRequestYearMonthKeys(request).some(key =>
    (selectedPeriod.year === null || key.year === selectedPeriod.year)
    && (selectedPeriod.month === null || key.month === selectedPeriod.month))
    && (!statusFilter.value || (request.fgProtocolStatus === "feito" ? "feito" : "fazer") === statusFilter.value));
  count.textContent = `${filteredRequests.length} ${filteredRequests.length === 1 ? "protocolo" : "protocolos"}`;
  body.innerHTML = filteredRequests.length
    ? filteredRequests.map(request => {
      const person = String(request.person || "Não identificado");
      const substitute = String(request.substituto || request.substitute || "Não informado");
      const personCpf = request.cpf || findServerCpfByName(person);
      const substituteCpf = request.substituteCpf || request.cpfSubstituto || findServerCpfByName(substitute);
      const rawMonth = request.month || (isIsoDate(request.start)
        ? new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date(`${request.start}T12:00:00`))
        : "Não informado");
      const month = rawMonth === "Não informado" ? rawMonth : `${String(rawMonth).charAt(0).toLocaleUpperCase("pt-BR")}${String(rawMonth).slice(1)}`;
      const year = getRequestYearLabel(request);
      const protocolDone = request.fgProtocolStatus === "feito";
      const isChecked = request.fgProtocolChecked === true;
      const start = isIsoDate(request.start) ? formatDate(request.start, { day: "2-digit", month: "2-digit", year: "numeric" }) : "Não informado";
      const end = isIsoDate(request.end) ? formatDate(request.end, { day: "2-digit", month: "2-digit", year: "numeric" }) : "Não informado";
      const durationDays = Number(request.days) || (isIsoDate(request.start) && isIsoDate(request.end)
        ? Math.round((new Date(`${request.end}T12:00:00`) - new Date(`${request.start}T12:00:00`)) / 86400000) + 1
        : 0);
      const daysLabel = durationDays > 0 ? String(durationDays) : "Não informado";
      return `<tr class="${isChecked ? "fg-protocol-checked" : ""}"><td>${escapeHtml(person)}</td><td>${escapeHtml(formatCpfLabel(personCpf))}</td><td>${escapeHtml(substitute)}</td><td>${escapeHtml(formatCpfLabel(substituteCpf))}</td><td>${escapeHtml(month)}</td><td>${escapeHtml(year)}</td><td>${escapeHtml(start)}</td><td>${escapeHtml(end)}</td><td>${escapeHtml(daysLabel)}</td><td><select data-fg-protocol-status data-request-id="${escapeHtml(request.id)}" aria-label="Status do protocolo de ${escapeHtml(person)}"><option value="fazer"${protocolDone ? "" : " selected"}>Fazer protocolo</option><option value="feito"${protocolDone ? " selected" : ""}>Protocolo feito</option></select></td><td><input data-fg-protocol-number data-request-id="${escapeHtml(request.id)}" type="text" maxlength="60" value="${escapeHtml(request.fgProtocolNumber || "")}"${protocolDone ? "" : " disabled"} aria-label="Número do protocolo de ${escapeHtml(person)}" placeholder="Número"></td><td><input data-fg-protocol-checked data-request-id="${escapeHtml(request.id)}" type="checkbox"${isChecked ? " checked" : ""} aria-label="Marcar protocolo de ${escapeHtml(person)} como conferido"></td></tr>`;
    }).join("")
    : `<tr><td class="detailed-report-empty" colspan="12">Nenhum pedido de férias de servidores com Função Gratificada.</td></tr>`;
}

function openRequestDetails(requestId) {
  const request = requests.find(item => item.id === requestId);
  if (!request) {
    showToast("Não foi possível localizar os dados desta solicitação.");
    return;
  }

  const dialog = document.getElementById("request-details-dialog");
  const content = document.getElementById("request-details-content");
  const actions = document.getElementById("request-details-actions");
  const rejectionSection = document.getElementById("request-rejection-section");
  const rejectionForm = document.getElementById("request-rejection-form");
  const requestType = String(request.type || "Férias").trim();
  const detailRows = [
    ["Servidor", request.person || "Não identificado"],
    ["CPF", request.cpf],
    ["E-mail", request.email],
    ["Tipo de solicitação", requestType.charAt(0).toLocaleUpperCase("pt-BR") + requestType.slice(1)],
    ["Unidade", request.unidade || request.unit || "Não informada"],
    ["Equipe", request.equipe],
    [hasRequestCycle(request) ? "Mês - Ciclo" : "Mês", hasRequestCycle(request) ? getRequestMonthCycleDisplay(request) : getRequestMonthDisplay(request)],
    ["Período", getRequestPeriodDisplay(request)],
    ["Função exercida", request.funcaoExercida || request.functionExercised],
    ["Substituto", request.substituto || request.substitute],
    ["Observações", request.note],
    ["Justificativa da recusa", request.rejectionJustification]
  ].filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "");

  rejectionForm.reset();
  rejectionSection.hidden = true;
  actions.hidden = false;
  rejectionForm.querySelector('[name="requestId"]').value = request.id;
  document.getElementById("request-details-title").textContent = `Solicitação de ${request.person || "servidor"}`;
  const attachment = request.rejectionAttachment;
  const attachmentMarkup = attachment
    ? `<div class="request-attachment-detail"><strong>Anexo da recusa</strong><span>${escapeHtml(attachment.name)}</span><button class="button button-secondary" type="button" data-request-attachment="${escapeHtml(request.id)}"><i data-lucide="download"></i><span>Baixar arquivo</span></button></div>`
    : "";
  content.innerHTML = `<dl class="request-details-list">${detailRows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>${attachmentMarkup}`;
  actions.innerHTML = `
    <button class="button button-secondary" type="button" data-request-edit="${escapeHtml(request.id)}"><i data-lucide="pen-line"></i><span>Editar</span></button>
    <button class="button button-secondary" type="button" data-request-remove="${escapeHtml(request.id)}"><i data-lucide="trash-2"></i><span>Excluir</span></button>
    ${request.status === "pending"
    ? `<button class="button button-secondary" type="button" data-request-action="reject" data-request-id="${escapeHtml(request.id)}"><i data-lucide="x"></i><span>Recusar</span></button><button class="button button-primary" type="button" data-request-action="approve" data-request-id="${escapeHtml(request.id)}"><i data-lucide="check"></i><span>Aprovar</span></button>`
    : ""}`;
  dialog.showModal();
  refreshIcons();
}

async function downloadRequestAttachment(requestId) {
  try {
    const attachment = await getRequestAttachment(requestId);
    if (!attachment?.blob) {
      showToast("O arquivo anexado não está disponível neste navegador.");
      return;
    }
    const downloadUrl = URL.createObjectURL(attachment.blob);
    const downloadLink = document.createElement("a");
    downloadLink.href = downloadUrl;
    downloadLink.download = attachment.name || "anexo-solicitacao";
    document.body.append(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
  } catch (error) {
    const detail = error instanceof Error ? ` ${error.message}` : "";
    showToast(`Não foi possível abrir o arquivo anexado.${detail}`);
  }
}

async function rejectRequestWithDetails(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const requestId = String(formData.get("requestId") || "");
  const justification = String(formData.get("justification") || "").trim();
  const attachmentFile = document.getElementById("request-rejection-attachment").files[0] || null;
  const request = requests.find(item => item.id === requestId);
  if (!request || request.status !== "pending") {
    showToast("Esta solicitação não está mais pendente.");
    return;
  }
  const reasonField = document.getElementById("request-rejection-reason");
  reasonField.setCustomValidity("");
  if (!justification) {
    reasonField.setCustomValidity("Informe a justificativa para recusar a solicitação.");
    reasonField.reportValidity();
    reasonField.focus();
    return;
  }
  document.getElementById("request-rejection-reason").setCustomValidity("");

  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  let previousAttachment = null;
  const previousStatus = request.status;
  const previousJustification = request.rejectionJustification;
  const previousAttachmentMetadata = request.rejectionAttachment;
  let attachmentStored = false;
  try {
    if (attachmentFile) {
      previousAttachment = await getRequestAttachment(requestId);
      await storeRequestAttachment(requestId, attachmentFile);
      attachmentStored = true;
    }
    request.status = "rejected";
    request.rejectionJustification = justification;
    request.rejectionAttachment = attachmentFile
      ? { name: attachmentFile.name, type: attachmentFile.type, size: attachmentFile.size }
      : null;
    if (!saveRequests()) {
      request.status = previousStatus;
      request.rejectionJustification = previousJustification;
      request.rejectionAttachment = previousAttachmentMetadata;
      if (attachmentStored) {
        try {
          await restoreRequestAttachment(requestId, previousAttachment);
        } catch {
          showToast("A solicitação não foi atualizada e não foi possível restaurar o anexo anterior.");
        }
      }
      return;
    }
    document.getElementById("request-details-dialog").close();
    renderAll();
    showToast(`Solicitação de ${request.person} recusada.`);
  } catch (error) {
    request.status = previousStatus;
    request.rejectionJustification = previousJustification;
    request.rejectionAttachment = previousAttachmentMetadata;
    if (attachmentStored) {
      try {
        await restoreRequestAttachment(requestId, previousAttachment);
      } catch {
        showToast("Não foi possível salvar o anexo nem restaurar o arquivo anterior.");
        return;
      }
    }
    const detail = error instanceof Error ? ` ${error.message}` : "";
    showToast(`Não foi possível registrar a recusa ou salvar o anexo.${detail}`);
  } finally {
    submitButton.disabled = false;
  }
}

function renderTeam(elementId, limit) {
  const container = document.getElementById(elementId);
  if (!container) return;
  const query = (elementId === "full-team" ? document.getElementById("team-search")?.value : "")?.trim().toLocaleLowerCase("pt-BR") || "";
  const filteredPeople = people.filter(person => `${person.name} ${person.role}`.toLocaleLowerCase("pt-BR").includes(query)).slice(0, limit);
  if (filteredPeople.length === 0) { container.innerHTML = `<tr><td colspan="5" class="team-empty">Nenhuma pessoa encontrada.</td></tr>`; return; }
  container.innerHTML = filteredPeople.map(person => {
    const nextRequest = requests.find(request => request.person === person.name && request.status === "approved");
    const upcoming = nextRequest
      ? (getMonthLabel(nextRequest) || formatRange(nextRequest.start, nextRequest.end))
      : person.next;
    const today = dateKey(new Date());
    const status = nextRequest && (!nextRequest.month ? nextRequest.start <= today && nextRequest.end >= today : true) ? "Férias" : person.status;
    const width = `${Math.min(100, Math.round(person.balance / 30 * 100))}%`;
    return `<tr><td><div class="person-cell">${avatar(person.initials, person.color)}<span><strong>${escapeHtml(person.name)}</strong><small>${escapeHtml(person.role)}</small></span></div></td><td>${escapeHtml(person.role)}</td><td><div class="balance-cell"><span>${person.balance} dias</span><span class="balance-track"><i style="width:${width}"></i></span></div></td><td>${escapeHtml(upcoming)}</td><td><span class="status-pill ${status === "Férias" ? "status-away" : "status-approved"}">${status}</span></td></tr>`;
  }).join("");
}
function updateCounts() {
  const pendingCount = getPendingRequests().length;
  document.getElementById("nav-pending-count").textContent = pendingCount;
  document.getElementById("pending-stat").textContent = pendingCount;
  document.getElementById("request-heading-count").textContent = String(pendingCount).padStart(2, "0");
  document.getElementById("pending-foot").textContent = pendingCount ? "Solicitações aguardando sua revisão" : "Todas as solicitações foram revisadas";
}
function updateSelectedDay() {
  const heading = document.getElementById("selected-day-heading");
  const content = document.getElementById("selected-day-content");
  if (!heading || !content) return;
  if (!selectedDate) { heading.textContent = "Selecione uma data"; content.innerHTML = `<p class="empty-note">Escolha um dia no calendário para ver quem estará fora.</p>`; return; }
  const date = new Date(`${selectedDate}T12:00:00`);
  heading.textContent = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(date);
  const events = requests.filter(request => {
    if (request.status === "rejected") return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(request.start || "")) || !/^\d{4}-\d{2}-\d{2}$/.test(String(request.end || ""))) return false;
    return selectedDate >= request.start && selectedDate <= request.end;
  });
  content.innerHTML = events.length ? events.map(request => `<article class="day-person">${avatar(request.initials, request.color)}<span><strong>${escapeHtml(request.person)}</strong><small>24h trabalhadas • 72h de descanso</small></span></article>`).join("") : `<p class="empty-note">Nenhuma equipe escalada para esta data.</p>`;
}
function setView(view) {
  document.querySelectorAll(".view-panel").forEach(panel => panel.classList.toggle("active", panel.id === `view-${view}`));
  document.querySelectorAll(".nav-link[data-view], .nav-submenu-link[data-view]").forEach(link => {
    const matchesView = link.dataset.view === view;
    const matchesRequestFilter = !link.dataset.requestFilter || link.dataset.requestFilter === requestFilter;
    link.classList.toggle("active", matchesView && matchesRequestFilter);
  });
  document.querySelectorAll(".nav-menu-item").forEach(menuItem => {
    const toggle = menuItem.querySelector("[data-submenu-toggle]");
    const submenu = menuItem.querySelector(".nav-submenu");
    const hasActiveItem = Array.from(submenu.querySelectorAll("[data-view], [data-open-report]"))
      .some(link => link.dataset.view === view || link.dataset.openReport === view);
    menuItem.classList.toggle("open", hasActiveItem);
    toggle.classList.toggle("active", hasActiveItem);
    toggle.setAttribute("aria-expanded", String(hasActiveItem));
    submenu.hidden = !hasActiveItem;
  });
  const titles = { overview: ["Visão geral", "", ""], calendar: ["Calendário", "Calendário da equipe", "Planeje as férias sem perder de vista a cobertura do time."], team: ["Equipe", "Sua equipe", "Saldo, disponibilidade e próximos períodos de descanso."], requests: ["Solicitações", "Solicitações", "Revise os pedidos e ajude o time a planejar com tranquilidade."], servers: ["Servidores", "Cadastro de Login", "Consulte os dados cadastrados e altere somente o tipo de acesso."],   "server-data": ["Servidores", "Cadastro de Dados dos Servidores", "Cadastre e consulte os dados funcionais dos servidores."], "vacation-launch": ["Solicitações", "Lançar férias", "Registre períodos de férias diretamente para os servidores."], "server-fg": ["Servidores", "Cadastro de Servidores com Função Gratificada", "Cadastre os servidores que possuem Função Gratificada."], reports: ["Relatórios", "Relatório de Férias Por mês", "Consulte os relatórios de férias."], "report-year": ["Relatório por ano", "Relatório por ano", "Consulte os servidores com férias aprovadas no ano escolhido."], "report-unit": ["Relatório por unidade", "Relatório por unidade", "Consulte as férias aprovadas agrupadas por unidade."], "report-person": ["Relatório por servidor", "Relatório por servidor", "Consulte as férias aprovadas de cada servidor."], "report-servers": ["Relatório - Servidores", "Relatório - Servidores", "Consulte os dados funcionais dos servidores cadastrados."], "report-capacitacao": ["Licença-capacitação", "Relatório de licença-capacitação", "Consulte as solicitações de licença-capacitação aprovadas."], "report-especial": ["Licença especial", "Relatório de licença especial", "Consulte as solicitações de licença especial aprovadas."], usuarios: ["Gestão", "Usuários & Acessos", "Gerencie quem acessa o sistema com o Google e o perfil de cada um."] };
  const [breadcrumb, title, subtitle] = titles[view] || (view === "tasks" ? ["Gestão", "Lista de tarefas", "Registre e acompanhe suas tarefas."] : view === "meta4" ? ["Solicitações", "META 4", "Consulte os pedidos de férias enviados pelos usuários."] : view === "protocols-fg" ? ["Solicitações", "Protocolos F.G", "Acompanhe o status e o número dos protocolos de férias com Função Gratificada."] : titles.overview);
  document.getElementById("breadcrumb-current").textContent = breadcrumb;
  const pageTitle = document.getElementById("page-title");
  pageTitle.replaceChildren(document.createTextNode(title));
  pageTitle.hidden = !title;
  const pageSubtitle = document.getElementById("page-subtitle");
  pageSubtitle.textContent = subtitle;
  pageSubtitle.hidden = !subtitle;
  if (view === "reports") renderCurrentMonthVacations();
  if (view === "meta4") renderMeta4();
  if (view === "protocols-fg") renderFgProtocols();
  if (view === "servers") renderServerAccounts();
  if (view === "server-data") renderServerPersonalData();
  if (view === "server-fg") renderFgServerRoster();
  if (view === "vacation-launch") renderVacationLaunch();
  if (view === "report-year") renderReportYear();
  if (view === "report-unit") renderReportUnit();
  if (view === "report-person") renderReportPerson();
  if (view === "report-servers") renderServerDirectoryReport();
  if (view === "report-capacitacao") renderReportCapacitacao();
  if (view === "report-especial") renderReportEspecial();
  if (view === "usuarios") renderUsuarios();
  if (view === "calendar") {
    document.getElementById("page-subtitle").textContent = "Escala de trabalho: 24h de serviço e 72h de descanso, distribuídas entre as equipes Alfa, Bravo, Charlie e Delta.";
  }
  refreshIcons();
}
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.querySelector("span").textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2800);
}
function refreshIcons() { if (window.lucide) window.lucide.createIcons(); }
function renderLoggedInProfile() {
  const nameElement = document.getElementById("profile-name");
  const avatarElement = document.getElementById("profile-avatar");
  const roleElement = document.getElementById("profile-role");
  if (!nameElement || !avatarElement || !roleElement) return;

  let profile = null;
  try {
    profile = JSON.parse(sessionStorage.getItem("brisa-demo-profile") || "null");
  } catch {}
  const name = String(profile?.name || "").trim() || "Administrador";
  const nameParts = name.split(/\s+/).filter(Boolean);
  const initials = nameParts.length > 1
    ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
    : nameParts[0]?.[0] || "A";
  nameElement.textContent = name;
  avatarElement.textContent = initials.toLocaleUpperCase("pt-BR");
  roleElement.textContent = profile?.role === "admin" ? "Administrador" : "Acesso administrativo";
}
function getReportTableData(table) {
  const headers = Array.from(table.tHead?.rows[0]?.cells || []).map(cell => cell.innerText.trim());
  const rows = Array.from(table.tBodies[0]?.rows || [])
    .filter(row => !row.querySelector(".detailed-report-empty, .current-vacations-empty"))
    .map(row => Array.from(row.cells).map(cell => (cell.innerText || cell.textContent || "").replace(/\s+/g, " ").trim()));
  return { headers, rows };
}
function downloadReportCsv(title, headers, rows, extraSections = []) {
  const csvCell = value => {
    const text = String(value);
    const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safeText.replace(/"/g, '""')}"`;
  };
  const csvLines = [headers, ...rows].map(row => row.map(csvCell).join(";"));
  extraSections.forEach(section => {
    csvLines.push("", csvCell(section.label), ...[section.headers, ...section.rows].map(row => row.map(csvCell).join(";")));
  });
  const csv = csvLines.join("\r\n");
  const downloadUrl = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const downloadLink = document.createElement("a");
  const fileTitle = title.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  downloadLink.href = downloadUrl;
  downloadLink.download = `${fileTitle || "relatorio"}-${dateKey(new Date())}.csv`;
  document.body.append(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
}
function buildPrintReportHtml(title, recordCount, recordLabel, tableMarkup) {
  const crestUrl = new URL("brasao_ok.png", document.baseURI).href;
  const generatedDate = new Intl.DateTimeFormat("pt-BR").format(new Date());
  return `<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${escapeHtml(title)}</title><style>html{background:#41474d}body{min-height:100vh;box-sizing:border-box;font-family:Arial,sans-serif;color:#f2f4f5;background:#41474d;margin:0;padding:24px}.section-title{margin:28px 0 12px;color:#f2f4f5;font-size:24px}.group-row th{background:#9fc4dc;color:#10222d}.report-header{display:flex;align-items:center;gap:22px;margin-bottom:24px;padding-bottom:18px;border-bottom:2px solid #9fc4dc}.report-header img{width:200px;height:200px;object-fit:contain}.report-organization{margin:0 0 8px;color:#c2d9e7;font-size:18px;font-weight:700;letter-spacing:.08em}.report-header h1{margin:0 0 9px;color:#f2f4f5;font-size:32px}.report-meta{margin:0;color:#d2d9de;font-size:18px}table{width:max-content;min-width:100%;border-collapse:collapse;font-size:18px}th,td{padding:11px 9px;border:1px solid #68727a;text-align:left;white-space:nowrap;overflow-wrap:normal}th{background:#d7e9f4;color:#273945;font-size:18px}tbody tr:nth-child(even){background:#50575d}tbody tr:nth-child(odd){background:#41474d}td{color:#f2f4f5}@page{size:landscape;margin:0}@media print{html,body{width:100%;min-height:100%;margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{padding:10mm}.report-header{break-inside:avoid}thead{display:table-header-group}}</style></head><body><header class="report-header"><img src="${escapeHtml(crestUrl)}" alt="Brasão da Polícia Penal do Paraná"><div><p class="report-organization">POLÍCIA PENAL DO PARANÁ</p><h1>${escapeHtml(title)}</h1><p class="report-meta">Relatório gerado em ${escapeHtml(generatedDate)} · ${recordCount} ${escapeHtml(recordLabel)}</p></div></header>${tableMarkup}</body></html>`;
}
function openPrintReport(reportHtml, frameTitle) {
  const printFrame = document.createElement("iframe");
  printFrame.title = frameTitle;
  printFrame.style.cssText = "position:fixed;width:0;height:0;border:0;visibility:hidden";
  printFrame.onload = async () => {
    try {
      const printDocument = printFrame.contentDocument;
      const images = Array.from(printDocument.images);
      await Promise.all(images.map(image => {
        if (image.complete) {
          return image.naturalWidth > 0
            ? Promise.resolve()
            : Promise.reject(new Error("A imagem do relatório não foi carregada."));
        }
        return image.decode();
      }));
      printFrame.contentWindow.onafterprint = () => printFrame.remove();
      printFrame.contentWindow.focus();
      printFrame.contentWindow.print();
    } catch {
      printFrame.remove();
      showToast("Não foi possível carregar o brasão institucional ou abrir a impressão do relatório.");
    }
  };
  printFrame.srcdoc = reportHtml;
  document.body.append(printFrame);
}
function printReportTable(title, headers, rows, extraSections = []) {
  const buildTable = (tableHeaders, tableData) => {
    const tableRows = tableData.map(row => row.length === 1 && tableHeaders.length > 1
      ? `<tr class="group-row"><th colspan="${tableHeaders.length}">${escapeHtml(row[0])}</th></tr>`
      : `<tr>${row.map(value => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`).join("");
    return `<table><thead><tr>${tableHeaders.map(header => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${tableRows}</tbody></table>`;
  };
  const tableMarkup = buildTable(headers, rows) + extraSections.map(section => `<h2 class="section-title">${escapeHtml(section.label)}</h2>${buildTable(section.headers, section.rows)}`).join("");
  const countRecords = list => list.filter(row => !(row.length === 1 && headers.length > 1)).length;
  const totalRows = countRecords(rows) + extraSections.reduce((sum, section) => sum + countRecords(section.rows), 0);
  const reportHtml = buildPrintReportHtml(title, totalRows, "registro(s)", tableMarkup);
  openPrintReport(reportHtml, `Relatório para impressão: ${title}`);
}
document.querySelectorAll("[data-report-export-table]").forEach(exportControls => {
  exportControls.innerHTML = '<button class="button button-secondary" type="button" data-report-export="csv"><i data-lucide="file-spreadsheet"></i><span>Exportar CSV</span></button><button class="button button-secondary" type="button" data-report-export="pdf"><i data-lucide="file-text"></i><span>Gerar PDF</span></button>';
  exportControls.addEventListener("click", event => {
    const exportButton = event.target.closest("[data-report-export]");
    if (!exportButton) return;
    const title = exportControls.dataset.reportExportTitle;
    const tableIds = exportControls.dataset.reportExportTable.split(",");
    const labels = (exportControls.dataset.reportExportLabels || "").split("|");
    const tables = tableIds.map(id => document.getElementById(id.trim()));
    if (tables.some(table => !table)) {
      showToast("Não foi possível localizar a tabela do relatório.");
      return;
    }
    const [main, ...others] = tables.map((table, index) => ({ label: labels[index] || title, ...getReportTableData(table) }));
    const extraSections = others.filter(section => section.rows.length);
    if (!main.rows.length && !extraSections.length) {
      showToast("Não há registros para exportar neste relatório.");
      return;
    }
    if (exportButton.dataset.reportExport === "csv") downloadReportCsv(title, main.headers, main.rows, extraSections);
    else printReportTable(title, main.headers, main.rows, extraSections);
  });
});
const serverRegistryBody = document.getElementById("server-registry-body");
document.getElementById("meta4-month-filter").addEventListener("change", renderMeta4);
document.getElementById("meta4-year-filter").addEventListener("change", renderMeta4);
document.getElementById("meta4-launch-filter").addEventListener("change", renderMeta4);
document.getElementById("protocols-fg-month-filter").addEventListener("change", renderFgProtocols);
document.getElementById("protocols-fg-year-filter").addEventListener("change", renderFgProtocols);
document.getElementById("protocols-fg-status-filter").addEventListener("change", renderFgProtocols);
document.getElementById("meta4-search").addEventListener("input", renderMeta4);
document.getElementById("protocols-fg-search").addEventListener("input", renderFgProtocols);
document.getElementById("protocols-fg-body").addEventListener("change", event => {
  const statusSelect = event.target.closest("[data-fg-protocol-status]");
  const numberInput = event.target.closest("[data-fg-protocol-number]");
  const checkedInput = event.target.closest("[data-fg-protocol-checked]");
  const control = statusSelect || numberInput || checkedInput;
  if (!control) return;
  const request = requests.find(item => item.id === control.dataset.requestId);
  if (!request) return;
  const previousStatus = request.fgProtocolStatus;
  const previousNumber = request.fgProtocolNumber;
  const previousChecked = request.fgProtocolChecked;
  if (statusSelect) request.fgProtocolStatus = statusSelect.value === "feito" ? "feito" : "fazer";
  else if (numberInput) request.fgProtocolNumber = numberInput.value.trim();
  else request.fgProtocolChecked = checkedInput.checked;
  if (!saveRequests()) {
    request.fgProtocolStatus = previousStatus;
    request.fgProtocolNumber = previousNumber;
    request.fgProtocolChecked = previousChecked;
    renderFgProtocols();
    return;
  }
  renderFgProtocols();
  showToast(statusSelect
    ? `Status do protocolo de ${request.person || "servidor"} atualizado.`
    : numberInput
      ? `Número do protocolo de ${request.person || "servidor"} salvo.`
      : `Protocolo de ${request.person || "servidor"} ${request.fgProtocolChecked ? "marcado como conferido" : "desmarcado"}.`);
});
document.getElementById("meta4-body").addEventListener("change", event => {
  const control = event.target.closest("[data-meta4-launch], [data-meta4-launch-date]");
  if (!control) return;
  const request = requests.find(item => item.id === control.dataset.requestId);
  if (!request) return;
  const previousValue = request.meta4Launch;
  const previousDate = request.meta4LaunchDate;
  if (control.matches("[data-meta4-launch]")) {
    request.meta4Launch = control.value === "sim" ? "sim" : "nao";
    request.meta4LaunchDate = request.meta4Launch === "sim" ? (isIsoDate(request.meta4LaunchDate) ? request.meta4LaunchDate : dateKey(new Date())) : "";
  } else {
    request.meta4LaunchDate = control.value;
  }
  if (!saveRequests()) {
    request.meta4Launch = previousValue;
    request.meta4LaunchDate = previousDate;
    renderMeta4();
    return;
  }
  renderMeta4();
  showToast(control.matches("[data-meta4-launch]")
    ? `Lançamento de ${request.person || "servidor"} atualizado para ${request.meta4Launch === "sim" ? "Sim" : "Não"}.`
    : `Data M4 de ${request.person || "servidor"} atualizada.`);
});
const accountPasswordDialog = document.getElementById("account-password-dialog");
const accountPasswordForm = document.getElementById("account-password-form");
const accountPasswordMessage = document.getElementById("account-password-message");
document.getElementById("open-password-change").addEventListener("click", () => {
  accountPasswordForm.reset();
  accountPasswordMessage.textContent = "";
  accountPasswordMessage.classList.remove("error");
  accountPasswordDialog.showModal();
});
document.getElementById("account-password-cancel").addEventListener("click", () => accountPasswordDialog.close());
accountPasswordForm.addEventListener("submit", async event => {
  event.preventDefault();
  accountPasswordMessage.textContent = "";
  accountPasswordMessage.classList.remove("error");
  const currentPassword = document.getElementById("account-current-password").value;
  const newPassword = document.getElementById("account-new-password").value;
  const confirmPassword = document.getElementById("account-confirm-password").value;
  if (newPassword !== confirmPassword) {
    accountPasswordMessage.textContent = "A confirmação não corresponde à nova senha.";
    accountPasswordMessage.classList.add("error");
    return;
  }
  if (newPassword === currentPassword) {
    accountPasswordMessage.textContent = "A nova senha deve ser diferente da senha atual.";
    accountPasswordMessage.classList.add("error");
    return;
  }

  try {
    const username = String(sessionStorage.getItem("brisa-demo-username") || "").toLowerCase();
    if (username === "centralrh") {
      const savedCredential = localStorage.getItem(adminPasswordStorageKey);
      let isCurrentPasswordValid = currentPassword === initialAdminPassword;
      if (savedCredential) {
        const credential = JSON.parse(savedCredential);
        isCurrentPasswordValid = Boolean(credential?.salt && credential?.passwordHash)
          && await hashServerPassword(currentPassword, credential.salt) === credential.passwordHash;
      }
      if (!isCurrentPasswordValid) {
        accountPasswordMessage.textContent = "A senha atual está incorreta.";
        accountPasswordMessage.classList.add("error");
        return;
      }
      const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
      const passwordHash = await hashServerPassword(newPassword, salt);
      localStorage.setItem(adminPasswordStorageKey, JSON.stringify({ salt, passwordHash }));
    } else {
      const profile = JSON.parse(sessionStorage.getItem("brisa-demo-profile") || "null");
      const cpfDigits = String(profile?.cpf || username).replace(/\D/g, "");
      const account = serverAccounts.find(item => String(item.cpf || "").replace(/\D/g, "") === cpfDigits);
      if (!account?.salt || !account.passwordHash) {
        accountPasswordMessage.textContent = "Não foi possível localizar as credenciais desta conta.";
        accountPasswordMessage.classList.add("error");
        return;
      }
      if (await hashServerPassword(currentPassword, account.salt) !== account.passwordHash) {
        accountPasswordMessage.textContent = "A senha atual está incorreta.";
        accountPasswordMessage.classList.add("error");
        return;
      }
      const previousSalt = account.salt;
      const previousPasswordHash = account.passwordHash;
      account.salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
      account.passwordHash = await hashServerPassword(newPassword, account.salt);
      if (!saveServerAccounts()) {
        account.salt = previousSalt;
        account.passwordHash = previousPasswordHash;
        accountPasswordMessage.textContent = "Não foi possível salvar a nova senha.";
        accountPasswordMessage.classList.add("error");
        return;
      }
    }
    accountPasswordForm.reset();
    accountPasswordMessage.textContent = "Senha alterada com sucesso.";
  } catch {
    accountPasswordMessage.textContent = "Não foi possível alterar a senha neste navegador.";
    accountPasswordMessage.classList.add("error");
  }
});
document.getElementById("task-entry-form").addEventListener("submit", addTask);
document.getElementById("task-list").addEventListener("change", event => {
  const checkbox = event.target.closest("[data-task-toggle]");
  if (checkbox) updateTask(checkbox.dataset.taskToggle, checkbox.checked);
});
document.getElementById("task-list").addEventListener("click", event => {
  const removeButton = event.target.closest("[data-task-remove]");
  if (removeButton) removeTask(removeButton.dataset.taskRemove);
});
document.getElementById("task-calendar-prev").addEventListener("click", () => shiftTaskCalendar(-1));
document.getElementById("task-calendar-next").addEventListener("click", () => shiftTaskCalendar(1));
document.getElementById("task-calendar").addEventListener("click", event => {
  const day = event.target.closest("[data-task-calendar-date]");
  if (!day) return;
  selectedTaskDate = selectedTaskDate === day.dataset.taskCalendarDate ? null : day.dataset.taskCalendarDate;
  renderTasks();
});
document.getElementById("task-calendar").addEventListener("keydown", event => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const day = event.target.closest("[data-task-calendar-date]");
  if (!day) return;
  event.preventDefault();
  selectedTaskDate = selectedTaskDate === day.dataset.taskCalendarDate ? null : day.dataset.taskCalendarDate;
  renderTasks();
});
document.getElementById("task-clear-selected-date").addEventListener("click", () => {
  selectedTaskDate = null;
  renderTasks();
});
document.getElementById("task-calendar-today").addEventListener("click", () => {
  const today = new Date();
  shownTaskMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  selectedTaskDate = null;
  renderTasks();
});
document.addEventListener("click", event => {
  if (event.target.id === "request-details-dialog") {
    const dialog = event.target;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  }
});
document.getElementById("server-fg-form").addEventListener("submit", addFgServerFromForm);
document.getElementById("vacation-launch-form").addEventListener("submit", addVacationLaunch);
document.getElementById("vacation-launch-server-search").addEventListener("input", renderVacationSuggestions);
document.getElementById("vacation-launch-suggestions").addEventListener("mousedown", event => {
  const option = event.target.closest("[data-server-id]");
  if (!option) return;
  event.preventDefault();
  const record = serverPersonalData.find(item => item.id === option.dataset.serverId);
  if (!record) return;
  document.getElementById("vacation-launch-server-search").value = record.name;
  document.getElementById("vacation-launch-server").value = record.id;
  document.getElementById("vacation-launch-suggestions").hidden = true;
  syncVacationLaunchFg();
});
document.getElementById("vacation-launch-fg").addEventListener("change", syncVacationLaunchFg);
document.getElementById("vacation-launch-server-search").addEventListener("blur", () => {
  document.getElementById("vacation-launch-suggestions").hidden = true;
});
document.getElementById("vacation-launch-server-search").addEventListener("keydown", event => {
  if (event.key === "Escape") document.getElementById("vacation-launch-suggestions").hidden = true;
});
document.getElementById("request-rejection-form").addEventListener("submit", rejectRequestWithDetails);
document.getElementById("request-rejection-reason").addEventListener("input", event => {
  event.currentTarget.setCustomValidity("");
});
document.getElementById("server-fg-body").addEventListener("click", event => {
  const removeButton = event.target.closest("[data-remove-fg-server]");
  if (removeButton) removeFgServer(removeButton.dataset.removeFgServer);
});
document.getElementById("server-registry-search").addEventListener("input", renderServerAccounts);
document.getElementById("server-registry-role-filter").addEventListener("change", renderServerAccounts);
document.getElementById("server-data-search").addEventListener("input", renderServerPersonalData);
document.getElementById("server-data-export-csv").addEventListener("click", () => {
  const records = getFilteredServerPersonalData();
  if (!records.length) {
    showToast("Não há servidores para exportar com o filtro atual.");
    return;
  }
  const columns = [
    ["Nome", "name"],
    ["CPF", "cpf"],
    ["RG", "rg"],
    ["Data de nascimento", "birthDate"],
    ["Telefone celular", "phone"],
    ["E-mail institucional", "email"],
    ["Unidade Penal", "unidadePenal"],
    ["Cargo", "cargo"],
    ["Quadro", "quadro"]
  ];
  const csvCell = value => {
    const safeValue = /^[=+\-@]/.test(String(value)) ? `'${value}` : String(value);
    return `"${safeValue.replace(/"/g, '""')}"`;
  };
  const csv = [
    columns.map(([title]) => csvCell(title)).join(";"),
    ...records.map(record => columns.map(([, field]) => csvCell(record[field] || "")).join(";"))
  ].join("\r\n");
  const downloadUrl = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const downloadLink = document.createElement("a");
  downloadLink.href = downloadUrl;
  downloadLink.download = `cadastro-servidores-${dateKey(new Date())}.csv`;
  document.body.append(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
});
document.getElementById("server-data-export-pdf").addEventListener("click", () => {
  const records = getFilteredServerPersonalData();
  if (!records.length) {
    showToast("Não há servidores para gerar o relatório com o filtro atual.");
    return;
  }
  const columns = [
    ["Nome", "name"],
    ["CPF", "cpf"],
    ["RG", "rg"],
    ["Data de nascimento", "birthDate"],
    ["Telefone celular", "phone"],
    ["E-mail institucional", "email"],
    ["Unidade Penal", "unidadePenal"],
    ["Cargo", "cargo"],
    ["Quadro", "quadro"]
  ];
  const tableRows = records.map(record => `<tr>${columns.map(([, field]) => `<td>${escapeHtml(record[field] || "")}</td>`).join("")}</tr>`).join("");
  const tableMarkup = `<table><thead><tr>${columns.map(([title]) => `<th>${escapeHtml(title)}</th>`).join("")}</tr></thead><tbody>${tableRows}</tbody></table>`;
  const reportHtml = buildPrintReportHtml("Cadastro de Dados dos Servidores", records.length, "servidor(es)", tableMarkup);
  openPrintReport(reportHtml, "Relatório de servidores para impressão");
});
const serverDataForm = document.getElementById("server-data-form");
const serverDataFormToggle = document.getElementById("server-data-form-toggle");
const serverDataSubmit = document.getElementById("server-data-submit");
const serverDataCancelEdit = document.getElementById("server-data-cancel-edit");
const serverDataCargo = serverDataForm.elements.namedItem("cargo");
const serverDataQuadro = serverDataForm.elements.namedItem("quadro");
let editingServerDataId = null;

serverDataFormToggle.addEventListener("click", () => {
  const isExpanded = serverDataFormToggle.getAttribute("aria-expanded") === "true";
  serverDataFormToggle.setAttribute("aria-expanded", String(!isExpanded));
  serverDataForm.hidden = isExpanded;
});

function getServerDataQuadroForCargo(cargo) {
  if (cargo === "Policial Penal") return "QPPP";
  if (cargo === "Agente de Execução" || cargo === "Agente Profissional") return "QPPE";
  return "";
}

serverDataCargo.addEventListener("change", () => {
  serverDataQuadro.value = getServerDataQuadroForCargo(serverDataCargo.value);
});

function resetServerDataEdit() {
  editingServerDataId = null;
  serverDataForm.reset();
  serverDataForm.hidden = true;
  serverDataFormToggle.setAttribute("aria-expanded", "false");
  serverDataSubmit.innerHTML = '<i data-lucide="user-round-plus"></i><span>Cadastrar dados</span>';
  serverDataCancelEdit.hidden = true;
  refreshIcons();
}

document.addEventListener("click", event => {
  const attachmentButton = event.target.closest("[data-request-attachment]");
  if (attachmentButton) {
    downloadRequestAttachment(attachmentButton.dataset.requestAttachment);
    return;
  }
  const requestDetailsButton = event.target.closest("[data-request-details]");
  if (requestDetailsButton) {
    openRequestDetails(requestDetailsButton.dataset.requestDetails);
    return;
  }
  const requestEditButton = event.target.closest("[data-request-edit]");
  if (requestEditButton) {
    openRequestEditDialog(requestEditButton.dataset.requestEdit);
    return;
  }
  const requestRemoveButton = event.target.closest("[data-request-remove]");
  if (requestRemoveButton) {
    removeRequest(requestRemoveButton.dataset.requestRemove);
    return;
  }
  const editServerDataButton = event.target.closest("[data-edit-server-data]");
  if (editServerDataButton) {
    const record = serverPersonalData.find(item => item.id === editServerDataButton.dataset.editServerData);
    if (!record) {
      showToast("Não foi possível localizar os dados do servidor.");
      return;
    }
    editingServerDataId = record.id;
    serverDataForm.hidden = false;
    serverDataFormToggle.setAttribute("aria-expanded", "true");
    for (const [field, value] of Object.entries({
      name: record.name,
      cpf: record.cpf,
      rg: record.rg,
      birthDate: record.birthDate,
      phone: record.phone,
      email: record.email,
      unidadePenal: record.unidadePenal || "",
      cargo: record.cargo || "",
      quadro: record.quadro || ""
    })) {
      const input = serverDataForm.elements.namedItem(field);
      if (input instanceof HTMLSelectElement && value && !Array.from(input.options).some(option => option.value === value)) {
        input.add(new Option(`${value} (cadastro existente)`, value));
      }
      input.value = value || "";
    }
    serverDataSubmit.innerHTML = '<i data-lucide="save"></i><span>Salvar alterações</span>';
    serverDataCancelEdit.hidden = false;
    refreshIcons();
    serverDataForm.elements.namedItem("name").focus();
    return;
  }

  const logoutButton = event.target.closest("[data-logout]");
  if (logoutButton) {
    try {
      sessionStorage.removeItem("brisa-demo-user");
      sessionStorage.removeItem("brisa-demo-username");
      sessionStorage.removeItem("brisa-demo-profile");
    } catch {}
    if (window.RH_SYNC && window.RH_SYNC.enabled) window.RH_SYNC.signOut();
    window.location.href = "login.html";
    return;
  }

  const submenuToggle = event.target.closest("[data-submenu-toggle]");
  if (submenuToggle) {
    const isOpen = submenuToggle.getAttribute("aria-expanded") === "true";
    if (submenuToggle.dataset.submenuToggle === "report-servers") renderServerDirectoryReport();
    const toggleParent = submenuToggle.closest(".nav-menu-item").parentElement;
    document.querySelectorAll("[data-submenu-toggle]").forEach(toggle => {
      if (toggle === submenuToggle) return;
      if (toggle.closest(".nav-menu-item").parentElement !== toggleParent) return;
      toggle.setAttribute("aria-expanded", "false");
      toggle.closest(".nav-menu-item").classList.remove("open");
      document.getElementById(toggle.getAttribute("aria-controls")).hidden = true;
    });
    submenuToggle.setAttribute("aria-expanded", String(!isOpen));
    submenuToggle.closest(".nav-menu-item").classList.toggle("open", !isOpen);
    document.getElementById(submenuToggle.getAttribute("aria-controls")).hidden = isOpen;
    return;
  }

  const navLink = event.target.closest("[data-view]");
  if (navLink) {
    setView(navLink.dataset.view);
  }
  const openReportLink = event.target.closest("[data-open-report]");
  if (openReportLink) {
    document.getElementById("report-servers-unit").value = "";
    document.getElementById("report-servers-select").value = "";
    document.getElementById("view-report-servers").dataset.countMode = openReportLink.dataset.reportCount || "unit";
    setView(openReportLink.dataset.openReport);
  }
  const requestFilterLink = event.target.closest("[data-request-filter]");
  if (requestFilterLink) {
    requestFilter = requestFilterLink.dataset.requestFilter;
    document.querySelectorAll("#requests-submenu [data-request-filter]").forEach(link => {
      link.classList.toggle("active", link === requestFilterLink);
    });
    renderRequests("full-requests", false);
  }
  const goView = event.target.closest("[data-go-view]");
  if (goView) setView(goView.dataset.goView);
  const monthButton = event.target.closest("[data-month-shift]");
  if (monthButton) {
    const shiftedMonth = new Date(shownMonth.getFullYear(), shownMonth.getMonth() + Number(monthButton.dataset.monthShift), 1);
    shownMonth = clampShownMonth(shiftedMonth);
    renderAll();
  }
  if (event.target.closest("[data-month-today]")) { shownMonth = new Date(); shownMonth.setDate(1); selectedDate = dateKey(new Date()); renderAll(); }
  const calendarDay = event.target.closest("[data-date]");
  if (calendarDay) { selectedDate = calendarDay.dataset.date; renderCalendar("overview-calendar", true); renderCalendar("full-calendar", false); updateSelectedDay(); }
  const actionButton = event.target.closest("[data-request-action]");
  if (actionButton) {
    const request = requests.find(item => item.id === actionButton.dataset.requestId);
    if (!request) return;
    if (actionButton.dataset.requestAction === "reject") {
      if (!document.getElementById("request-details-dialog").open) openRequestDetails(request.id);
      const rejectionSection = document.getElementById("request-rejection-section");
      rejectionSection.hidden = false;
      document.getElementById("request-details-actions").hidden = true;
      document.getElementById("request-rejection-form").querySelector('[name="requestId"]').value = request.id;
      document.getElementById("request-rejection-reason").focus();
      return;
    }
    if (actionButton.dataset.requestAction === "cancel-reject") {
      document.getElementById("request-rejection-form").reset();
      document.getElementById("request-rejection-section").hidden = true;
      document.getElementById("request-details-actions").hidden = false;
      return;
    }
    const previousStatus = request.status;
    request.status = "approved";
    if (!saveRequests()) {
      request.status = previousStatus;
      return;
    }
    document.getElementById("request-details-dialog").close();
    renderAll();
    showToast(`Solicitação de ${request.person} aprovada.`);
  }
  const removeServerDataButton = event.target.closest("[data-remove-server-data]");
  if (removeServerDataButton) {
    const recordId = removeServerDataButton.dataset.removeServerData;
    const recordIndex = serverPersonalData.findIndex(record => record.id === recordId);
    if (recordIndex < 0) return;
    const [removedRecord] = serverPersonalData.splice(recordIndex, 1);
    const removedCpf = String(removedRecord.cpf || "").replace(/\D/g, "");
    const previousAccounts = serverAccounts;
    const previousPersonalDataStorage = localStorage.getItem(serverDataStorageKey);
    const previousAccountsStorage = localStorage.getItem(serverAccountsStorageKey);
    serverAccounts = serverAccounts.filter(account => String(account.cpf || "").replace(/\D/g, "") !== removedCpf);
    const accountsSaved = saveServerAccounts();
    const personalDataSaved = accountsSaved && saveServerPersonalData();
    if (!accountsSaved || !personalDataSaved) {
      serverPersonalData.splice(recordIndex, 0, removedRecord);
      serverAccounts = previousAccounts;
      try {
        if (previousPersonalDataStorage === null) localStorage.removeItem(serverDataStorageKey);
        else localStorage.setItem(serverDataStorageKey, previousPersonalDataStorage);
        if (previousAccountsStorage === null) localStorage.removeItem(serverAccountsStorageKey);
        else localStorage.setItem(serverAccountsStorageKey, previousAccountsStorage);
      } catch {
        showToast("Não foi possível restaurar os cadastros anteriores. Verifique os dados salvos neste navegador.");
      }
      return;
    }
    if (editingServerDataId === recordId) resetServerDataEdit();
    renderServerPersonalData();
    renderServerAccounts();
    if (window.RH_SYNC && window.RH_SYNC.enabled) {
      window.RH_SYNC.deleteDoc("servidores", recordId).catch(() => {});
      if (removedCpf) window.RH_SYNC.deleteDoc("contas", removedCpf).catch(() => {});
    }
  }
});
serverRegistryBody.addEventListener("change", event => {
  const roleSelect = event.target.closest("[data-server-account-role]");
  if (!roleSelect) return;
  const cpfDigits = roleSelect.dataset.serverCpf;
  const record = serverPersonalData.find(item => String(item.cpf || "").replace(/\D/g, "") === cpfDigits);
  if (!record) {
    showToast("Não foi possível localizar os dados do servidor.");
    renderServerAccounts();
    return;
  }
  const previousAccounts = serverAccounts.map(account => ({ ...account }));
  const account = serverAccounts.find(item => String(item.cpf || "").replace(/\D/g, "") === cpfDigits);
  const role = roleSelect.value === "admin" || roleSelect.value === "both" ? roleSelect.value : "usuario";
  if (account) {
    account.username = cpfDigits;
    account.name = record.name;
    account.cpf = record.cpf;
    account.role = role;
  } else {
    serverAccounts.push({ username: cpfDigits, name: record.name, cpf: record.cpf, role });
  }
  if (!saveServerAccounts()) {
    serverAccounts = previousAccounts;
    renderServerAccounts();
    return;
  }
  const roleLabel = role === "both" ? "Usuário e administrador" : role === "admin" ? "Administrador" : "Usuário";
  showToast(`Acesso de ${record.name} atualizado para ${roleLabel}.`);
});
serverDataCancelEdit.addEventListener("click", resetServerDataEdit);
document.getElementById("usuario-add").addEventListener("click", () => openUsuarioDialog(null));
document.getElementById("usuario-cancel").addEventListener("click", () => document.getElementById("usuario-dialog").close());
document.getElementById("usuarios-search").addEventListener("input", renderUsuarios);
document.getElementById("usuarios-body").addEventListener("change", event => {
  const perfilSelect = event.target.closest("[data-usuario-perfil]");
  if (!perfilSelect) return;
  const user = usuarios.find(item => item.id === perfilSelect.dataset.usuarioPerfil);
  if (!user || isOwnerEmail(user.email)) {
    renderUsuarios();
    return;
  }
  const previousPerfil = user.perfil;
  user.perfil = perfilSelect.value === "admin" ? "admin" : "usuario";
  saveUsuarios();
  renderUsuarios();
  showToast(`Perfil de ${user.name} atualizado para ${user.perfil === "admin" ? "Administrador" : "Usuário"}.`);
});
document.getElementById("usuarios-body").addEventListener("click", event => {
  const editButton = event.target.closest("[data-edit-usuario]");
  const removeButton = event.target.closest("[data-remove-usuario]");
  if (editButton) {
    const user = usuarios.find(item => item.id === editButton.dataset.editUsuario);
    if (user) openUsuarioDialog(user);
    return;
  }
  if (!removeButton) return;
  const userId = removeButton.dataset.removeUsuario;
  const user = usuarios.find(item => item.id === userId);
  if (!user) return;
  if (isOwnerEmail(user.email)) {
    showToast("O e-mail de um proprietário não pode ser removido.");
    return;
  }
  if (!window.confirm(`Remover o acesso de ${user.name} (${user.email})?`)) return;
  usuarios = usuarios.filter(item => item.id !== userId);
  saveUsuarios();
  renderUsuarios();
  showToast("Usuário removido.");
});
document.getElementById("usuario-form").addEventListener("submit", event => {
  event.preventDefault();
  const form = event.currentTarget;
  const name = String(form.elements.nome.value).trim();
  const email = String(form.elements.email.value).trim().toLowerCase();
  const perfil = form.elements.perfil.value === "admin" ? "admin" : "usuario";
  const ativo = form.elements.ativo.value !== "inativo";
  if (!name) {
    setUsuarioMessage("Informe o nome do usuário.", true);
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setUsuarioMessage("Informe um e-mail válido.", true);
    return;
  }
  if (usuarios.some(user => user.id !== editingUsuarioId && user.email === email)) {
    setUsuarioMessage("Já existe um usuário cadastrado com esse e-mail.", true);
    return;
  }
  if (isOwnerEmail(email) && perfil !== "admin") {
    setUsuarioMessage("O e-mail de um proprietário permanece sempre como administrador.", true);
    return;
  }
  const ownerEmail = isOwnerEmail(email);
  const currentDate = dateKey(new Date());
  if (editingUsuarioId) {
    usuarios = usuarios.map(user => user.id === editingUsuarioId
      ? Object.assign({}, user, { id: email, name, email, perfil: ownerEmail ? "admin" : perfil, ativo: ownerEmail ? true : ativo, criadoEm: user.criadoEm || currentDate })
      : user);
  } else {
    usuarios.push({ id: email, name, email, perfil: ownerEmail ? "admin" : perfil, ativo: ownerEmail ? true : ativo, criadoEm: currentDate });
  }
  saveUsuarios();
  form.closest("dialog").close();
  renderUsuarios();
  showToast(editingUsuarioId ? "Usuário atualizado." : "Usuário adicionado.");
});
document.getElementById("request-edit-cancel").addEventListener("click", () => document.getElementById("request-edit-dialog").close());
document.getElementById("request-edit-form").addEventListener("submit", event => {
  event.preventDefault();
  const form = event.currentTarget;
  const request = requests.find(item => item.id === editingRequestId);
  if (!request) {
    setRequestEditMessage("Não foi possível localizar a solicitação.", true);
    return;
  }
  const person = String(form.elements.person.value).trim();
  const start = String(form.elements.start.value || "");
  const end = String(form.elements.end.value || "");
  const note = String(form.elements.note.value).trim();
  if (!person) {
    setRequestEditMessage("Informe o nome do servidor.", true);
    return;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    setRequestEditMessage("Informe as datas de início e término.", true);
    return;
  }
  if (end < start) {
    setRequestEditMessage("O término não pode ser anterior ao início.", true);
    return;
  }
  const days = Math.round((new Date(`${end}T12:00:00`) - new Date(`${start}T12:00:00`)) / 86400000) + 1;
  const previousRequests = requests.map(item => ({ ...item }));
  const updated = Object.assign({}, request, { person, start, end, days, note });
  requests = requests.map(item => item.id === request.id ? updated : item);
  if (!saveRequests()) {
    requests = previousRequests;
    renderAll();
    return;
  }
  form.closest("dialog").close();
  renderAll();
  showToast("Solicitação atualizada.");
});
document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;
  const openSubmenuToggle = document.querySelector('[data-submenu-toggle][aria-expanded="true"]');
  if (!openSubmenuToggle) return;
  openSubmenuToggle.setAttribute("aria-expanded", "false");
  openSubmenuToggle.closest(".nav-menu-item").classList.remove("open");
  document.getElementById(openSubmenuToggle.getAttribute("aria-controls")).hidden = true;
  openSubmenuToggle.focus();
});
document.getElementById("team-search").addEventListener("input", () => renderTeam("full-team", people.length));
document.getElementById("current-vacation-search").addEventListener("input", renderCurrentMonthVacations);
document.getElementById("current-vacation-month").addEventListener("change", event => {
  selectedVacationMonth = event.currentTarget.value;
  renderCurrentMonthVacations();
});
document.getElementById("current-vacation-year").addEventListener("change", event => {
  selectedVacationYear = event.currentTarget.value;
  renderCurrentMonthVacations();
});
document.getElementById("report-year-select").addEventListener("change", event => {
  selectedReportYear = event.currentTarget.value;
  renderReportYear();
});
document.getElementById("report-unit-select").addEventListener("change", event => {
  selectedReportUnit = event.currentTarget.value;
  renderReportUnit();
});
document.getElementById("report-unit-person-search").addEventListener("input", renderReportUnit);
document.getElementById("report-person-search").addEventListener("input", renderReportPerson);
document.getElementById("report-servers-select").addEventListener("input", renderServerDirectoryReport);
document.getElementById("report-servers-unit").addEventListener("change", renderServerDirectoryReport);
document.getElementById("report-capacitacao-name").addEventListener("input", renderReportCapacitacao);
document.getElementById("report-capacitacao-month").addEventListener("change", event => {
  selectedCapacitacaoMonth = event.currentTarget.value;
  renderReportCapacitacao();
});
document.getElementById("report-especial-name").addEventListener("input", renderReportEspecial);
document.getElementById("report-especial-month").addEventListener("change", event => {
  selectedEspecialMonth = event.currentTarget.value;
  renderReportEspecial();
});
serverDataForm.addEventListener("submit", event => {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const name = String(formData.get("name") || "").trim();
  const cpf = String(formData.get("cpf") || "").trim();
  const cpfDigits = cpf.replace(/\D/g, "");
  const rg = String(formData.get("rg") || "").trim();
  const birthDate = String(formData.get("birthDate") || "");
  const phone = String(formData.get("phone") || "").trim();
  const phoneDigits = phone.replace(/\D/g, "");
  const email = String(formData.get("email") || "").trim();
  const unidadePenal = String(formData.get("unidadePenal") || "").trim();
  const cargo = String(formData.get("cargo") || "").trim();
  const quadro = String(formData.get("quadro") || "").trim();
  const editedRecord = editingServerDataId
    ? serverPersonalData.find(record => record.id === editingServerDataId)
    : null;
  if (!name || !rg || !birthDate || !phone || !email || !unidadePenal || !cargo || !quadro) return;
  if (quadro !== getServerDataQuadroForCargo(cargo)) {
    showToast("O quadro selecionado não corresponde ao cargo informado.");
    return;
  }
  if (!/^\d{11}$/.test(cpfDigits)) {
    showToast("Informe um CPF com 11 dígitos.");
    return;
  }
  if (editingServerDataId && !editedRecord) {
    showToast("Não foi possível localizar os dados que deseja editar.");
    resetServerDataEdit();
    renderServerPersonalData();
    return;
  }
  if (serverPersonalData.some(record => record.id !== editingServerDataId && String(record.cpf || "").replace(/\D/g, "") === cpfDigits)) {
    showToast("Já existem dados cadastrados para esse CPF.");
    return;
  }
  if (!/^\d{10,11}$/.test(phoneDigits)) {
    showToast("Informe um telefone celular com DDD.");
    return;
  }
  if (birthDate > dateKey(new Date())) {
    showToast("A data de nascimento não pode ser futura.");
    return;
  }
  if (serverPersonalData.some(record => record.id !== editingServerDataId && String(record.email || "").toLocaleLowerCase("pt-BR") === email.toLocaleLowerCase("pt-BR"))) {
    showToast("Esse e-mail institucional já está cadastrado.");
    return;
  }
  const linkedAccount = editedRecord
    ? serverAccounts.find(account => String(account.cpf || "").replace(/\D/g, "") === String(editedRecord.cpf || "").replace(/\D/g, ""))
    : null;
  if (linkedAccount && serverAccounts.some(account => account !== linkedAccount && String(account.cpf || "").replace(/\D/g, "") === cpfDigits)) {
    showToast("Esse CPF já está vinculado a outra conta de acesso.");
    return;
  }
  const previousPersonalData = serverPersonalData.map(record => ({ ...record }));
  const previousAccounts = serverAccounts.map(account => ({ ...account }));
  const previousPersonalDataStorage = localStorage.getItem(serverDataStorageKey);
  const previousAccountsStorage = linkedAccount ? localStorage.getItem(serverAccountsStorageKey) : null;
  const record = { id: editingServerDataId || crypto.randomUUID(), name, cpf, rg, birthDate, phone, email, unidadePenal, cargo, quadro };
  if (editedRecord) {
    serverPersonalData = serverPersonalData.map(item => item.id === editedRecord.id ? record : item);
    if (linkedAccount) {
      linkedAccount.name = name;
      linkedAccount.cpf = cpf;
      linkedAccount.username = cpfDigits;
    }
  } else {
    serverPersonalData.push(record);
  }

  const accountSaved = !linkedAccount || saveServerAccounts();
  const personalDataSaved = accountSaved && saveServerPersonalData();
  if (!accountSaved || !personalDataSaved) {
    serverPersonalData = previousPersonalData;
    serverAccounts = previousAccounts;
    try {
      if (previousPersonalDataStorage === null) localStorage.removeItem(serverDataStorageKey);
      else localStorage.setItem(serverDataStorageKey, previousPersonalDataStorage);
      if (linkedAccount) {
        if (previousAccountsStorage === null) localStorage.removeItem(serverAccountsStorageKey);
        else localStorage.setItem(serverAccountsStorageKey, previousAccountsStorage);
      }
    } catch {
      showToast("Não foi possível restaurar os dados anteriores. Verifique os cadastros salvos neste navegador.");
    }
    return;
  }

  const wasEditing = Boolean(editedRecord);
  resetServerDataEdit();
  renderServerPersonalData();
  renderServerAccounts();
  showToast(wasEditing ? "Dados do servidor atualizados." : "Dados do servidor cadastrados.");
});
document.getElementById("global-search").addEventListener("input", event => {
  const query = event.target.value.trim();
  if (!query) return;
  setView("team"); document.getElementById("team-search").value = query; renderTeam("full-team", people.length);
});
document.getElementById("global-search").addEventListener("keydown", event => { if (event.key === "Escape") { event.target.value = ""; event.target.blur(); } });
document.addEventListener("keydown", event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); const search = document.getElementById("global-search"); search.style.width = "230px"; search.focus(); }
});
const today = new Date();
document.getElementById("current-date").textContent = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(today).toLocaleUpperCase("pt-BR");

async function initializeApp() {
  requests = await loadRequests();
  selectedDate = dateKey(new Date());
  renderLoggedInProfile();
  renderAll();
  renderTasks();
  if (window.RH_SYNC && window.RH_SYNC.enabled) {
    window.RH_SYNC.subscribeRequests(list => {
      requests = (list.length ? list : requests).map(normalizeRequest);
      renderAll();
    }, error => console.warn("Assinatura do Firestore falhou:", error));
    loadUsuariosFromFirestore();
    loadServerRegistryFromFirestore();
  }
}

async function loadUsuariosFromFirestore() {
  try {
    const remote = await window.RH_SYNC.loadDocs("usuarios");
    if (remote && remote.length > 0) {
      usuarios = remote.map(normalizeUsuario);
    } else if (usuarios.length > 0) {
      saveUsuarios();
    }
  } catch (error) {
    const detail = error instanceof Error ? ` ${error.message}` : "";
    console.warn("Falha ao carregar usuários do Firestore:", error);
    showToast(`Não foi possível carregar os usuários da nuvem.${detail}`);
  }
  renderUsuarios();
}

async function loadServerRegistryFromFirestore() {
  try {
    const [remoteServidores, remoteContas] = await Promise.all([
      window.RH_SYNC.loadDocs("servidores"),
      window.RH_SYNC.loadDocs("contas")
    ]);
    if (remoteServidores && remoteServidores.length > 0) {
      serverPersonalData = mergeServerRecords(serverPersonalData, remoteServidores, record => record.id);
    }
    if (remoteContas && remoteContas.length > 0) {
      serverAccounts = mergeServerRecords(serverAccounts, remoteContas, account => String(account.cpf || account.username || "").replace(/\D/g, ""));
    }
  } catch (error) {
    const detail = error instanceof Error ? ` ${error.message}` : "";
    console.warn("Falha ao carregar cadastros do Firestore:", error);
    showToast(`Cadastros carregados apenas deste navegador.${detail}`);
  }
  renderServerPersonalData();
  renderServerAccounts();
}

function mergeServerRecords(localList, remoteList, keyFor) {
  const merged = localList.map(item => ({ ...item }));
  const localKeys = new Set(merged.map(keyFor));
  remoteList.forEach(remote => {
    const remoteKey = keyFor(remote);
    const index = merged.findIndex(item => keyFor(item) === remoteKey);
    if (index >= 0) merged[index] = remote;
    else if (remoteKey && !localKeys.has(remoteKey)) merged.push(remote);
  });
  return merged;
}

initializeApp();
