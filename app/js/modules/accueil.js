// modules/accueil.js — tableau de bord « Aujourd'hui » (phase 7).
// Répond sans aucun clic à : quel cours maintenant, qu'est-ce qui m'attend, où reprendre.
// 1. « En ce moment » : EDT × heure × parité A/B × séquence active, création séance + appel en un tap.
// 2. Alertes agrégées : inaptitudes expirant (J-7) ou venant de finir, seuils tenue/dispenses,
//    évaluations notées non remontées vers Pronote.
// 3. Reprendre : dernière classe ouverte, dernière évaluation.

import { enregistrerVue, el, carte } from '../ui.js';
import { tous, lire, parIndex, enregistrer } from '../io.js';
import { coursDuJour, semaineCourante, enMinutes, isoAujourdhui, collecterAlertes } from '../metier.js';
import { etat } from '../state.js';

// ---------------------------------------------------------------------------
// Carte « En ce moment / Prochain cours »
// ---------------------------------------------------------------------------

async function carteMaintenant() {
  const maintenant = new Date();
  const isoJour = isoAujourdhui();
  const minutes = maintenant.getHours() * 60 + maintenant.getMinutes();
  const cours = await coursDuJour(maintenant);

  if (!cours.length) {
    const cVide = carte('Aujourd’hui', 'Pas de cours EPS aujourd’hui.');
    if (!(await tous('edt')).length) {
      cVide.querySelector('p').textContent = 'Aucun créneau dans l’emploi du temps pour l’instant.';
      cVide.append(el('div', { class: 'rang-btn' }, el('a', { class: 'btn', href: '#/edt' }, 'Saisir mon EDT')));
    }
    return cVide;
  }

  const enCours = cours.find((cr) => enMinutes(cr.heureDebut) <= minutes && minutes < enMinutes(cr.heureFin));
  const aVenir = cours.find((cr) => enMinutes(cr.heureDebut) > minutes);
  const creneau = enCours || aVenir;

  if (!creneau) return carte('Aujourd’hui', 'Les cours de la journée sont terminés.');

  const classe = await lire('classes', creneau.classeId);
  const sem = await semaineCourante(maintenant);
  const cM = carte(enCours ? 'En ce moment' : `À ${creneau.heureDebut}`, '', sem ? `semaine ${sem}` : '');
  cM.append(el('p', { class: 'maintenant-cours' },
    el('strong', {}, classe ? classe.nom : 'Classe ?'),
    ` · ${creneau.heureDebut}–${creneau.heureFin}`,
    creneau.installation ? ` · ${creneau.installation}` : '',
  ));

  const sequences = (await parIndex('sequences', 'classeId', creneau.classeId))
    .filter((s) => (!s.dateDebut || s.dateDebut <= isoJour) && (!s.dateFin || isoJour <= s.dateFin));
  const sequence = sequences[0];
  if (sequences.length > 1) {
    cM.append(el('p', { class: 'note-discrete' },
      `⚠ ${sequences.length} séquences actives pour cette classe (dates qui se chevauchent) — « ${sequence.apsa} » est utilisée. À vérifier dans Plus → Séquences.`));
  }

  if (!sequence) {
    cM.append(
      el('p', {}, 'Aucune séquence en cours pour cette classe à cette date.'),
      el('div', { class: 'rang-btn' }, el('a', { class: 'btn', href: '#/sequences' }, 'Créer une séquence')),
    );
    return cM;
  }

  const seances = (await parIndex('seances', 'sequenceId', sequence.id)).sort((a, b) => a.date.localeCompare(b.date));
  const duJour = seances.find((s) => s.date === isoJour);
  const total = sequence.nbSeancesPrevu || '?';

  if (duJour) {
    const numero = seances.indexOf(duJour) + 1;
    cM.append(
      el('p', {}, `${sequence.apsa} — séance ${numero}/${total}${duJour.theme ? ` · ${duJour.theme}` : ''}`),
      el('div', { class: 'rang-btn' },
        el('a', { class: 'btn btn-principal', href: `#/appel/${duJour.id}` }, 'Faire l’appel'),
        el('a', { class: 'btn', href: `#/sequences/${sequence.id}` }, 'Séquence'),
      ),
    );
  } else {
    const numero = seances.filter((s) => s.date < isoJour).length + 1;
    const btnCreer = el('button', { class: 'btn btn-principal' }, `Créer la séance ${numero}/${total} et faire l’appel`);
    btnCreer.addEventListener('click', async () => {
      const nouvelle = {
        id: crypto.randomUUID(), sequenceId: sequence.id, date: isoJour,
        edtId: creneau.id, numero, theme: '', bilan: '', annulee: false,
      };
      await enregistrer('seances', nouvelle);
      location.hash = `#/appel/${nouvelle.id}`;
    });
    cM.append(
      el('p', {}, `${sequence.apsa} — prochaine séance : ${numero}/${total}`),
      el('div', { class: 'rang-btn' }, btnCreer, el('a', { class: 'btn', href: `#/sequences/${sequence.id}` }, 'Séquence')),
    );
  }

  const suivants = cours.filter((cr) => enMinutes(cr.heureDebut) > enMinutes(creneau.heureDebut));
  if (suivants.length) {
    const classes = await tous('classes');
    const nomDe = (id) => classes.find((cl) => cl.id === id)?.nom || '?';
    cM.append(el('p', { class: 'note-discrete' }, 'Ensuite : ' + suivants.map((cr) => `${cr.heureDebut} ${nomDe(cr.classeId)}`).join(' · ')));
  }
  return cM;
}

