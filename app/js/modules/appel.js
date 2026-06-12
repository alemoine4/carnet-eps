// modules/appel.js — l'appel EPS, cœur de l'app (phase 4).
// Sous-routes : #/appel (sélecteur) · #/appel/<seanceId> (écran d'appel) · #/appel/recap/<classeId>
// Interactions : 1 tap = cycle présent → absent → oubli de tenue ; appui long (ou clic droit,
// ou tap sur un statut hors cycle) = menu complet. Chaque changement est enregistré immédiatement.
// Rappel D006 : l'appel réglementaire reste fait dans Pronote — ici on trace le suivi EPS.

import { enregistrerVue, el, carte, champZone } from '../ui.js';
import { tous, lire, parIndex, enregistrer, telechargerTexte } from '../io.js';
import {
  STATUTS, CYCLE_TAP, SEUIL_ALERTE,
  isoAujourdhui, dateFR, coursDuJour, inaptitudesActives,
} from '../metier.js';

const trierEleves = (a, b) =>
  a.nom.localeCompare(b.nom, 'fr') || a.prenom.localeCompare(b.prenom, 'fr');
const trierClasses = (a, b) => a.nom.localeCompare(b.nom, 'fr', { numeric: true });

// ---------------------------------------------------------------------------
// Vue : sélecteur de séance
// ---------------------------------------------------------------------------

async function vueSelecteur(c) {
  const [classes, sequences, seances, appels, eleves] = await Promise.all([
    tous('classes'), tous('sequences'), tous('seances'), tous('appels'), tous('eleves'),
  ]);
  const classeDe = (id) => classes.find((cl) => cl.id === id);
  const seqDe = (id) => sequences.find((s) => s.id === id);
  const effectifs = new Map();
  for (const e of eleves) if (e.actif !== false) effectifs.set(e.classeId, (effectifs.get(e.classeId) || 0) + 1);
  const saisis = new Map();
  for (const a of appels) saisis.set(a.seanceId, (saisis.get(a.seanceId) || 0) + 1);
  const auj = isoAujourdhui();

  if (!classes.length) {
    c.append(carte('Pas encore de classes', 'L’appel se fait sur une séance d’une classe : commencez par l’onglet Élèves (import Pronote), puis créez une séquence et l’EDT.'));
    return;
  }

  // --- Aujourd'hui (d'après l'EDT) ---
  const cours = await coursDuJour();
  const carteAuj = carte('Aujourd’hui');
  if (!cours.length) carteAuj.append(el('p', {}, 'Pas de cours EPS aujourd’hui (selon l’EDT).'));
  for (const cr of cours) {
    const classe = classeDe(cr.classeId);
    const seq = sequences.find((s) =>
      s.classeId === cr.classeId && (!s.dateDebut || s.dateDebut <= auj) && (!s.dateFin || auj <= s.dateFin));
    const seance = seq ? seances.find((s) => s.sequenceId === seq.id && s.date === auj) : null;
    const eff = effectifs.get(cr.classeId) || 0;
    const libelle = el('span', {}, `${cr.heureDebut} · ${classe?.nom || '?'}${seq ? ' · ' + seq.apsa : ''}`);
    let action;
    if (seance) {
      const n = saisis.get(seance.id) || 0;
      const complet = eff > 0 && n >= eff;
      action = el('a', { class: complet ? 'btn' : 'btn btn-principal', href: `#/appel/${seance.id}` },
        complet ? 'Appel fait ✓' : n > 0 ? `Reprendre (${n}/${eff})` : 'Faire l’appel');
    } else if (seq) {
      action = el('button', { class: 'btn btn-principal' }, 'Créer la séance + appel');
      action.addEventListener('click', async () => {
        const deja = seances.filter((s) => s.sequenceId === seq.id && s.date < auj).length;
        const nouvelle = {
          id: crypto.randomUUID(), sequenceId: seq.id, date: auj, edtId: cr.id,
          numero: deja + 1, theme: '', bilan: '', annulee: false,
        };
        await enregistrer('seances', nouvelle);
        location.hash = `#/appel/${nouvelle.id}`;
      });
    } else {
      action = el('a', { class: 'btn', href: '#/sequences' }, 'Créer une séquence');
    }
    carteAuj.append(el('div', { class: 'info-ligne' }, libelle, action));
  }
  c.append(carteAuj);

  // --- Séances récentes ---
  const recentes = seances
    .filter((s) => s.date <= auj)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);
  if (recentes.length) {
    const carteRec = carte('Séances récentes');
    for (const s of recentes) {
      const seq = seqDe(s.sequenceId);
      const classe = seq ? classeDe(seq.classeId) : null;
      const eff = classe ? effectifs.get(classe.id) || 0 : 0;
      const n = saisis.get(s.id) || 0;
      carteRec.append(el('a', { class: 'ligne-eleve', href: `#/appel/${s.id}` },
        el('span', { class: 'badge' }, dateFR(s.date)),
        el('span', { class: 'ligne-eleve-nom' }, `${classe?.nom || '?'} · ${seq?.apsa || '?'}`),
        el('span', { class: 'pousse-droite note-inline' }, eff ? `${n}/${eff}` : ''),
        el('span', { class: 'chevron', 'aria-hidden': 'true' }, '›'),
      ));
    }
    c.append(carteRec);
  }

  // --- Récapitulatifs par classe ---
  const actives = classes.filter((cl) => !cl.archivee).sort(trierClasses);
  if (actives.length) {
    const carteR = carte('Récapitulatifs', 'Bilan par classe (présences, tenues, dispenses…) — imprimable et exportable en CSV pour la vie scolaire ou le conseil de classe.');
    for (const cl of actives) {
      const pastille = el('span', { class: 'pastille', 'aria-hidden': 'true' });
      pastille.style.background = cl.couleur || 'var(--c-accent)';
      carteR.append(el('a', { class: 'ligne-eleve', href: `#/appel/recap/${cl.id}` },
        pastille,
        el('span', { class: 'ligne-eleve-nom' }, cl.nom),
        el('span', { class: 'chevron', 'aria-hidden': 'true' }, '›'),
      ));
    }
    c.append(carteR);
  }
}

