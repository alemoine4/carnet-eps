// marqueurs.js — écran du vocabulaire des marqueurs de séance (v0.14.1 « le vocabulaire »).
// Contrat : docs/avis/AVIS_FORMAT_MARQUEURS.md, §6.5. Routes : #/marqueurs, #/marqueurs/nouveau,
// #/marqueurs/modifier/<id>. Toute écriture passe par ecrireMarqueur (io.js, §4.4), qui relit le
// vocabulaire dans sa transaction : l'écran ne décide jamais seul de l'unicité d'un code ni du genre.
// Aucune suppression (archiver / restaurer seulement, §4.4) ; aucune pose ici (v0.14.2).

import { el, carte, champ, enregistrerVue, toast, rerendre } from '../ui.js';
import { tous, lire, ecrireMarqueur } from '../io.js';
import { GENRES, LIBELLES_GENRE, COULEURS, cleCourt } from '../marqueurs-calcul.js';

// Amorçage (§14, réponse 5 : OUI, sur un vocabulaire vide seulement). Couleurs distinctes entre
// rôles et équipes ; le comportement est gris de toute façon (forcé par ecrireMarqueur, décision 10).
const PROPOSES = [
  { libelle: 'Arbitre', court: 'ARB', genre: 'role', couleur: 'bleu' },
  { libelle: 'Observateur', court: 'OBS', genre: 'role', couleur: 'violet' },
  { libelle: 'Coach', court: 'COA', genre: 'role', couleur: 'orange' },
  { libelle: 'Équipe 1', court: 'E1', genre: 'groupe', couleur: 'rouge' },
  { libelle: 'Équipe 2', court: 'E2', genre: 'groupe', couleur: 'vert' },
  { libelle: 'À recadrer', court: 'REC', genre: 'comportement', couleur: 'gris' },
];
const LIBELLE_AMORCE = 'Créer les 6 marqueurs proposés';

// Un genre absent ou inconnu (sauvegarde tierce ou future) se range et se lit avec les comportements
// (§5.1 point 5) : jamais « undefined », jamais un code de rôle inattendu.
const genreAffiche = (m) => (GENRES.includes(m.genre) ? m.genre : 'comportement');
// Couleur de l'aperçu : aucune pour un comportement (bordure neutre), gris pour une couleur inconnue.
const couleurAffichee = (m) => (genreAffiche(m) === 'comportement' ? null : (COULEURS.includes(m.couleur) ? m.couleur : 'gris'));
// Aperçu « sur la carte » : les mêmes nœuds que la carte d'élève (§6.1). Un rôle ou une équipe montre
// son code (purement visuel : il est déjà dans le texte de la carte ou dans le champ du formulaire).
// Un comportement — genre absent ou inconnu compris — ne montre JAMAIS son code (décision 10, §5.1
// points 2 et 5) : le repère neutre, sans texte, et une phrase qui dit où vit le sens (revue v0.14.1, R2).
const NOTE_NEUTRE = 'un repère neutre, sans code ; le sens reste dans la feuille de l’élève.';
function apercuCarte(m) {
  if (genreAffiche(m) === 'comportement') {
    return [el('span', { class: 'mq-neutre', 'aria-hidden': 'true' }), ' ', el('span', { class: 'note-inline' }, NOTE_NEUTRE)];
  }
  return [el('span', { class: 'mq-code', 'aria-hidden': 'true', 'data-niveau-couleur': couleurAffichee(m) }, m.court)];
}

// Focus après un nouveau rendu de la liste (revue v0.14.1, R3) : `rerendre` ne rend le focus que par
// l'id de l'élément actif ; un bouton sans id (alerte « Codes en double ») ou disparu (amorçage) le
// laissait tomber sur <body>. Cible stable : l'élément `id` s'il existe encore, sinon « Nouveau marqueur ».
function retenirFocus(c, id) {
  if (!c.isConnected || c.contains(document.activeElement)) return;
  (document.getElementById(id) ?? document.getElementById('mq-nouveau'))?.focus({ preventScroll: true });
}

