// Pastoral da Música · Santa Luzia — service worker
// Ao publicar uma versão nova do app, troque o número abaixo (v1 → v2 → v3...).
const VERSAO = "pastoral-v1";

const ARQUIVOS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png",
  "./favicon-32.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(chaves.filter((k) => k !== VERSAO).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Banco de dados e login do Firebase: sempre direto pela internet (o Firebase tem o próprio modo offline)
  if (/firestore\.googleapis\.com|identitytoolkit|securetoken|googleapis\.com\/identitytoolkit/.test(url.host + url.pathname)) return;

  // Páginas e arquivos do próprio app: tenta a internet primeiro (pega a versão nova), senão usa a cópia salva
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone();
          caches.open(VERSAO).then((c) => c.put(req, copia));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
    );
    return;
  }

  // Fontes e bibliotecas (Google Fonts, Firebase): usa a cópia salva e atualiza por trás
  if (/fonts\.(googleapis|gstatic)\.com|www\.gstatic\.com/.test(url.host)) {
    e.respondWith(
      caches.match(req).then((salvo) => {
        const rede = fetch(req)
          .then((res) => {
            caches.open(VERSAO).then((c) => c.put(req, res.clone()));
            return res;
          })
          .catch(() => salvo);
        return salvo || rede;
      })
    );
  }
});
