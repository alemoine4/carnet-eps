// modules/edt.js — emploi du temps EPS (phase 3) : créneaux hebdomadaires,
// alternance semaines A/B, installations. Spécification : docs/fonctionnalites.md §2.
// La carte « En ce moment » vit dans modules/accueil.js (phase 7).
// Limite v1 assumée : l'alternance A/B suit la parité calendaire depuis le
// lundi de référence (les vacances ne décalent pas l'alternance).

import { enregistrerVue, el, carte, champTexte, confirmer, toast } from '../ui.js';
import { tous, enregistrer, supprimer, lireMeta, ecrireMeta } from '../io.js';
import { enMinutes, semaineCourante } from '../metier.js';

const JOURS = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const INSTALLATIONS = ['Gymnase', 'Plateau extérieur', 'Stade', 'Piscine', 'Salle polyvalente', 'Dojo'];

const trierClasses = (a, b) => a.nom.localeCompare(b.nom, 'fr', { numeric: true });

// ---------------------------------------------------------------------------
// Vue EDT
// ---------------------------------------------------------------------------

async function vueEDT(c) {
  const rafraichir = () => { c.innerHTML = ''; return vueEDT(c); };
  const classes = (await tous('classes')).filter((cl) => !cl.archivee).sort(trierClasses);
  const creneaux = await tous('edt');

  // --- Alternance A/B ---
  const ref = await lireMeta('semaineAReference', '');
  const sem = await semaineCourante();
  const utiliseAB = creneaux.some((cr) => cr.semaine !== 'AB');
  const carteSem = carte('Alternance A / B',
    ref ? `Cette semaine est une semaine ${sem}.`
      : (utiliseAB ? '⚠ Des créneaux A/B existent mais la semaine de référence n’est pas définie : indiquez un lundi d’une semaine A.'
        : 'Si votre EDT alterne sur deux semaines, indiquez un lundi d’une semaine A.'));
  carteSem.append(champTexte({
    id: 'edt-ref', libelle: 'Un lundi de semaine A', type: 'date', valeur: ref,
    onChange: async (v) => { await ecrireMeta('semaineAReference', v); rafraichir(); },
  }));
  c.append(carteSem);

  if (!classes.length) {
    c.append(carte('Créez d’abord vos classes', 'L’EDT relie des créneaux à des classes : commencez par l’onglet Élèves (création ou import Pronote).'));
    return;
  }

  // --- Formulaire créneau (ajout / édition) ---
  const btnAjouter = el('button', { class: 'btn btn-principal' }, '+ Ajouter un créneau');
  c.append(el('div', { class: 'barre-actions' }, btnAjouter));

  const selJour = el('select', { id: 'cr-jour' }, ...[1, 2, 3, 4, 5, 6].map((j) => el('option', { value: String(j) }, JOURS[j])));
  const inpDebut = el('input', { type: 'time', id: 'cr-debut' });
  const inpFin = el('input', { type: 'time', id: 'cr-fin' });
  const selClasse = el('select', { id: 'cr-classe' }, ...classes.map((cl) => el('option', { value: cl.id }, cl.nom)));
  const selSemaine = el('select', { id: 'cr-semaine' },
    el('option', { value: 'AB' }, 'Toutes les semaines'),
    el('option', { value: 'A' }, 'Semaine A'),
    el('option', { value: 'B' }, 'Semaine B'),
  );
  const inpInstal = el('input', { type: 'text', id: 'cr-instal', list: 'liste-installations', placeholder: 'Gymnase, plateau…', autocomplete: 'off' });
  const datalist = el('datalist', { id: 'liste-installations' }, ...INSTALLATIONS.map((i) => el('option', { value: i })));
  const statutForm = el('p', { class: 'statut' });
  const btnEnregistrer = el('button', { class: 'btn btn-principal' }, 'Enregistrer');
  const btnSupprimer = el('button', { class: 'btn btn-danger' }, 'Supprimer');
  const formCarte = carte('Créneau');
  const champF = (id, libelle, controle) => el('div', { class: 'champ' }, el('label', { for: id }, libelle), controle);
  formCarte.append(
    champF('cr-jour', 'Jour', selJour),
    el('div', { class: 'rang-2' },
      champF('cr-debut', 'Début', inpDebut),
      champF('cr-fin', 'Fin', inpFin),
    ),
    champF('cr-classe', 'Classe', selClasse),
    champF('cr-semaine', 'Semaine', selSemaine),
    champF('cr-instal', 'Installation', inpInstal),
    datalist,
    el('div', { class: 'rang-btn' }, btnEnregistrer, btnSupprimer),
    statutForm,
  );
  formCarte.hidden = true;
  c.append(formCarte);

  let enEdition = null; // créneau en cours d'édition (null = ajout)
  const ouvrirForm = (creneau = null) => {
    enEdition = creneau;
    formCarte.hidden = false;
    formCarte.querySelector('h2').textContent = creneau ? 'Modifier le créneau' : 'Nouveau créneau';
    btnSupprimer.hidden = !creneau;
    selJour.value = String(creneau?.jour ?? 1);
    inpDebut.value = creneau?.heureDebut || '08:00';
    inpFin.value = creneau?.heureFin || '09:00';
    selClasse.value = creneau?.classeId || classes[0].id;
    selSemaine.value = creneau?.semaine || 'AB';
    inpInstal.value = creneau?.installation || '';
    statutForm.textContent = '';
    formCarte.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
  btnAjouter.addEventListener('click', () => (formCarte.hidden ? ouvrirForm() : (formCarte.hidden = true)));
  btnEnregistrer.addEventListener('click', async () => {
    if (!inpDebut.value || !inpFin.value || enMinutes(inpFin.value) <= enMinutes(inpDebut.value)) {
      statutForm.textContent = 'Heures invalides (la fin doit être après le début).';
      statutForm.className = 'statut statut-erreur';
      return;
    }
    const rec = {
      id: enEdition?.id || crypto.randomUUID(),
      jour: Number(selJour.value),
      heureDebut: inpDebut.value,
      heureFin: inpFin.value,
      classeId: selClasse.value,
      semaine: selSemaine.value,
      installation: inpInstal.value.trim(),
    };
    // Chevauchement (même jour, plages qui se croisent, semaines compatibles A/B/AB) :
    // on enregistre quand même — un prof peut avoir 2 classes en barrette — mais on prévient.
    const chevauche = creneaux.find((cr) => cr.id !== rec.id && cr.jour === rec.jour
      && (cr.semaine === 'AB' || rec.semaine === 'AB' || cr.semaine === rec.semaine)
      && enMinutes(rec.heureDebut) < enMinutes(cr.heureFin) && enMinutes(cr.heureDebut) < enMinutes(rec.heureFin));
    await enregistrer('edt', rec);
    rafraichir();
    if (chevauche) {
      const cl = classes.find((x) => x.id === chevauche.classeId);
      toast(`⚠ Ce créneau chevauche ${JOURS[chevauche.jour]} ${chevauche.heureDebut}–${chevauche.heureFin} (${cl?.nom || '?'}). Enregistré quand même.`);
    }
  });
  btnSupprimer.addEventListener('click', async () => {
    if (!enEdition) return;
    if (!(await confirmer({ titre: 'Supprimer le créneau', message: 'Les séances déjà créées seront conservées.' }))) return;
    const creneau = enEdition;
    await supprimer('edt', enEdition.id);
    rafraichir();
    toast('Créneau supprimé', { action: async () => { await enregistrer('edt', creneau); rafraichir(); } });
  });

  // --- Semaine (liste par jour) ---
  if (!creneaux.length) {
    c.append(carte('EDT vide', 'Ajoutez vos créneaux hebdomadaires : jour, heures, classe, semaine A/B, installation.'));
    return;
  }
  const aujourdHui = ((new Date().getDay() + 6) % 7) + 1;
  const grille = el('div', { class: 'grille-edt' });
  for (let jour = 1; jour <= 7; jour++) {
    const slots = creneaux.filter((cr) => cr.jour === jour).sort((a, b) => enMinutes(a.heureDebut) - enMinutes(b.heureDebut));
    if (!slots.length) continue;
    const section = el('section', { class: 'jour-section carte' });
    const h = el('h2', {}, JOURS[jour]);
    if (jour === aujourdHui) h.append(el('span', { class: 'badge badge-accent' }, 'aujourd’hui'));
    section.append(h);
    for (const cr of slots) {
      const classe = classes.find((cl) => cl.id === cr.classeId);
      const pastille = el('span', { class: 'pastille', 'aria-hidden': 'true' });
      pastille.style.background = classe?.couleur || 'var(--c-accent)';
      const ligne = el('button', { class: 'ligne-edt', onclick: () => ouvrirForm(cr) },
        el('span', { class: 'edt-heures' }, `${cr.heureDebut}–${cr.heureFin}`),
        pastille,
        el('span', { class: 'edt-classe' }, classe?.nom || 'Classe ?'),
        cr.installation ? el('span', { class: 'edt-instal' }, cr.installation) : '',
        cr.semaine !== 'AB' ? el('span', { class: 'badge' }, `sem. ${cr.semaine}`) : '',
      );
      section.append(ligne);
    }
    grille.append(section);
  }
  c.append(grille);
}

export function initialiser() {
  enregistrerVue('edt', (c) => vueEDT(c));
}
