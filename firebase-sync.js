/*
 * Camada de sincronizacao com o Firebase (Auth + Firestore).
 *
 * Se o Firebase NAO estiver configurado em config.js (window.RH_CONFIG.firebase),
 * este script nao faz nada e o app continua usando apenas localStorage.
 *
 * Expoe window.RH_SYNC com:
 *   enabled            -> true quando o Firestore/Auth estao ativos
 *   signInWithPopup()  -> login Google nativo do Firebase (popup)
 *   signInWithGoogle() -> troca o token do GIS por uma sessao do Firebase
 *   waitForAuth()      -> resolve com o usuario apos restaurar a sessao
 *   signOut()
 *   loadRequests()     -> Promise<array>
 *   addRequest(req)    -> Promise<req> (usado pela pagina de solicitacao)
 *   saveRequests(list) -> Promise (grava a lista inteira, com merge)
 *   subscribeRequests(onData, onError)
 *   loadDocs(col)      -> Promise<array> (qualquer colecao, com id)
 *   saveDocs(col, list)-> Promise (grava a lista inteira, com merge)
 *   deleteDoc(col, id) -> Promise
 *   subscribeDocs(col, onData, onError)
 */
(function () {
  const config = (window.RH_CONFIG && window.RH_CONFIG.firebase) || null;

  const RH_SYNC = {
    enabled: false,
    user: null
  };
  window.RH_SYNC = RH_SYNC;

  if (!config || !config.apiKey || !config.projectId || !window.firebase) {
    return;
  }

  try {
    if (!firebase.apps.length) firebase.initializeApp(config);
    RH_SYNC._auth = firebase.auth();
    RH_SYNC._db = firebase.firestore();
    RH_SYNC.enabled = true;
  } catch (error) {
    console.warn("Firebase nao foi inicializado; usando armazenamento local.", error);
    RH_SYNC.enabled = false;
    return;
  }

  const REQUESTS = "requests";
  const requestsCol = () => RH_SYNC._db.collection(REQUESTS);

  RH_SYNC.currentUser = function () {
    return RH_SYNC._auth.currentUser;
  };

  // Aguarda o Firebase restaurar a sessão e resolve com o usuário (ou null).
  RH_SYNC.waitForAuth = function () {
    return new Promise(resolve => {
      const unsubscribe = RH_SYNC._auth.onAuthStateChanged(user => {
        unsubscribe();
        RH_SYNC.user = user;
        resolve(user);
      }, () => resolve(null));
    });
  };

  RH_SYNC.signInWithGoogle = function (idToken) {
    const credential = firebase.auth.GoogleAuthProvider.credential(idToken);
    return RH_SYNC._auth.signInWithCredential(credential);
  };

  // Login Google nativo do Firebase (popup). Dispensa o Client ID do GIS e
  // evita o erro origin_mismatch.
  RH_SYNC.signInWithPopup = function () {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    return RH_SYNC._auth.signInWithPopup(provider);
  };

  RH_SYNC.signOut = function () {
    return RH_SYNC._auth.signOut().catch(() => {});
  };

  RH_SYNC.loadRequests = function () {
    return RH_SYNC.waitForAuth().then(() => requestsCol().get()).then(snapshot =>
      snapshot.docs.map(doc => Object.assign({}, doc.data(), { id: doc.data().id || doc.id }))
    );
  };

  RH_SYNC.addRequest = function (request) {
    const docId = request.id || requestsCol().doc().id;
    const payload = Object.assign({}, request, { id: docId });
    return RH_SYNC.waitForAuth().then(() =>
      requestsCol().doc(docId).set(payload, { merge: true })
    ).then(() => payload);
  };

  RH_SYNC.saveRequests = function (requests) {
    return RH_SYNC.waitForAuth().then(() => {
      const batch = RH_SYNC._db.batch();
      const col = requestsCol();
      requests.forEach(request => {
        const docId = request.id || col.doc().id;
        batch.set(col.doc(docId), Object.assign({}, request, { id: docId }), { merge: true });
      });
      return batch.commit();
    });
  };

  RH_SYNC.subscribeRequests = function (onData, onError) {
    return requestsCol().onSnapshot(
      snapshot => onData(snapshot.docs.map(doc => Object.assign({}, doc.data(), { id: doc.data().id || doc.id }))),
      error => { if (onError) onError(error); }
    );
  };

  // ---- Helpers genéricos (qualquer coleção) ----

  RH_SYNC.loadDocs = function (collection) {
    return RH_SYNC.waitForAuth().then(() => RH_SYNC._db.collection(collection).get()).then(snapshot =>
      snapshot.docs.map(doc => Object.assign({}, doc.data(), { id: doc.id }))
    );
  };

  RH_SYNC.saveDocs = function (collection, docs) {
    return RH_SYNC.waitForAuth().then(() => {
      const batch = RH_SYNC._db.batch();
      const col = RH_SYNC._db.collection(collection);
      docs.forEach(doc => {
        const id = doc.id || col.doc().id;
        batch.set(col.doc(id), Object.assign({}, doc, { id }), { merge: true });
      });
      return batch.commit();
    });
  };

  RH_SYNC.deleteDoc = function (collection, id) {
    return RH_SYNC.waitForAuth().then(() => RH_SYNC._db.collection(collection).doc(id).delete());
  };

  RH_SYNC.subscribeDocs = function (collection, onData, onError) {
    return RH_SYNC._db.collection(collection).onSnapshot(
      snapshot => onData(snapshot.docs.map(doc => Object.assign({}, doc.data(), { id: doc.id }))),
      error => { if (onError) onError(error); }
    );
  };
})();