const retour = (href) => el('a', { class: 'retour no-print', href }, '← Retour');
const pluriel = (n, un, plusieurs) => `${n} ${n > 1 ? plusieurs : un}`;

// Marqueurs actifs qui partagent un code court (forme normalisée) : seule une sauvegarde bricolée peut
// en produire (l'import ne contrôle que la forme, §9.2), et ecrireMarqueur refuse alors de modifier
// l'un comme l'autre (contrat §16, « Revue de la v0.14.0 », point 2). Map<cleCourt, marqueur[]>.
function doublons(vocabulaire) {
  const parCode = new Map();
  for (const m of vocabulaire) {
    if (m.archivee === true) continue;
    const cle = cleCourt(m.court);
    if (!parCode.has(cle)) parCode.set(cle, []);
    parCode.get(cle).push(m);
  }
  return new Map([...parCode].filter(([, liste]) => liste.length > 1));
}
const nomsGuillemets = (liste) => liste.map((m) => `« ${m.libelle} »`).join(', ');

const trier = (a, b) => Number(a.archivee === true) - Number(b.archivee === true)
  || String(a.libelle).localeCompare(String(b.libelle), 'fr') || cleCourt(a.court).localeCompare(cleCourt(b.court));

async function basculerArchive(c, m) {
  const archiver = m.archivee !== true;
  try {
    await ecrireMarqueur(m.id, { archivee: archiver });
  } catch (e) {
    // Pas de p.statut hors du formulaire : le refus (genre inconnu, code repris entre-temps) part en toast (§6.5).
    toast(`${archiver ? 'Archivage' : 'Restauration'} impossible : ${e?.message || e}`, { duree: 12000 });
    return;
  }
  await rerendre(c, () => liste(c));
  retenirFocus(c, `mq-archive-${m.id}`); // le bouton de la carte existe toujours (devenu « Restaurer » / « Archiver »)
  toast(archiver ? `« ${m.libelle} » archivé : son code est libéré, l’historique reste lisible.` : `« ${m.libelle} » restauré.`);
}

async function amorcer(c, bouton) {
  if (bouton.getAttribute('aria-disabled') === 'true') return; // B50 : pas de `disabled` sous le focus
  bouton.setAttribute('aria-disabled', 'true');
  bouton.textContent = 'Création en cours…';
  try {
    // Sur un vocabulaire VIDE seulement : relu au moment du geste (un autre onglet a pu en créer un).
    if ((await tous('marqueurs')).length) {
      await rerendre(c, () => liste(c));
      retenirFocus(c, 'mq-nouveau'); // #mq-amorcer n'existe plus
      toast('Des marqueurs existent déjà : rien n’a été créé.');
      return;
    }
    // Une transaction par marqueur, par l'unique écriture du vocabulaire : un code pris entre-temps
    // est refusé par ecrireMarqueur, et ce refus est DIT, pas avalé.
    const echecs = [];
    for (const p of PROPOSES) {
      try {
        await ecrireMarqueur(crypto.randomUUID(), { ...p });
      } catch (e) {
        echecs.push(`${p.libelle} (${p.court}) : ${e?.message || e}`);
      }
    }
    const crees = PROPOSES.length - echecs.length;
    const message = echecs.length
      ? `${crees ? pluriel(crees, 'marqueur créé', 'marqueurs créés') : 'Aucun marqueur créé'} sur ${PROPOSES.length}. Non ${echecs.length > 1 ? 'créés' : 'créé'} — ${echecs.join(' ; ')}.`
      : `${PROPOSES.length} marqueurs créés.`;
    await rerendre(c, () => liste(c, echecs.length ? message : ''));
    retenirFocus(c, 'mq-nouveau'); // idem après la création
    toast(message, echecs.length ? { duree: 12000 } : {});
  } finally {
    if (bouton.isConnected) { bouton.removeAttribute('aria-disabled'); bouton.textContent = LIBELLE_AMORCE; }
  }
}

