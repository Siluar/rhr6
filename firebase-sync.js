/*
 * Camada de sincronizacao com o Firebase (Auth + Firestore).
 *
 * Se o Firebase NAO estiver configurado em config.js (window.RH_CONFIG.firebase),
 * este script nao faz nada e o app continua usando apenas localStorage.
 *
 * Expoe window.RH_SYNC com:
 *   enabled            -> true quando o Firestore/Auth estao ativos
 *   signInWithGoogle() -> troca o token do Google por uma sessao do Firebase
 *   signOut()
 *   loadRequests()     -> Promise<array>
 *   addRequest(req)    -> Promise<req> (usado pela pagina de solicitacao)
 *   saveRequests(list) -> Promise (grava a lista inteira, com merge)
 *   subscribeRequests(onData, onError)
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

  RH_SYNC.signInWithGoogle = function (idToken) {
    const credential = firebase.auth.GoogleAuthProvider.credential(idToken);
    return RH_SYNC._auth.signInWithCredential(credential);
  };

  RH_SYNC.signOut = function () {
    return RH_SYNC._auth.signOut().catch(() => {});
  };

  RH_SYNC.loadRequests = function () {
    return requestsCol().get().then(snapshot =>
      snapshot.docs.map(doc => Object.assign({}, doc.data(), { id: doc.data().id || doc.id }))
    );
  };

  RH_SYNC.addRequest = function (request) {
    const docId = request.id || requestsCol().doc().id;
    const payload = Object.assign({}, request, { id: docId });
    return requestsCol().doc(docId).set(payload, { merge: true }).then(() => payload);
  };

  RH_SYNC.saveRequests = function (requests) {
    const batch = RH_SYNC._db.batch();
    const col = requestsCol();
    requests.forEach(request => {
      const docId = request.id || col.doc().id;
      batch.set(col.doc(docId), Object.assign({}, request, { id: docId }), { merge: true });
    });
    return batch.commit();
  };

  RH_SYNC.subscribeRequests = function (onData, onError) {
    return requestsCol().onSnapshot(
      snapshot => onData(snapshot.docs.map(doc => Object.assign({}, doc.data(), { id: doc.data().id || doc.id }))),
      error => { if (onError) onError(error); }
    );
  };
})();
