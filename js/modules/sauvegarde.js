// modules/sauvegarde.js — export / import JSON complet + purge (phase 1).
// L'export est LE mécanisme de transfert PC ↔ Android et le filet de sécurité
// avant toute opération destructrice (BIBLE règle 4).

import { enregistrerVue, el, carte, confirmer, toast } from '../ui.js';
import { exporterJSON, importerJSON, validerExport, telechargerJSON, compterTout, vider, STORES } from '../io.js';

// [singulier, pluriel] par store — tout store de données doit figurer ici (sinon il
// disparaît du résumé affiché avant un import qui REMPLACE tout). `meta` exclu (réglages).
const LIBELLES = {
  classes: ['classe', 'classes'],
  eleves: ['élève', 'élèves'],
  edt: ['créneau EDT', 'créneaux EDT'],
  sequences: ['séquence', 'séquences'],
  seances: ['séance', 'séances'],
  appels: ['appel', 'appels'],
  inaptitudes: ['inaptitude', 'inaptitudes'],
  certificats: ['certificat', 'certificats'],
  fichiers: ['pièce jointe', 'pièces jointes'],
  evaluations: ['évaluation', 'évaluations'],
  notes: ['note', 'notes'],
  documents: ['document', 'documents'],
  observations: ['observation', 'observations'],
};

function resumeComptes(comptes) {
  const parties = Object.entries(LIBELLES)
    .filter(([nom]) => comptes[nom] > 0)
    .map(([nom, [sing, plur]]) => `${comptes[nom]} ${comptes[nom] > 1 ? plur : sing}`);
  return parties.length ? parties.join(' · ') : 'aucune donnée pour l’instant';
}

function statut(elem, message, ok = true) {
  elem.textContent = message;
  elem.className = ok ? 'statut statut-ok' : 'statut statut-erreur';
}

export function initialiser() {
  enregistrerVue('sauvegarde', async (c) => {
    c.append(el('a', { class: 'retour', href: '#/plus' }, '← Retour'));

    // ---- État actuel ----
    const carteEtat = carte('Données sur cet appareil', '…');
    c.append(carteEtat);
    compterTout().then((comptes) => {
      carteEtat.querySelector('p').textContent = resumeComptes(comptes);
    });

    // ---- Export ----
    const carteExp = carte('Exporter', 'Télécharge un fichier JSON contenant toutes les données. À conserver précieusement : c’est la seule sauvegarde possible (app 100 % locale).');
    const chkFichiers = el('input', { type: 'checkbox', id: 'export-fichiers' });
    chkFichiers.checked = true;
    const statutExp = el('p', { class: 'statut' });
    const btnExp = el('button', { class: 'btn btn-principal' }, 'Télécharger la sauvegarde');
    btnExp.addEventListener('click', async () => {
      btnExp.disabled = true;
      try {
        const objet = await exporterJSON({ avecFichiers: chkFichiers.checked });
        const nomFichier = await telechargerJSON(objet, 'sauvegarde');
        statut(statutExp, `Sauvegarde téléchargée : ${nomFichier}`);
      } catch (e) {
        statut(statutExp, `Échec de l’export : ${e.message}`, false);
      } finally {
        btnExp.disabled = false;
      }
    });
    carteExp.append(
      el('label', { class: 'ligne-option', for: 'export-fichiers' }, chkFichiers, ' Inclure les pièces jointes (photos de certificats…)'),
      el('div', { class: 'rang-btn' }, btnExp),
      statutExp,
    );
    c.append(carteExp);

    // ---- Import ----
    const carteImp = carte('Importer', 'Restaure une sauvegarde JSON. Remplace TOUTES les données de cet appareil (une sauvegarde de sécurité est téléchargée automatiquement avant).');
    const inputFichier = el('input', { type: 'file', accept: 'application/json,.json', class: 'champ-fichier', 'aria-label': 'Fichier de sauvegarde à importer' });
    const statutImp = el('p', { class: 'statut' });
    inputFichier.addEventListener('change', async () => {
      const fichier = inputFichier.files[0];
      if (!fichier) return;
      try {
        const objet = JSON.parse(await fichier.text());
        const { date, comptes } = validerExport(objet);
        const total = Object.values(comptes).reduce((a, b) => a + b, 0);
        const ok1 = await confirmer({
          titre: 'Importer cette sauvegarde',
          message: `Sauvegarde du ${date} — ${total} enregistrements (${resumeComptes(comptes)}). L’import REMPLACE toutes les données de cet appareil.`,
          action: 'Importer',
        });
        if (!ok1) return;
        await telechargerJSON(await exporterJSON({ avecFichiers: true }), 'avant-import');
        const ok2 = await confirmer({
          titre: 'Confirmer le remplacement',
          message: 'Une sauvegarde de sécurité vient d’être téléchargée. Remplacer définitivement les données de cet appareil ?',
          action: 'Remplacer',
        });
        if (!ok2) return;
        await importerJSON(objet);
        toast('Import terminé — rechargement…');
        setTimeout(() => location.reload(), 900);
      } catch (e) {
        statut(statutImp, `Import impossible : ${e.message}`, false);
      } finally {
        inputFichier.value = '';
      }
    });
    carteImp.append(inputFichier, statutImp);
    c.append(carteImp);

    // ---- Purge ----
    const cartePurge = carte('Tout effacer', 'Efface définitivement toutes les données de cet appareil (fin d’année, changement de poste…). Une sauvegarde de sécurité est téléchargée automatiquement avant.');
    const btnPurge = el('button', { class: 'btn btn-danger' }, 'Effacer toutes les données');
    btnPurge.addEventListener('click', async () => {
      const ok1 = await confirmer({
        titre: 'Tout effacer',
        message: 'Effacer toutes les données de cet appareil ? Une sauvegarde de sécurité va d’abord être téléchargée.',
        action: 'Continuer',
      });
      if (!ok1) return;
      await telechargerJSON(await exporterJSON({ avecFichiers: true }), 'avant-purge');
      const ok2 = await confirmer({
        titre: 'Confirmer l’effacement',
        message: 'Sauvegarde téléchargée. Effacer DÉFINITIVEMENT toutes les données de cet appareil ?',
        action: 'Tout effacer',
      });
      if (!ok2) return;
      for (const nom of STORES) await vider(nom);
      toast('Données effacées — rechargement…');
      setTimeout(() => location.reload(), 900);
    });
    cartePurge.append(el('div', { class: 'rang-btn' }, btnPurge));
    c.append(cartePurge);
  });
}
