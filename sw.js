// Service Worker de la page d'essai : garde les fichiers de la page en réserve
// pour qu'elle s'ouvre sans Internet après le premier chargement.
// Il ne répond que pour les fichiers de son propre dossier et ne contacte aucun autre hôte.

// À changer en même temps que VERSION dans essai.js quand un fichier de la page change :
// c'est ce changement qui fait remplacer l'ancienne réserve.
const VERSION = '1';
const CACHE = 'essai-navigateur-v' + VERSION;
const PREFIXE = 'essai-navigateur-v';

// Chemins relatifs à ce fichier : la page marche dans n'importe quel dossier.
const FICHIERS = [
  './',
  'essai.css',
  'essai.js',
  'manifest.webmanifest',
  'icone.svg',
  'icone-180.png',
  'icone-192.png',
  'icone-512.png'
];

const DOSSIER = new URL('./', self.location.href).href;

self.addEventListener('install', (evenement) => {
  evenement.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // « reload » : on prend la copie du serveur, pas une vieille copie du navigateur.
    await cache.addAll(FICHIERS.map((chemin) => new Request(chemin, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (evenement) => {
  evenement.waitUntil((async () => {
    const noms = await caches.keys();
    await Promise.all(noms
      .filter((nom) => nom.startsWith(PREFIXE) && nom !== CACHE)
      .map((nom) => caches.delete(nom)));
    await self.clients.claim();
  })());
});

async function repondre(requete) {
  const cache = await caches.open(CACHE);
  const enReserve = await cache.match(requete, { ignoreSearch: true });
  if (enReserve) { return enReserve; }
  try {
    return await fetch(requete);
  } catch (erreur) {
    // Sans réseau, toute ouverture de page dans ce dossier rend la page d'essai.
    if (requete.mode === 'navigate') {
      const page = await cache.match('./');
      if (page) { return page; }
    }
    throw erreur;
  }
}

self.addEventListener('fetch', (evenement) => {
  const requete = evenement.request;
  if (requete.method !== 'GET') { return; }
  if (!requete.url.startsWith(DOSSIER)) { return; }
  evenement.respondWith(repondre(requete));
});
