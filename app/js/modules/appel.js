// modules/appel.js — l'appel EPS, cœur de l'app (phase 4).
// Sous-routes : #/appel (sélecteur) · #/appel/<seanceId> (écran d'appel) · #/appel/recap/<classeId>
// Interactions : 1 tap = cycle présent → absent → oubli de tenue ; appui long (ou clic droit,
// ou tap sur un statut hors cycle) = menu complet. Chaque changement est enregistré immédiatement.
// Rappel D006 : l'appel réglementaire reste fait dans Pronote — ici on trace le suivi EPS.

import { enregistrerVue, el, carte, champZone, ouvrirFeuille, toast } from '../ui.js';
import { tous, lire, lireMeta, parIndex, parIndexLot, enregistrer, restaurer, telechargerTexte, champCSV } from '../io.js';
import {
  STATUTS, CYCLE_TAP, SEUIL_ALERTE, depasseSeuil,
  isoAujourdhui, dateFR, coursDuJour, inaptitudesActives, trierEleves, trierClasses,
  bornesTrimestres, periodeTrimestre, compterStatutsParTrimestre,
} from '../metier.js';

// Raccourcis clavier (PC) sur une carte d'élève focalisée : une lettre = un statut.
const RACCOURCIS_STATUT = { p: 'present', a: 'absent', r: 'retard', d: 'dispense', i: 'inapte', t: 'oubli_tenue', f: 'infirmerie' };
// Minutes de retard : entier de 1 à 120, sinon « non précisé » — le champ acceptait 5000 ou -3
// (audit 2026-09-07, B42/V2-03).
const minutesRetardDe = (v) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 1 && n <= 120 ? n : null;
};

// ---------------------------------------------------------------------------
// Vue : sélecteur de séance
// ---------------------------------------------------------------------------