// ---------------------------------------------------------------------------
// Carte « Alertes »
// ---------------------------------------------------------------------------

async function carteAlertes() {
  const alertes = await collecterAlertes();
  const carteA = carte('Alertes');
  if (!alertes.length) {
    carteA.append(el('p', {}, 'Rien à signaler ✓'));
  } else {
    for (const a of alertes.slice(0, 8)) {
      carteA.append(el('a', { class: 'ligne-eleve', href: a.href },
        el('span', { class: 'badge' + (a.grave ? ' badge-alerte' : '') }, a.grave ? '⚠' : 'ℹ'),
        el('span', { class: 'ligne-eleve-nom' }, a.texte),
        el('span', { class: 'chevron pousse-droite', 'aria-hidden': 'true' }, '›'),
      ));
    }
    if (alertes.length > 8) carteA.append(el('p', { class: 'note-discrete' }, `… et ${alertes.length - 8} autre(s)`));
  }
  return carteA;
}

// ---------------------------------------------------------------------------
// Carte « Reprendre » (raccourcis)
// ---------------------------------------------------------------------------

async function carteReprendre() {
  const boutons = [];
  if (etat.prefs.derniereClasseId) {
    const cl = await lire('classes', etat.prefs.derniereClasseId);
    if (cl) boutons.push(el('a', { class: 'btn', href: `#/eleves/classe/${cl.id}` }, `Classe ${cl.nom}`));
  }
  if (etat.prefs.derniereEvalId) {
    const ev = await lire('evaluations', etat.prefs.derniereEvalId);
    if (ev) boutons.push(el('a', { class: 'btn', href: `#/notes/eval/${ev.id}` }, `Éval. « ${ev.titre} »`));
  }
  if (!boutons.length) return null;
  const cR = carte('Reprendre');
  cR.append(el('div', { class: 'rang-btn' }, ...boutons));
  return cR;
}

// ---------------------------------------------------------------------------

export function initialiser() {
  enregistrerVue('accueil', async (c) => {
    c.append(await carteMaintenant());
    c.append(await carteAlertes());
    const reprendre = await carteReprendre();
    if (reprendre) c.append(reprendre);
  });
}
