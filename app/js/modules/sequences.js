// modules/sequences.js — séquences (classe × APSA × CA × dates) et séances
// numérotées automatiquement (phase 3). Spécification : docs/fonctionnalites.md §3.
// Le numéro d'une séance est calculé par ordre de date (pas de renumérotation à gérer).
// Le bilan de séance se saisira depuis l'écran d'appel (phase 4).

import { enregistrerVue, el, carte, champTexte, champSelect, champZone, confirmer, toast } from '../ui.js';
import {
  tous, lire, parIndex, enregistrer,
  supprimerSeanceEnCascade, supprimerSequenceEnCascade,
  apercuSuppressionSequence, detailSuppression, restaurer,
} from '../io.js';
import { dateFR, isoAujourdhui } from '../metier.js';

const APSA_COURANTES = [
  'Demi-fond', 'Course de haies', 'Relais-vitesse', 'Javelot', 'Saut en hauteur', 'Natation de vitesse',
  'Course d’orientation', 'Escalade', 'Savoir nager',
  'Danse', 'Acrosport', 'Gymnastique', 'Arts du cirque',
  'Badminton', 'Tennis de table', 'Boxe française', 'Lutte',
  'Basket-ball', 'Handball', 'Volley-ball', 'Football', 'Ultimate', 'Rugby',
];
const CA_OPTIONS = [
  { value: '', label: '—' },
  { value: '1', label: 'CA1 · Performance' },
  { value: '2', label: 'CA2 · Pleine nature' },
  { value: '3', label: 'CA3 · Artistique / acrobatique' },
  { value: '4', label: 'CA4 · Opposition' },
];

const trierClasses = (a, b) => a.nom.localeCompare(b.nom, 'fr', { numeric: true });

function estActive(s, jour = isoAujourdhui()) {
  return (!s.dateDebut || s.dateDebut <= jour) && (!s.dateFin || jour <= s.dateFin);
}

// ---------------------------------------------------------------------------
// Vue : liste des séquences
// ---------------------------------------------------------------------------

async function vueListe(c) {
  const rafraichir = () => { c.innerHTML = ''; return vueListe(c); };
  c.append(el('a', { class: 'retour', href: '#/plus' }, '← Retour'));
  const classes = (await tous('classes')).filter((cl) => !cl.archivee).sort(trierClasses);
  const sequences = await tous('sequences');
  const seances = await tous('seances');

  if (!classes.length) {
    c.append(carte('Créez d’abord vos classes', 'Une séquence relie une classe à une APSA : commencez par l’onglet Élèves.'));
    return;
  }

  // --- Formulaire nouvelle séquence ---
  const btnNouvelle = el('button', { class: 'btn btn-principal' }, '+ Nouvelle séquence');
  c.append(el('div', { class: 'barre-actions' }, btnNouvelle));

  const selClasse = el('select', { id: 'sq-classe' }, ...classes.map((cl) => el('option', { value: cl.id }, cl.nom)));
  const inpApsa = el('input', { type: 'text', id: 'sq-apsa', list: 'liste-apsa', placeholder: 'Badminton, Demi-fond…', autocomplete: 'off' });
  const datalist = el('datalist', { id: 'liste-apsa' }, ...APSA_COURANTES.map((a) => el('option', { value: a })));
  const selCA = el('select', { id: 'sq-ca' }, ...CA_OPTIONS.map((o) => el('option', { value: o.value }, o.label)));
  const inpDebut = el('input', { type: 'date', id: 'sq-debut' });
  const inpFin = el('input', { type: 'date', id: 'sq-fin' });
  const inpNb = el('input', { type: 'number', id: 'sq-nb', min: '1', max: '30', value: '10' });
  const statutForm = el('p', { class: 'statut' });
  const btnCreer = el('button', { class: 'btn btn-principal' }, 'Créer la séquence');
  const champF = (id, libelle, controle) => el('div', { class: 'champ' }, el('label', { for: id }, libelle), controle);
  const formCarte = carte('Nouvelle séquence');
  formCarte.append(
    champF('sq-classe', 'Classe', selClasse),
    champF('sq-apsa', 'APSA *', inpApsa),
    datalist,
    champF('sq-ca', 'Champ d’apprentissage', selCA),
    el('div', { class: 'rang-2' }, champF('sq-debut', 'Début', inpDebut), champF('sq-fin', 'Fin', inpFin)),
    champF('sq-nb', 'Séances prévues', inpNb),
    el('div', { class: 'rang-btn' }, btnCreer),
    statutForm,
  );
  formCarte.hidden = true;
  c.append(formCarte);
  btnNouvelle.addEventListener('click', () => { formCarte.hidden = !formCarte.hidden; if (!formCarte.hidden) inpApsa.focus(); });
  btnCreer.addEventListener('click', async () => {
    const apsa = inpApsa.value.trim();
    if (!apsa) { statutForm.textContent = 'L’APSA est obligatoire.'; statutForm.className = 'statut statut-erreur'; return; }
    if (inpDebut.value && inpFin.value && inpFin.value < inpDebut.value) {
      statutForm.textContent = 'La date de fin est avant le début.'; statutForm.className = 'statut statut-erreur'; return;
    }
    const id = crypto.randomUUID();
    await enregistrer('sequences', {
      id, classeId: selClasse.value, apsa, ca: selCA.value ? Number(selCA.value) : null,
      afl: [], dateDebut: inpDebut.value || '', dateFin: inpFin.value || '',
      nbSeancesPrevu: Number(inpNb.value) || null, objectifs: '', bilan: '',
    });
    location.hash = `#/sequences/${id}`;
  });

  // --- Liste (séquences actives d'abord, puis par date de début décroissante) ---
  if (!sequences.length) {
    c.append(carte('Aucune séquence', 'Une séquence = une classe, une APSA, des dates. Les séances et (bientôt) l’appel et les évaluations s’y rattachent.'));
    return;
  }
  const nbSeancesDe = (id) => seances.filter((s) => s.sequenceId === id).length;
  const nomClasse = (id) => classes.find((cl) => cl.id === id)?.nom || '?';
  const couleurClasse = (id) => classes.find((cl) => cl.id === id)?.couleur;
  const triees = [...sequences].sort((a, b) =>
    (estActive(b) - estActive(a)) || String(b.dateDebut).localeCompare(String(a.dateDebut)));
  const liste = el('div', { class: 'liste-cartes' });
  for (const s of triees) {
    const morceaux = [];
    if (s.ca) morceaux.push(`CA${s.ca}`);
    if (s.dateDebut || s.dateFin) morceaux.push(`${dateFR(s.dateDebut)} → ${dateFR(s.dateFin)}`);
    morceaux.push(`${nbSeancesDe(s.id)}/${s.nbSeancesPrevu || '?'} séances`);
    const carteSeq = carte(`${nomClasse(s.classeId)} — ${s.apsa}`, morceaux.join(' · '), estActive(s) ? 'en cours' : '');
    const pastille = el('span', { class: 'pastille', 'aria-hidden': 'true' });
    pastille.style.background = couleurClasse(s.classeId) || 'var(--c-accent)';
    carteSeq.querySelector('h2').prepend(pastille);
    liste.append(el('a', { class: 'carte-lien', href: `#/sequences/${s.id}` }, carteSeq));
  }
  c.append(liste);
}