async function vueSelecteur(c) {
  const [classes, sequences, seances, eleves] = await Promise.all([
    tous('classes'), tous('sequences'), tous('seances'), tous('eleves'),
  ]);
  const classeDe = (id) => classes.find((cl) => cl.id === id);
  const seqDe = (id) => sequences.find((s) => s.id === id);
  const seanceDe = (id) => seances.find((s) => s.id === id);
  // Effectifs ET appels saisis sur les élèves ACTIFS de la classe de la séance : l'appel d'un
  // élève parti gonflait « saisis » et affichait « Appel fait ✓ » à tort (audit 2026-09-07, B16/A12).
  const actifsParClasse = new Map();
  for (const e of eleves) {
    if (e.actif === false) continue;
    if (!actifsParClasse.has(e.classeId)) actifsParClasse.set(e.classeId, new Set());
    actifsParClasse.get(e.classeId).add(e.id);
  }
  const effectifs = new Map([...actifsParClasse].map(([classeId, ids]) => [classeId, ids.size]));
  const auj = isoAujourdhui();

  if (!classes.length) {
    c.append(carte('Pas encore de classes', 'L’appel se fait sur une séance d’une classe : commencez par l’onglet Élèves (import Pronote), puis créez une séquence et l’EDT.'));
    return;
  }

  // --- Aujourd'hui (d'après l'EDT) ---
  const cours = await coursDuJour();
  // Appels lus par index pour les seules séances affichées (celles du jour + les 10 récentes) :
  // tout le store (≈ 10 000 en juin) était chargé pour en compter quelques centaines (C02).
  const recentes = seances
    .filter((s) => s.date <= auj)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);
  const utiles = new Set(recentes.map((s) => s.id));
  for (const cr of cours) {
    const seq = sequences.find((s) => s.classeId === cr.classeId && (!s.dateDebut || s.dateDebut <= auj) && (!s.dateFin || auj <= s.dateFin));
    const seance = seq ? seances.find((s) => s.sequenceId === seq.id && s.date === auj) : null;
    if (seance) utiles.add(seance.id);
  }
  const appels = await parIndexLot('appels', 'seanceId', [...utiles]);
  const saisis = new Map();
  for (const a of appels) {
    const seq = seqDe(seanceDe(a.seanceId)?.sequenceId);
    if (!seq || !actifsParClasse.get(seq.classeId)?.has(a.eleveId)) continue;
    saisis.set(a.seanceId, (saisis.get(a.seanceId) || 0) + 1);
  }
  const carteAuj = carte('Aujourd’hui');
  if (!cours.length) carteAuj.append(el('p', {}, 'Pas de cours EPS aujourd’hui (selon l’EDT).'));
  for (const cr of cours) {
    const classe = classeDe(cr.classeId);
    const seqsActives = sequences.filter((s) =>
      s.classeId === cr.classeId && (!s.dateDebut || s.dateDebut <= auj) && (!s.dateFin || auj <= s.dateFin));
    const seq = seqsActives[0]; // même choix que l'ancien `find` (ordre du store) et que l'accueil
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
        action.disabled = true; // un double tap créait deux séances le même jour (audit 2026-09-05, B05)
        try {
          const existante = (await parIndex('seances', 'sequenceId', seq.id)).find((s) => s.date === auj);
          if (existante) { location.hash = `#/appel/${existante.id}`; return; }
          const deja = seances.filter((s) => s.sequenceId === seq.id && s.date < auj).length;
          const nouvelle = {
            id: crypto.randomUUID(), sequenceId: seq.id, date: auj, edtId: cr.id,
            numero: deja + 1, theme: '', bilan: '', annulee: false,
          };
          await enregistrer('seances', nouvelle);
          location.hash = `#/appel/${nouvelle.id}`;
        } catch (e) {
          // Échec d'écriture : le bouton restait grisé sans un mot (audit 2026-09-07, A11).
          action.disabled = false;
          toast(`Séance non créée : ${e?.message || e}`);
        }
      });
    } else {
      action = el('a', { class: 'btn', href: '#/sequences' }, 'Créer une séquence');
    }
    carteAuj.append(el('div', { class: 'info-ligne' }, libelle, action));
    // Même avertissement que l'accueil (A15) : plusieurs séquences actives pour la classe (audit 2026-09-07, A29).
    if (seqsActives.length > 1) carteAuj.append(el('p', { class: 'note-discrete' }, `⚠ ${seqsActives.length} séquences actives pour ${classe?.nom || '?'} (dates qui se chevauchent) — « ${seq.apsa} » est utilisée. À vérifier dans Plus → Séquences.`));
  }
  c.append(carteAuj);

  // --- Séances récentes ---
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
  c.classList.add('vue-large'); // grille d'appel : utiliser toute la largeur sur PC
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
  // Dernier état CONFIRMÉ en base par élève : c'est lui (et non l'état précédent à l'écran, jamais
  // vérifié) que le retour arrière d'une écriture refusée rétablit — deux échecs d'affilée
  // laissaient à l'écran un statut inexistant et « Appel complet ✓ » (revue du lot 1, C10).
  const confirmes = new Map(enregs);

  // Pré-remplissage : inaptitude active à la date de la séance → statut « inapte » d'office
  // (modifiable comme les autres — docs/fonctionnalites.md §4).
  // UNIQUEMENT pour la séance du JOUR (audit A14) : consulter après coup un appel passé
  // ne doit rien écrire en base. La pastille 🩺 reste affichée dans tous les cas.
  const estSeanceDuJour = seance.date === isoAujourdhui();
  // Une inaptitude par élève, la plus contraignante (totale > partielle). Seule une inaptitude
  // TOTALE fixe un statut d'office — « dispensé (mot) » si elle vient d'un mot des parents,
  // « inapte » sinon ; une partielle laisse « présent » (l'élève pratique avec restrictions) et se
  // signale par la pastille 🩺 (audit 2026-09-07, C01, décision D013). Voulu : trois séances non
  // pratiquées sur un simple mot déclenchent le seuil D012 « penser famille / vie scolaire »
  // (un certificat est attendu au-delà de quelques séances) — la revue du lot 1 l'a confirmé.
  // Départage déterministe entre deux inaptitudes actives : totale > partielle, puis certificat >
  // infirmerie > mot — sinon l'ordre des clés (UUID) décidait, donc le hasard (revue du lot 1).
  const RANG_ORIGINE = { certificat: 3, infirmerie: 2, mot: 1 };
  const rang = (i) => (i.type === 'totale' ? 10 : 0) + (RANG_ORIGINE[i.origine] || 0);
  const inaptesMap = new Map();
  for (const i of await inaptitudesActives(seance.date)) {
    const prec = inaptesMap.get(i.eleveId);
    if (!prec || rang(i) > rang(prec)) inaptesMap.set(i.eleveId, i);
  }
  const statutInapte = (eleveId) => {
    const i = inaptesMap.get(eleveId);
    return i && i.type === 'totale' ? (i.origine === 'mot' ? 'dispense' : 'inapte') : null;
  };
  if (estSeanceDuJour) {
    const prerempl = [];
    for (const eleve of eleves) {
      const st = statutInapte(eleve.id);
      if (st && !enregs.has(eleve.id)) {
        prerempl.push({
          id: `${seanceId}_${eleve.id}`, seanceId, eleveId: eleve.id, statut: st, minutesRetard: null,
          commentaire: st === 'dispense' ? 'Dispense (mot des parents) en cours' : 'Inaptitude en cours',
        });
      }
    }
    // UNE transaction, et l'écran s'affiche même si elle échoue : avant, un pré-remplissage refusé
    // rendait tout l'écran d'appel inaccessible (audit 2026-09-07, C11).
    try {
      if (prerempl.length) {
        await restaurer({ appels: prerempl });
        for (const r of prerempl) { enregs.set(r.eleveId, r); confirmes.set(r.eleveId, r); }
      }
    } catch (e) {
      toast(`Pré-remplissage des inaptitudes non enregistré (${e?.message || e}) — statuts à saisir à la main.`);
    }
  }

  // Pastilles ⚠ : seuil sur le cumul de l'ANNÉE SCOLAIRE de la séance (D012), détail du
  // trimestre — plus sur tous les appels depuis l'origine (audit 2026-09-07, A14/V2-01).
  const bornes = await bornesTrimestres(seance.date);
  // Appels des seuls élèves de la classe, par index (plus tout le store — C02).
  const appelsClasse = await parIndexLot('appels', 'eleveId', eleves.map((e) => e.id));
  const parTri = compterStatutsParTrimestre(appelsClasse, await tous('seances'), bornes);

  // --- En-tête + compteurs ---
  const seancesSeq = (await parIndex('seances', 'sequenceId', sequence.id)).sort((a, b) => a.date.localeCompare(b.date));
  const numero = seancesSeq.findIndex((s) => s.id === seanceId) + 1;
  const total = sequence.nbSeancesPrevu || '?';
  const compteursEl = el('p', { class: 'compteurs' });
  // Annonce courte du statut appliqué (au lieu de relire les trois compteurs à chaque tap — B40).
  const annonce = el('p', { class: 'sr-only', role: 'status' });
  const statutFin = el('p', { class: 'statut', role: 'status' });
  const btnTerminer = el('button', { class: 'btn btn-principal' }, 'Terminer l’appel (le reste = présents)');
  const carteTete = carte(`${classe.nom} — ${sequence.apsa}`, '', dateFR(seance.date));
  carteTete.append(
    el('p', {}, `Séance ${numero}/${total}${seance.theme ? ' · ' + seance.theme : ''}${estSeanceDuJour ? '' : ' · ⚠ séance passée'}`),
    compteursEl,
    annonce,
  );
  c.append(carteTete);

  function majCompteurs() {
    let absents = 0;
    let pratiquants = 0;
    let saisis = 0; // parmi les élèves ACTUELS de la classe — pas enregs.size, qui compte aussi
    // les appels d'un élève parti depuis vers une autre classe (audit 2026-09-05, B06)
    for (const eleve of eleves) {
      const rec = enregs.get(eleve.id);
      if (rec) saisis++;
      const st = rec?.statut || 'present';
      if (st === 'absent') absents++;
      if ((STATUTS[st] || STATUTS.present).pratiquant) pratiquants++;
    }
    compteursEl.replaceChildren(
      el('span', {}, el('strong', {}, String(eleves.length - absents)), `/${eleves.length} présents`),
      el('span', {}, el('strong', {}, String(pratiquants)), ' pratiquants'),
      el('span', { class: 'note-inline' }, `${saisis}/${eleves.length} saisis`),
    );
    // statutFin est une région live : n'écrire que sur changement réel, sinon chaque tap après
    // « Appel complet » le réannonçait (revue du lot 3).
    const fin = saisis >= eleves.length ? `Appel complet ✓ (${eleves.length}/${eleves.length})` : '';
    if (statutFin.textContent !== fin) { statutFin.textContent = fin; statutFin.className = 'statut statut-ok'; }
    if (saisis >= eleves.length) {
      btnTerminer.hidden = true;
    } else {
      const restants = eleves.length - saisis;
      btnTerminer.hidden = false;
      btnTerminer.textContent = `Terminer l’appel · ${restants} passé${restants > 1 ? 's' : ''} en présent`;
    }
  }

  // --- Grille d'élèves ---
  const grille = el('div', { class: 'grille-appel' });
  const boutons = new Map();

  const majBouton = (eleve) => {
    const carteE = boutons.get(eleve.id);
    const rec = enregs.get(eleve.id);
    const st = rec?.statut || 'present';
    const conf = STATUTS[st] || STATUTS.present; // statut inconnu (sauvegarde tierce) : ne pas planter la vue
    carteE.dataset.statut = rec ? st : '';
    // Couleur de bordure pilotée par CSS via [data-statut] (déclinée par thème, audit UX P2).
    const badge = carteE.querySelector('.badge-statut');
    badge.hidden = !rec;
    badge.textContent = rec ? conf.court : ''; // pas de « P » fantôme dans le nom accessible (B34)
    // Fond de la pastille piloté par CSS via [data-statut] (thématisé clair/sombre).
    const detail = carteE.querySelector('.detail-txt');
    detail.textContent = !rec ? ''
      : st === 'retard' && rec.minutesRetard ? `${conf.libelle} · ${rec.minutesRetard} min`
      : conf.libelle;
    // Le statut est porté par la pastille colorée + la bordure ; le texte reste en encre
    // pleine pour la lisibilité (contraste WCAG AA, audit UX P2).
  };

  async function definirStatut(eleve, statut, extras = {}) {
    const prec = enregs.get(eleve.id);
    const rec = {
      id: `${seanceId}_${eleve.id}`, seanceId, eleveId: eleve.id, statut,
      minutesRetard: 'minutesRetard' in extras ? extras.minutesRetard
        : statut === 'retard' ? prec?.minutesRetard ?? null : null,
      commentaire: 'commentaire' in extras ? extras.commentaire : prec?.commentaire || '',
    };
    // État mis à jour AVANT l'écriture : deux taps très rapprochés lisaient tous deux l'ancien
    // statut et « absent → tenue » devenait « absent → absent » (audit 2026-09-05, B04).
    enregs.set(eleve.id, rec);
    annonce.textContent = `${eleve.prenom} ${eleve.nom} : ${(STATUTS[statut] || STATUTS.present).libelle}`;
    majBouton(eleve);
    majCompteurs();
    try {
      await enregistrer('appels', rec);
      confirmes.set(eleve.id, rec);
    } catch (e) {
      // Ne défaire que si aucun tap plus récent n'a remplacé cet enregistrement : sinon l'écran
      // revenait à un état périmé et mentait sur la base (audit 2026-09-07, C10) — et revenir au
      // dernier état CONFIRMÉ, pas à `prec` (qui pouvait lui-même ne jamais avoir été écrit).
      if (enregs.get(eleve.id) !== rec) { toast(`Statut non enregistré : ${e?.message || e}`); return; }
      const ref = confirmes.get(eleve.id);
      if (ref) enregs.set(eleve.id, ref); else enregs.delete(eleve.id);
      majBouton(eleve);
      majCompteurs();
      toast(`Statut non enregistré : ${e?.message || e}`);
    }
  }

  // --- Menu complet (feuille bas d'écran, <dialog> natif) ---
  function ouvrirMenu(eleve) {
    const rec = enregs.get(eleve.id);
    const courant = rec?.statut || 'present';
    let dlg;

    const inpMinutes = el('input', { type: 'number', min: '1', max: '120', id: 'ap-minutes' });
    inpMinutes.value = rec?.minutesRetard || '';
    const ligneMinutes = el('div', { class: 'champ' }, el('label', { for: 'ap-minutes' }, 'Minutes de retard'), inpMinutes);
    ligneMinutes.hidden = courant !== 'retard';
    // Valeur hors 1..120 : prévenue et retirée du champ, au lieu d'un « non précisé » silencieux
    // qui laissait 455 affiché et rien en base (revue du lot 1, B42).
    const minutesSaisies = () => {
      const brut = inpMinutes.value.trim();
      const n = minutesRetardDe(brut);
      if (brut === '' || n !== null) return { minutesRetard: n };
      toast('Minutes de retard : entier de 1 à 120 attendu — non enregistré.');
      inpMinutes.value = enregs.get(eleve.id)?.minutesRetard || '';
      return null;
    };
    inpMinutes.addEventListener('change', () => { const m = minutesSaisies(); if (m) definirStatut(eleve, 'retard', m); });

    const grilleSt = el('div', { class: 'grille-statuts' });
    for (const [cle, conf] of Object.entries(STATUTS)) {
      // aria-pressed expose le statut courant aux technologies d'assistance (B17) et le style
      // « enfoncé » vit en CSS ; bordure via les tokens --stb-* déclinés par thème (B18).
      const b = el('button', { class: 'btn btn-statut', type: 'button', 'aria-pressed': String(cle === courant) }, conf.libelle);
      b.style.borderColor = `var(--stb-${cle})`;
      b.addEventListener('click', async () => {
        await definirStatut(eleve, cle, (cle === 'retard' && minutesSaisies()) || {});
        if (cle === 'retard') {
          ligneMinutes.hidden = false;
          for (const x of grilleSt.children) x.setAttribute('aria-pressed', 'false');
          b.setAttribute('aria-pressed', 'true');
          inpMinutes.focus();
        } else {
          dlg.close();
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
    btnFermer.addEventListener('click', () => dlg.close());

    dlg = ouvrirFeuille({
      titre: `${eleve.prenom} ${eleve.nom}`,
      label: `Statut de ${eleve.prenom} ${eleve.nom}`,
      contenu: [grilleSt, ligneMinutes, el('div', { class: 'champ' }, inpComm), el('div', { class: 'rang-btn' }, btnFermer)],
    });
  }

  for (const eleve of eleves) {
    const annee = parTri.get(eleve.id)?.annee || {};
    const enAlerte = depasseSeuil(annee);
    const tri = parTri.get(eleve.id)?.t[bornes.courant] || {};
    const inapt = inaptesMap.get(eleve.id);
    const carteE = el('div', { class: 'btn-eleve', role: 'group', 'aria-label': `${eleve.prenom} ${eleve.nom}` });
    const cycle = el('button', { class: 'eleve-cycle', type: 'button' },
      el('span', { class: 'nom-e' }, `${eleve.prenom} ${eleve.nom}`),
      el('span', { class: 'detail-statut' },
        el('span', { class: 'badge-statut', hidden: true }, ''),
        el('span', { class: 'detail-txt' }, ''),
      ),
      // Pictogrammes doublés d'un texte pour les technologies d'assistance (le title ne leur
      // suffit pas — B43) ; le title reste pour la souris.
      inapt ? el('span', { class: 'pastille-info', title: inapt.type === 'totale' ? 'Inaptitude totale en cours' : 'Inaptitude partielle en cours (pratique avec restrictions)' },
        el('span', { 'aria-hidden': 'true' }, '🩺'), el('span', { class: 'sr-only' }, inapt.type === 'totale' ? 'Inaptitude totale en cours' : 'Inaptitude partielle en cours')) : '',
      enAlerte ? el('span', { class: 'pastille-warn', title: `Année : oublis de tenue ×${annee.oubli_tenue || 0} · dispenses ×${annee.dispense || 0} — T${bornes.courant} : ${tri.oubli_tenue || 0} · ${tri.dispense || 0}` },
        el('span', { 'aria-hidden': 'true' }, '⚠'), el('span', { class: 'sr-only' }, `Alerte : ${annee.oubli_tenue || 0} oublis de tenue et ${annee.dispense || 0} dispenses sur l’année`)) : '',
    );
    const menu = el('button', {
      class: 'eleve-menu', type: 'button', 'aria-haspopup': 'dialog',
      'aria-label': `Choisir le statut de ${eleve.prenom} ${eleve.nom}`,
    }, '⋯');
    menu.addEventListener('click', () => ouvrirMenu(eleve));

    let timer = null;
    let longPress = false;
    const finPresse = () => { clearTimeout(timer); cycle.classList.remove('presse'); };
    cycle.addEventListener('pointerdown', () => {
      longPress = false;
      cycle.classList.add('presse'); // barre de progression (retour visuel de l'appui long)
      timer = setTimeout(() => {
        longPress = true;
        cycle.classList.remove('presse');
        navigator.vibrate?.(15); // petit retour haptique au déclenchement (Android)
        ouvrirMenu(eleve);
      }, 450);
    });
    cycle.addEventListener('pointerup', finPresse);
    cycle.addEventListener('pointerleave', finPresse);
    // Le navigateur prend la main pour défiler → pointercancel (ni pointerup ni pointerleave) :
    // sans ça, faire défiler la grille le doigt posé > 450 ms ouvrait le menu (audit 2026-09-05, B03).
    cycle.addEventListener('pointercancel', finPresse);
    cycle.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      finPresse();
      if (!longPress) { longPress = true; ouvrirMenu(eleve); }
    });
    cycle.addEventListener('click', async () => {
      if (longPress) return;
      const courant = enregs.get(eleve.id)?.statut || 'present';
      const idx = CYCLE_TAP.indexOf(courant);
      if (idx === -1 && enregs.has(eleve.id)) { ouvrirMenu(eleve); return; } // statut hors cycle : ne pas l'écraser par erreur
      await definirStatut(eleve, idx === -1 ? CYCLE_TAP[1] : CYCLE_TAP[(idx + 1) % CYCLE_TAP.length]);
    });
    // Raccourci clavier (PC) : une lettre fixe directement le statut de la carte focalisée.
    cycle.addEventListener('keydown', (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const st = RACCOURCIS_STATUT[e.key.toLowerCase()];
      if (st) { e.preventDefault(); longPress = false; definirStatut(eleve, st); }
    });

    carteE.append(cycle, menu);
    boutons.set(eleve.id, carteE);
    grille.append(carteE);
    majBouton(eleve);
  }
  c.append(
    el('p', { class: 'note-discrete' },
      'Tap : présent → absent → tenue · Appui long (ou ⋯) : tous les statuts',
      el('span', { class: 'aide-clavier' }, ' · Clavier : P A R D I T, F = infirmerie'),
    ),
    grille,
    el('div', { class: 'rang-btn' }, btnTerminer),
    statutFin,
  );
  btnTerminer.addEventListener('click', async () => {
    // Le reste = présents, SAUF les élèves sous inaptitude totale (séance passée : rien n'a été
    // pré-rempli et « Terminer » les marquait présents — audit 2026-09-07, B02).
    // UNE transaction pour tous les restants (restaurer = ecrireLot) et bouton verrouillé pendant
    // l'écriture : c'était une transaction par élève, attendue, sur un bouton libre (audit 2026-09-07, A27).
    const aFaire = eleves.filter((eleve) => !enregs.has(eleve.id));
    if (!aFaire.length) return;
    const recs = aFaire.map((eleve) => ({
      id: `${seanceId}_${eleve.id}`, seanceId, eleveId: eleve.id,
      statut: statutInapte(eleve.id) || 'present', minutesRetard: null, commentaire: '',
    }));
    btnTerminer.disabled = true;
    try {
      await restaurer({ appels: recs });
      // Un tap pendant l'écriture du lot a déjà posé son statut (et sa propre écriture, validée après la
      // nôtre) : l'instantané ne le réécrase pas (revue du lot 5).
      recs.forEach((rec, i) => { if (enregs.has(rec.eleveId)) return; enregs.set(rec.eleveId, rec); confirmes.set(rec.eleveId, rec); majBouton(aFaire[i]); });
      majCompteurs();
    } catch (e) {
      toast(`Appel non terminé : ${e?.message || e}`);
    } finally {
      btnTerminer.disabled = false;
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
  c.classList.add('vue-large'); // tableau récap : pleine largeur sur PC
  c.append(el('a', { class: 'retour no-print', href: '#/appel' }, '← Appel'));
  const classe = await lire('classes', classeId);
  if (!classe) { c.append(carte('Classe introuvable', '')); return; }
  // Tous les élèves de la classe, partis compris : un « parti » ayant des appels dans la période
  // reste sur le récapitulatif (mention « parti ») au lieu de disparaître rétroactivement (A13).
  const tousEleves = (await parIndex('eleves', 'classeId', classeId)).sort(trierEleves);
  const sequencesCl = await parIndex('sequences', 'classeId', classeId);
  const seqIds = new Set(sequencesCl.map((s) => s.id));
  const toutesSeances = (await tous('seances')).filter((s) => seqIds.has(s.sequenceId));
  // Appels des seules séances de la classe, par index (C02).
  const tousAppels = await parIndexLot('appels', 'seanceId', toutesSeances.map((s) => s.id));

  const inpDebut = el('input', { type: 'date', id: 'rc-debut' });
  const inpFin = el('input', { type: 'date', id: 'rc-fin' });
  const btnImprimer = el('button', { class: 'btn' }, 'Imprimer');
  const btnCSV = el('button', { class: 'btn' }, 'Exporter CSV');
  btnImprimer.addEventListener('click', () => window.print());

  const carteFiltres = carte(`Récapitulatif — ${classe.nom}`, 'Seuls les appels enregistrés sont comptés (pensez à « Terminer l’appel » à chaque séance).');
  // Établissement (Réglages) et date d'édition sur le papier (audit 2026-09-07, B44) ; la période,
  // elle, est dans le <caption> (B21).
  carteFiltres.append(el('p', { class: 'note-discrete', id: 'rc-edition' }, [(await lireMeta('etablissement')) || '', `édité le ${new Date().toLocaleDateString('fr-FR')}`].filter(Boolean).join(' — ')));
  // Périodes rapides : trimestres de l'année scolaire en cours (bornes : Réglages) ou l'année (D012).
  const bornes = await bornesTrimestres();
  const presets = el('div', { class: 'rang-chips no-print', role: 'group', 'aria-label': 'Période rapide' });
  const deselectionner = () => { for (const x of presets.children) x.setAttribute('aria-pressed', 'false'); };
  let btnAnnee = null;
  for (const [t, lib] of [[1, 'T1'], [2, 'T2'], [3, 'T3'], ['annee', `Année ${bornes.annee}-${bornes.annee + 1}`]]) {
    const b = el('button', { class: 'btn btn-statut', type: 'button', 'aria-pressed': 'false' },
      lib + (t === bornes.courant ? ' (en cours)' : ''));
    if (t === 'annee') btnAnnee = b;
    b.addEventListener('click', () => {
      const p = periodeTrimestre(t, bornes);
      inpDebut.value = p.du;
      inpFin.value = p.au;
      deselectionner();
      b.setAttribute('aria-pressed', 'true');
      construire();
    });
    presets.append(b);
  }
  carteFiltres.append(
    presets,
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

    // Groupés une fois par élève au lieu d'un balayage complet par ligne (C02).
    const parEleve = new Map();
    for (const a of appelsPeriode) {
      if (!parEleve.has(a.eleveId)) parEleve.set(a.eleveId, []);
      parEleve.get(a.eleveId).push(a);
    }
    const lignes = tousEleves.map((e) => {
      const cnt = Object.fromEntries(CLES.map((k) => [k, 0]));
      for (const a of parEleve.get(e.id) || []) cnt[a.statut in cnt ? a.statut : 'present']++; // statut inconnu rabattu comme à l'appel (audit 2026-09-07, A28)
      return { e, cnt, alerte: depasseSeuil(cnt) };
    }).filter(({ e, cnt }) => e.actif !== false || Object.values(cnt).some((n) => n > 0));

    // La période figure dans la légende du tableau (caption) : les champs de dates sont masqués à
    // l'impression, le papier ne disait pas quelle période il couvrait (audit 2026-09-05, B21).
    const dateLongue = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR');
    const periode = inpDebut.value || inpFin.value
      ? `du ${inpDebut.value ? dateLongue(inpDebut.value) : 'début'} au ${inpFin.value ? dateLongue(inpFin.value) : 'aujourd’hui'}`
      : 'toutes dates';
    // Vrai tableau pour les lecteurs d'écran : scope sur les en-têtes, nom de l'élève en en-tête de
    // ligne, légende, défilement porté par une région nommée (audit 2026-09-07, B07).
    // Légende COURTE dans le <caption> (sa boîte prend la largeur du tableau, coupée dans le
    // conteneur défilant sur mobile) ; le décodage des colonnes vit dans un <p> hors défilement,
    // relié par aria-describedby (revue du lot 3).
    const table = el('table', { class: 'table-apercu', 'aria-describedby': 'rc-legende' },
      el('caption', {}, `${seancesPeriode.length} séance(s) — ${periode}`),
      el('thead', {}, el('tr', {},
        el('th', { scope: 'col' }, 'Élève'),
        ...CLES.map((k) => el('th', { scope: 'col', title: STATUTS[k].libelle }, el('span', { 'aria-hidden': 'true' }, STATUTS[k].court), el('span', { class: 'sr-only' }, STATUTS[k].libelle))),
        // Ici le seuil porte sur la PÉRIODE affichée (l'année par défaut), alors que la pastille de
        // l'appel porte toujours sur l'année : le dire (revue du lot 1).
        el('th', { scope: 'col', title: `Seuil de ${SEUIL_ALERTE} oublis de tenue ou dispenses atteint sur la période affichée` }, el('span', { 'aria-hidden': 'true' }, '⚠'), el('span', { class: 'sr-only' }, 'Alerte')),
      )),
      el('tbody', {}, ...lignes.map(({ e, cnt, alerte }) => el('tr', {},
        el('th', { scope: 'row' }, `${e.nom} ${e.prenom}${e.actif === false ? ' (parti)' : ''}`),
        ...CLES.map((k) => el('td', {}, cnt[k] ? String(cnt[k]) : '')),
        el('td', {}, alerte ? el('span', { 'aria-hidden': 'true' }, '⚠') : '', alerte ? el('span', { class: 'sr-only' }, 'seuil atteint') : ''), // texte DANS la cellule (revue du lot 3)
      ))),
    );
    zoneTable.replaceChildren(
      el('div', { class: 'table-scroll', tabindex: '0', role: 'region', 'aria-label': `Récapitulatif ${classe.nom}` }, table),
      el('p', { class: 'note-discrete', id: 'rc-legende' }, `${STATUTS.present.court}=présent, A=absent, R=retard, D=dispensé, I=inapte, T=oubli de tenue, INF=infirmerie · ⚠ = ${SEUIL_ALERTE} oublis de tenue ou dispenses sur la période affichée`),
    );
    return { lignes, nbSeances: seancesPeriode.length };
  }

  btnCSV.addEventListener('click', () => {
    const { lignes } = construire();
    const tete = ['Nom', 'Prénom', ...CLES.map((k) => STATUTS[k].libelle), `Alerte (seuil ${SEUIL_ALERTE} sur la période)`].map(champCSV).join(';');
    const corps = lignes.map(({ e, cnt, alerte }) =>
      [`${e.nom}${e.actif === false ? ' (parti)' : ''}`, e.prenom, ...CLES.map((k) => cnt[k]), alerte ? 'OUI' : ''].map(champCSV).join(';')); // mention « parti » aussi dans le CSV (revue)
    telechargerTexte(`recap-eps_${classe.nom}_${isoAujourdhui()}.csv`, [tete, ...corps].join('\r\n'));
  });
  inpDebut.addEventListener('change', () => { deselectionner(); construire(); });
  inpFin.addEventListener('change', () => { deselectionner(); construire(); });
  btnAnnee.click(); // période par défaut : l'année scolaire en cours, cohérente avec le seuil ⚠ (A14)
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