function carteMarqueur(c, m, enDouble) {
  const bloc = el('section', { class: 'carte' },
    el('h3', { class: 'mq-titre' }, m.libelle),
    el('p', {}, `${m.court} · ${LIBELLES_GENRE[genreAffiche(m)]}${m.archivee === true ? ' · archivé' : ''}`),
    el('p', {}, ...(genreAffiche(m) === 'comportement' ? ['Sur la carte : '] : []), ...apercuCarte(m)));
  if (enDouble) {
    bloc.append(el('p', { class: 'statut statut-erreur' },
      `Code en double avec ${nomsGuillemets(enDouble.filter((x) => x.id !== m.id))} : archivez l’un des deux pour pouvoir les modifier.`));
  }
  const archive = el('button', { class: 'btn', type: 'button', id: `mq-archive-${m.id}`,
    'aria-label': `${m.archivee === true ? 'Restaurer' : 'Archiver'} « ${m.libelle} »` }, m.archivee === true ? 'Restaurer' : 'Archiver');
  archive.addEventListener('click', () => basculerArchive(c, m));
  bloc.append(el('div', { class: 'rang-btn' },
    el('a', { class: 'btn', href: `#/marqueurs/modifier/${encodeURIComponent(m.id)}`, 'aria-label': `Modifier « ${m.libelle} »` }, 'Modifier'),
    archive));
  return bloc;
}

async function liste(c, avertissement = '') {
  c.append(retour('#/plus'));
  const intro = carte('Rôles, équipes, comportements');
  intro.append(el('p', {}, 'Un marqueur vit ', el('strong', {}, 'le temps d’une séance'),
    '. Les rôles et les équipes s’affichent par leur code sur la carte de l’élève ; les comportements n’affichent qu’un repère neutre, leur sens reste dans la feuille de l’élève. Renommer sert à ',
    el('strong', {}, 'corriger une faute'),
    '. Pour changer de sens, créez un nouveau marqueur : l’ancien reste lisible dans l’historique.'));
  // v0.14.1 seulement — la pose n'existe pas encore : ne rien promettre d'absent (texte retiré en v0.14.2).
  intro.append(el('p', { class: 'mq-provisoire', id: 'mq-bientot' }, 'Cette version sert à préparer votre liste : la pose des marqueurs pendant l’appel arrive dans la prochaine version.'));
  c.append(intro);
  const nouveau = el('a', { class: 'btn btn-principal', href: '#/marqueurs/nouveau', id: 'mq-nouveau' }, 'Nouveau marqueur');
  c.append(el('div', { class: 'barre-actions no-print' }, nouveau));
  if (avertissement) c.append(el('p', { class: 'statut statut-erreur', role: 'status' }, avertissement));

  const vocabulaire = await tous('marqueurs');
  if (!vocabulaire.length) {
    const premier = carte('Votre premier marqueur',
      'Créez vos rôles, équipes et comportements un par un, ou partez des six proposés : Arbitre (ARB), Observateur (OBS), Coach (COA), Équipe 1 (E1), Équipe 2 (E2) et À recadrer (REC). Vous pourrez les renommer ou les archiver.');
    const amorce = el('button', { class: 'btn', type: 'button', id: 'mq-amorcer' }, LIBELLE_AMORCE);
    amorce.addEventListener('click', () => amorcer(c, amorce));
    premier.append(el('div', { class: 'rang-btn no-print' }, amorce));
    c.append(premier);
    return;
  }

  // Doublons lisibles : nommés, avec l'archivage de l'un ou de l'autre à portée de main (l'archivage
  // libère le code, ecrireMarqueur ne contrôle l'unicité que parmi les non archivés).
  const enDouble = doublons(vocabulaire);
  if (enDouble.size) {
    const alerte = carte('Codes en double',
      'Une sauvegarde restaurée contient des marqueurs actifs qui partagent le même code court. Tant que le doublon existe, aucun des deux ne peut être modifié : archivez l’un des deux pour libérer le code.');
    for (const groupe of enDouble.values()) {
      alerte.append(el('p', {}, `Code « ${groupe[0].court} » : ${nomsGuillemets(groupe)}.`));
      const rang = el('div', { class: 'rang-btn no-print' });
      for (const m of groupe) {
        const b = el('button', { class: 'btn', type: 'button' }, `Archiver « ${m.libelle} »`);
        b.addEventListener('click', () => basculerArchive(c, m));
        rang.append(b);
      }
      alerte.append(rang);
    }
    c.append(alerte);
  }

  for (const genre of GENRES) {
    const duGenre = vocabulaire.filter((m) => genreAffiche(m) === genre).sort(trier);
    if (!duGenre.length) continue;
    c.append(el('h2', { class: 'mq-genre' }, LIBELLES_GENRE[genre]));
    for (const m of duGenre) c.append(carteMarqueur(c, m, enDouble.get(cleCourt(m.court)) && m.archivee !== true ? enDouble.get(cleCourt(m.court)) : null));
  }
}

