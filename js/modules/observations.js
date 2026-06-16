// modules/observations.js — notes de suivi terrain par élève (v2).
// Brique réutilisable : carte « Observations » (timeline + bouton « + Observation ») affichée
// sur la fiche élève. Le formulaire est une feuille <dialog> ; suppression avec annulation (toast).

import { el, carte, ouvrirFeuille, confirmer, toast } from '../ui.js';
import { parIndex, enregistrer, supprimer, restaurer } from '../io.js';
import { TYPES_OBSERVATION, TONS_OBSERVATION, TAGS_OBSERVATION, MODELES_PHRASES, dateFR, isoAujourdhui } from '../metier.js';

// Carte complète des observations d'un élève. `rafraichir` = re-rendu de la vue hôte.
export async function carteObservations(eleveId, rafraichir, seanceId = null) {
  const observations = (await parIndex('observations', 'eleveId', eleveId))
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.dateAjout || '').localeCompare(a.dateAjout || ''));

  const carteO = carte('Observations');
  const btnAjouter = el('button', { class: 'btn btn-principal' }, '+ Observation');
  btnAjouter.addEventListener('click', () => ouvrirFormObservation(eleveId, rafraichir, seanceId));
  carteO.append(el('div', { class: 'rang-btn' }, btnAjouter));

  if (!observations.length) {
    carteO.append(el('p', { class: 'vide' }, 'Aucune observation pour l’instant.'));
    return carteO;
  }

  for (const o of observations) {
    const ligne = el('div', { class: 'obs-ligne', 'data-ton': o.ton || 'neutre' });
    const btnSuppr = el('button', { class: 'btn-mini', 'aria-label': 'Supprimer cette observation' }, '✕');
    btnSuppr.addEventListener('click', async () => {
      if (!(await confirmer({ titre: 'Supprimer l’observation', message: o.texte.length > 90 ? o.texte.slice(0, 90) + '…' : o.texte }))) return;
      await supprimer('observations', o.id);
      rafraichir();
      toast('Observation supprimée', { action: async () => { await restaurer({ observations: [o] }); rafraichir(); } });
    });
    ligne.append(
      el('div', { class: 'obs-tete' },
        el('span', { class: 'badge' }, o.type || 'Remarque'),
        el('span', { class: 'note-inline' }, dateFR(o.date)),
        el('span', { class: 'pousse-droite' }, btnSuppr),
      ),
      el('p', {}, o.texte),
    );
    if (o.tags?.length) ligne.append(el('p', { class: 'obs-tags' }, o.tags.map((t) => `#${t}`).join(' ')));
    carteO.append(ligne);
  }
  return carteO;
}

function ouvrirFormObservation(eleveId, onSaved, seanceId) {
  const selType = el('select', { id: 'obs-type' }, ...TYPES_OBSERVATION.map((t) => el('option', { value: t }, t)));
  const selTon = el('select', { id: 'obs-ton' }, ...TONS_OBSERVATION.map((t) => el('option', { value: t.cle }, t.libelle)));
  selTon.value = 'neutre';
  const zone = el('textarea', { rows: 3, placeholder: 'Ce que tu observes… (dictée possible via le micro du clavier)', 'aria-label': 'Observation' });

  const modeles = el('div', { class: 'rang-chips' }, ...MODELES_PHRASES.map((p) => {
    const b = el('button', { class: 'btn btn-statut', type: 'button' }, p);
    b.addEventListener('click', () => { zone.value = zone.value.trim() ? `${zone.value.trim()} ${p}` : p; zone.focus(); });
    return b;
  }));

  const tagsCases = TAGS_OBSERVATION.map((t) => {
    const cb = el('input', { type: 'checkbox', value: t });
    return { t, cb, ligne: el('label', { class: 'ligne-option' }, cb, ` #${t}`) };
  });

  const statut = el('p', { class: 'statut' });
  const btnSave = el('button', { class: 'btn btn-principal' }, 'Enregistrer');
  let dlg;
  btnSave.addEventListener('click', async () => {
    const texte = zone.value.trim();
    if (!texte) { statut.textContent = 'Écris quelques mots avant d’enregistrer.'; statut.className = 'statut statut-erreur'; return; }
    await enregistrer('observations', {
      id: crypto.randomUUID(),
      eleveId,
      date: isoAujourdhui(),
      type: selType.value,
      ton: selTon.value,
      tags: tagsCases.filter((x) => x.cb.checked).map((x) => x.t),
      texte,
      seanceId: seanceId || null,
      dateAjout: new Date().toISOString(),
    });
    dlg.close();
    if (onSaved) onSaved();
  });

  dlg = ouvrirFeuille({
    titre: 'Nouvelle observation',
    contenu: [
      el('div', { class: 'rang-2' },
        el('div', { class: 'champ' }, el('label', { for: 'obs-type' }, 'Type'), selType),
        el('div', { class: 'champ' }, el('label', { for: 'obs-ton' }, 'Ton'), selTon),
      ),
      el('div', { class: 'champ' }, el('label', {}, 'Observation'), zone),
      el('p', { class: 'note-discrete' }, 'Phrases rapides :'),
      modeles,
      el('p', { class: 'note-discrete' }, 'Étiquettes :'),
      ...tagsCases.map((x) => x.ligne),
      el('div', { class: 'rang-btn' }, btnSave),
      statut,
    ],
  });
}