// ---------------------------------------------------------------------------
// Vue : écran d'appel d'une séance
// ---------------------------------------------------------------------------

async function vueAppel(c, seanceId) {
  c.append(el('a', { class: 'retour', href: '#/appel' }, '← Appel'));
  const seance = await lire('seances', seanceId);
  if (!seance) { c.append(carte('Séance introuvable', 'Elle a peut-être été supprimée.')); return; }
  const sequence = await lire('sequences', seance.sequenceId);
  const classe = sequence ? await lire('classes', sequence.classeId) : null;
  if (!sequence || !classe) { c.append(carte('Séance orpheline', 'Sa séquence ou sa classe a été supprimée.')); return; }
  const eleves = (await parIndex('eleves', 'classeId', classe.id))
    .filter((e) => e.actif !== false)
    .sort(trierEleves);
  if (!eleves.length) {
    c.append(carte('Aucun élève', `La classe ${classe.nom} est vide — importez ou ajoutez les élèves d'abord.`),
      el('div', { class: 'rang-btn' }, el('a', { class: 'btn', href: `#/eleves/classe/${classe.id}` }, 'Ouvrir la classe')));
    return;
  }

  const enregs = new Map((await parIndex('appels', 'seanceId', seanceId)).map((a) => [a.eleveId, a]));

  // Pré-remplissage : inaptitude active à la date de la séance → statut « inapte » d'office
  // (modifiable comme les autres — docs/fonctionnalites.md §4).
  const actives = await inaptitudesActives(seance.date);
  const inaptesSet = new Set(actives.map((i) => i.eleveId));
  for (const eleve of eleves) {
    if (inaptesSet.has(eleve.id) && !enregs.has(eleve.id)) {
      const rec = {
        id: `${seanceId}_${eleve.id}`, seanceId, eleveId: eleve.id,
        statut: 'inapte', minutesRetard: null, commentaire: 'Inaptitude en cours',
      };
      await enregistrer('appels', rec);
      enregs.set(eleve.id, rec);
    }
  }

  // Cumuls tenue/dispense (pour les pastilles ⚠)
  const tousAppels = await tous('appels');
  const cumul = new Map();
  for (const a of tousAppels) {
    if (a.statut !== 'oubli_tenue' && a.statut !== 'dispense') continue;
    if (!cumul.has(a.eleveId)) cumul.set(a.eleveId, { oubli_tenue: 0, dispense: 0 });
    cumul.get(a.eleveId)[a.statut]++;
  }

  // --- En-tête + compteurs ---
  const seancesSeq = (await parIndex('seances', 'sequenceId', sequence.id)).sort((a, b) => a.date.localeCompare(b.date));
  const numero = seancesSeq.findIndex((s) => s.id === seanceId) + 1;
  const total = sequence.nbSeancesPrevu || '?';
  const compteursEl = el('p', { class: 'compteurs' });
  const statutFin = el('p', { class: 'statut' });
  const btnTerminer = el('button', { class: 'btn btn-principal' }, 'Terminer l’appel (le reste = présents)');
  const carteTete = carte(`${classe.nom} — ${sequence.apsa}`, '', dateFR(seance.date));
  carteTete.append(
    el('p', {}, `Séance ${numero}/${total}${seance.theme ? ' · ' + seance.theme : ''}${seance.date === isoAujourdhui() ? '' : ' · ⚠ séance passée'}`),
    compteursEl,
  );
  c.append(carteTete);

  function majCompteurs() {
    let absents = 0;
    let pratiquants = 0;
    for (const eleve of eleves) {
      const st = enregs.get(eleve.id)?.statut || 'present';
      if (st === 'absent') absents++;
      if (STATUTS[st].pratiquant) pratiquants++;
    }
    compteursEl.replaceChildren(
      el('span', {}, el('strong', {}, String(eleves.length - absents)), `/${eleves.length} présents`),
      el('span', {}, el('strong', {}, String(pratiquants)), ' pratiquants'),
      el('span', { class: 'note-inline' }, `${enregs.size}/${eleves.length} saisis`),
    );
    if (enregs.size >= eleves.length) {
      btnTerminer.hidden = true;
      statutFin.textContent = `Appel complet ✓ (${eleves.length}/${eleves.length})`;
      statutFin.className = 'statut statut-ok';
    }
  }

  // --- Grille d'élèves ---
  const grille = el('div', { class: 'grille-appel' });
  const boutons = new Map();

  const majBouton = (eleve) => {
    const btn = boutons.get(eleve.id);
    const rec = enregs.get(eleve.id);
    const st = rec?.statut || 'present';
    const conf = STATUTS[st];
    btn.dataset.statut = rec ? st : '';
    btn.style.borderColor = rec ? conf.couleur : 'var(--c-bordure)';
    const badge = btn.querySelector('.badge-statut');
    badge.hidden = !rec;
    badge.textContent = conf.court;
    badge.style.background = conf.couleur;
    const detail = btn.querySelector('.detail-statut');
    detail.textContent = !rec ? ''
      : st === 'retard' && rec.minutesRetard ? `${conf.libelle} · ${rec.minutesRetard} min`
      : conf.libelle;
    detail.style.color = conf.couleur;
  };

  async function definirStatut(eleve, statut, extras = {}) {
    const prec = enregs.get(eleve.id);
    const rec = {
      id: `${seanceId}_${eleve.id}`, seanceId, eleveId: eleve.id, statut,
      minutesRetard: 'minutesRetard' in extras ? extras.minutesRetard
        : statut === 'retard' ? prec?.minutesRetard ?? null : null,
      commentaire: 'commentaire' in extras ? extras.commentaire : prec?.commentaire || '',
    };
    await enregistrer('appels', rec);
    enregs.set(eleve.id, rec);
    majBouton(eleve);
    majCompteurs();
  }

  // --- Menu complet (feuille bas d'écran) ---
  function ouvrirMenu(eleve) {
    document.querySelector('.feuille-fond')?.remove();
    const rec = enregs.get(eleve.id);
    const courant = rec?.statut || 'present';
    const fond = el('div', { class: 'feuille-fond' });
    const feuille = el('div', { class: 'feuille', role: 'dialog', 'aria-label': `Statut de ${eleve.prenom} ${eleve.nom}` });
    feuille.append(el('h3', {}, `${eleve.prenom} ${eleve.nom}`));

    const inpMinutes = el('input', { type: 'number', min: '1', max: '120', id: 'ap-minutes' });
    inpMinutes.value = rec?.minutesRetard || '';
    const ligneMinutes = el('div', { class: 'champ' }, el('label', { for: 'ap-minutes' }, 'Minutes de retard'), inpMinutes);
    ligneMinutes.hidden = courant !== 'retard';
    inpMinutes.addEventListener('change', () => definirStatut(eleve, 'retard', { minutesRetard: Number(inpMinutes.value) || null }));

    const grilleSt = el('div', { class: 'grille-statuts' });
    for (const [cle, conf] of Object.entries(STATUTS)) {
      const b = el('button', { class: 'btn btn-statut', type: 'button' }, conf.libelle);
      b.style.borderColor = conf.couleur;
      if (cle === courant) { b.style.background = conf.couleur; b.style.color = '#fff'; }
      b.addEventListener('click', async () => {
        await definirStatut(eleve, cle, cle === 'retard' ? { minutesRetard: Number(inpMinutes.value) || null } : {});
        if (cle === 'retard') {
          ligneMinutes.hidden = false;
          for (const x of grilleSt.children) { x.style.background = ''; x.style.color = ''; }
          b.style.background = conf.couleur; b.style.color = '#fff';
          inpMinutes.focus();
        } else {
          fond.remove();
        }
      });
      grilleSt.append(b);
    }

    const inpComm = el('input', { type: 'text', placeholder: 'Commentaire (optionnel)', 'aria-label': 'Commentaire', autocomplete: 'off' });
    inpComm.value = rec?.commentaire || '';
    inpComm.addEventListener('change', () => {
      const cur = enregs.get(eleve.id)?.statut || 'present';
      definirStatut(eleve, cur, { commentaire: inpComm.value.trim() });
    });

    const btnFermer = el('button', { class: 'btn' }, 'Fermer');
    btnFermer.addEventListener('click', () => fond.remove());
    fond.addEventListener('click', (e) => { if (e.target === fond) fond.remove(); });
    feuille.append(grilleSt, ligneMinutes, el('div', { class: 'champ' }, inpComm), el('div', { class: 'rang-btn' }, btnFermer));
    fond.append(feuille);
    c.append(fond);
  }

  for (const eleve of eleves) {
    const alerte = cumul.get(eleve.id);
    const enAlerte = alerte && (alerte.oubli_tenue >= SEUIL_ALERTE || alerte.dispense >= SEUIL_ALERTE);
    const btn = el('button', { class: 'btn-eleve', type: 'button' },
      el('span', { class: 'nom-e' }, `${eleve.prenom} ${eleve.nom}`),
      el('span', { class: 'detail-statut' }, ''),
      el('span', { class: 'badge-statut', hidden: true }, ''),
      inaptesSet.has(eleve.id) ? el('span', { class: 'pastille-info', title: 'Inaptitude en cours' }, '🩺') : '',
      enAlerte ? el('span', { class: 'pastille-warn', title: `Oublis de tenue ×${alerte.oubli_tenue} · Dispenses ×${alerte.dispense}` }, '⚠') : '',
    );
    let timer = null;
    let longPress = false;
    btn.addEventListener('pointerdown', () => {
      longPress = false;
      timer = setTimeout(() => { longPress = true; ouvrirMenu(eleve); }, 450);
    });
    btn.addEventListener('pointerup', () => clearTimeout(timer));
    btn.addEventListener('pointerleave', () => clearTimeout(timer));
    btn.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      clearTimeout(timer);
      if (!longPress) { longPress = true; ouvrirMenu(eleve); }
    });
    btn.addEventListener('click', async () => {
      if (longPress) return;
      const courant = enregs.get(eleve.id)?.statut || 'present';
      const idx = CYCLE_TAP.indexOf(courant);
      if (idx === -1 && enregs.has(eleve.id)) { ouvrirMenu(eleve); return; } // statut « menu » : on ne l'écrase pas par erreur
      await definirStatut(eleve, idx === -1 ? CYCLE_TAP[1] : CYCLE_TAP[(idx + 1) % CYCLE_TAP.length]);
    });
    boutons.set(eleve.id, btn);
    grille.append(btn);
    majBouton(eleve);
  }
  c.append(
    el('p', { class: 'note-discrete' }, 'Tap : présent → absent → tenue · Appui long : tous les statuts'),
    grille,
    el('div', { class: 'rang-btn' }, btnTerminer),
    statutFin,
  );
  btnTerminer.addEventListener('click', async () => {
    for (const eleve of eleves) {
      if (!enregs.has(eleve.id)) await definirStatut(eleve, 'present');
    }
  });
  majCompteurs();

  // --- Bilan de séance ---
  const carteBilan = carte('Bilan de séance', '');
  carteBilan.append(champZone({
    id: 'ap-bilan', libelle: 'Quelques mots après le cours (optionnel)', valeur: seance.bilan || '',
    placeholder: 'Ce qui a marché, à revoir, incidents…',
    onChange: async (v) => { seance.bilan = v; await enregistrer('seances', seance); },
  }));
  c.append(carteBilan);
}

