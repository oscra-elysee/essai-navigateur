// Page d'essai du navigateur (essai n° 0, avant tout achat).
// Aucune dépendance. Aucun envoi : la page ne charge que ses propres fichiers,
// et le texte du résultat ne part que si la personne le colle elle-même quelque part.
// Chaque constat est indépendant : une capacité absente donne « non », jamais une erreur.
(function () {
  'use strict';

  // À changer en même temps que VERSION dans sw.js quand un fichier de la page change.
  var VERSION = '1';
  var PREFIXE_CACHE = 'essai-navigateur-v';
  var NOM_BASE = 'essai-navigateur';
  var MAGASIN = 'lignes';

  // Ordre des lignes du texte à copier : identifiant du constat, libellé court.
  var LIGNES = [
    ['installee', 'Installée'],
    ['serie', 'Port série (navigator.serial)'],
    ['bluetooth', 'Bluetooth (navigator.bluetooth)'],
    ['usb', 'USB (navigator.usb)'],
    ['durable', 'Stockage durable (persist)'],
    ['quota', 'Quota estimé'],
    ['navigateur', 'Navigateur'],
    ['systeme', 'Système'],
    ['securise', 'Connexion sécurisée'],
    ['sw', 'Service Worker'],
    ['horsligne', 'Prête hors ligne'],
    ['reseau', 'Réseau en ce moment'],
    ['nombre', 'Lignes écrites'],
    ['premiere', 'Première ligne'],
    ['derniere', 'Dernière ligne']
  ];

  var etat = {};      // identifiant du constat -> texte affiché
  var erreurs = [];   // messages d'erreur vus pendant l'essai

  // ---------- Outils ----------

  function element(id) { return document.getElementById(id); }

  function deuxChiffres(n) { return (n < 10 ? '0' : '') + n; }

  // Date locale de l'appareil, toujours écrite de la même façon : JJ/MM/AAAA HH:MM:SS.
  function dateLisible(d) {
    return deuxChiffres(d.getDate()) + '/' + deuxChiffres(d.getMonth() + 1) + '/' + d.getFullYear() +
      ' ' + deuxChiffres(d.getHours()) + ':' + deuxChiffres(d.getMinutes()) + ':' + deuxChiffres(d.getSeconds());
  }

  function tailleLisible(octets) {
    if (typeof octets !== 'number' || !isFinite(octets)) { return 'inconnu'; }
    var unites = [['Go', 1e9], ['Mo', 1e6], ['ko', 1e3]];
    for (var i = 0; i < unites.length; i++) {
      if (octets >= unites[i][1]) {
        return (octets / unites[i][1]).toFixed(1).replace('.', ',') + ' ' + unites[i][0];
      }
    }
    return octets + ' octets';
  }

  function messageDe(e) {
    var m = e && (e.message || e.name) ? String(e.message || e.name) : String(e);
    // L'adresse de la page n'a rien à faire dans le texte renvoyé : on la retire des messages.
    m = m.replace(/[a-z][a-z0-9+.-]*:\/\/[^\s'")]+/gi, '[adresse]');
    return m.length > 120 ? m.slice(0, 120) + '…' : m;
  }

  // Écrit la réponse d'un constat dans la page et dans le texte à copier.
  // genre : 'oui', 'non', 'info' ou 'attente' (couleur ; le mot reste écrit en clair).
  function noter(id, texte, genre) {
    etat[id] = texte;
    var v = element('v-' + id);
    if (v) {
      // « oui » ou « non » reste seul en gros ; la précision entre parenthèses passe dessous, en petit.
      var coupe = (genre === 'oui' || genre === 'non') ? texte.indexOf(' (') : -1;
      v.textContent = coupe > 0 ? texte.slice(0, coupe) : texte;
      if (coupe > 0) {
        var precision = document.createElement('small');
        precision.textContent = texte.slice(coupe + 1);
        v.appendChild(document.createTextNode(' '));
        v.appendChild(precision);
      }
      v.className = genre;
    }
    majResultat();
  }

  function ouiNon(id, vrai, precisionOui, precisionNon) {
    if (vrai) {
      noter(id, 'oui' + (precisionOui ? ' (' + precisionOui + ')' : ''), 'oui');
    } else {
      noter(id, 'non' + (precisionNon ? ' (' + precisionNon + ')' : ''), 'non');
    }
  }

  function signalerErreur(texte) {
    if (erreurs.length < 5) { erreurs.push(texte); }
    majResultat();
  }

  // Lance un constat sans laisser son échec empêcher les suivants.
  function essayer(id, fonction) {
    try {
      fonction();
    } catch (e) {
      noter(id, 'non (erreur : ' + messageDe(e) + ')', 'non');
      signalerErreur(id + ' : ' + messageDe(e));
    }
  }

  // ---------- Texte à copier ----------

  function texteResultat() {
    var lignes = [
      'ESSAI DU NAVIGATEUR n° 0 (page version ' + VERSION + ')',
      'Relevé du ' + dateLisible(new Date())
    ];
    for (var i = 0; i < LIGNES.length; i++) {
      var valeur = etat[LIGNES[i][0]];
      lignes.push(LIGNES[i][1] + ' : ' + (valeur && valeur !== '…' ? valeur : 'en attente'));
    }
    lignes.push('Erreurs : ' + (erreurs.length ? erreurs.join(' | ') : 'aucune'));
    return lignes.join('\n');
  }

  function majResultat() {
    var zone = element('resultat');
    if (zone) { zone.value = texteResultat(); }
  }

  function copierResultat() {
    majResultat();
    var zone = element('resultat');
    var message = element('message-copier');
    var texte = zone.value;

    function dire(reussi) {
      message.textContent = reussi
        ? 'Copié. Collez-le dans votre message.'
        : 'Copie refusée par le navigateur : sélectionnez le texte ci-dessous et copiez-le à la main.';
      message.className = 'message ' + (reussi ? 'oui' : 'non');
    }

    // Secours pour les navigateurs sans presse-papiers moderne : sélection puis commande « copier ».
    function parSelection() {
      var reussi = false;
      try {
        zone.focus();
        zone.select();
        zone.setSelectionRange(0, texte.length);
        reussi = document.execCommand('copy');
      } catch (e) {
        reussi = false;
      }
      dire(reussi);
    }

    var pressePapiers = null;
    try { pressePapiers = navigator.clipboard; } catch (e) { pressePapiers = null; }
    if (pressePapiers && typeof pressePapiers.writeText === 'function') {
      pressePapiers.writeText(texte).then(function () { dire(true); }, parSelection);
    } else {
      parSelection();
    }
  }

  // ---------- Constats ----------

  function modeAffichage() {
    var modes = ['standalone', 'minimal-ui', 'window-controls-overlay', 'fullscreen'];
    if (typeof window.matchMedia === 'function') {
      for (var i = 0; i < modes.length; i++) {
        if (window.matchMedia('(display-mode: ' + modes[i] + ')').matches) { return modes[i]; }
      }
    }
    // Safari sur iPad et iPhone : ancienne propriété, vraie quand la page vient de l'écran d'accueil.
    if (navigator.standalone === true) { return 'standalone'; }
    return 'browser';
  }

  function constatInstallee() {
    var mode = modeAffichage();
    ouiNon('installee', mode !== 'browser', 'mode ' + mode, 'simple onglet, mode browser');
  }

  // Présence d'une capacité du navigateur, par son nom dans « navigator ».
  function constatPresence(id, nom) {
    var presente = false;
    try { presente = (nom in navigator) && !!navigator[nom]; } catch (e) { presente = false; }
    ouiNon(id, presente);
  }

  function stockage() {
    try { return navigator.storage || null; } catch (e) { return null; }
  }

  function constatDurable() {
    var s = stockage();
    if (!s || typeof s.persist !== 'function') {
      noter('durable', 'non (fonction absente)', 'non');
      return;
    }
    s.persist().then(function (accorde) {
      ouiNon('durable', accorde === true, '', 'refusé par le navigateur');
    }, function (e) {
      noter('durable', 'non (erreur : ' + messageDe(e) + ')', 'non');
    });
  }

  function constatQuota() {
    var s = stockage();
    if (!s || typeof s.estimate !== 'function') {
      noter('quota', 'inconnu (fonction absente)', 'info');
      return;
    }
    s.estimate().then(function (e) {
      noter('quota', tailleLisible(e.quota) + ' (utilisé : ' + tailleLisible(e.usage) + ')', 'info');
    }, function (e) {
      noter('quota', 'inconnu (erreur : ' + messageDe(e) + ')', 'info');
    });
  }

  // Nom et version lus dans la chaîne d'identification. L'ordre compte :
  // presque tous les navigateurs citent aussi « Chrome » ou « Safari ».
  function navigateurDepuisChaine(ua) {
    var regles = [
      ['Edge', /Edg(?:e|A|iOS)?\/([\d.]+)/],
      ['Opera', /OPR\/([\d.]+)/],
      ['Samsung Internet', /SamsungBrowser\/([\d.]+)/],
      ['Firefox pour iOS', /FxiOS\/([\d.]+)/],
      ['Chrome pour iOS', /CriOS\/([\d.]+)/],
      ['Firefox', /Firefox\/([\d.]+)/],
      ['Chrome', /Chrom(?:e|ium)\/([\d.]+)/],
      ['Safari', /Version\/([\d.]+).*Safari\//]
    ];
    for (var i = 0; i < regles.length; i++) {
      var trouve = regles[i][1].exec(ua);
      if (trouve) { return regles[i][0] + ' ' + trouve[1]; }
    }
    return 'inconnu';
  }

  function systemeDepuisChaine(ua) {
    var t = /Android ([\d.]+)/.exec(ua);
    if (t) { return 'Android ' + t[1]; }
    t = /(iPad|iPhone|iPod).*? OS (\d+)[_.](\d+)/.exec(ua);
    if (t) { return (t[1] === 'iPad' ? 'iPadOS ' : 'iOS ') + t[2] + '.' + t[3]; }
    if (/Macintosh/.test(ua)) {
      // Un iPad se présente par défaut comme un Mac ; l'écran tactile le trahit.
      return navigator.maxTouchPoints > 1 ? 'iPadOS (se présente comme un Mac)' : 'macOS';
    }
    if (/Windows/.test(ua)) { return 'Windows'; }
    if (/CrOS/.test(ua)) { return 'ChromeOS'; }
    if (/Linux/.test(ua)) { return 'Linux'; }
    return 'inconnu';
  }

  // Dans une liste de marques déclarées, celle qui n'est ni le moteur ni le leurre.
  function marquePrincipale(liste) {
    if (!liste || !liste.length) { return null; }
    for (var i = 0; i < liste.length; i++) {
      var nom = String(liste[i].brand || '');
      if (nom && !/not.?a.?brand/i.test(nom) && nom !== 'Chromium') {
        return nom + ' ' + liste[i].version;
      }
    }
    for (var j = 0; j < liste.length; j++) {
      if (liste[j].brand === 'Chromium') { return 'Chromium ' + liste[j].version; }
    }
    return null;
  }

  function constatNavigateur() {
    var ua = String(navigator.userAgent || '');
    var embarquee = /; wv\)/.test(ua) ? ' (page embarquée, WebView)' : '';
    noter('navigateur', navigateurDepuisChaine(ua) + embarquee, 'info');
    noter('systeme', systemeDepuisChaine(ua), 'info');

    // Les navigateurs de la famille Chrome déclarent aussi leur nom et leur version exacte
    // par une interface à part. On ne demande que la version : jamais le modèle de l'appareil.
    var d = null;
    try { d = navigator.userAgentData || null; } catch (e) { d = null; }
    if (!d) { return; }
    var marque = marquePrincipale(d.brands);
    if (marque) { noter('navigateur', marque + embarquee, 'info'); }
    if (typeof d.getHighEntropyValues !== 'function') { return; }
    d.getHighEntropyValues(['fullVersionList', 'platformVersion']).then(function (v) {
      var complete = marquePrincipale(v.fullVersionList);
      if (complete) { noter('navigateur', complete + embarquee, 'info'); }
      if (d.platform === 'Android' && v.platformVersion) {
        noter('systeme', 'Android ' + v.platformVersion, 'info');
      }
    }, function () { /* la première réponse reste affichée */ });
  }

  function constatSecurise() {
    ouiNon('securise', window.isSecureContext === true, '',
      'sans HTTPS, le navigateur cache le Service Worker et le port série');
  }

  function constatReseau() {
    ouiNon('reseau', navigator.onLine !== false, '', 'hors ligne');
  }

  // ---------- Hors-ligne ----------

  function verifierCache() {
    var depot = null;
    try { depot = window.caches || null; } catch (e) { depot = null; }
    if (!depot) {
      noter('horsligne', 'non (cache absent)', 'non');
      return null;
    }
    return depot.keys().then(function (noms) {
      var nom = null;
      for (var i = 0; i < noms.length; i++) {
        if (noms[i].indexOf(PREFIXE_CACHE) === 0) { nom = noms[i]; }
      }
      if (!nom) {
        noter('horsligne', 'non (rien en réserve)', 'non');
        return null;
      }
      return depot.open(nom).then(function (cache) {
        return Promise.all([cache.keys(), cache.match('./')]);
      }).then(function (r) {
        var version = nom.slice(PREFIXE_CACHE.length);
        ouiNon('horsligne', !!r[1], r[0].length + ' fichiers en réserve, version ' + version,
          'la page n\'est pas en réserve');
      });
    });
  }

  function constatServiceWorker() {
    var sw = null;
    try { sw = navigator.serviceWorker || null; } catch (e) { sw = null; }
    if (!sw) {
      noter('sw', 'non', 'non');
      noter('horsligne', 'non (pas de Service Worker)', 'non');
      return;
    }
    sw.register('sw.js').then(function () {
      noter('sw', 'oui', 'oui');
      return sw.ready;
    }).then(verifierCache).catch(function (e) {
      if (etat.sw !== 'oui') { noter('sw', 'non (erreur : ' + messageDe(e) + ')', 'non'); }
      noter('horsligne', 'non (erreur : ' + messageDe(e) + ')', 'non');
    });
  }

  // ---------- Essai d'écriture (IndexedDB) ----------

  function ouvrirBase() {
    return new Promise(function (resoudre, rejeter) {
      var idb = null;
      try { idb = window.indexedDB || null; } catch (e) { idb = null; }
      if (!idb) { rejeter(new Error('IndexedDB absent')); return; }
      var demande;
      try { demande = idb.open(NOM_BASE, 1); } catch (e) { rejeter(e); return; }
      demande.onupgradeneeded = function () {
        demande.result.createObjectStore(MAGASIN, { autoIncrement: true });
      };
      demande.onsuccess = function () { resoudre(demande.result); };
      demande.onerror = function () { rejeter(demande.error || new Error('ouverture refusée')); };
      demande.onblocked = function () { rejeter(new Error('base occupée par une autre fenêtre')); };
    });
  }

  // Relit la base : nombre de lignes, date de la première et de la dernière.
  function relireLignes() {
    return ouvrirBase().then(function (base) {
      return new Promise(function (resoudre, rejeter) {
        var releve = { nombre: 0, premiere: null, derniere: null };
        var transaction = base.transaction(MAGASIN, 'readonly');
        var magasin = transaction.objectStore(MAGASIN);
        magasin.count().onsuccess = function (e) { releve.nombre = e.target.result; };
        magasin.openCursor().onsuccess = function (e) {
          if (e.target.result) { releve.premiere = e.target.result.value; }
        };
        magasin.openCursor(null, 'prev').onsuccess = function (e) {
          if (e.target.result) { releve.derniere = e.target.result.value; }
        };
        transaction.oncomplete = function () { base.close(); resoudre(releve); };
        transaction.onerror = transaction.onabort = function () {
          base.close();
          rejeter(transaction.error || new Error('lecture refusée'));
        };
      });
    });
  }

  function dateDeLigne(ligne) {
    if (!ligne || !ligne.date) { return 'aucune'; }
    var d = new Date(ligne.date);
    return isNaN(d.getTime()) ? 'illisible' : dateLisible(d);
  }

  function afficherLignes() {
    return relireLignes().then(function (releve) {
      noter('nombre', String(releve.nombre), 'info');
      noter('premiere', dateDeLigne(releve.premiere), 'info');
      noter('derniere', dateDeLigne(releve.derniere), 'info');
    }, function (e) {
      var texte = 'non (erreur : ' + messageDe(e) + ')';
      noter('nombre', texte, 'non');
      noter('premiere', texte, 'non');
      noter('derniere', texte, 'non');
      throw e;
    });
  }

  // Écrit une ligne. La promesse n'est tenue qu'à la fin de la transaction :
  // tant que le navigateur n'a pas confirmé, rien n'est annoncé comme écrit.
  function ecrireLigne() {
    return ouvrirBase().then(function (base) {
      return new Promise(function (resoudre, rejeter) {
        var transaction = base.transaction(MAGASIN, 'readwrite');
        transaction.objectStore(MAGASIN).add({ date: new Date().toISOString() });
        transaction.oncomplete = function () { base.close(); resoudre(); };
        transaction.onerror = transaction.onabort = function () {
          base.close();
          rejeter(transaction.error || new Error('écriture refusée'));
        };
      });
    });
  }

  function appuiEcrire() {
    var bouton = element('bouton-ecrire');
    var message = element('message-ecrire');
    bouton.disabled = true;
    message.textContent = 'Écriture…';
    message.className = 'message attente';
    ecrireLigne().then(afficherLignes).then(function () {
      message.textContent = 'Ligne écrite et relue : ' + etat.nombre + ' en tout.';
      message.className = 'message oui';
    }, function (e) {
      message.textContent = 'Écriture impossible : ' + messageDe(e);
      message.className = 'message non';
    }).then(function () { bouton.disabled = false; });
  }

  // ---------- Démarrage ----------

  window.addEventListener('error', function (e) {
    signalerErreur(messageDe(e && e.message ? e : 'erreur de script'));
  });
  window.addEventListener('unhandledrejection', function (e) {
    signalerErreur('promesse rejetée : ' + messageDe(e && e.reason));
  });

  function demarrer() {
    var avis = element('sans-script');
    if (avis) { avis.hidden = true; }
    element('version').textContent = VERSION;

    essayer('installee', constatInstallee);
    essayer('serie', function () { constatPresence('serie', 'serial'); });
    essayer('bluetooth', function () { constatPresence('bluetooth', 'bluetooth'); });
    essayer('usb', function () { constatPresence('usb', 'usb'); });
    essayer('durable', constatDurable);
    essayer('quota', constatQuota);
    essayer('navigateur', constatNavigateur);
    essayer('securise', constatSecurise);
    essayer('reseau', constatReseau);
    essayer('sw', constatServiceWorker);
    essayer('nombre', function () { afficherLignes().catch(function () { /* déjà affiché */ }); });

    window.addEventListener('online', function () { essayer('reseau', constatReseau); });
    window.addEventListener('offline', function () { essayer('reseau', constatReseau); });
    element('bouton-ecrire').addEventListener('click', appuiEcrire);
    element('bouton-copier').addEventListener('click', copierResultat);
    majResultat();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', demarrer);
  } else {
    demarrer();
  }
})();
