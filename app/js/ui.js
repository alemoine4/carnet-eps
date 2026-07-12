// ui.js — registre de vues + helpers DOM communs.
// Une vue = fonction (conteneur, params) => void|Promise, enregistrée par enregistrerVue().
// `params` = segments du hash après la route (ex. #/eleves/fiche/<id> → ['fiche', '<id>']).
// Les modules métier (js/modules/*.js) s'enregistrent ici sans toucher au router.

const vues = new Map();

export function enregistrerVue(id, rendu) {
  vues.set(id, rendu);
}

let generation = 0; // deux navigations très rapprochées : seule la plus récente garde la main

export async function afficherVue(id, params = []) {
  const gen = ++generation;
  // Conteneur NEUF à chaque navigation : un rendu async devenu obsolète continue d'écrire
  // dans l'ancien nœud détaché au lieu de se mélanger à la vue courante.
  const ancien = document.getElementById('vue');
  const conteneur = ancien.cloneNode(false); // mêmes attributs (id, tabindex, aria-label), vide
  ancien.replaceWith(conteneur);
  conteneur.className = 'vue'; // réinitialise (une vue peut ajouter 'vue-large' pour s'élargir sur PC)
  const rendu = vues.get(id);
  if (!rendu) {
    conteneur.append(carte('Page introuvable', `Aucune vue « ${id} ».`));
    return;
  }
  await rendu(conteneur, params);
  if (gen === generation) conteneur.focus({ preventScroll: true });
}

// el('button', { class: 'btn', onclick: fn }, 'Texte') — création DOM concise et sûre
// (textes passés en nœuds texte, jamais en innerHTML).
export function el(tag, attrs = {}, ...enfants) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else if (v !== false && v !== null && v !== undefined) n.setAttribute(k, v === true ? '' : v);
  }
  n.append(...enfants);
  return n;
}

export function carte(titre, texte = '', badge = '') {
  const c = el('section', { class: 'carte' });
  const h = el('h2', {}, titre);
  if (badge) h.append(el('span', { class: 'badge' }, badge));
  c.append(h);
  if (texte) c.append(el('p', {}, texte));
  return c;
}

// ---- Champs de formulaire (sauvegarde sur `change` + retour visuel « ✓ ») ----

function brancherRetour(controle, onChange, transformer = (v) => v.trim()) {
  const retour = el('span', { class: 'statut statut-ok', role: 'status' });
  if (onChange) {
    controle.addEventListener('change', async () => {
      await onChange(transformer(controle.value));
      retour.textContent = '✓';
      setTimeout(() => { retour.textContent = ''; }, 1500);
    });
  }
  return retour;
}

export function champTexte({ id, libelle, valeur = '', placeholder = '', type = 'text', onChange }) {
  const input = el('input', { type, id, placeholder, autocomplete: 'off' });
  input.value = valeur;
  const retour = brancherRetour(input, onChange, type === 'date' ? (v) => v : (v) => v.trim());
  return el('div', { class: 'champ' }, el('label', { for: id }, libelle, ' ', retour), input);
}

export function champSelect({ id, libelle, options, valeur = '', onChange }) {
  const select = el('select', { id }, ...options.map((o) => el('option', { value: o.value }, o.label)));
  select.value = valeur;
  const retour = brancherRetour(select, onChange, (v) => v);
  return el('div', { class: 'champ' }, el('label', { for: id }, libelle, ' ', retour), select);
}

export function champZone({ id, libelle, valeur = '', placeholder = '', rows = 3, onChange }) {
  const zone = el('textarea', { id, placeholder, rows });
  zone.value = valeur;
  const retour = brancherRetour(zone, onChange);
  return el('div', { class: 'champ' }, el('label', { for: id }, libelle, ' ', retour), zone);
}

