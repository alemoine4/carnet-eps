// modules/reglages.js — réglages (phase 1) : établissement, année scolaire,
// thème, stockage, version et mises à jour (BIBLE règle 5 : bouton MAJ visible).

import { enregistrerVue, el, carte } from '../ui.js';
import { lireMeta, ecrireMeta } from '../io.js';
import { etat, sauverPrefs, estLocalhost, VERSION_APP } from '../state.js';

function champTexte(id, libelle, valeur, placeholder, onChange) {
  const input = el('input', { type: 'text', id, placeholder, autocomplete: 'off' });
  input.value = valeur;
  const retour = el('span', { class: 'statut statut-ok', role: 'status' });
  input.addEventListener('change', async () => {
    await onChange(input.value.trim());
    retour.textContent = '✓ enregistré';
    setTimeout(() => { retour.textContent = ''; }, 2000);
  });
  return el('div', { class: 'champ' }, el('label', { for: id }, libelle, ' ', retour), input);
}

function octetsLisibles(n) {
  if (!Number.isFinite(n)) return '?';
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} Ko`;
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
}

export function initialiser() {
  enregistrerVue('reglages', async (c) => {
    c.append(el('a', { class: 'retour', href: '#/plus' }, '← Retour'));

    // ---- Établissement ----
    const carteEtab = carte('Établissement');
    carteEtab.append(
      champTexte('reg-etab', 'Nom de l’établissement', await lireMeta('etablissement'), 'Collège…', (v) => ecrireMeta('etablissement', v)),
      champTexte('reg-annee', 'Année scolaire', await lireMeta('anneeScolaire'), '2026-2027', (v) => ecrireMeta('anneeScolaire', v)),
    );
    c.append(carteEtab);

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
    }
    if (navigator.storage?.persisted) {
      const persiste = await navigator.storage.persisted();
      const lignePersist = el('div', { class: 'info-ligne' },
        el('span', {}, 'Protection contre l’effacement auto'),
        el('strong', {}, persiste ? 'active ✓' : 'non garantie'),
      );
      lignes.append(lignePersist);
      if (!persiste && navigator.storage.persist) {
        const btnPersist = el('button', { class: 'btn' }, 'Demander la protection');
        btnPersist.addEventListener('click', async () => {
          const ok = await navigator.storage.persist();
          lignePersist.querySelector('strong').textContent = ok ? 'active ✓' : 'refusée par le navigateur';
          btnPersist.remove();
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
    const statutMaj = el('p', { class: 'statut' });
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
        if (reg.waiting || reg.installing) {
          statutMaj.textContent = 'Mise à jour téléchargée : fermez complètement l’app puis rouvrez-la.';
        } else {
          statutMaj.textContent = `Vous êtes à jour (v${VERSION_APP}).`;
        }
      } catch (e) {
        statutMaj.textContent = `Vérification impossible : ${e.message}`;
      }
    });
    carteApp.append(el('div', { class: 'rang-btn' }, btnMaj), statutMaj);
    c.append(carteApp);
  });
}
