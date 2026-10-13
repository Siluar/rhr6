const monthNames = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const weekdays = ["D", "S", "T", "Q", "Q", "S", "S"];
const calendarScale = { width: 24, height: 72 };
const calendarMaxMonth = new Date(2040, 11, 1);
const avatarColors = ["#728e70", "#bd785e", "#718da0", "#a58a58", "#8a7798", "#5f917f", "#c38174", "#7c8764", "#a77b57", "#688b98", "#a06a69", "#8b9369"];
// A lista "Equipe" é montada a partir dos servidores realmente cadastrados,
// sem nomes fictícios.
function getTeamMembers() {
  return serverPersonalData.map((record, index) => {
    const name = String(record.name || "").trim();
    const initials = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0])
      .join("")
      .toLocaleUpperCase("pt-BR") || "?";
    return {
      id: record.id || `server-${index}`,
      name,
      initials,
      role: record.cargo || record.unidadePenal || "",
      balance: null,
      next: "A definir",
      status: "Ativa",
      color: avatarColors[index % avatarColors.length]
    };
  });
}
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
const unidadesStorageKey = "brisa-unidades-v2";
const cargosStorageKey = "brisa-cargos-v1";
const quadrosStorageKey = "brisa-quadros-v1";
const requestAttachmentsDatabaseName = "brisa-request-attachments-v1";
const requestAttachmentsStoreName = "attachments";
let requests = [];
let tasks = loadTasks();
let fgServerRoster = loadFgServerRoster();
let serverAccounts = loadServerAccounts();
let serverPersonalData = loadServerPersonalData();
let usuarios = loadLocalUsuarios();
let unidades = loadLocalReferenceList(unidadesStorageKey, seedUnidades());
let cargos = loadLocalReferenceList(cargosStorageKey, seedCargos());
let quadros = loadLocalReferenceList(quadrosStorageKey, seedQuadros());
let editingUsuarioId = null;
let editingUnidadeId = null;
let editingCargoId = null;
let editingQuadroId = null;
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
let selectedPremioMonth = "";
let selectedMedicaMonth = "";
let selectedReportRequestsStatus = "";
let selectedReportRequestsCategory = "";
let selectedReportRequestsType = "";
let selectedReportRequestsYear = "";
let toastTimer;