// ---- Feuille modale (menu bas d'écran) ----
// <dialog> natif : piège de focus, fermeture par Échap et par clic sur le fond,
// arrière-plan rendu inerte par le navigateur, focus restitué au déclencheur.
// `contenu` = un nœud ou un tableau de nœuds. Retourne le <dialog> (close() pour fermer).
export function ouvrirFeuille({ titre = '', label = '', contenu }) {
  document.querySelector('dialog.feuille[open]')?.close();
  const declencheur = document.activeElement;
  const dlg = el('dialog', { class: 'feuille', 'aria-label': label || titre || 'Menu' });
  if (titre) dlg.append(el('h3', {}, titre));
  dlg.append(...(Array.isArray(contenu) ? contenu : [contenu]));
  // Clic sur le fond (backdrop) = fermeture. Le backdrop cible le <dialog> lui-même ;
  // un clic/activation clavier sur un enfant cible l'enfant → la feuille ne se ferme pas.
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', () => {
    dlg.remove();
    if (declencheur?.isConnected) declencheur.focus();
  });
  document.body.append(dlg);
  dlg.showModal();
  dlg.querySelector('button, [href], input, select, textarea')?.focus();
  return dlg;
}

// Confirmation modale cohérente (remplace confirm() natif). Échap / clic sur le fond = Annuler,
// focus initial sur « Annuler » (anti-mauvais-tap), action en rouge par défaut.
// Retourne Promise<boolean>. Usage : if (!(await confirmer({ titre, message, detail }))) return;
export function confirmer({ titre, message = '', detail = '', action = 'Supprimer', danger = true }) {
  return new Promise((resoudre) => {
    const declencheur = document.activeElement;
    const dlg = el('dialog', { class: 'feuille feuille-confirm', 'aria-label': titre });
    let ok = false;
    const btnAnnuler = el('button', { class: 'btn', type: 'button' }, 'Annuler');
    const btnAction = el('button', { class: danger ? 'btn btn-danger' : 'btn btn-principal', type: 'button' }, action);
    btnAnnuler.addEventListener('click', () => dlg.close());
    btnAction.addEventListener('click', () => { ok = true; dlg.close(); });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); }); // clic sur le fond = Annuler
    dlg.addEventListener('close', () => {
      dlg.remove();
      if (declencheur?.isConnected) declencheur.focus();
      resoudre(ok);
    });
    dlg.append(el('h3', {}, titre));
    if (message) dlg.append(el('p', {}, message));
    if (detail) dlg.append(el('p', { class: 'confirm-detail' }, detail));
    dlg.append(el('div', { class: 'rang-btn' }, btnAnnuler, btnAction));
    document.body.append(dlg);
    dlg.showModal();
    btnAnnuler.focus();
  });
}

// Notification brève avec action optionnelle (ex. « Supprimé — Annuler »), auto-disparition.
// Les toasts S'EMPILENT (max 3, le plus ancien cède la place — audit A12) : un « Annuler »
// n'est plus perdu quand deux suppressions s'enchaînent. duree: Infinity = reste affiché.
export function toast(message, { action, libelleAction = 'Annuler', duree = 8000 } = {}) {
  let pile = document.querySelector('.toasts');
  if (!pile) { pile = el('div', { class: 'toasts' }); document.body.append(pile); }
  // L'éviction n'emporte que les toasts à durée finie : le toast persistant
  // (ex. « Nouvelle version installée ») survit à une rafale de notifications.
  while (pile.children.length >= 3) {
    const victime = [...pile.children].find((x) => !('persistant' in x.dataset));
    if (!victime) break;
    victime.remove();
  }
  const t = el('div', { class: 'toast', role: 'status' }, el('span', {}, message));
  if (!Number.isFinite(duree)) t.dataset.persistant = '';
  let timer;
  const fermer = () => {
    clearTimeout(timer);
    t.remove();
    if (!pile.children.length) pile.remove();
  };
  if (action) {
    const btn = el('button', { class: 'btn btn-principal', type: 'button' }, libelleAction);
    btn.addEventListener('click', async () => { fermer(); await action(); });
    t.append(btn);
  }
  pile.append(t);
  if (Number.isFinite(duree)) timer = setTimeout(fermer, duree);
  return t;
}