async function formulaire(c, idBrut) {
  let id = idBrut;
  try { id = idBrut === undefined ? undefined : decodeURIComponent(idBrut); } catch { /* id illisible : introuvable ci-dessous */ }
  const existant = id !== undefined ? await lire('marqueurs', id) : null;
  c.append(retour('#/marqueurs'));
  if (id !== undefined && !existant) { c.append(carte('Marqueur introuvable')); return; }
  const vocabulaire = await tous('marqueurs');

  const bloc = carte(existant ? 'Modifier le marqueur' : 'Nouveau marqueur');
  const inpLibelle = el('input', { type: 'text', id: 'mq-libelle', maxlength: '40', autocomplete: 'off' });
  inpLibelle.value = existant?.libelle ?? '';
  const inpCourt = el('input', { type: 'text', id: 'mq-court', maxlength: '3', autocapitalize: 'characters', autocomplete: 'off', spellcheck: 'false' });
  inpCourt.value = existant?.court ?? '';

  // Genre : choisi à la création, VERROUILLÉ ensuite (décision 13 : changer de sens = nouveau marqueur).
  const selGenre = el('select', { id: 'mq-genre' }, ...GENRES.map((g) => el('option', { value: g }, LIBELLES_GENRE[g])));
  if (existant && !GENRES.includes(existant.genre)) {
    selGenre.append(el('option', { value: '' }, 'Inconnu (rangé avec les comportements)'));
    selGenre.value = '';
  } else {
    selGenre.value = existant?.genre ?? 'role';
  }
  const champGenre = champ('mq-genre', 'Genre', selGenre);
  if (existant) {
    selGenre.disabled = true;
    champGenre.append(el('p', { class: 'note-inline' }, 'Le genre ne change pas : créez un nouveau marqueur.'));
  }

  const selCouleur = el('select', { id: 'mq-couleur' }, ...COULEURS.map((v) => el('option', { value: v }, v)));
  selCouleur.value = existant ? (COULEURS.includes(existant.couleur) ? existant.couleur : 'gris') : 'bleu';
  const champCouleur = champ('mq-couleur', 'Couleur', selCouleur);
  const noteCouleur = el('p', { class: 'note-inline' }, 'Les comportements n’affichent pas de couleur sur la carte.');

  // Aperçu vivant : exactement les nœuds de la carte d'élève, recalculés à chaque frappe.
  const apercu = el('span', { class: 'mq-apercu' });
  const genreCourant = () => (existant ? existant.genre : selGenre.value);
  // Majuscules (§6.5) : AFFICHÉES par le CSS (text-transform sur #mq-court), APPLIQUÉES à la valeur
  // dans l'aperçu et à l'enregistrement — jamais en réécrivant le champ pendant la frappe : un clavier
  // qui compose le mot (type Gboard) doublait alors les lettres (« arb » → « AARARB », revue v0.14.1, R1).
  const courtSaisi = () => inpCourt.value.trim().toLocaleUpperCase('fr');
  function majApercu() {
    const comportement = genreAffiche({ genre: genreCourant() }) === 'comportement';
    champCouleur.hidden = comportement;
    noteCouleur.hidden = !comportement;
    apercu.replaceChildren(...apercuCarte({ court: courtSaisi() || '?', genre: genreCourant(), couleur: selCouleur.value }));
  }
  inpCourt.addEventListener('input', majApercu);
  selGenre.addEventListener('change', majApercu);
  selCouleur.addEventListener('change', majApercu);

  const statut = el('p', { role: 'status', class: 'statut' });
  // Un marqueur en double (sauvegarde bricolée) ne peut être enregistré qu'avec un autre code : le dire
  // dès l'ouverture, en nommant l'autre marqueur, plutôt qu'au refus.
  const conseilDoublon = () => {
    if (!existant || existant.archivee === true) return '';
    const autres = vocabulaire.filter((m) => m.id !== existant.id && m.archivee !== true && cleCourt(m.court) === cleCourt(existant.court));
    return autres.length
      ? `Code « ${existant.court} » en double avec ${nomsGuillemets(autres)} : changez ce code, ou archivez l’un des deux depuis la liste.`
      : '';
  };
  const avertir = (texte) => { statut.textContent = texte; statut.className = texte ? 'statut statut-erreur' : 'statut'; };
  if (existant && !GENRES.includes(existant.genre)) {
    avertir('Genre inconnu (sauvegarde d’une autre version) : ce marqueur reste lisible, mais il ne peut être ni modifié ni archivé ici.');
  } else {
    avertir(conseilDoublon());
  }

  const sauver = el('button', { type: 'submit', class: 'btn btn-principal' }, 'Enregistrer le marqueur');
  const form = el('form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sauver.getAttribute('aria-disabled') === 'true') return;
    sauver.setAttribute('aria-disabled', 'true');
    // Le formulaire ne transmet que libellé, code et couleur — et le genre à la création seulement (§4.4).
    const modifs = { libelle: inpLibelle.value.trim(), court: courtSaisi(), couleur: selCouleur.value };
    if (!existant) modifs.genre = selGenre.value;
    try {
      await ecrireMarqueur(existant ? existant.id : crypto.randomUUID(), modifs);
      location.hash = '#/marqueurs';
      toast('Marqueur enregistré.');
    } catch (err) {
      // Refus : rien n'est écrit, la saisie reste à l'écran, le motif est dit (§6.5).
      const conseil = conseilDoublon();
      avertir(`Non enregistré : ${err?.message || err}${conseil ? `. ${conseil}` : ''}`);
    } finally {
      sauver.removeAttribute('aria-disabled');
    }
  });
  bloc.append(
    champ('mq-libelle', 'Libellé', inpLibelle),
    el('div', { class: 'champ' }, el('label', { for: 'mq-court' }, 'Code court (3 caractères au plus)'),
      el('div', { class: 'mq-ligne-code' }, inpCourt, el('span', { class: 'note-inline' }, 'Sur la carte :'), apercu)),
    champGenre, champCouleur, noteCouleur, statut, el('div', { class: 'rang-btn' }, sauver));
  form.append(bloc);
  c.append(form);
  majApercu();
}

export function initialiser() {
  enregistrerVue('marqueurs', async (c, p = []) => {
    if (p[0] === 'nouveau') await formulaire(c);
    else if (p[0] === 'modifier') await formulaire(c, p[1] ?? '');
    else await liste(c);
  });
}