function loadRequests() {
  if (window.RH_SYNC && window.RH_SYNC.enabled) {
    return window.RH_SYNC.loadRequests()
      .then(list => {
        if (list.length) {
          const normalized = list.map(normalizeRequest);
          seedFirestoreSyncState("requests", normalized);
          // Solicitações que existam apenas neste navegador (criadas sem rede ou
          // antes do Firebase entrar no ar) sobem para a nuvem em vez de serem
          // descartadas pela lista da nuvem.
          const cloudIds = new Set(normalized.map(request => String(request.id)));
          const localOnly = legacyLoadRequests(false)
            .map(normalizeRequest)
            .filter(request => request && request.id && !cloudIds.has(String(request.id)));
          if (!localOnly.length) return normalized;
          const merged = normalized.concat(localOnly);
          syncCollectionToFirestore("requests", merged);
          return merged;
        }
        // Nuvem vazia: reaproveita apenas o que houver no navegador (sem
        // injetar solicitações de exemplo em produção) e sobe tudo para a nuvem,
        // para que solicitações feitas sem rede não fiquem só aqui.
        const localRequests = legacyLoadRequests(false).map(normalizeRequest);
        syncCollectionToFirestore("requests", localRequests);
        return localRequests;
      })
      .catch(error => {
        console.warn("Falha ao carregar as solicitações do Firestore:", error);
        showToast("Não foi possível carregar as solicitações online.");
        return legacyLoadRequests(false).map(normalizeRequest);
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
  syncCollectionToFirestore("requests", requests);
  if (window.RH_SYNC && window.RH_SYNC.enabled) return true;
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
  } catch {
    showToast("Não foi possível salvar as tarefas neste navegador.");
    return false;
  }
  syncCollectionWithRemovals("tarefas", tasks, task => task.id);
  return true;
}

// Traz as tarefas gravadas na nuvem e sobe as que existirem apenas aqui.
async function loadTasksFromFirestore() {
  if (!window.RH_SYNC || !window.RH_SYNC.enabled) return;
  try {
    const remote = await window.RH_SYNC.loadDocs("tarefas");
    if (remote && remote.length > 0) {
      tasks = mergeServerRecords(tasks, remote, task => task.id);
      seedFirestoreSyncState("tarefas", remote, task => task.id);
      saveTasks();
    } else if (tasks.length > 0) {
      saveTasks();
    }
  } catch (error) {
    const detail = error instanceof Error ? ` ${error.message}` : "";
    console.warn("Falha ao carregar as tarefas do Firestore:", error);
    showToast(`Tarefas carregadas apenas deste navegador.${detail}`);
  }
  renderTasks();
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

// Limite seguro para caber em um documento do Firestore (limite de 1 MiB por
// documento; base64 ocupa cerca de 1/3 a mais que o arquivo original).
const attachmentCloudLimit = 700 * 1024;

function formatFileSize(bytes) {
  const size = Number(bytes || 0);
  if (size < 1024) return `${size} bytes`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function readAttachmentAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Não foi possível ler o arquivo."));
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl) {
  const [meta, base64] = String(dataUrl || "").split(",");
  const mime = (String(meta).match(/data:([^;]+)/) || [])[1] || "application/octet-stream";
  const binary = atob(base64 || "");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mime });
}

// Espelha o anexo na coleção "anexos" (arquivo em base64). Sem a nuvem o anexo
// continua apenas neste navegador, como antes. Uma falha entra na fila de novas
// tentativas (a exclusão do anexo é representada por `null`).
const pendingAttachmentSyncs = new Map();

async function syncAttachmentToFirestore(requestId, attachment) {
  if (!window.RH_SYNC || !window.RH_SYNC.enabled || !requestId) return;
  const pendingAttachment = attachment && attachment.blob ? attachment : null;
  markSyncPending("anexos");
  try {
    if (!pendingAttachment) {
      await window.RH_SYNC.deleteDoc("anexos", requestId);
      pendingAttachmentSyncs.delete(requestId);
      markSyncSettled("anexos");
      return;
    }
    const dataUrl = await readAttachmentAsDataUrl(pendingAttachment.blob);
    await window.RH_SYNC.saveDocs("anexos", [{
      id: requestId,
      requestId,
      name: pendingAttachment.name || "anexo",
      type: pendingAttachment.type || pendingAttachment.blob.type || "",
      size: Number(pendingAttachment.size || pendingAttachment.blob.size || 0),
      dataUrl,
      updatedAt: new Date().toISOString()
    }]);
    pendingAttachmentSyncs.delete(requestId);
    markSyncSettled("anexos");
  } catch (error) {
    pendingAttachmentSyncs.set(requestId, pendingAttachment);
    registerSyncFailure(
      "anexos",
      error,
      "Anexo salvo neste navegador; a nuvem será atualizada assim que possível."
    );
  }
}

async function getLocalRequestAttachment(requestId) {
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

// Busca o anexo neste navegador e, se não estiver aqui, na nuvem.
async function getRequestAttachment(requestId) {
  let local = null;
  try {
    local = await getLocalRequestAttachment(requestId);
  } catch (error) {
    console.warn("Anexo local indisponível:", error);
  }
  if (local && local.blob) return local;
  if (window.RH_SYNC && window.RH_SYNC.enabled) {
    try {
      const remote = await window.RH_SYNC.getDoc("anexos", requestId);
      if (remote && remote.dataUrl) {
        const blob = dataUrlToBlob(remote.dataUrl);
        return {
          requestId,
          blob,
          name: remote.name || "anexo",
          type: remote.type || blob.type,
          size: Number(remote.size || blob.size)
        };
      }
    } catch (error) {
      console.warn("Falha ao carregar o anexo da nuvem:", error);
    }
  }
  return local;
}

async function storeRequestAttachment(requestId, file) {
  const database = await openRequestAttachmentsDatabase();
  await new Promise((resolve, reject) => {
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
  await syncAttachmentToFirestore(requestId, {
    blob: file,
    name: file.name,
    type: file.type,
    size: file.size
  });
}

async function restoreRequestAttachment(requestId, attachment) {
  const database = await openRequestAttachmentsDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(requestAttachmentsStoreName, "readwrite");
    const store = transaction.objectStore(requestAttachmentsStoreName);
    if (attachment && attachment.blob) store.put(attachment);
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
  await syncAttachmentToFirestore(requestId, attachment && attachment.blob ? attachment : null);
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
  syncCollectionWithRemovals("contasLegado", serverAccounts, account => String(account.cpf || "").replace(/\D/g, ""));
  return true;
}

// Copia de segurança das contas CPF/senha (legado) na nuvem. A cópia local tem
// prioridade (é nela que a senha é alterada); a nuvem apenas acrescenta contas
// que ainda não existem neste navegador. Somente admin lê e grava.
function mergeServerAccountsWithCloud(localList, remoteList) {
  const merged = (localList || []).map(account => ({ ...account }));
  const knownKeys = new Set(merged.map(account => String(account.cpf || "").replace(/\D/g, "")));
  (remoteList || []).forEach(remote => {
    const key = String(remote.cpf || "").replace(/\D/g, "");
    if (!key || knownKeys.has(key)) return;
    knownKeys.add(key);
    merged.push({ ...remote });
  });
  return merged;
}

async function loadServerAccountsFromFirestore() {
  if (!window.RH_SYNC || !window.RH_SYNC.enabled) return;
  const idFor = account => String(account.cpf || "").replace(/\D/g, "");
  try {
    const remote = await window.RH_SYNC.loadDocs("contasLegado");
    if (!remote || remote.length === 0) {
      if (serverAccounts.length > 0) saveServerAccounts();
      return;
    }
    serverAccounts = mergeServerAccountsWithCloud(serverAccounts, remote);
    seedFirestoreSyncState("contasLegado", remote, idFor);
    saveServerAccounts();
  } catch (error) {
    const detail = error instanceof Error ? ` ${error.message}` : "";
    console.warn("Falha ao carregar as contas legadas do Firestore:", error);
    showToast(`Contas de acesso carregadas apenas deste navegador.${detail}`);
  }
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
  syncCollectionToFirestore("servidores", serverPersonalData);
  return true;
}

// Cada coleção guarda a assinatura do último documento gravado, para enviar ao
// Firestore apenas o que realmente mudou (em vez de reescrever a coleção toda).
// O retrato também fica salvo no navegador: ao reabrir o painel ele permite
// distinguir "nunca subiu" (precisa enviar) de "foi excluído em outro
// computador" (precisa sair daqui também).
const firestoreSyncStateStorageKey = "brisa-firestore-sync-state-v1";
const firestoreSyncState = new Map();
loadPersistedFirestoreSyncState();

// Coleções com alterações que ainda não foram confirmadas pelo Firestore. Uma
// falha (rede ou permissão) não descarta nada: a coleção continua na fila e é
// reenviada quando a conexão volta, quando a aba volta ao foco e a cada ciclo
// do temporizador.
const pendingSyncCollections = new Set();
let cloudSyncLastError = "";
let cloudSyncNotifiedFailure = "";
let cloudSyncLastSuccessAt = null;
const cloudSyncRetryIntervalMs = 15000;

// Coleção -> lista local, usada para reenviar o que ficou pendente.
const collectionSyncSources = {
  requests: () => requests,
  servidores: () => serverPersonalData,
  usuarios: () => usuarios,
  unidades: () => unidades,
  cargos: () => cargos,
  quadros: () => quadros,
  tarefas: () => tasks,
  fgServidores: () => fgServerRoster,
  contasLegado: () => serverAccounts
};

function syncIdForCollection(collection) {
  if (collection === "contasLegado") return account => String(account.cpf || "").replace(/\D/g, "");
  return null;
}

// Onde cada lista é guardada no navegador (usado quando a nuvem manda novidades:
// o estado local precisa acompanhar, senão uma exclusão feita em outro
// computador voltaria ao recarregar a página).
const collectionStorageKeys = {
  requests: storageKey,
  servidores: serverDataStorageKey,
  usuarios: usuariosStorageKey,
  unidades: unidadesStorageKey,
  cargos: cargosStorageKey,
  quadros: quadrosStorageKey,
  tarefas: taskStorageKey,
  fgServidores: fgRosterStorageKey,
  contasLegado: serverAccountsStorageKey
};

function persistCollectionLocally(collection) {
  const storageKeyForCollection = collectionStorageKeys[collection];
  const source = collectionSyncSources[collection];
  if (!storageKeyForCollection || !source) return;
  try {
    localStorage.setItem(storageKeyForCollection, JSON.stringify(source()));
  } catch {
    // Sem espaço no navegador: o que veio da nuvem continua valendo na sessão.
  }
}

function loadPersistedFirestoreSyncState() {
  try {
    const saved = JSON.parse(localStorage.getItem(firestoreSyncStateStorageKey) || "{}");
    Object.keys(saved || {}).forEach(collection => {
      const entries = saved[collection];
      if (!entries || typeof entries !== "object") return;
      firestoreSyncState.set(collection, new Map(Object.entries(entries)));
    });
  } catch {
    // Sem retrato salvo: a primeira gravação de cada coleção envia a lista toda.
  }
}

function persistFirestoreSyncState() {
  try {
    const out = {};
    firestoreSyncState.forEach((entries, collection) => { out[collection] = Object.fromEntries(entries); });
    localStorage.setItem(firestoreSyncStateStorageKey, JSON.stringify(out));
  } catch {
    // O retrato é apenas uma otimização; sem ele a lista toda é reenviada.
  }
}

// Compara valores ignorando a ordem das propriedades (o Firestore pode devolver
// os campos em ordem diferente da que gravamos).
function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === "object") {
    const out = {};
    Object.keys(value).sort().forEach(key => { out[key] = sortKeysDeep(value[key]); });
    return out;
  }
  return value;
}

function valueSignature(value) {
  try {
    return JSON.stringify(sortKeysDeep(value === undefined ? null : value));
  } catch {
    return `${Date.now()}-${Math.random()}`;
  }
}

// true quando tudo o que existe neste navegador já está na nuvem: nesse caso a
// versão da nuvem prevalece (ela pode ter campos extras de outra versão do app
// e o envio usa merge, que preserva esses campos).
function localIsCoveredByCloud(localDoc, cloudDoc) {
  return Object.keys(localDoc).every(key => valueSignature(localDoc[key]) === valueSignature(cloudDoc[key]));
}

function documentSignature(doc) {
  try {
    return JSON.stringify(sortKeysDeep(doc));
  } catch {
    return `${Date.now()}-${Math.random()}`;
  }
}

// Estado da nuvem mostrado no cabeçalho do painel.
function updateSyncIndicator() {
  const chip = document.getElementById("sync-status");
  const text = document.getElementById("sync-status-text");
  if (!chip || !text) return;
  const enabled = Boolean(window.RH_SYNC && window.RH_SYNC.enabled);
  chip.hidden = !enabled;
  if (!enabled) return;
  const pending = pendingSyncCollections.size > 0;
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  chip.classList.toggle("is-pending", pending && !cloudSyncLastError);
  chip.classList.toggle("is-error", pending && Boolean(cloudSyncLastError));
  chip.classList.toggle("is-ok", !pending);
  if (pending) {
    if (cloudSyncLastError) {
      text.textContent = "Sem conexão com a nuvem — tentando de novo…";
      chip.title = `Última falha: ${cloudSyncLastError}`;
    } else if (offline) {
      text.textContent = "Sem conexão com a nuvem — enviando quando voltar";
      chip.title = "As alterações estão guardadas neste navegador e sobem assim que a internet voltar";
    } else {
      text.textContent = "Salvando na nuvem…";
      chip.title = "Enviando as alterações para o Firestore";
    }
    return;
  }
  text.textContent = cloudSyncLastSuccessAt
    ? `Salvo na nuvem às ${cloudSyncLastSuccessAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
    : "Tudo salvo na nuvem";
  chip.title = "Todos os dados estão salvos no Firestore";
}

function markSyncPending(collection) {
  pendingSyncCollections.add(collection);
  updateSyncIndicator();
}

function markSyncSettled(collection) {
  pendingSyncCollections.delete(collection);
  if (!pendingSyncCollections.size) {
    cloudSyncLastError = "";
    cloudSyncNotifiedFailure = "";
    cloudSyncLastSuccessAt = new Date();
  }
  updateSyncIndicator();
}

function registerSyncFailure(collection, error, message) {
  cloudSyncLastError = error instanceof Error ? error.message : "";
  const detail = cloudSyncLastError ? ` ${cloudSyncLastError}` : "";
  console.warn(`Falha ao sincronizar ${collection} no Firestore:`, error);
  // O mesmo aviso não se repete a cada nova tentativa automática.
  const stamp = `${collection}|${cloudSyncLastError}`;
  if (cloudSyncNotifiedFailure !== stamp) {
    cloudSyncNotifiedFailure = stamp;
    showToast(message || `Salvo neste navegador; a nuvem será atualizada assim que possível.${detail}`);
  }
  updateSyncIndicator();
}

// Marca como "já presentes no Firestore" os documentos do carregamento inicial,
// para que as próximas gravações enviem somente as alterações.
function seedFirestoreSyncState(collection, docs, idFor) {
  if (!window.RH_SYNC || !window.RH_SYNC.enabled) return;
  const baseline = new Map();
  (docs || []).forEach(doc => {
    const rawId = idFor ? idFor(doc) : doc.id;
    if (!rawId) return;
    const id = String(rawId);
    baseline.set(id, documentSignature(Object.assign({}, doc, { id })));
  });
  firestoreSyncState.set(collection, baseline);
  persistFirestoreSyncState();
}

function syncCollectionToFirestore(collection, docs, idFor) {
  if (!window.RH_SYNC || !window.RH_SYNC.enabled) return;
  const normalized = (docs || []).map(doc => {
    const rawId = idFor ? idFor(doc) : doc.id;
    return Object.assign({}, doc, { id: rawId ? String(rawId) : undefined });
  });
  let baseline = firestoreSyncState.get(collection);
  const changed = [];
  if (!baseline) {
    // Ainda sem retrato do Firestore: envia tudo uma vez e memoriza.
    baseline = new Map();
    firestoreSyncState.set(collection, baseline);
    normalized.forEach(doc => { if (doc.id) changed.push(doc); });
  } else {
    normalized.forEach(doc => {
      if (!doc.id) return;
      const id = String(doc.id);
      if (baseline.get(id) === documentSignature(doc)) return;
      changed.push(doc);
    });
  }
  if (!changed.length) return;
  const signatures = new Map();
  changed.forEach(doc => {
    const id = String(doc.id);
    signatures.set(id, documentSignature(doc));
    baseline.set(id, signatures.get(id));
  });
  persistFirestoreSyncState();
  markSyncPending(collection);
  window.RH_SYNC.saveDocs(collection, changed)
    .then(() => markSyncSettled(collection))
    .catch(error => {
      // Desfaz o retrato desses documentos: a próxima tentativa os envia de novo.
      signatures.forEach((value, id) => {
        if (baseline.get(id) === value) baseline.delete(id);
      });
      persistFirestoreSyncState();
      registerSyncFailure(collection, error);
    });
}

function deleteReferenceDocFromFirestore(collection, id) {
  if (!window.RH_SYNC || !window.RH_SYNC.enabled) return;
  const baseline = firestoreSyncState.get(collection);
  const previous = baseline ? baseline.get(String(id)) : undefined;
  if (baseline) baseline.delete(String(id));
  persistFirestoreSyncState();
  // Coleções com lista local podem ser inteiramente reenviadas na retentativa.
  const canRetry = Boolean(collectionSyncSources[collection]);
  if (canRetry) markSyncPending(collection);
  window.RH_SYNC.deleteDoc(collection, id)
    .then(() => { if (canRetry) markSyncSettled(collection); })
    .catch(error => {
      // Devolve o retrato do documento: assim a exclusão é tentada novamente.
      if (baseline && previous !== undefined) baseline.set(String(id), previous);
      persistFirestoreSyncState();
      registerSyncFailure(collection, error, "Exclusão aplicada neste navegador; a nuvem será atualizada assim que possível.");
    });
}

// Sincroniza a coleção e também apaga na nuvem o que foi removido aqui. Só
// apaga com base no retrato já conhecido do Firestore, para nunca remover
// documentos que este navegador ainda não viu.
function syncCollectionWithRemovals(collection, docs, idFor) {
  if (!window.RH_SYNC || !window.RH_SYNC.enabled) return;
  const baseline = firestoreSyncState.get(collection);
  if (baseline) {
    const currentIds = new Set();
    (docs || []).forEach(doc => {
      const rawId = idFor ? idFor(doc) : doc.id;
      if (rawId) currentIds.add(String(rawId));
    });
    Array.from(baseline.keys()).forEach(id => {
      if (!currentIds.has(String(id))) deleteReferenceDocFromFirestore(collection, id);
    });
  }
  syncCollectionToFirestore(collection, docs, idFor);
}

// Reenvia tudo o que ficou pendente (falha de rede/permissão ou aba fechada no
// meio do envio).
function retryPendingSyncs() {
  if (!window.RH_SYNC || !window.RH_SYNC.enabled) return;
  if (!pendingSyncCollections.size) return;
  // Sem internet o Firestore já guarda a escrita na fila dele: tentar de novo
  // agora só acumularia pedidos repetidos.
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  // Anexos pendentes voltam pelo mesmo caminho que os grava (null = exclusão).
  if (pendingAttachmentSyncs.size) {
    Array.from(pendingAttachmentSyncs.entries()).forEach(([requestId, attachment]) => {
      syncAttachmentToFirestore(requestId, attachment);
    });
  }
  Array.from(pendingSyncCollections).forEach(collection => {
    if (collection === "anexos") {
      if (!pendingAttachmentSyncs.size) pendingSyncCollections.delete(collection);
      return;
    }
    const source = collectionSyncSources[collection];
    if (!source) {
      pendingSyncCollections.delete(collection);
      return;
    }
    syncCollectionWithRemovals(collection, source(), syncIdForCollection(collection));
  });
  updateSyncIndicator();
}

function setupSyncRetryLoop() {
  if (!window.RH_SYNC || !window.RH_SYNC.enabled) return;
  window.addEventListener("online", retryPendingSyncs);
  window.addEventListener("offline", updateSyncIndicator);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") retryPendingSyncs();
  });
  setInterval(retryPendingSyncs, cloudSyncRetryIntervalMs);
}

// ---- Espelho em tempo real -------------------------------------------------

// Funde a lista da nuvem com a deste navegador:
//  - documento que existe só aqui e nunca subiu continua valendo (será enviado);
//  - documento que existe nos dois lados mantém a versão local apenas enquanto
//    houver nela algo que a nuvem ainda não tem;
//  - documento que já estava na nuvem e sumiu de lá foi excluído em outro
//    computador, então sai daqui também.
function mergeRemoteCollection(collection, localList, remoteList, idFor) {
  const baseline = firestoreSyncState.get(collection);
  // Enquanto existe alteração local ainda não confirmada, a ausência de um
  // documento na nuvem não é confiável (a nuvem pode estar um passo atrás):
  // nesse caso nada é descartado daqui.
  const trustRemovals = !pendingSyncCollections.has(collection);
  const idOf = doc => {
    const rawId = idFor ? idFor(doc) : doc && doc.id;
    return rawId ? String(rawId) : "";
  };
  const remoteById = new Map();
  (remoteList || []).forEach(doc => {
    const id = idOf(doc);
    if (id) remoteById.set(id, doc);
  });
  const merged = [];
  const known = new Set();
  (localList || []).forEach(local => {
    const id = idOf(local);
    if (!id || known.has(id)) return;
    known.add(id);
    const remote = remoteById.get(id);
    if (!remote) {
      // Ausente na nuvem: mantém se nunca chegou a subir (senão foi excluído em
      // outro computador e sai daqui também).
      const signature = documentSignature(Object.assign({}, local, { id }));
      const confirmed = baseline ? baseline.get(id) === signature : false;
      if (!confirmed || !trustRemovals) merged.push(local);
      return;
    }
    // Presente nos dois lados: fica a versão local só enquanto houver algo nela
    // que a nuvem ainda não tem (nesse caso o envio acontece na sequência).
    merged.push(localIsCoveredByCloud(local, remote) ? remote : local);
  });
  (remoteList || []).forEach(remote => {
    const id = idOf(remote);
    if (!id || known.has(id)) return;
    known.add(id);
    merged.push(remote);
  });
  return merged;
}

// O que fazer quando a nuvem envia novidades de cada coleção do painel.
const liveCollectionHandlers = {
  requests: {
    normalize: normalizeRequest,
    idFor: null,
    read: () => requests,
    write: list => { requests = list; },
    render: () => renderRequestsDependentViews(),
    flush: () => saveRequests()
  },
  usuarios: {
    normalize: normalizeUsuario,
    idFor: null,
    read: () => usuarios,
    write: list => { usuarios = list; },
    render: () => renderUsuarios(),
    flush: () => saveUsuarios()
  },
  servidores: {
    normalize: record => record,
    idFor: record => record.id,
    read: () => serverPersonalData,
    write: list => { serverPersonalData = list; },
    render: () => { renderServerPersonalData(); fillServerDataReferenceSelects(); },
    flush: () => saveServerPersonalData()
  },
  tarefas: {
    normalize: task => ({
      ...task,
      date: isIsoDate(task.date) ? task.date : "",
      completed: Boolean(task.completed)
    }),
    idFor: task => task.id,
    read: () => tasks,
    write: list => { tasks = list; },
    render: () => renderTasks(),
    flush: () => saveTasks()
  },
  fgServidores: {
    normalize: normalizeFgRosterEntry,
    idFor: entry => entry.id,
    read: () => fgServerRoster,
    write: list => { fgServerRoster = list; },
    render: () => renderFgServerRoster(),
    flush: () => saveFgServerRoster()
  }
};

// Aplica a lista vinda da nuvem: funde com o que existe aqui, guarda o retrato
// da nuvem (antes de enviar), sobe o que só existe neste navegador e redesenha.
function applyRemoteCollection(collection, remoteRaw) {
  const handler = liveCollectionHandlers[collection];
  if (!handler || !window.RH_SYNC || !window.RH_SYNC.enabled) return;
  const idOf = doc => {
    const rawId = handler.idFor ? handler.idFor(doc) : doc && doc.id;
    return rawId ? String(rawId) : "";
  };
  const remote = (remoteRaw || []).map(handler.normalize).filter(Boolean);
  const remoteIds = new Set(remote.map(idOf).filter(Boolean));
  const merged = mergeRemoteCollection(collection, handler.read(), remote, handler.idFor);
  seedFirestoreSyncState(collection, remote, handler.idFor);
  handler.write(merged);
  // Guarda o estado da nuvem também no navegador: sem isso uma exclusão feita em
  // outro computador voltaria na próxima abertura da página.
  persistCollectionLocally(collection);
  // Envia somente quando existe algo aqui que ainda não está na nuvem. Sem isso
  // cada aviso da nuvem provocaria uma nova gravação (e um aviso novo).
  const hasLocalOnly = merged.some(doc => {
    const id = idOf(doc);
    return !id || !remoteIds.has(id);
  });
  if (hasLocalOnly) handler.flush();
  handler.render();
}

function subscribeLiveCollections() {
  if (!window.RH_SYNC || !window.RH_SYNC.enabled) return;
  Object.keys(liveCollectionHandlers).forEach(collection => {
    window.RH_SYNC.subscribeDocs(
      collection,
      list => applyRemoteCollection(collection, list),
      error => console.warn(`Assinatura em tempo real de ${collection} falhou:`, error)
    );
  });
}

function seedUnidades() {
  return [
    "Penitenciária de Cruzeiro",
    "Penitenciária de Campo Mourão",
    "Penitenciária de Guaíra",
    "CP Cianorte",
    "CP Loanda",
    "CP Iporã",
    "CP Altonia",
    "CP Goioere",
    "CP Umuarama",
    "CP Cidade Gaúcha",
    "CP Campo Mourão",
    "Coordenação Regional CR-6"
  ].map((name, index) => ({ id: `unidade-seed-${index}`, name }));
}

function seedCargos() {
  return [
    { name: "Policial Penal", quadro: "QPPP" },
    { name: "Agente de Execução", quadro: "QPPE" },
    { name: "Agente Profissional", quadro: "QPPE" }
  ].map((item, index) => ({ id: `cargo-seed-${index}`, name: item.name, quadro: item.quadro }));
}

function seedQuadros() {
  return [
    { name: "QPPP" },
    { name: "QPPE" }
  ].map((item, index) => ({ id: `quadro-seed-${index}`, name: item.name, observacoes: "" }));
}

function loadLocalReferenceList(key, seeds) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "[]");
    if (Array.isArray(saved) && saved.length > 0) return normalizeReferenceList(saved);
  } catch {
    // Ignora e usa a lista inicial abaixo.
  }
  return seeds;
}

function normalizeReferenceList(list) {
  return (Array.isArray(list) ? list : [])
    .map(item => ({
      id: String((item && item.id) || crypto.randomUUID()),
      name: String((item && item.name) || "").trim(),
      quadro: String((item && item.quadro) || "").trim(),
      observacoes: String((item && item.observacoes) || "").trim()
    }))
    .filter(item => item.name);
}

// Junta o que existe na nuvem com o que existir apenas neste navegador (a
// nuvem tem prioridade). Itens locais cujo nome já existe na nuvem são
// descartados, para não duplicar a lista inicial em cada navegador novo.
function mergeReferenceListWithCloud(localList, remoteList) {
  const remote = normalizeReferenceList(remoteList);
  const cloudIds = new Set(remote.map(item => String(item.id)));
  const cloudNames = new Set(remote.map(item => normalizeSearchText(item.name)));
  const localOnly = normalizeReferenceList(localList).filter(item =>
    !cloudIds.has(String(item.id)) && !cloudNames.has(normalizeSearchText(item.name)));
  return remote.concat(localOnly);
}

function saveUnidades() {
  try {
    localStorage.setItem(unidadesStorageKey, JSON.stringify(unidades));
  } catch {
    showToast("Não foi possível salvar as unidades neste navegador.");
    return false;
  }
  syncCollectionToFirestore("unidades", unidades);
  return true;
}

function saveCargos() {
  try {
    localStorage.setItem(cargosStorageKey, JSON.stringify(cargos));
  } catch {
    showToast("Não foi possível salvar os cargos neste navegador.");
    return false;
  }
  syncCollectionToFirestore("cargos", cargos);
  return true;
}

function saveQuadros() {
  try {
    localStorage.setItem(quadrosStorageKey, JSON.stringify(quadros));
  } catch {
    showToast("Não foi possível salvar os quadros neste navegador.");
    return false;
  }
  syncCollectionToFirestore("quadros", quadros);
  return true;
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
    pendente: raw.pendente === true,
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
  syncCollectionToFirestore("usuarios", usuarios);
}

function renderUsuarios() {
  const pendingCount = usuarios.filter(user => user.pendente).length;
  const pendingBadge = document.getElementById("nav-usuarios-pending");
  if (pendingBadge) {
    pendingBadge.textContent = pendingCount;
    pendingBadge.hidden = pendingCount === 0;
  }
  const container = document.getElementById("usuarios-body");
  if (!container) return;
  const query = (document.getElementById("usuarios-search")?.value || "").trim().toLocaleLowerCase("pt-BR");
  const filtered = usuarios
    .filter(user => `${user.name} ${user.email}`.toLocaleLowerCase("pt-BR").includes(query))
    .sort((a, b) => (Number(Boolean(b.pendente)) - Number(Boolean(a.pendente))) || String(a.name).localeCompare(String(b.name), "pt-BR"));
  const pendingNote = document.getElementById("usuarios-pending-note");
  if (pendingNote) {
    pendingNote.textContent = pendingCount === 1
      ? "1 acesso aguardando aprovação."
      : `${pendingCount} acessos aguardando aprovação.`;
    pendingNote.hidden = pendingCount === 0;
  }
  if (filtered.length === 0) {
    container.innerHTML = `<tr><td colspan="5" class="team-empty">Nenhum usuário encontrado.</td></tr>`;
    refreshIcons();
    return;
  }
  container.innerHTML = filtered.map(user => {
    const statusLabel = user.pendente ? "Pendente" : (user.ativo ? "Ativo" : "Inativo");
    const statusClass = user.pendente ? "status-pending" : (user.ativo ? "status-approved" : "status-rejected");
    const ownerBadge = isOwnerEmail(user.email) ? "<small>Proprietário</small>" : "";
    const perfilCell = `<select class="usuario-perfil-select" data-usuario-perfil="${escapeHtml(user.id)}" aria-label="Perfil de ${escapeHtml(user.name)}"><option value="usuario"${user.perfil === "usuario" ? " selected" : ""}>Usuário</option><option value="admin"${user.perfil === "admin" ? " selected" : ""}>Administrador</option></select>`;
    const actions = user.pendente
      ? `<button class="action-icon approve" type="button" data-approve-usuario="${escapeHtml(user.id)}" aria-label="Permitir acesso de ${escapeHtml(user.name)}" title="Permitir acesso"><i data-lucide="check"></i></button><button class="action-icon reject" type="button" data-deny-usuario="${escapeHtml(user.id)}" aria-label="Negar acesso de ${escapeHtml(user.name)}" title="Negar acesso"><i data-lucide="x"></i></button>`
      : `<button class="action-icon approve" type="button" data-edit-usuario="${escapeHtml(user.id)}" aria-label="Editar usuário ${escapeHtml(user.name)}" title="Editar"><i data-lucide="pencil"></i></button><button class="action-icon reject" type="button" data-remove-usuario="${escapeHtml(user.id)}" aria-label="Remover usuário ${escapeHtml(user.name)}" title="Remover"><i data-lucide="trash-2"></i></button>`;
    return `<tr><td><div class="person-cell"><span><strong>${escapeHtml(user.name)}</strong>${ownerBadge}</span></div></td><td>${escapeHtml(user.email)}</td><td>${perfilCell}</td><td><span class="status-pill ${statusClass}">${statusLabel}</span></td><td><div class="request-actions">${actions}</div></td></tr>`;
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

function renderUnidades() {
  const container = document.getElementById("unidades-body");
  if (!container) return;
  const query = (document.getElementById("unidades-search")?.value || "").trim().toLocaleLowerCase("pt-BR");
  const filtered = unidades.filter(unidade => unidade.name.toLocaleLowerCase("pt-BR").includes(query));
  if (filtered.length === 0) {
    container.innerHTML = `<tr><td colspan="2" class="team-empty">Nenhuma unidade cadastrada.</td></tr>`;
    refreshIcons();
    return;
  }
  container.innerHTML = filtered.map((unidade, index) => {
    const upDisabled = index === 0;
    const downDisabled = index === filtered.length - 1;
    return `<tr><td><strong>${escapeHtml(unidade.name)}</strong></td><td><div class="request-actions"><button class="action-icon move" type="button" data-move-unidade="${escapeHtml(unidade.id)}" data-direction="-1" aria-label="Mover ${escapeHtml(unidade.name)} para cima" title="Mover para cima"${upDisabled ? " disabled" : ""}><i data-lucide="chevron-up"></i></button><button class="action-icon move" type="button" data-move-unidade="${escapeHtml(unidade.id)}" data-direction="1" aria-label="Mover ${escapeHtml(unidade.name)} para baixo" title="Mover para baixo"${downDisabled ? " disabled" : ""}><i data-lucide="chevron-down"></i></button><button class="action-icon approve" type="button" data-edit-unidade="${escapeHtml(unidade.id)}" aria-label="Editar unidade ${escapeHtml(unidade.name)}" title="Editar"><i data-lucide="pencil"></i></button><button class="action-icon reject" type="button" data-remove-unidade="${escapeHtml(unidade.id)}" aria-label="Remover unidade ${escapeHtml(unidade.name)}" title="Remover"><i data-lucide="trash-2"></i></button></div></td></tr>`;
  }).join("");
  refreshIcons();
  fillServerDataReferenceSelects();
}

function renderCargos() {
  const container = document.getElementById("cargos-body");
  if (!container) return;
  const query = (document.getElementById("cargos-search")?.value || "").trim().toLocaleLowerCase("pt-BR");
  const filtered = cargos.filter(cargo => cargo.name.toLocaleLowerCase("pt-BR").includes(query));
  if (filtered.length === 0) {
    container.innerHTML = `<tr><td colspan="4" class="team-empty">Nenhum cargo cadastrado.</td></tr>`;
    refreshIcons();
    return;
  }
  container.innerHTML = filtered.map((cargo, index) => {
    const observacoesCell = cargo.observacoes ? `<span title="${escapeHtml(cargo.observacoes)}">${escapeHtml(cargo.observacoes)}</span>` : "—";
    const upDisabled = index === 0;
    const downDisabled = index === filtered.length - 1;
    return `<tr><td><strong>${escapeHtml(cargo.name)}</strong></td><td>${cargo.quadro ? `<span class="status-pill status-approved">${escapeHtml(cargo.quadro)}</span>` : "—"}</td><td>${observacoesCell}</td><td><div class="request-actions"><button class="action-icon move" type="button" data-move-cargo="${escapeHtml(cargo.id)}" data-direction="-1" aria-label="Mover ${escapeHtml(cargo.name)} para cima" title="Mover para cima"${upDisabled ? " disabled" : ""}><i data-lucide="chevron-up"></i></button><button class="action-icon move" type="button" data-move-cargo="${escapeHtml(cargo.id)}" data-direction="1" aria-label="Mover ${escapeHtml(cargo.name)} para baixo" title="Mover para baixo"${downDisabled ? " disabled" : ""}><i data-lucide="chevron-down"></i></button><button class="action-icon approve" type="button" data-edit-cargo="${escapeHtml(cargo.id)}" aria-label="Editar cargo ${escapeHtml(cargo.name)}" title="Editar"><i data-lucide="pencil"></i></button><button class="action-icon reject" type="button" data-remove-cargo="${escapeHtml(cargo.id)}" aria-label="Remover cargo ${escapeHtml(cargo.name)}" title="Remover"><i data-lucide="trash-2"></i></button></div></td></tr>`;
  }).join("");
  refreshIcons();
  fillServerDataReferenceSelects();
}

function renderQuadros() {
  const container = document.getElementById("quadros-body");
  if (!container) return;
  const query = (document.getElementById("quadros-search")?.value || "").trim().toLocaleLowerCase("pt-BR");
  const filtered = quadros.filter(quadro => quadro.name.toLocaleLowerCase("pt-BR").includes(query));
  if (filtered.length === 0) {
    container.innerHTML = `<tr><td colspan="3" class="team-empty">Nenhum quadro cadastrado.</td></tr>`;
    refreshIcons();
    return;
  }
  container.innerHTML = filtered.map((quadro, index) => {
    const observacoesCell = quadro.observacoes ? `<span title="${escapeHtml(quadro.observacoes)}">${escapeHtml(quadro.observacoes)}</span>` : "—";
    const upDisabled = index === 0;
    const downDisabled = index === filtered.length - 1;
    return `<tr><td><strong>${escapeHtml(quadro.name)}</strong></td><td>${observacoesCell}</td><td><div class="request-actions"><button class="action-icon move" type="button" data-move-quadro="${escapeHtml(quadro.id)}" data-direction="-1" aria-label="Mover ${escapeHtml(quadro.name)} para cima" title="Mover para cima"${upDisabled ? " disabled" : ""}><i data-lucide="chevron-up"></i></button><button class="action-icon move" type="button" data-move-quadro="${escapeHtml(quadro.id)}" data-direction="1" aria-label="Mover ${escapeHtml(quadro.name)} para baixo" title="Mover para baixo"${downDisabled ? " disabled" : ""}><i data-lucide="chevron-down"></i></button><button class="action-icon approve" type="button" data-edit-quadro="${escapeHtml(quadro.id)}" aria-label="Editar quadro ${escapeHtml(quadro.name)}" title="Editar"><i data-lucide="pencil"></i></button><button class="action-icon reject" type="button" data-remove-quadro="${escapeHtml(quadro.id)}" aria-label="Remover quadro ${escapeHtml(quadro.name)}" title="Remover"><i data-lucide="trash-2"></i></button></div></td></tr>`;
  }).join("");
  refreshIcons();
  fillServerDataReferenceSelects();
}

// Evita reconstruir as listas de opções quando nada no cadastro mudou
// (renderAll chama esta função várias vezes por ciclo).
let referenceSelectsSignature = null;
function fillServerDataReferenceSelects() {
  const signature = JSON.stringify([
    unidades.map(item => item.name),
    cargos.map(item => `${item.name}\u0000${item.quadro}`),
    quadros.map(item => item.name)
  ]);
  if (signature === referenceSelectsSignature) return;
  referenceSelectsSignature = signature;
  const quadroOptions = quadros.map(item => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)}</option>`).join("");
  if (serverDataForm) {
    const unidadeSelect = serverDataForm.elements.namedItem("unidadePenal");
    const cargoSelect = serverDataForm.elements.namedItem("cargo");
    if (unidadeSelect) {
      const current = unidadeSelect.value;
      unidadeSelect.innerHTML = `<option value="">Selecione a unidade penal</option>${unidades.map(item => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)}</option>`).join("")}`;
      if (current && !Array.from(unidadeSelect.options).some(option => option.value === current)) {
        unidadeSelect.add(new Option(`${current} (cadastro existente)`, current));
      }
      if (current) unidadeSelect.value = current;
    }
    if (cargoSelect) {
      const current = cargoSelect.value;
      cargoSelect.innerHTML = `<option value="">Selecione o cargo</option>${cargos.map(item => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)}</option>`).join("")}`;
      if (current && !Array.from(cargoSelect.options).some(option => option.value === current)) {
        cargoSelect.add(new Option(`${current} (cadastro existente)`, current));
      }
      if (current) cargoSelect.value = current;
    }
    if (serverDataQuadro) {
      const current = serverDataQuadro.value;
      serverDataQuadro.innerHTML = `<option value="">Selecione o quadro</option>${quadroOptions}`;
      if (current && !Array.from(serverDataQuadro.options).some(option => option.value === current)) {
        serverDataQuadro.add(new Option(`${current} (cadastro existente)`, current));
      }
      const autoQuadro = getServerDataQuadroForCargo(cargoSelect ? cargoSelect.value : "");
      if (autoQuadro) serverDataQuadro.value = autoQuadro;
      else if (current) serverDataQuadro.value = current;
    }
  }
  const cargoQuadroSelect = document.getElementById("cargo-quadro");
  if (cargoQuadroSelect) {
    const current = cargoQuadroSelect.value;
    cargoQuadroSelect.innerHTML = `<option value="">Sem quadro padrão</option>${quadroOptions}`;
    if (current && !Array.from(cargoQuadroSelect.options).some(option => option.value === current)) {
      cargoQuadroSelect.add(new Option(`${current} (cadastro existente)`, current));
    }
    cargoQuadroSelect.value = current;
  }
}