// ---------------------------------------------------------------------------
// Vue : récapitulatif par classe (imprimable + CSV)
// ---------------------------------------------------------------------------

async function vueRecap(c, classeId) {
  c.append(el('a', { class: 'retour no-print', href: '#/appel' }, '← Appel'));
  const classe = await lire('classes', classeId);
  if (!classe) { c.append(carte('Classe introuvable', '')); return; }
  const eleves = (await parIndex('eleves', 'classeId', classeId)).filter((e) => e.actif !== false).sort(trierEleves);
  const sequencesCl = await parIndex('sequences', 'classeId', classeId);
  const seqIds = new Set(sequencesCl.map((s) => s.id));
  const toutesSeances = (await tous('seances')).filter((s) => seqIds.has(s.sequenceId));
  const tousAppels = (await tous('appels'));

  const inpDebut = el('input', { type: 'date', id: 'rc-debut' });
  const inpFin = el('input', { type: 'date', id: 'rc-fin' });
  const btnImprimer = el('button', { class: 'btn' }, 'Imprimer');
  const btnCSV = el('button', { class: 'btn' }, 'Exporter CSV');
  btnImprimer.addEventListener('click', () => window.print());

  const carteFiltres = carte(`Récapitulatif — ${classe.nom}`, 'Seuls les appels enregistrés sont comptés (pensez à « Terminer l’appel » à chaque séance).');
  carteFiltres.append(
    el('div', { class: 'rang-2 no-print' },
      el('div', { class: 'champ' }, el('label', { for: 'rc-debut' }, 'Du'), inpDebut),
      el('div', { class: 'champ' }, el('label', { for: 'rc-fin' }, 'Au'), inpFin),
    ),
    el('div', { class: 'rang-btn no-print' }, btnImprimer, btnCSV),
  );
  c.append(carteFiltres);
  const zoneTable = el('div', {});
  c.append(zoneTable);

  const CLES = Object.keys(STATUTS);

  function construire() {
    const debut = inpDebut.value || '0000';
    const fin = inpFin.value || '9999';
    const seancesPeriode = toutesSeances.filter((s) => s.date >= debut && s.date <= fin);
    const seanceIds = new Set(seancesPeriode.map((s) => s.id));
    const appelsPeriode = tousAppels.filter((a) => seanceIds.has(a.seanceId));

    const lignes = eleves.map((e) => {
      const cnt = Object.fromEntries(CLES.map((k) => [k, 0]));
      for (const a of appelsPeriode) if (a.eleveId === e.id) cnt[a.statut]++;
      const alerte = cnt.oubli_tenue >= SEUIL_ALERTE || cnt.dispense >= SEUIL_ALERTE;
      return { e, cnt, alerte };
    });

    const table = el('table', { class: 'table-apercu table-recap' },
      el('thead', {}, el('tr', {},
        el('th', {}, 'Élève'),
        ...CLES.map((k) => el('th', { title: STATUTS[k].libelle }, STATUTS[k].court)),
        el('th', {}, '⚠'),
      )),
      el('tbody', {}, ...lignes.map(({ e, cnt, alerte }) => el('tr', {},
        el('td', {}, `${e.nom} ${e.prenom}`),
        ...CLES.map((k) => el('td', {}, cnt[k] ? String(cnt[k]) : '')),
        el('td', {}, alerte ? '⚠' : ''),
      ))),
    );
    zoneTable.replaceChildren(
      el('p', { class: 'note-discrete' }, `${seancesPeriode.length} séance(s) dans la période · ${STATUTS.present.court}=présent, A=absent, R=retard, D=dispensé, I=inapte, T=oubli de tenue, INF=infirmerie`),
      table,
    );
    return { lignes, nbSeances: seancesPeriode.length };
  }

  btnCSV.addEventListener('click', () => {
    const { lignes } = construire();
    const tete = ['Nom', 'Prénom', ...CLES.map((k) => STATUTS[k].libelle), 'Alerte'].join(';');
    const corps = lignes.map(({ e, cnt, alerte }) =>
      [e.nom, e.prenom, ...CLES.map((k) => cnt[k]), alerte ? 'OUI' : ''].join(';'));
    telechargerTexte(`recap-eps_${classe.nom}_${isoAujourdhui()}.csv`, [tete, ...corps].join('\r\n'));
  });
  inpDebut.addEventListener('change', construire);
  inpFin.addEventListener('change', construire);
  construire();
}

// ---------------------------------------------------------------------------

export function initialiser() {
  enregistrerVue('appel', async (c, params = []) => {
    const [a, b] = params;
    if (a === 'recap' && b) return vueRecap(c, b);
    if (a) return vueAppel(c, a);
    return vueSelecteur(c);
  });
}
