// modules/reglages.js — réglages (phase 1) : établissement, année scolaire,
// thème, stockage, version et mises à jour (BIBLE règle 5 : bouton MAJ visible).

import { enregistrerVue, el, carte, champTexte } from '../ui.js';
import { lireMeta, ecrireMeta } from '../io.js';
import { etat, sauverPrefs, estLocalhost, VERSION_APP } from '../state.js';
import { bornesTrimestres, dateFR, octetsLisibles } from '../metier.js';

export function initialiser() {
  enregistrerVue('reglages', async (c) => {
    c.append(el('a', { class: 'retour', href: '#/plus' }, '← Retour'));

    // ---- Établissement ----
    const carteEtab = carte('Établissement');
    carteEtab.append(
      champTexte({ id: 'reg-etab', libelle: 'Nom de l’établissement', valeur: await lireMeta('etablissement'), placeholder: 'Collège…', onChange: (v) => ecrireMeta('etablissement', v) }),
      champTexte({ id: 'reg-annee', libelle: 'Année scolaire', valeur: await lireMeta('anneeScolaire'), placeholder: '2026-2027', onChange: (v) => ecrireMeta('anneeScolaire', v) }),
    );
    c.append(carteEtab);

    // ---- Trimestres (D012 : alertes sur le cumul de l'année, vision par trimestre) ----
    const carteTri = carte('Trimestres', 'Bornes utilisées par la fiche élève, les récapitulatifs et les alertes. Laisser vide = 15/12 et 15/03 (l’année scolaire court du 1er août au 31 juillet).');
    // Une borne hors année scolaire ou dans le mauvais ordre était ignorée SANS le dire, tout en
    // restant affichée dans le champ (audit 2026-09-07, V2-02/D-10) : refus à la saisie (✗ + motif)
    // et note sous le champ quand la valeur enregistrée n'est pas celle appliquée.
    let bornes = await bornesTrimestres();
    // L'ordre est vérifié contre la borne voisine ENREGISTRÉE (si elle est dans l'année), pas contre
    // la borne effective : sinon une saisie pouvait être acceptée (« ✓ ») et rester ignorée parce
    // que la voisine stockée, inversée, faisait retomber les deux aux défauts (revue du lot 1).
    const voisineStockee = async (cle) => {
      const v = await lireMeta(cle === 'finTrimestre1' ? 'finTrimestre2' : 'finTrimestre1', '');
      const dansAnnee = /^\d{4}-\d{2}-\d{2}$/.test(v) && v >= `${bornes.annee}-09-01` && v <= bornes.fin; // même plancher que metier.js (D-10)
      return dansAnnee ? v : (cle === 'finTrimestre1' ? bornes.finT2 : bornes.finT1);
    };
    const verifier = async (cle, v) => {
      if (!v) return;
      // Une fin de trimestre en août (faute de frappe pour décembre) basculerait toutes les séances
      // de l'automne en T2 : plancher au 1er septembre, l'année des cumuls restant au 1er août (D-10).
      if (v < `${bornes.annee}-09-01` || v > bornes.fin) throw new Error(`date hors de l’année scolaire ${bornes.annee}-${bornes.annee + 1} (du 1er septembre au 31 juillet)`);
      const autre = await voisineStockee(cle);
      const aide = ' — videz l’autre borne pour repartir des valeurs par défaut';
      if (cle === 'finTrimestre1' && v >= autre) throw new Error(`la fin du 1er trimestre doit précéder celle du 2e (${dateFR(autre)})${aide}`);
      if (cle === 'finTrimestre2' && v <= autre) throw new Error(`la fin du 2e trimestre doit suivre celle du 1er (${dateFR(autre)})${aide}`);
    };
    const notes = { finTrimestre1: el('p', { class: 'statut statut-erreur' }), finTrimestre2: el('p', { class: 'statut statut-erreur' }) };
    // Notes recalculées après chaque enregistrement : figées au rendu, elles affirmaient encore
    // « ignorée » après la correction de la borne (revue du lot 1).
    const majNotes = async () => {
      bornes = await bornesTrimestres();
      for (const [cle, appliquee] of [['finTrimestre1', bornes.finT1], ['finTrimestre2', bornes.finT2]]) {
        const valeur = await lireMeta(cle, '');
        notes[cle].textContent = valeur && valeur !== appliquee
          ? `Valeur enregistrée ignorée (hors année scolaire ou ordre inversé) — ${dateFR(appliquee)} utilisé.` : '';
      }
    };
    const enregistrerBorne = async (cle, v) => {
      await verifier(cle, v);
      await ecrireMeta(cle, v);
      await majNotes();
    };
    await majNotes();
    carteTri.append(
      champTexte({ id: 'reg-t1', libelle: 'Fin du 1er trimestre', type: 'date', valeur: await lireMeta('finTrimestre1', ''), onChange: (v) => enregistrerBorne('finTrimestre1', v) }),
      notes.finTrimestre1,
      champTexte({ id: 'reg-t2', libelle: 'Fin du 2e trimestre', type: 'date', valeur: await lireMeta('finTrimestre2', ''), onChange: (v) => enregistrerBorne('finTrimestre2', v) }),
      notes.finTrimestre2,
    );
    c.append(carteTri);

    // ---- Apparence ----
    const carteTheme = carte('Apparence');
    const selTheme = el('select', { id: 'reg-theme' },
      el('option', { value: 'auto' }, 'Automatique (suit l’appareil)'),
      el('option', { value: 'clair' }, 'Clair'),
      el('option', { value: 'sombre' }, 'Sombre'),
    );
    selTheme.value = etat.prefs.theme;
    selTheme.addEventListener('change', () => sauverPrefs({ theme: selTheme.value }));
    carteTheme.append(el('div', { class: 'champ' }, el('label', { for: 'reg-theme' }, 'Thème'), selTheme));
    c.append(carteTheme);

    // ---- Stockage ----
    const carteStock = carte('Stockage local', 'Les données vivent dans le navigateur de cet appareil. Pensez aux sauvegardes régulières (écran Sauvegarde).');
    const lignes = el('div', {});
    carteStock.append(lignes);
    c.append(carteStock);
    if (navigator.storage?.estimate) {
      const { usage, quota } = await navigator.storage.estimate();
      lignes.append(el('div', { class: 'info-ligne' }, el('span', {}, 'Espace utilisé'), el('strong', {}, `${octetsLisibles(usage)} / ${octetsLisibles(quota)}`)));
      // Chiffre par origine, pas par app : la même adresse héberge d'autres PWA (audit 2026-09-07, A32).
      lignes.append(el('p', { class: 'note-discrete' }, 'Chiffre fourni par le navigateur pour tout le site — il inclut les autres applications publiées à la même adresse.'));
    }
    if (navigator.storage?.persisted) {
      const persiste = await navigator.storage.persisted();
      const lignePersist = el('div', { class: 'info-ligne', role: 'status' },
        el('span', {}, 'Protection contre l’effacement auto'),
        el('strong', {}, persiste ? 'active ✓' : 'non garantie'),
      );
      lignes.append(lignePersist);
      if (!persiste && navigator.storage.persist) {
        const btnPersist = el('button', { class: 'btn' }, 'Demander la protection');
        btnPersist.addEventListener('click', async () => {
          if (btnPersist.getAttribute('aria-disabled') === 'true') return;
          const ok = await navigator.storage.persist();
          lignePersist.querySelector('strong').textContent = ok ? 'active ✓' : 'refusée par le navigateur';
          // Le bouton reste et garde le focus (aria-disabled, relibellé) : se supprimer — ou passer
          // `disabled` — sous le focus le renvoyait au <body> (B50)
          btnPersist.setAttribute('aria-disabled', 'true');
          btnPersist.textContent = ok ? 'Protection obtenue' : 'Protection refusée';
        });
        lignes.append(el('div', { class: 'rang-btn' }, btnPersist));
      }
    }

    // ---- Application ----
    const carteApp = carte('Application');
    carteApp.append(
      el('div', { class: 'info-ligne' }, el('span', {}, 'Version'), el('strong', {}, `v${VERSION_APP}`)),
      el('div', { class: 'info-ligne' }, el('span', {}, 'Mode'),
        el('strong', {}, estLocalhost() ? 'développement (localhost, hors-ligne désactivé)' : 'installé / en ligne')),
    );
    const statutMaj = el('p', { class: 'statut', role: 'status' });
    const btnMaj = el('button', { class: 'btn' }, 'Vérifier les mises à jour');
    btnMaj.addEventListener('click', async () => {
      if (estLocalhost() || !('serviceWorker' in navigator)) {
        statutMaj.textContent = 'Mode développement : service-worker inactif, rien à vérifier.';
        return;
      }
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) { statutMaj.textContent = 'Service-worker non enregistré.'; return; }
        await reg.update();
        const w = reg.installing || reg.waiting;
        if (w) {
          // Le SW fait skipWaiting + claim : la nouvelle version prend la main toute seule et
          // le toast « Recharger » apparaît — inutile de fermer l'app (audit 2026-09-05, B20).
          statutMaj.textContent = 'Mise à jour trouvée : elle s’installe, un bouton « Recharger » va apparaître.';
          // État réel de l'installation : un échec (réseau, espace disque) était muet et l'écran
          // promettait un bouton qui n'arrivait jamais (audit 2026-09-07, A20).
          w.addEventListener('statechange', () => {
            if (w.state === 'redundant') statutMaj.textContent = 'Installation de la mise à jour échouée (réseau ou espace disque) — réessayez.';
            if (w.state === 'activated') {
              // Un vrai bouton ICI : le toast « Recharger » de main.js est avalé quand la page n'était
              // pas contrôlée au chargement (rechargement forcé) — revue du lot 4.
              statutMaj.textContent = 'Mise à jour installée.';
              const btnRecharger = el('button', { class: 'btn btn-principal' }, 'Recharger maintenant');
              btnRecharger.addEventListener('click', () => location.reload());
              statutMaj.after(el('div', { class: 'rang-btn' }, btnRecharger));
            }
          });
        } else {
          statutMaj.textContent = `Vous êtes à jour (v${VERSION_APP}).`;
        }
      } catch (e) {
        statutMaj.textContent = `Vérification impossible : ${e?.message || e}`;
      }
    });
    carteApp.append(el('div', { class: 'rang-btn' }, btnMaj), statutMaj);
    c.append(carteApp);
  });
}