function moveReferenceItem(list, id, direction, searchInputId, nameKey) {
  const query = (document.getElementById(searchInputId)?.value || "").trim().toLocaleLowerCase("pt-BR");
  const visible = list.filter(item => String(item[nameKey]).toLocaleLowerCase("pt-BR").includes(query));
  const fromVisible = visible.findIndex(item => item.id === id);
  if (fromVisible < 0) return null;
  const toVisible = fromVisible + direction;
  if (toVisible < 0 || toVisible >= visible.length) return null;
  const target = visible[toVisible];
  const reordered = list.slice();
  const fromIndex = reordered.findIndex(item => item.id === id);
  const targetIndex = reordered.findIndex(item => item.id === target.id);
  [reordered[fromIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[fromIndex]];
  return reordered;
}

function setUnidadeMessage(message, isError) {
  const element = document.getElementById("unidade-message");
  if (!element) return;
  element.textContent = message || "";
  element.classList.toggle("error", Boolean(isError));
}

function openUnidadeDialog(unidade) {
  const dialog = document.getElementById("unidade-dialog");
  const title = document.getElementById("unidade-dialog-title");
  const form = document.getElementById("unidade-form");
  if (unidade) {
    editingUnidadeId = unidade.id;
    title.textContent = "Editar unidade";
    document.getElementById("unidade-nome").value = unidade.name || "";
  } else {
    editingUnidadeId = null;
    title.textContent = "Adicionar unidade";
    form.reset();
  }
  setUnidadeMessage("");
  dialog.showModal();
  refreshIcons();
}

function setCargoMessage(message, isError) {
  const element = document.getElementById("cargo-message");
  if (!element) return;
  element.textContent = message || "";
  element.classList.toggle("error", Boolean(isError));
}

function openCargoDialog(cargo) {
  const dialog = document.getElementById("cargo-dialog");
  const title = document.getElementById("cargo-dialog-title");
  const form = document.getElementById("cargo-form");
  if (cargo) {
    editingCargoId = cargo.id;
    title.textContent = "Editar cargo";
    document.getElementById("cargo-nome").value = cargo.name || "";
    const cargoQuadroSelect = document.getElementById("cargo-quadro");
    if (cargo.quadro && !Array.from(cargoQuadroSelect.options).some(option => option.value === cargo.quadro)) {
      cargoQuadroSelect.add(new Option(`${cargo.quadro} (cadastro existente)`, cargo.quadro));
    }
    cargoQuadroSelect.value = cargo.quadro || "";
    document.getElementById("cargo-obs").value = cargo.observacoes || "";
  } else {
    editingCargoId = null;
    title.textContent = "Adicionar cargo";
    form.reset();
  }
  setCargoMessage("");
  dialog.showModal();
  refreshIcons();
}

function setQuadroMessage(message, isError) {
  const element = document.getElementById("quadro-message");
  if (!element) return;
  element.textContent = message || "";
  element.classList.toggle("error", Boolean(isError));
}

function openQuadroDialog(quadro) {
  const dialog = document.getElementById("quadro-dialog");
  const title = document.getElementById("quadro-dialog-title");
  const form = document.getElementById("quadro-form");
  if (quadro) {
    editingQuadroId = quadro.id;
    title.textContent = "Editar quadro";
    document.getElementById("quadro-nome").value = quadro.name || "";
    document.getElementById("quadro-obs").value = quadro.observacoes || "";
  } else {
    editingQuadroId = null;
    title.textContent = "Adicionar quadro";
    form.reset();
  }
  setQuadroMessage("");
  dialog.showModal();
  refreshIcons();
}

function setReferenceImportMessage(type, message, isError) {
  const element = document.getElementById(`${type}-import-message`);
  if (!element) return;
  element.textContent = message || "";
  element.classList.toggle("error", Boolean(isError));
}

function openReferenceImportDialog(type) {
  const dialog = document.getElementById(`${type}-import-dialog`);
  if (!dialog) return;
  dialog.querySelector("form").reset();
  setReferenceImportMessage(type, "");
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
  deleteReferenceDocFromFirestore("requests", requestId);
  // O anexo (se houver) sai da nuvem pelo mesmo caminho que o grava, para que
  // uma falha entre na fila de novas tentativas.
  syncAttachmentToFirestore(requestId, null);
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
  if (document.getElementById("view-report-servers")?.classList.contains("active")) renderServerDirectoryReport();
  renderVacationTodayStat();
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

function legacyLoadRequests(includeSeed = true) {
  const fallback = () => (includeSeed ? seedRequests.map(request => ({ ...request })) : []);
  try {
    const saved = localStorage.getItem(storageKey);
    const parsed = saved ? JSON.parse(saved) : fallback();
    return (Array.isArray(parsed) ? parsed : fallback()).map(normalizeRequest);
  } catch {
    return fallback();
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

// Identificador estável de uma entrada da lista de Função Gratificada. É usado
// como id do documento na nuvem (CPF quando existir, senão o nome).
function fgRosterEntryId(entry) {
  const cpf = String((entry && entry.cpf) || "").replace(/\D/g, "");
  if (cpf) return `fg-${cpf}`;
  const slug = normalizeSearchText((entry && entry.name) || "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `fg-${slug || "sem-nome"}`;
}

// Sempre trabalha com objetos { id, name, cpf } (as listas antigas guardavam
// apenas o nome em texto).
function normalizeFgRosterEntry(entry) {
  const name = String((typeof entry === "string" ? entry : entry && entry.name) || "").trim();
  if (!name) return null;
  const cpf = String((typeof entry === "string" ? "" : entry && entry.cpf) || "").trim();
  const base = { name, cpf };
  const id = typeof entry === "string" ? "" : String((entry && entry.id) || "").trim();
  return { id: id || fgRosterEntryId(base), name, cpf };
}

function fgRosterKey(entry) {
  const cpf = String((entry && entry.cpf) || "").replace(/\D/g, "");
  return cpf ? `cpf:${cpf}` : `nome:${normalizeSearchText((entry && entry.name) || "")}`;
}

// Une a lista local com a da nuvem (a nuvem tem prioridade na mesma pessoa).
function mergeFgRoster(localList, remoteList) {
  const merged = [];
  const indexByKey = new Map();
  const put = entry => {
    const normalized = normalizeFgRosterEntry(entry);
    if (!normalized) return;
    const key = fgRosterKey(normalized);
    const index = indexByKey.get(key);
    if (index === undefined) {
      indexByKey.set(key, merged.length);
      merged.push(normalized);
    } else {
      merged[index] = normalized;
    }
  };
  (localList || []).forEach(put);
  (remoteList || []).forEach(put);
  return merged;
}

function loadFgServerRoster() {
  try {
    const saved = JSON.parse(localStorage.getItem(fgRosterStorageKey) || "[]");
    return Array.isArray(saved) ? mergeFgRoster(saved, []) : [];
  } catch {
    return [];
  }
}

function saveFgServerRoster() {
  try {
    localStorage.setItem(fgRosterStorageKey, JSON.stringify(fgServerRoster));
  } catch {
    showToast("Não foi possível salvar o cadastro de servidores com Função Gratificada neste navegador.");
    return false;
  }
  syncCollectionWithRemovals("fgServidores", fgServerRoster, entry => entry.id);
  return true;
}

// Traz a lista de Função Gratificada da nuvem e sobe o que existir só aqui.
async function loadFgServerRosterFromFirestore() {
  if (!window.RH_SYNC || !window.RH_SYNC.enabled) return;
  try {
    const remote = await window.RH_SYNC.loadDocs("fgServidores");
    if (remote && remote.length > 0) {
      fgServerRoster = mergeFgRoster(fgServerRoster, remote);
      seedFirestoreSyncState("fgServidores", remote, entry => entry.id);
      saveFgServerRoster();
    } else if (fgServerRoster.length > 0) {
      saveFgServerRoster();
    }
  } catch (error) {
    const detail = error instanceof Error ? ` ${error.message}` : "";
    console.warn("Falha ao carregar o cadastro de Função Gratificada do Firestore:", error);
    showToast(`Cadastro de Função Gratificada carregado apenas deste navegador.${detail}`);
  }
  renderFgServerRoster();
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

// Tipos de solicitação de licença e como cada relatório os agrupa.
const licenseCycleMonths = {
  A: ["março", "abril", "maio"],
  B: ["junho", "julho", "agosto"],
  C: ["setembro", "outubro", "novembro"]
};

function normalizeTypeText(value) {
  return String(value || "").trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeRequestType(request) {
  return normalizeTypeText(request?.type);
}

function getRequestCycleLabel(request) {
  const cycle = String(request?.ciclo || "").trim().toUpperCase();
  if (licenseCycleMonths[cycle]) return cycle;
  const month = String(request?.month || "").trim().toLocaleLowerCase("pt-BR");
  return Object.keys(licenseCycleMonths).find(key => licenseCycleMonths[key].includes(month)) || "";
}

// Relatórios de licenças concedidas por ciclo (licença prêmio e capacitação).
function renderCycleLicenseReport({ type, bodyId, cycleSelectId, searchInputId, selectedCycle, onSelectedCycle, emptyMessage }) {
  const reportBody = document.getElementById(bodyId);
  const cycleSelect = document.getElementById(cycleSelectId);
  const nameSearch = document.getElementById(searchInputId);
  if (!reportBody || !cycleSelect || !nameSearch) return;

  const approvedRequests = requests
    .filter(request => request.status === "approved" && normalizeRequestType(request) === type)
    .sort((left, right) => String(left.person || "").localeCompare(String(right.person || ""), "pt-BR"));

  const availableCycles = new Set(approvedRequests.map(getRequestCycleLabel).filter(Boolean));
  cycleSelect.innerHTML = `<option value="">Todos os ciclos</option>${Object.keys(licenseCycleMonths).filter(cycle => availableCycles.has(cycle)).map(cycle => `<option value="${cycle}">Ciclo ${cycle} — ${licenseCycleMonths[cycle].join(", ")}</option>`).join("")}`;
  if (selectedCycle() && !availableCycles.has(selectedCycle())) onSelectedCycle("");
  cycleSelect.value = selectedCycle();

  const nameQuery = nameSearch.value.trim().toLocaleLowerCase("pt-BR");
  const filteredRequests = approvedRequests.filter(request => {
    const name = String(request.person || "Não identificado").toLocaleLowerCase("pt-BR");
    return name.includes(nameQuery) && (!selectedCycle() || getRequestCycleLabel(request) === selectedCycle());
  });

  reportBody.innerHTML = filteredRequests.length
    ? filteredRequests.map(request => {
      const cycle = String(request.ciclo || "").trim().toUpperCase();
      const months = licenseCycleMonths[cycle] || [String(request.month || "").trim().toLocaleLowerCase("pt-BR")].filter(Boolean);
      const monthLabels = months.length
        ? months.map(month => `${month.charAt(0).toLocaleUpperCase("pt-BR")}${month.slice(1)}`).join(", ")
        : "Não informado";
      const period = licenseCycleMonths[cycle] ? `Ciclo ${cycle}` : "Não informado";
      return `<tr><td>${escapeHtml(request.person || "Não identificado")}</td><td>${escapeHtml(monthLabels)}</td><td>${escapeHtml(request.unidade || request.unit || "Não informada")}</td><td>${escapeHtml(period)}</td></tr>`;
    }).join("")
    : `<tr><td class="detailed-report-empty" colspan="4">${escapeHtml(emptyMessage)}</td></tr>`;
}

function renderReportPremio() {
  renderCycleLicenseReport({
    type: "licenca premio",
    bodyId: "report-premio-body",
    cycleSelectId: "report-premio-month",
    searchInputId: "report-premio-name",
    selectedCycle: () => selectedPremioMonth,
    onSelectedCycle: value => { selectedPremioMonth = value; },
    emptyMessage: "Nenhuma licença prêmio concedida."
  });
}

function renderReportCapacitacao() {
  renderCycleLicenseReport({
    type: "licenca capacitacao",
    bodyId: "report-capacitacao-body",
    cycleSelectId: "report-capacitacao-month",
    searchInputId: "report-capacitacao-name",
    selectedCycle: () => selectedCapacitacaoMonth,
    onSelectedCycle: value => { selectedCapacitacaoMonth = value; },
    emptyMessage: "Nenhuma licença capacitação concedida."
  });
}

// Relatório de licença médica (mês de referência + período; sem ciclos).
function renderReportMedica() {
  const reportBody = document.getElementById("report-medica-body");
  const monthSelect = document.getElementById("report-medica-month");
  const nameSearch = document.getElementById("report-medica-name");
  if (!reportBody || !monthSelect || !nameSearch) return;

  const approvedRequests = requests
    .filter(request => request.status === "approved" && normalizeRequestType(request) === "licenca medica")
    .sort((left, right) => String(left.person || "").localeCompare(String(right.person || ""), "pt-BR"));

  const availableMonths = new Set(approvedRequests.map(getRequestMonthDisplay).filter(label => label && label !== "Não informado"));
  monthSelect.innerHTML = `<option value="">Todos os meses</option>${Array.from(availableMonths).sort((left, right) => left.localeCompare(right, "pt-BR")).map(month => `<option value="${escapeHtml(month)}">${escapeHtml(month)}</option>`).join("")}`;
  if (selectedMedicaMonth && !availableMonths.has(selectedMedicaMonth)) selectedMedicaMonth = "";
  monthSelect.value = selectedMedicaMonth;

  const nameQuery = nameSearch.value.trim().toLocaleLowerCase("pt-BR");
  const filteredRequests = approvedRequests.filter(request => {
    const name = String(request.person || "Não identificado").toLocaleLowerCase("pt-BR");
    return name.includes(nameQuery) && (!selectedMedicaMonth || getRequestMonthDisplay(request) === selectedMedicaMonth);
  });

  reportBody.innerHTML = filteredRequests.length
    ? filteredRequests.map(request => `<tr><td>${escapeHtml(request.person || "Não identificado")}</td><td>${escapeHtml(getRequestMonthDisplay(request))}</td><td>${escapeHtml(request.unidade || request.unit || "Não informada")}</td><td>${escapeHtml(getRequestPeriodDisplay(request))}</td></tr>`).join("")
    : `<tr><td class="detailed-report-empty" colspan="4">Nenhuma licença médica concedida.</td></tr>`;
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

const requestStatusLabels = { pending: "Pendentes", approved: "Aprovadas", rejected: "Recusadas" };
const requestStatusOrder = ["pending", "approved", "rejected"];

function getRequestTypeLabel(request) {
  const raw = String(request?.type || "Férias").trim() || "Férias";
  return raw.charAt(0).toLocaleUpperCase("pt-BR") + raw.slice(1);
}

function getRequestYearValue(request) {
  const start = String(request?.start || "");
  if (isIsoDate(start)) return start.slice(0, 4);
  const createdAt = String(request?.createdAt || "");
  if (isIsoDate(createdAt)) return createdAt.slice(0, 4);
  const explicit = String(request?.year || request?.ano || "").trim();
  return /^\d{4}$/.test(explicit) ? explicit : "";
}

function getRequestJustification(request) {
  if (request?.status === "rejected") return String(request.rejectionJustification || "").trim();
  if (request?.status === "approved") return String(request.approvalJustification || "").trim();
  return "";
}

// Categorias dos relatórios: férias, licenças (prêmio, capacitação, médica e afins)
// e "outros" (qualquer tipo especificado livremente pelo servidor).
const requestCategoryLabels = { ferias: "Férias", licencas: "Licenças", outros: "Outros" };
const requestCategoryOrder = ["ferias", "licencas", "outros"];

function getRequestCategory(requestOrType) {
  const type = typeof requestOrType === "string" ? normalizeTypeText(requestOrType) : normalizeRequestType(requestOrType);
  if (!type || type.startsWith("ferias")) return "ferias";
  if (type.startsWith("licenca")) return "licencas";
  return "outros";
}

function getRequestCategoryLabel(requestOrType) {
  return requestCategoryLabels[getRequestCategory(requestOrType)] || "Outros";
}

function renderReportRequests() {
  const body = document.getElementById("report-requests-body");
  const statusSelect = document.getElementById("report-requests-status");
  const categorySelect = document.getElementById("report-requests-category");
  const typeSelect = document.getElementById("report-requests-type");
  const yearSelect = document.getElementById("report-requests-year");
  const searchInput = document.getElementById("report-requests-search");
  const countElement = document.getElementById("report-requests-count");
  if (!body || !statusSelect || !typeSelect || !yearSelect) return;

  if (categorySelect) {
    categorySelect.value = requestCategoryOrder.includes(selectedReportRequestsCategory) ? selectedReportRequestsCategory : "";
    selectedReportRequestsCategory = categorySelect.value;
  }
  const categoryFilter = categorySelect ? categorySelect.value : "";

  // Filtro de tipos montado a partir das solicitações existentes e limitado à categoria escolhida.
  const typeLabels = new Map();
  requests.forEach(request => {
    const key = String(request?.type || "").trim().toLocaleLowerCase("pt-BR");
    if (key && !typeLabels.has(key)) typeLabels.set(key, getRequestTypeLabel(request));
  });
  const sortedTypes = Array.from(typeLabels.entries())
    .filter(([key]) => !categoryFilter || getRequestCategory(key) === categoryFilter)
    .sort((left, right) => left[1].localeCompare(right[1], "pt-BR"));
  const availableTypeKeys = new Set(sortedTypes.map(([key]) => key));
  if (!availableTypeKeys.has(selectedReportRequestsType)) selectedReportRequestsType = "";
  typeSelect.innerHTML = `<option value="">Todos os tipos</option>${sortedTypes.map(([key, label]) => `<option value="${escapeHtml(key)}">${escapeHtml(label)}</option>`).join("")}`;
  typeSelect.value = selectedReportRequestsType;
  selectedReportRequestsType = typeSelect.value;

  // Filtro de anos montado a partir das solicitações existentes.
  const years = new Set();
  requests.forEach(request => {
    const year = getRequestYearValue(request);
    if (year) years.add(year);
  });
  if (!years.has(selectedReportRequestsYear)) selectedReportRequestsYear = "";
  yearSelect.innerHTML = `<option value="">Todos os anos</option>${Array.from(years).sort((left, right) => right.localeCompare(left)).map(year => `<option value="${escapeHtml(year)}">${escapeHtml(year)}</option>`).join("")}`;
  yearSelect.value = selectedReportRequestsYear;
  selectedReportRequestsYear = yearSelect.value;

  statusSelect.value = selectedReportRequestsStatus;
  selectedReportRequestsStatus = statusSelect.value;
  const statusFilter = statusSelect.value || "";
  const typeFilter = typeSelect.value;
  const yearFilter = yearSelect.value;
  const searchTerm = searchInput ? searchInput.value.trim().toLocaleLowerCase("pt-BR") : "";
  const filtered = requests.filter(request => {
    if (statusFilter && String(request.status || "") !== statusFilter) return false;
    if (categoryFilter && getRequestCategory(request) !== categoryFilter) return false;
    if (typeFilter && String(request.type || "").trim().toLocaleLowerCase("pt-BR") !== typeFilter) return false;
    if (yearFilter && getRequestYearValue(request) !== yearFilter) return false;
    if (searchTerm && !String(request.person || "Não identificado").toLocaleLowerCase("pt-BR").includes(searchTerm)) return false;
    return true;
  });

  if (countElement) countElement.textContent = `${filtered.length} ${filtered.length === 1 ? "solicitação" : "solicitações"}`;

  if (!filtered.length) {
    body.innerHTML = `<tr><td class="detailed-report-empty" colspan="7">Nenhuma solicitação encontrada com esses filtros.</td></tr>`;
    return;
  }

  const groupedStatuses = requestStatusOrder.filter(status => filtered.some(request => String(request.status || "") === status));
  filtered.forEach(request => {
    const status = String(request.status || "pending");
    if (!groupedStatuses.includes(status)) groupedStatuses.push(status);
  });

  const renderRow = request => {
    const period = getRequestPeriodDisplay(request);
    const displayPeriod = period && period !== "Não informado" ? period : getRequestMonthCycleDisplay(request);
    const justification = getRequestJustification(request) || "—";
    return `<tr><td>${escapeHtml(request.person || "Não identificado")}</td><td>${escapeHtml(formatCpfLabel(request.cpf))}</td><td>${escapeHtml(getRequestCategoryLabel(request))}</td><td>${escapeHtml(getRequestTypeLabel(request))}</td><td>${escapeHtml(request.unidade || request.unit || "Não informada")}</td><td>${escapeHtml(displayPeriod)}</td><td>${escapeHtml(justification)}</td></tr>`;
  };

  body.innerHTML = groupedStatuses
    .filter(status => !statusFilter || status === statusFilter)
    .map(status => {
      const items = filtered
        .filter(request => String(request.status || "") === status)
        .sort((left, right) => String(left.person || "").localeCompare(String(right.person || ""), "pt-BR") || String(left.start || left.month || "").localeCompare(String(right.start || right.month || "")));
      if (!items.length) return "";
      return `<tr class="report-requests-group"><th scope="colgroup" colspan="7">${escapeHtml(requestStatusLabels[status] || status)} (${items.length})</th></tr>${items.map(renderRow).join("")}`;
    })
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
  renderTeam("full-team", getTeamMembers().length);
  renderCurrentMonthVacations();
  renderServerPersonalData();
  renderReportYear();
  renderReportUnit();
  renderReportPerson();
  renderReportRequests();
  renderReportFg();
  renderUsuarios();
  renderUnidades();
  renderCargos();
  renderQuadros();
  renderVacationTodayStat();
  updateCounts();
  updateSelectedDay();
  refreshIcons();
}

// Re-renderiza somente o que depende de `requests` (usado quando o Firestore
// avisa de mudanças), evitando refazer cadastros, equipe e relatórios pesados.
function renderRequestsDependentViews() {
  renderCalendar("overview-calendar", true);
  renderCalendar("full-calendar", false);
  renderRequests("overview-requests", true);
  renderRequests("full-requests", false);
  renderMeta4();
  renderFgProtocols();
  renderCurrentMonthVacations();
  renderReportYear();
  renderReportUnit();
  renderReportPerson();
  renderReportRequests();
  renderReportPremio();
  renderReportCapacitacao();
  renderReportMedica();
  renderReportFg();
  renderVacationTodayStat();
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
    const statusActions = request.status === "pending"
      ? `<button class="action-icon approve" data-request-action="approve" data-request-id="${escapeHtml(request.id)}" aria-label="Aprovar ${escapeHtml(request.person)}" title="Aprovar"><i data-lucide="check"></i></button><button class="action-icon reject" data-request-action="reject" data-request-id="${escapeHtml(request.id)}" aria-label="Recusar ${escapeHtml(request.person)}" title="Recusar"><i data-lucide="x"></i></button>`
      : "";
    if (compact) {
      const summary = formatRequestPeriod(request);
      const actions = `<div class="request-actions">${statusActions}</div>`;
      return `<article class="request-item">${avatar(request.initials, request.color, "request-person-avatar")}<div class="request-copy"><strong>${escapeHtml(request.person)}</strong><span>${escapeHtml(summary)}</span>${request.note ? `<small>“${escapeHtml(request.note)}”</small>` : ""}</div>${actions}</article>`;
    }
    const unit = String(request.unidade || request.unit || "Não informada");
    const monthLabel = hasRequestCycle(request) ? "Mês - Ciclo" : "Mês";
    const monthValue = hasRequestCycle(request) ? getRequestMonthCycleDisplay(request) : getRequestMonthDisplay(request);
    const period = getRequestPeriodDisplay(request);
    const details = `<span class="request-details"><span><strong>Unidade:</strong> ${escapeHtml(unit)}</span><span><strong>${monthLabel}:</strong> ${escapeHtml(monthValue)}</span>${period ? `<span><strong>Período:</strong> ${escapeHtml(period)}</span>` : ""}</span>`;
    const manageActions = `<button class="action-icon approve" type="button" data-request-edit="${escapeHtml(request.id)}" aria-label="Editar solicitação de ${escapeHtml(request.person)}" title="Editar"><i data-lucide="pencil"></i></button><button class="action-icon reject" type="button" data-request-remove="${escapeHtml(request.id)}" aria-label="Excluir solicitação de ${escapeHtml(request.person)}" title="Excluir"><i data-lucide="trash-2"></i></button>`;
    const actions = `<div class="request-actions">${statusActions}${manageActions}</div>`;
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
  const approvalSection = document.getElementById("request-approval-section");
  const approvalForm = document.getElementById("request-approval-form");
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
    ["Justificativa da recusa", request.rejectionJustification],
    ["Justificativa da concessão", request.approvalJustification]
  ].filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "");

  rejectionForm.reset();
  rejectionSection.hidden = true;
  approvalForm.reset();
  approvalSection.hidden = true;
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
      showToast("O arquivo anexado não está disponível.");
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
  if (attachmentFile && attachmentFile.size > attachmentCloudLimit) {
    showToast(`O arquivo tem ${formatFileSize(attachmentFile.size)} e não cabe na nuvem (máximo ${formatFileSize(attachmentCloudLimit)}). Escolha um arquivo menor.`);
    return;
  }
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

async function approveRequestWithDetails(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const requestId = String(formData.get("requestId") || "");
  const justification = String(formData.get("justification") || "").trim();
  const request = requests.find(item => item.id === requestId);
  if (!request || request.status !== "pending") {
    showToast("Esta solicitação não está mais pendente.");
    return;
  }
  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) submitButton.disabled = true;
  const previousStatus = request.status;
  const previousJustification = request.approvalJustification;
  request.status = "approved";
  request.approvalJustification = justification || null;
  if (!saveRequests()) {
    request.status = previousStatus;
    request.approvalJustification = previousJustification;
    if (submitButton) submitButton.disabled = false;
    return;
  }
  document.getElementById("request-details-dialog").close();
  renderAll();
  showToast(`Solicitação de ${request.person} concedida.`);
}

function renderTeam(elementId, limit) {
  const container = document.getElementById(elementId);
  if (!container) return;
  const members = getTeamMembers();
  const query = (elementId === "full-team" ? document.getElementById("team-search")?.value : "")?.trim().toLocaleLowerCase("pt-BR") || "";
  const filteredPeople = members.filter(person => `${person.name} ${person.role}`.toLocaleLowerCase("pt-BR").includes(query)).slice(0, limit);
  if (elementId === "full-team") {
    const totalLabel = document.querySelector(".team-total");
    if (totalLabel) totalLabel.textContent = `${members.length} ${members.length === 1 ? "pessoa" : "pessoas"}`;
  }
  if (filteredPeople.length === 0) {
    const message = members.length === 0 ? "Nenhum servidor cadastrado." : "Nenhum resultado para a busca.";
    container.innerHTML = `<tr><td colspan="5" class="team-empty">${message}</td></tr>`;
    return;
  }
  container.innerHTML = filteredPeople.map(person => {
    const nextRequest = requests.find(request => request.person === person.name && request.status === "approved");
    const upcoming = nextRequest
      ? (getMonthLabel(nextRequest) || formatRange(nextRequest.start, nextRequest.end))
      : person.next;
    const today = dateKey(new Date());
    const status = nextRequest && (!nextRequest.month ? nextRequest.start <= today && nextRequest.end >= today : true) ? "Férias" : person.status;
    const hasBalance = typeof person.balance === "number";
    const width = hasBalance ? `${Math.min(100, Math.round(person.balance / 30 * 100))}%` : "0%";
    const balanceLabel = hasBalance ? `${person.balance} dias` : "—";
    return `<tr><td><div class="person-cell">${avatar(person.initials, person.color)}<span><strong>${escapeHtml(person.name)}</strong><small>${escapeHtml(person.role)}</small></span></div></td><td>${escapeHtml(person.role)}</td><td><div class="balance-cell"><span>${balanceLabel}</span><span class="balance-track"><i style="width:${width}"></i></span></div></td><td>${escapeHtml(upcoming)}</td><td><span class="status-pill ${status === "Férias" ? "status-away" : "status-approved"}">${status}</span></td></tr>`;
  }).join("");
}
// Atualiza o card "Pessoas de férias" do painel (hoje) com dados reais.
function renderVacationTodayStat() {
  const countEl = document.getElementById("vacation-today-count");
  if (!countEl) return;
  const today = dateKey(new Date());
  const onLeave = requests.filter(request => {
    if (request.status === "rejected" || request.month) return false;
    const start = String(request.start || "");
    const end = String(request.end || "");
    return /^\d{4}-\d{2}-\d{2}$/.test(start) && /^\d{4}-\d{2}-\d{2}$/.test(end) && start <= today && end >= today;
  });
  const seen = new Set();
  const away = [];
  onLeave.forEach(request => {
    const key = request.person || request.initials || request.id;
    if (!key || seen.has(key)) return;
    seen.add(key);
    away.push({ name: request.person || "Servidor", initials: request.initials || "", color: request.color || "" });
  });
  countEl.textContent = String(away.length);
  const totalEl = document.getElementById("vacation-today-total");
  if (totalEl) {
    const total = serverPersonalData.length;
    totalEl.textContent = `de ${total} ${total === 1 ? "servidor" : "servidores"}`;
  }
  const avatarsEl = document.getElementById("vacation-today-avatars");
  if (avatarsEl) avatarsEl.innerHTML = away.slice(0, 3).map(person => avatar(person.initials, person.color)).join("");
  const namesEl = document.getElementById("vacation-today-names");
  if (namesEl) {
    if (away.length === 0) namesEl.textContent = "Ninguém de férias hoje";
    else if (away.length === 1) namesEl.textContent = `${away[0].name} está fora`;
    else namesEl.textContent = `${away[0].name} e ${away[1].name} estão fora`;
  }
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
  const titles = { overview: ["Visão geral", "", ""], calendar: ["Calendário", "Calendário da equipe", "Planeje as férias sem perder de vista a cobertura do time."], team: ["Equipe", "Sua equipe", "Saldo, disponibilidade e próximos períodos de descanso."], requests: ["Solicitações", "Solicitações", "Revise os pedidos e ajude o time a planejar com tranquilidade."],   "server-data": ["Servidores", "Cadastro de Dados dos Servidores", "Cadastre e consulte os dados funcionais dos servidores."], "cadastro-unidades": ["Unidades", "Cadastro de Unidades", "Cadastre as unidades penais usadas no sistema."], "cadastro-cargos": ["Cargos", "Cadastro de Cargos", "Cadastre os cargos usados no sistema."], "cadastro-quadros": ["Quadros", "Cadastro de Quadros", "Cadastre os quadros usados pelos cargos."], "vacation-launch": ["Solicitações", "Lançar férias", "Registre períodos de férias diretamente para os servidores."], "server-fg": ["Servidores", "Cadastro de Servidores com Função Gratificada", "Cadastre os servidores que possuem Função Gratificada."], reports: ["Relatórios", "Relatório de Férias Por mês", "Consulte os relatórios de férias."], "report-year": ["Relatório por ano", "Relatório por ano", "Consulte os servidores com férias aprovadas no ano escolhido."], "report-unit": ["Relatório por unidade", "Relatório por unidade", "Consulte as férias aprovadas agrupadas por unidade."], "report-person": ["Relatório por servidor", "Relatório por servidor", "Consulte as férias aprovadas de cada servidor."], "report-servers": ["Relatórios", "Relatório de servidores", "Consulte os dados funcionais dos servidores cadastrados."], "report-requests": ["Solicitações", "Relatório de solicitações", "Consulte todas as solicitações agrupadas por situação."], "report-capacitacao": ["Licença-capacitação", "Relatório de licença-capacitação", "Consulte as solicitações de licença-capacitação aprovadas."], "report-premio": ["Licença prêmio", "Relatório de licença prêmio", "Consulte as solicitações de licença prêmio aprovadas."], "report-medica": ["Licença médica", "Relatório de licença médica", "Consulte as solicitações de licença médica aprovadas."], usuarios: ["Gestão", "Usuários & Acessos", "Gerencie quem acessa o sistema com o Google e o perfil de cada um."] };
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
  if (view === "server-data") renderServerPersonalData();
  if (view === "server-fg") renderFgServerRoster();
  if (view === "cadastro-unidades") renderUnidades();
  if (view === "cadastro-cargos") renderCargos();
  if (view === "cadastro-quadros") renderQuadros();
  if (view === "vacation-launch") renderVacationLaunch();
  if (view === "report-year") renderReportYear();
  if (view === "report-unit") renderReportUnit();
  if (view === "report-person") renderReportPerson();
  if (view === "report-requests") renderReportRequests();
  if (view === "report-servers") renderServerDirectoryReport();
  if (view === "report-premio") renderReportPremio();
  if (view === "report-capacitacao") renderReportCapacitacao();
  if (view === "report-medica") renderReportMedica();
  if (view === "usuarios") {
    // Relê a coleção ao abrir a seção para mostrar acessos pendentes novos.
    if (window.RH_SYNC && window.RH_SYNC.enabled) loadUsuariosFromFirestore();
    else renderUsuarios();
  }
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
// Agrupa várias chamadas no mesmo fluxo em uma única atualização de ícones.
let iconsRefreshScheduled = false;
function refreshIcons() {
  if (iconsRefreshScheduled) return;
  iconsRefreshScheduled = true;
  const run = () => {
    iconsRefreshScheduled = false;
    if (window.lucide) window.lucide.createIcons();
  };
  if (typeof window.requestAnimationFrame === "function") window.requestAnimationFrame(run);
  else window.setTimeout(run, 0);
}

function debounce(fn, wait = 150) {
  let timer = null;
  return function debounced(...args) {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn.apply(this, args), wait);
  };
}
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
// Registra um listener apenas quando o elemento existe no documento.
// Isso mantem o app.js utilizavel em paginas que nao possuem todas as secoes
// (por exemplo recusada.html, que traz um subconjunto das telas).
function on(elementId, eventName, handler) {
  const element = document.getElementById(elementId);
  if (element) element.addEventListener(eventName, handler);
}

on("meta4-month-filter", "change", renderMeta4);
on("meta4-year-filter", "change", renderMeta4);
on("meta4-launch-filter", "change", renderMeta4);
on("protocols-fg-month-filter", "change", renderFgProtocols);
on("protocols-fg-year-filter", "change", renderFgProtocols);
on("protocols-fg-status-filter", "change", renderFgProtocols);
on("meta4-search", "input", debounce(renderMeta4));
on("protocols-fg-search", "input", debounce(renderFgProtocols));
on("protocols-fg-body", "change", event => {
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
on("meta4-body", "change", event => {
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
on("open-password-change", "click", () => {
  accountPasswordForm.reset();
  accountPasswordMessage.textContent = "";
  accountPasswordMessage.classList.remove("error");
  accountPasswordDialog.showModal();
});
on("account-password-cancel", "click", () => accountPasswordDialog.close());
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
on("task-entry-form", "submit", addTask);
on("task-list", "change", event => {
  const checkbox = event.target.closest("[data-task-toggle]");
  if (checkbox) updateTask(checkbox.dataset.taskToggle, checkbox.checked);
});
on("task-list", "click", event => {
  const removeButton = event.target.closest("[data-task-remove]");
  if (removeButton) removeTask(removeButton.dataset.taskRemove);
});
on("task-calendar-prev", "click", () => shiftTaskCalendar(-1));
on("task-calendar-next", "click", () => shiftTaskCalendar(1));
on("task-calendar", "click", event => {
  const day = event.target.closest("[data-task-calendar-date]");
  if (!day) return;
  selectedTaskDate = selectedTaskDate === day.dataset.taskCalendarDate ? null : day.dataset.taskCalendarDate;
  renderTasks();
});
on("task-calendar", "keydown", event => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const day = event.target.closest("[data-task-calendar-date]");
  if (!day) return;
  event.preventDefault();
  selectedTaskDate = selectedTaskDate === day.dataset.taskCalendarDate ? null : day.dataset.taskCalendarDate;
  renderTasks();
});
on("task-clear-selected-date", "click", () => {
  selectedTaskDate = null;
  renderTasks();
});
on("task-calendar-today", "click", () => {
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
on("server-fg-form", "submit", addFgServerFromForm);
on("vacation-launch-form", "submit", addVacationLaunch);
on("vacation-launch-server-search", "input", debounce(renderVacationSuggestions));
on("vacation-launch-suggestions", "mousedown", event => {
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
on("vacation-launch-fg", "change", syncVacationLaunchFg);
on("vacation-launch-server-search", "blur", () => {
  document.getElementById("vacation-launch-suggestions").hidden = true;
});
on("vacation-launch-server-search", "keydown", event => {
  if (event.key === "Escape") document.getElementById("vacation-launch-suggestions").hidden = true;
});
on("request-rejection-form", "submit", rejectRequestWithDetails);
on("request-approval-form", "submit", approveRequestWithDetails);
on("request-rejection-reason", "input", event => {
  event.currentTarget.setCustomValidity("");
});
on("server-fg-body", "click", event => {
  const removeButton = event.target.closest("[data-remove-fg-server]");
  if (removeButton) removeFgServer(removeButton.dataset.removeFgServer);
});
on("server-data-search", "input", debounce(renderServerPersonalData));
on("server-data-export-csv", "click", () => {
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
on("server-data-export-pdf", "click", () => {
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
  const registered = cargos.find(item => item.name === cargo && item.quadro);
  if (registered) return registered.quadro;
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
    const action = actionButton.dataset.requestAction;
    if (action === "reject" || action === "approve") {
      if (!document.getElementById("request-details-dialog").open) openRequestDetails(request.id);
      const isReject = action === "reject";
      document.getElementById("request-rejection-section").hidden = !isReject;
      document.getElementById("request-approval-section").hidden = isReject;
      document.getElementById("request-details-actions").hidden = true;
      const formId = isReject ? "request-rejection-form" : "request-approval-form";
      const fieldId = isReject ? "request-rejection-reason" : "request-approval-reason";
      document.getElementById(formId).querySelector('[name="requestId"]').value = request.id;
      if (isReject) document.getElementById("request-rejection-reason").setCustomValidity("");
      document.getElementById(fieldId).focus();
      return;
    }
    if (action === "cancel-reject" || action === "cancel-approve") {
      const isReject = action === "cancel-reject";
      document.getElementById(isReject ? "request-rejection-form" : "request-approval-form").reset();
      document.getElementById(isReject ? "request-rejection-section" : "request-approval-section").hidden = true;
      document.getElementById("request-details-actions").hidden = false;
      return;
    }
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
    deleteReferenceDocFromFirestore("servidores", recordId);
  }
});
serverDataCancelEdit.addEventListener("click", resetServerDataEdit);
on("usuario-add", "click", () => openUsuarioDialog(null));
on("usuario-cancel", "click", () => document.getElementById("usuario-dialog").close());
on("usuarios-search", "input", debounce(renderUsuarios));
on("usuarios-body", "change", event => {
  const perfilSelect = event.target.closest("[data-usuario-perfil]");
  if (!perfilSelect) return;
  const user = usuarios.find(item => item.id === perfilSelect.dataset.usuarioPerfil);
  if (!user) {
    renderUsuarios();
    return;
  }
  const previousPerfil = user.perfil;
  user.perfil = perfilSelect.value === "admin" ? "admin" : "usuario";
  saveUsuarios();
  renderUsuarios();
  showToast(`Perfil de ${user.name} atualizado para ${user.perfil === "admin" ? "Administrador" : "Usuário"}.`);
});
on("usuarios-body", "click", event => {
  const approveButton = event.target.closest("[data-approve-usuario]");
  const denyButton = event.target.closest("[data-deny-usuario]");
  const editButton = event.target.closest("[data-edit-usuario]");
  const removeButton = event.target.closest("[data-remove-usuario]");
  if (approveButton) {
    const user = usuarios.find(item => item.id === approveButton.dataset.approveUsuario);
    if (!user) return;
    user.ativo = true;
    user.pendente = false;
    saveUsuarios();
    renderUsuarios();
    showToast(`Acesso de ${user.name} liberado.`);
    return;
  }
  if (denyButton) {
    const user = usuarios.find(item => item.id === denyButton.dataset.denyUsuario);
    if (!user) return;
    if (!window.confirm(`Negar o acesso de ${user.name} (${user.email})?`)) return;
    user.ativo = false;
    user.pendente = false;
    saveUsuarios();
    renderUsuarios();
    showToast("Acesso negado. O usuário permanece bloqueado.");
    return;
  }
  if (editButton) {
    const user = usuarios.find(item => item.id === editButton.dataset.editUsuario);
    if (user) openUsuarioDialog(user);
    return;
  }
  if (!removeButton) return;
  const userId = removeButton.dataset.removeUsuario;
  const user = usuarios.find(item => item.id === userId);
  if (!user) return;
  if (!window.confirm(`Remover o acesso de ${user.name} (${user.email})?`)) return;
  usuarios = usuarios.filter(item => item.id !== userId);
  saveUsuarios();
  deleteReferenceDocFromFirestore("usuarios", userId);
  renderUsuarios();
  showToast("Usuário removido.");
});
on("usuario-form", "submit", event => {
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
  const currentDate = dateKey(new Date());
  const previousId = editingUsuarioId;
  if (editingUsuarioId) {
    usuarios = usuarios.map(user => user.id === editingUsuarioId
      ? Object.assign({}, user, { id: email, name, email, perfil, ativo, pendente: false, criadoEm: user.criadoEm || currentDate })
      : user);
  } else {
    usuarios.push({ id: email, name, email, perfil, ativo, pendente: false, criadoEm: currentDate });
  }
  saveUsuarios();
  // Trocar o e-mail muda o id do documento: remove o registro antigo na nuvem.
  if (previousId && previousId !== email) deleteReferenceDocFromFirestore("usuarios", previousId);
  form.closest("dialog").close();
  renderUsuarios();
  showToast(editingUsuarioId ? "Usuário atualizado." : "Usuário adicionado.");
});
on("unidade-add", "click", () => openUnidadeDialog(null));
on("unidade-cancel", "click", () => document.getElementById("unidade-dialog").close());
on("unidades-search", "input", debounce(renderUnidades));
on("unidades-body", "click", event => {
  const editButton = event.target.closest("[data-edit-unidade]");
  const removeButton = event.target.closest("[data-remove-unidade]");
  if (editButton) {
    const unidade = unidades.find(item => item.id === editButton.dataset.editUnidade);
    if (unidade) openUnidadeDialog(unidade);
    return;
  }
  if (!removeButton) return;
  const unidadeId = removeButton.dataset.removeUnidade;
  const unidade = unidades.find(item => item.id === unidadeId);
  if (!unidade) return;
  const usedCount = serverPersonalData.filter(record => String(record.unidadePenal || "") === unidade.name).length;
  if (usedCount > 0) {
    showToast(`Não é possível excluir: a unidade está em uso por ${usedCount} servidor${usedCount === 1 ? "" : "es"} cadastrado${usedCount === 1 ? "" : "s"}.`);
    return;
  }
  if (!window.confirm(`Remover a unidade "${unidade.name}"?`)) return;
  unidades = unidades.filter(item => item.id !== unidadeId);
  saveUnidades();
  deleteReferenceDocFromFirestore("unidades", unidadeId);
  renderUnidades();
  showToast("Unidade removida.");
});
on("unidade-form", "submit", event => {
  event.preventDefault();
  const form = event.currentTarget;
  const name = String(form.elements.nome.value).trim();
  if (!name) {
    setUnidadeMessage("Informe o nome da unidade.", true);
    return;
  }
  if (unidades.some(item => item.id !== editingUnidadeId && item.name.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"))) {
    setUnidadeMessage("Já existe uma unidade cadastrada com esse nome.", true);
    return;
  }
  if (editingUnidadeId) {
    const previousName = (unidades.find(item => item.id === editingUnidadeId) || {}).name;
    unidades = unidades.map(item => item.id === editingUnidadeId ? Object.assign({}, item, { name }) : item);
    if (previousName && previousName !== name) {
      const previousRecords = serverPersonalData.map(record => ({ ...record }));
      serverPersonalData = serverPersonalData.map(record => String(record.unidadePenal || "") === previousName
        ? Object.assign({}, record, { unidadePenal: name })
        : record);
      if (!saveServerPersonalData()) serverPersonalData = previousRecords;
    }
  } else {
    unidades.push({ id: crypto.randomUUID(), name });
  }
  saveUnidades();
  form.closest("dialog").close();
  renderUnidades();
  showToast(editingUnidadeId ? "Unidade atualizada." : "Unidade adicionada.");
});
on("cargo-add", "click", () => openCargoDialog(null));
on("cargo-cancel", "click", () => document.getElementById("cargo-dialog").close());
on("cargos-search", "input", debounce(renderCargos));
on("cargos-body", "click", event => {
  const editButton = event.target.closest("[data-edit-cargo]");
  const removeButton = event.target.closest("[data-remove-cargo]");
  if (editButton) {
    const cargo = cargos.find(item => item.id === editButton.dataset.editCargo);
    if (cargo) openCargoDialog(cargo);
    return;
  }
  if (!removeButton) return;
  const cargoId = removeButton.dataset.removeCargo;
  const cargo = cargos.find(item => item.id === cargoId);
  if (!cargo) return;
  const usedCount = serverPersonalData.filter(record => String(record.cargo || "") === cargo.name).length;
  if (usedCount > 0) {
    showToast(`Não é possível excluir: o cargo está em uso por ${usedCount} servidor${usedCount === 1 ? "" : "es"} cadastrado${usedCount === 1 ? "" : "s"}.`);
    return;
  }
  if (!window.confirm(`Remover o cargo "${cargo.name}"?`)) return;
  cargos = cargos.filter(item => item.id !== cargoId);
  saveCargos();
  deleteReferenceDocFromFirestore("cargos", cargoId);
  renderCargos();
  showToast("Cargo removido.");
});
on("cargo-form", "submit", event => {
  event.preventDefault();
  const form = event.currentTarget;
  const name = String(form.elements.nome.value).trim();
  const quadroValue = String(form.elements.quadro.value || "").trim();
  const quadro = quadros.some(item => item.name === quadroValue) ? quadroValue : "";
  const observacoes = String(form.elements.observacoes.value).trim();
  if (!name) {
    setCargoMessage("Informe o nome do cargo.", true);
    return;
  }
  if (cargos.some(item => item.id !== editingCargoId && item.name.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"))) {
    setCargoMessage("Já existe um cargo cadastrado com esse nome.", true);
    return;
  }
  if (editingCargoId) {
    const previousName = (cargos.find(item => item.id === editingCargoId) || {}).name;
    cargos = cargos.map(item => item.id === editingCargoId ? Object.assign({}, item, { name, quadro, observacoes }) : item);
    if (previousName && previousName !== name) {
      const previousRecords = serverPersonalData.map(record => ({ ...record }));
      serverPersonalData = serverPersonalData.map(record => String(record.cargo || "") === previousName
        ? Object.assign({}, record, { cargo: name })
        : record);
      if (!saveServerPersonalData()) serverPersonalData = previousRecords;
    }
  } else {
    cargos.push({ id: crypto.randomUUID(), name, quadro, observacoes });
  }
  saveCargos();
  form.closest("dialog").close();
  renderCargos();
  showToast(editingCargoId ? "Cargo atualizado." : "Cargo adicionado.");
});
document.addEventListener("click", event => {
  const unidadeMoveButton = event.target.closest("[data-move-unidade]");
  if (unidadeMoveButton && !unidadeMoveButton.disabled) {
    const reordered = moveReferenceItem(unidades, unidadeMoveButton.dataset.moveUnidade, Number(unidadeMoveButton.dataset.direction), "unidades-search", "name");
    if (reordered) {
      unidades = reordered;
      saveUnidades();
      renderUnidades();
    }
    return;
  }
  const cargoMoveButton = event.target.closest("[data-move-cargo]");
  if (cargoMoveButton && !cargoMoveButton.disabled) {
    const reordered = moveReferenceItem(cargos, cargoMoveButton.dataset.moveCargo, Number(cargoMoveButton.dataset.direction), "cargos-search", "name");
    if (reordered) {
      cargos = reordered;
      saveCargos();
      renderCargos();
    }
  }
  const quadroMoveButton = event.target.closest("[data-move-quadro]");
  if (quadroMoveButton && !quadroMoveButton.disabled) {
    const reordered = moveReferenceItem(quadros, quadroMoveButton.dataset.moveQuadro, Number(quadroMoveButton.dataset.direction), "quadros-search", "name");
    if (reordered) {
      quadros = reordered;
      saveQuadros();
      renderQuadros();
    }
  }
});
on("unidade-import", "click", () => openReferenceImportDialog("unidade"));
on("unidade-import-cancel", "click", () => document.getElementById("unidade-import-dialog").close());
on("unidade-import-form", "submit", event => {
  event.preventDefault();
  const form = event.currentTarget;
  const raw = String(form.elements.lista.value || "");
  const seen = new Set();
  const names = [];
  for (const line of raw.split(/\r?\n/)) {
    const name = line.trim();
    if (!name) continue;
    const key = name.toLocaleLowerCase("pt-BR");
    if (seen.has(key)) continue;
    seen.add(key);
    if (unidades.some(item => item.name.toLocaleLowerCase("pt-BR") === key)) continue;
    names.push(name);
  }
  if (names.length === 0) {
    setReferenceImportMessage("unidade", "Nenhuma unidade nova na lista (linhas vazias, repetidas ou já cadastradas foram ignoradas).", true);
    return;
  }
  names.forEach(name => unidades.push({ id: crypto.randomUUID(), name }));
  saveUnidades();
  form.closest("dialog").close();
  renderUnidades();
  showToast(`${names.length} unidade${names.length === 1 ? "" : "s"} importada${names.length === 1 ? "" : "s"}.`);
});
on("cargo-import", "click", () => openReferenceImportDialog("cargo"));
on("cargo-import-cancel", "click", () => document.getElementById("cargo-import-dialog").close());
on("cargo-import-form", "submit", event => {
  event.preventDefault();
  const form = event.currentTarget;
  const raw = String(form.elements.lista.value || "");
  const seen = new Set();
  const newCargos = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^([^;]+?)(?:;\s*(.+))?$/);
    const name = (match ? match[1] : trimmed).trim();
    const quadroRaw = match && match[2] ? match[2].trim() : "";
    const key = name.toLocaleLowerCase("pt-BR");
    if (!name || seen.has(key)) continue;
    seen.add(key);
    if (cargos.some(item => item.name.toLocaleLowerCase("pt-BR") === key)) continue;
    const quadro = quadros.some(item => item.name.toLocaleLowerCase("pt-BR") === quadroRaw.toLocaleLowerCase("pt-BR")) ? quadroRaw : "";
    newCargos.push({ id: crypto.randomUUID(), name, quadro, observacoes: "" });
  }
  if (newCargos.length === 0) {
    setReferenceImportMessage("cargo", "Nenhum cargo novo na lista (linhas vazias, repetidas ou já cadastrados foram ignorados).", true);
    return;
  }
  newCargos.forEach(cargo => cargos.push(cargo));
  saveCargos();
  form.closest("dialog").close();
  renderCargos();
  showToast(`${newCargos.length} cargo${newCargos.length === 1 ? "" : "s"} importado${newCargos.length === 1 ? "" : "s"}.`);
});
on("quadro-add", "click", () => openQuadroDialog(null));
on("quadro-cancel", "click", () => document.getElementById("quadro-dialog").close());
on("quadros-search", "input", debounce(renderQuadros));
on("quadros-body", "click", event => {
  const editButton = event.target.closest("[data-edit-quadro]");
  const removeButton = event.target.closest("[data-remove-quadro]");
  if (editButton) {
    const quadro = quadros.find(item => item.id === editButton.dataset.editQuadro);
    if (quadro) openQuadroDialog(quadro);
    return;
  }
  if (!removeButton) return;
  const quadroId = removeButton.dataset.removeQuadro;
  const quadro = quadros.find(item => item.id === quadroId);
  if (!quadro) return;
  const usedByCargos = cargos.filter(cargo => cargo.quadro === quadro.name).length;
  if (usedByCargos > 0) {
    showToast(`Não é possível excluir: o quadro está em uso por ${usedByCargos} cargo${usedByCargos === 1 ? "" : "s"}.`);
    return;
  }
  if (!window.confirm(`Remover o quadro "${quadro.name}"?`)) return;
  quadros = quadros.filter(item => item.id !== quadroId);
  saveQuadros();
  deleteReferenceDocFromFirestore("quadros", quadroId);
  renderQuadros();
  showToast("Quadro removido.");
});
on("quadro-form", "submit", event => {
  event.preventDefault();
  const form = event.currentTarget;
  const name = String(form.elements.nome.value).trim();
  const observacoes = String(form.elements.observacoes.value).trim();
  if (!name) {
    setQuadroMessage("Informe o nome do quadro.", true);
    return;
  }
  if (quadros.some(item => item.id !== editingQuadroId && item.name.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"))) {
    setQuadroMessage("Já existe um quadro cadastrado com esse nome.", true);
    return;
  }
  if (editingQuadroId) {
    const previousName = (quadros.find(item => item.id === editingQuadroId) || {}).name;
    quadros = quadros.map(item => item.id === editingQuadroId ? Object.assign({}, item, { name, observacoes }) : item);
    if (previousName && previousName !== name) {
      cargos = cargos.map(cargo => cargo.quadro === previousName ? Object.assign({}, cargo, { quadro: name }) : cargo);
      saveCargos();
      const previousRecords = serverPersonalData.map(record => ({ ...record }));
      serverPersonalData = serverPersonalData.map(record => String(record.quadro || "") === previousName ? Object.assign({}, record, { quadro: name }) : record);
      if (!saveServerPersonalData()) serverPersonalData = previousRecords;
    }
  } else {
    quadros.push({ id: crypto.randomUUID(), name, observacoes });
  }
  saveQuadros();
  form.closest("dialog").close();
  renderQuadros();
  showToast(editingQuadroId ? "Quadro atualizado." : "Quadro adicionado.");
});
on("quadro-import", "click", () => openReferenceImportDialog("quadro"));
on("quadro-import-cancel", "click", () => document.getElementById("quadro-import-dialog").close());
on("quadro-import-form", "submit", event => {
  event.preventDefault();
  const form = event.currentTarget;
  const raw = String(form.elements.lista.value || "");
  const seen = new Set();
  const names = [];
  for (const line of raw.split(/\r?\n/)) {
    const name = line.trim();
    if (!name) continue;
    const key = name.toLocaleLowerCase("pt-BR");
    if (seen.has(key)) continue;
    seen.add(key);
    if (quadros.some(item => item.name.toLocaleLowerCase("pt-BR") === key)) continue;
    names.push(name);
  }
  if (names.length === 0) {
    setReferenceImportMessage("quadro", "Nenhum quadro novo na lista (linhas vazias, repetidas ou já cadastradas foram ignoradas).", true);
    return;
  }
  names.forEach(name => quadros.push({ id: crypto.randomUUID(), name, observacoes: "" }));
  saveQuadros();
  form.closest("dialog").close();
  renderQuadros();
  showToast(`${names.length} quadro${names.length === 1 ? "" : "s"} importado${names.length === 1 ? "" : "s"}.`);
});
on("request-edit-cancel", "click", () => document.getElementById("request-edit-dialog").close());
on("request-edit-form", "submit", event => {
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
on("team-search", "input", debounce(() => renderTeam("full-team", getTeamMembers().length)));
on("current-vacation-search", "input", debounce(renderCurrentMonthVacations));
on("current-vacation-month", "change", event => {
  selectedVacationMonth = event.currentTarget.value;
  renderCurrentMonthVacations();
});
on("current-vacation-year", "change", event => {
  selectedVacationYear = event.currentTarget.value;
  renderCurrentMonthVacations();
});
on("report-year-select", "change", event => {
  selectedReportYear = event.currentTarget.value;
  renderReportYear();
});
on("report-unit-select", "change", event => {
  selectedReportUnit = event.currentTarget.value;
  renderReportUnit();
});
on("report-unit-person-search", "input", debounce(renderReportUnit));
on("report-person-search", "input", debounce(renderReportPerson));
on("report-servers-select", "input", debounce(renderServerDirectoryReport));
on("report-servers-unit", "change", renderServerDirectoryReport);
document.querySelectorAll("[data-request-type]").forEach(link => {
  link.addEventListener("click", () => {
    window.location.href = `solicitacao-ferias.html?tipo=${encodeURIComponent(link.dataset.requestType)}`;
  });
});
on("report-requests-search", "input", debounce(renderReportRequests));
on("report-requests-status", "change", event => {
  selectedReportRequestsStatus = event.currentTarget.value;
  renderReportRequests();
});
on("report-requests-category", "change", event => {
  selectedReportRequestsCategory = event.currentTarget.value;
  selectedReportRequestsType = "";
  renderReportRequests();
});
on("report-requests-type", "change", event => {
  selectedReportRequestsType = event.currentTarget.value;
  renderReportRequests();
});
on("report-requests-year", "change", event => {
  selectedReportRequestsYear = event.currentTarget.value;
  renderReportRequests();
});
on("report-capacitacao-name", "input", debounce(renderReportCapacitacao));
on("report-capacitacao-month", "change", event => {
  selectedCapacitacaoMonth = event.currentTarget.value;
  renderReportCapacitacao();
});
on("report-premio-name", "input", debounce(renderReportPremio));
on("report-premio-month", "change", event => {
  selectedPremioMonth = event.currentTarget.value;
  renderReportPremio();
});
on("report-medica-name", "input", debounce(renderReportMedica));
on("report-medica-month", "change", event => {
  selectedMedicaMonth = event.currentTarget.value;
  renderReportMedica();
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
  const expectedQuadro = getServerDataQuadroForCargo(cargo);
  if (expectedQuadro && quadro !== expectedQuadro) {
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
  showToast(wasEditing ? "Dados do servidor atualizados." : "Dados do servidor cadastrados.");
});
on("global-search", "input", debounce(event => {
  const query = event.target.value.trim();
  if (!query) return;
  setView("team"); document.getElementById("team-search").value = query; renderTeam("full-team", getTeamMembers().length);
}));
on("global-search", "keydown", event => { if (event.key === "Escape") { event.target.value = ""; event.target.blur(); } });
document.addEventListener("keydown", event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); const search = document.getElementById("global-search"); search.style.width = "230px"; search.focus(); }
});
const today = new Date();
document.getElementById("current-date").textContent = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(today).toLocaleUpperCase("pt-BR");

// Esconde itens marcados com [data-admin-only] quando o perfil logado não é admin.
function applyRoleBasedNavigation() {
  let role = "";
  try { role = sessionStorage.getItem("brisa-demo-user") || ""; } catch {}
  const isAdmin = role === "admin";
  document.querySelectorAll("[data-admin-only]").forEach(element => { element.hidden = !isAdmin; });
}

async function initializeApp() {
  requests = await loadRequests();
  selectedDate = dateKey(new Date());
  renderLoggedInProfile();
  applyRoleBasedNavigation();
  renderAll();
  renderTasks();
  loadReferenceDataFromFirestore();
  if (window.RH_SYNC && window.RH_SYNC.enabled) {
    // Cada coleção fica ligada ao Firestore: novidades de outro computador
    // aparecem na hora e o que existe só aqui sobe automaticamente.
    subscribeLiveCollections();
    loadUsuariosFromFirestore();
    loadServerRegistryFromFirestore();
    loadFgServerRosterFromFirestore();
    loadTasksFromFirestore();
    loadServerAccountsFromFirestore();
    setupSyncRetryLoop();
  }
  updateSyncIndicator();
}

async function loadUsuariosFromFirestore() {
  try {
    const remote = await window.RH_SYNC.loadDocs("usuarios");
    if (remote && remote.length > 0) {
      const cloudUsers = remote.map(normalizeUsuario);
      // Mantém os acessos que existirem apenas neste navegador (serão enviados).
      usuarios = mergeRemoteCollection("usuarios", usuarios, cloudUsers, null);
      seedFirestoreSyncState("usuarios", cloudUsers, null);
      saveUsuarios();
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
    const remoteServidores = await window.RH_SYNC.loadDocs("servidores");
    if (remoteServidores && remoteServidores.length > 0) {
      serverPersonalData = mergeServerRecords(serverPersonalData, remoteServidores, record => record.id);
      seedFirestoreSyncState("servidores", remoteServidores);
      // Sobe o que existir apenas neste navegador (o merge acima já trouxe o
      // restante da nuvem).
      saveServerPersonalData();
    } else if (serverPersonalData.length > 0) {
      // Nuvem vazia: sobe o cadastro que só existe neste navegador.
      saveServerPersonalData();
    }
  } catch (error) {
    const detail = error instanceof Error ? ` ${error.message}` : "";
    console.warn("Falha ao carregar cadastros do Firestore:", error);
    showToast(`Cadastros carregados apenas deste navegador.${detail}`);
  }
  renderServerPersonalData();
}

async function loadReferenceDataFromFirestore() {
  if (window.RH_SYNC && window.RH_SYNC.enabled) {
    try {
      const [remoteUnidades, remoteCargos, remoteQuadros] = await Promise.all([
        window.RH_SYNC.loadDocs("unidades"),
        window.RH_SYNC.loadDocs("cargos"),
        window.RH_SYNC.loadDocs("quadros")
      ]);
      if (remoteUnidades && remoteUnidades.length > 0) {
        unidades = mergeReferenceListWithCloud(unidades, remoteUnidades);
        seedFirestoreSyncState("unidades", normalizeReferenceList(remoteUnidades));
        saveUnidades();
      }
      if (remoteCargos && remoteCargos.length > 0) {
        cargos = mergeReferenceListWithCloud(cargos, remoteCargos);
        seedFirestoreSyncState("cargos", normalizeReferenceList(remoteCargos));
        saveCargos();
      }
      if (remoteQuadros && remoteQuadros.length > 0) {
        quadros = mergeReferenceListWithCloud(quadros, remoteQuadros);
        seedFirestoreSyncState("quadros", normalizeReferenceList(remoteQuadros));
        saveQuadros();
      }
      if (!remoteUnidades?.length && unidades.length > 0) saveUnidades();
      if (!remoteCargos?.length && cargos.length > 0) saveCargos();
      if (!remoteQuadros?.length && quadros.length > 0) saveQuadros();
    } catch (error) {
      const detail = error instanceof Error ? ` ${error.message}` : "";
      console.warn("Falha ao carregar cadastros básicos do Firestore:", error);
      showToast(`Cadastros básicos carregados apenas deste navegador.${detail}`);
    }
  }
  fillServerDataReferenceSelects();
  renderUnidades();
  renderCargos();
  renderQuadros();
}

function mergeServerRecords(localList, remoteList, keyFor) {
  const merged = localList.map(item => ({ ...item }));
  const indexByKey = new Map();
  merged.forEach((item, index) => {
    const key = keyFor(item);
    if (key) indexByKey.set(key, index);
  });
  remoteList.forEach(remote => {
    const remoteKey = keyFor(remote);
    if (!remoteKey) return;
    const index = indexByKey.get(remoteKey);
    if (index !== undefined) {
      merged[index] = remote;
    } else {
      indexByKey.set(remoteKey, merged.length);
      merged.push(remote);
    }
  });
  return merged;
}

initializeApp();