// ---------------------------------------------------------------------------
// Vue : détail d'une séquence (infos + séances)
// ---------------------------------------------------------------------------

async function vueDetail(c, id) {
  const rafraichir = () => { c.innerHTML = ''; return vueDetail(c, id); };
  const sequence = await lire('sequences', id);
  c.append(el('a', { class: 'retour', href: '#/sequences' }, '← Séquences'));
  if (!sequence) { c.append(carte('Séquence introuvable', 'Elle a peut-être été supprimée.')); return; }
  const classes = (await tous('classes')).sort(trierClasses);
  const classe = classes.find((cl) => cl.id === sequence.classeId);
  const seances = (await parIndex('seances', 'sequenceId', id)).sort((a, b) => a.date.localeCompare(b.date));
  const sauver = () => enregistrer('sequences', sequence);

  // --- Infos éditables ---
  const carteSeq = carte(`${classe?.nom || '?'} — ${sequence.apsa}`, '', estActive(sequence) ? 'en cours' : '');
  carteSeq.append(
    champTexte({ id: 'sd-apsa', libelle: 'APSA', valeur: sequence.apsa, onChange: async (v) => { if (v) { sequence.apsa = v; await sauver(); } } }),
    champSelect({
      id: 'sd-classe', libelle: 'Classe', valeur: sequence.classeId,
      options: classes.map((cl) => ({ value: cl.id, label: cl.nom })),
      onChange: async (v) => { sequence.classeId = v; await sauver(); },
    }),
    champSelect({
      id: 'sd-ca', libelle: 'Champ d’apprentissage', valeur: sequence.ca ? String(sequence.ca) : '',
      options: CA_OPTIONS,
      onChange: async (v) => { sequence.ca = v ? Number(v) : null; await sauver(); },
    }),
    el('div', { class: 'rang-2' },
      champTexte({ id: 'sd-debut', libelle: 'Début', type: 'date', valeur: sequence.dateDebut || '', onChange: async (v) => { sequence.dateDebut = v; await sauver(); } }),
      champTexte({ id: 'sd-fin', libelle: 'Fin', type: 'date', valeur: sequence.dateFin || '', onChange: async (v) => { sequence.dateFin = v; await sauver(); } }),
    ),
    champTexte({ id: 'sd-nb', libelle: 'Séances prévues', type: 'number', valeur: String(sequence.nbSeancesPrevu || ''), onChange: async (v) => { sequence.nbSeancesPrevu = Number(v) || null; await sauver(); } }),
    champZone({ id: 'sd-obj', libelle: 'Objectifs / AFL', valeur: sequence.objectifs || '', placeholder: 'AFL visés, attendus de fin de séquence…', onChange: async (v) => { sequence.objectifs = v; await sauver(); } }),
  );
  c.append(carteSeq);

  // --- Séances ---
  const total = sequence.nbSeancesPrevu || '?';
  const carteSe = carte('Séances', seances.length ? '' : 'Ajoutez les séances au fil de l’eau (ou laissez l’accueil proposer la séance du jour).');
  const inpDate = el('input', { type: 'date', id: 'se-date' });
  inpDate.value = isoAujourdhui();
  const inpTheme = el('input', { type: 'text', id: 'se-theme', placeholder: 'Thème (optionnel)', autocomplete: 'off' });
  const btnAjout = el('button', { class: 'btn btn-principal' }, 'Ajouter');
  const statutSe = el('p', { class: 'statut' });
  btnAjout.addEventListener('click', async () => {
    if (!inpDate.value) { statutSe.textContent = 'Choisissez une date.'; statutSe.className = 'statut statut-erreur'; return; }
    if (seances.some((s) => s.date === inpDate.value)) {
      statutSe.textContent = 'Une séance existe déjà à cette date.'; statutSe.className = 'statut statut-erreur'; return;
    }
    await enregistrer('seances', {
      id: crypto.randomUUID(), sequenceId: id, date: inpDate.value, edtId: null,
      numero: seances.filter((s) => s.date < inpDate.value).length + 1,
      theme: inpTheme.value.trim(), bilan: '', annulee: false,
    });
    rafraichir();
  });
  carteSe.append(el('div', { class: 'rang-2' },
    el('div', { class: 'champ' }, el('label', { for: 'se-date' }, 'Date'), inpDate),
    el('div', { class: 'champ' }, el('label', { for: 'se-theme' }, 'Thème'), inpTheme),
  ), el('div', { class: 'rang-btn' }, btnAjout), statutSe);

  if (seances.length) {
    const listeSe = el('div', { class: 'liste-eleves' });
    seances.forEach((s, idx) => {
      const btnSuppr = el('button', { class: 'btn btn-mini', 'aria-label': `Supprimer la séance du ${dateFR(s.date)}` }, '✕');
      btnSuppr.addEventListener('click', async () => {
        if (!(await confirmer({ titre: 'Supprimer la séance', message: `Séance ${idx + 1}/${total} du ${dateFR(s.date)} — son appel éventuel sera supprimé.` }))) return;
        const objets = await supprimerSeanceEnCascade(s.id);
        rafraichir();
        toast('Séance supprimée', { action: async () => { await restaurer(objets); rafraichir(); } });
      });
      listeSe.append(el('div', { class: 'ligne-eleve' },
        el('span', { class: 'badge' }, `${idx + 1}/${total}`),
        el('span', { class: 'ligne-eleve-nom' }, `${dateFR(s.date)}${s.theme ? ` · ${s.theme}` : ''}`),
        s.date === isoAujourdhui() ? el('span', { class: 'badge badge-accent' }, 'aujourd’hui') : '',
        el('span', { class: 'pousse-droite' }, btnSuppr),
      ));
    });
    carteSe.append(listeSe);
  }
  c.append(carteSe);

  // --- Suppression ---
  const carteSuppr = carte('Supprimer la séquence', 'Supprime la séquence, ses séances, leurs appels, ses évaluations et leurs notes. Pensez à une sauvegarde avant (Plus → Sauvegarde).');
  const btnSuppr = el('button', { class: 'btn btn-danger' }, 'Supprimer définitivement');
  btnSuppr.addEventListener('click', async () => {
    const comptes = await apercuSuppressionSequence(id);
    if (!(await confirmer({
      titre: `Supprimer la séquence ${sequence.apsa} ?`,
      message: `Classe ${classe?.nom || '?'}. Action définitive.`,
      detail: detailSuppression(comptes),
    }))) return;
    const objets = await supprimerSequenceEnCascade(id);
    location.hash = '#/sequences';
    toast(`Séquence ${sequence.apsa} supprimée`, { action: async () => { await restaurer(objets); location.hash = `#/sequences/${id}`; } });
  });
  carteSuppr.append(el('div', { class: 'rang-btn' }, btnSuppr));
  c.append(carteSuppr);
}

// ---------------------------------------------------------------------------

export function initialiser() {
  enregistrerVue('sequences', async (c, params = []) => {
    const [id] = params;
    if (id) return vueDetail(c, id);
    return vueListe(c);
  });
}
