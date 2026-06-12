// modules/notes.js — évaluations & notes + export Pronote (phase 6).
// Sous-routes : #/notes (liste + création) · #/notes/eval/<id> (grille de saisie)
//               · #/notes/releve/<classeId> (relevé imprimable)
// Export Pronote (docs/pronote.md) : voie A = colonne presse-papiers triée alphabétiquement
// (codes ABS/DISP/NN laissés en lignes vides + liste à saisir à la main, garde-fou effectif) ;
// voie B = CSV Nom;Prénom;Note. Type « afl » = positionnement libre, non exportable vers Pronote.

import { enregistrerVue, el, carte, champTexte } from '../ui.js';
import { tous, lire, parIndex, enregistrer, supprimer, telechargerTexte } from '../io.js';
import { isoAujourdhui, dateFR } from '../metier.js';
import { sauverPrefs } from '../state.js';

const trierEleves = (a, b) => a.nom.localeCompare(b.nom, 'fr') || a.prenom.localeCompare(b.prenom, 'fr');
const trierClasses = (a, b) => a.nom.localeCompare(b.nom, 'fr', { numeric: true });
const CODES = ['ABS', 'DISP', 'NN'];

const baremeDe = (ev) => (ev.type === 'note20' ? 20 : ev.type === 'bareme' ? Number(ev.bareme) || 20 : null);
const formatFR = (n) => String(Math.round(n * 100) / 100).replace('.', ',');

// "12,5" → nombre · "ABS"/"A" → code · "" → vide · sinon invalide (type afl : texte libre)
function parserValeur(brut, max) {
  const t = String(brut).trim().toUpperCase().replace(',', '.');
  if (t === '') return { vide: true };
  if (t === 'ABS' || t === 'A') return { code: 'ABS' };
  if (t === 'DISP' || t === 'D') return { code: 'DISP' };
  if (t === 'NN' || t === 'N') return { code: 'NN' };
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0 || n > max) return { invalide: true };
  return { nombre: Math.round(n * 100) / 100 };
}

function afficherValeur(v, bareme) {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'number') return bareme ? `${formatFR(v)}/${bareme}` : formatFR(v);
  return String(v);
}

// ---------------------------------------------------------------------------
// Vue : liste des évaluations + création
// ---------------------------------------------------------------------------

async function vueListe(c) {
  const [classes, sequences, evaluations, notes, eleves] = await Promise.all([
    tous('classes'), tous('sequences'), tous('evaluations'), tous('notes'), tous('eleves'),
  ]);
  const classeDe = (id) => classes.find((cl) => cl.id === id);
  const seqDe = (id) => sequences.find((s) => s.id === id);
  if (!sequences.length) {
    c.append(carte('Pas encore de séquence', 'Une évaluation se rattache à une séquence (classe × APSA) : créez-en une d’abord (Plus → Séquences).'),
      el('div', { class: 'rang-btn' }, el('a', { class: 'btn btn-principal', href: '#/sequences' }, 'Créer une séquence')));
    return;
  }

  // --- Création ---
  const btnNouvelle = el('button', { class: 'btn btn-principal' }, '+ Nouvelle évaluation');
  c.append(el('div', { class: 'barre-actions' }, btnNouvelle));

  const seqTriees = [...sequences].sort((a, b) => String(b.dateDebut || '').localeCompare(String(a.dateDebut || '')));
  const selSeq = el('select', { id: 'ev-seq' }, ...seqTriees.map((s) =>
    el('option', { value: s.id }, `${classeDe(s.classeId)?.nom || '?'} — ${s.apsa}`)));
  const inpTitre = el('input', { type: 'text', id: 'ev-titre', placeholder: 'Match en montante, contrôle final…', autocomplete: 'off' });
  const inpDate = el('input', { type: 'date', id: 'ev-date' });
  inpDate.value = isoAujourdhui();
  const selType = el('select', { id: 'ev-type' },
    el('option', { value: 'note20' }, 'Note sur 20'),
    el('option', { value: 'bareme' }, 'Barème personnalisé'),
    el('option', { value: 'afl' }, 'AFL / positionnement (texte, non exporté vers Pronote)'));
  const inpBareme = el('input', { type: 'number', id: 'ev-bareme', min: '1', max: '200', value: '10' });
  const blocBareme = el('div', { class: 'champ' }, el('label', { for: 'ev-bareme' }, 'Barème ( /x )'), inpBareme);
  blocBareme.hidden = true;
  selType.addEventListener('change', () => { blocBareme.hidden = selType.value !== 'bareme'; });
  const inpCoef = el('input', { type: 'number', id: 'ev-coef', min: '0', max: '10', step: '0.5', value: '1' });
  const statutForm = el('p', { class: 'statut' });
  const btnCreer = el('button', { class: 'btn btn-principal' }, 'Créer et saisir les notes');
  const champF = (id, libelle, controle) => el('div', { class: 'champ' }, el('label', { for: id }, libelle), controle);
  const form = carte('Nouvelle évaluation');
  form.append(
    champF('ev-seq', 'Séquence', selSeq),
    champF('ev-titre', 'Titre *', inpTitre),
    el('div', { class: 'rang-2' }, champF('ev-date', 'Date', inpDate), champF('ev-coef', 'Coefficient', inpCoef)),
    champF('ev-type', 'Type', selType),
    blocBareme,
    el('div', { class: 'rang-btn' }, btnCreer),
    statutForm,
  );
  form.hidden = true;
  c.append(form);
  btnNouvelle.addEventListener('click', () => { form.hidden = !form.hidden; if (!form.hidden) inpTitre.focus(); });
  btnCreer.addEventListener('click', async () => {
    const titre = inpTitre.value.trim();
    if (!titre) { statutForm.textContent = 'Le titre est obligatoire.'; statutForm.className = 'statut statut-erreur'; return; }
    const id = crypto.randomUUID();
    await enregistrer('evaluations', {
      id, sequenceId: selSeq.value, titre, date: inpDate.value || isoAujourdhui(),
      type: selType.value, bareme: selType.value === 'bareme' ? Number(inpBareme.value) || 20 : null,
      coef: Number(inpCoef.value) || 1, publieePronote: null,
    });
    location.hash = `#/notes/eval/${id}`;
  });

  // --- Liste ---
  if (!evaluations.length) {
    c.append(carte('Aucune évaluation', 'Créez votre première évaluation : la saisie se fait en grille, dans l’ordre alphabétique de Pronote.'));
  } else {
    const effectifs = new Map();
    for (const e of eleves) if (e.actif !== false) effectifs.set(e.classeId, (effectifs.get(e.classeId) || 0) + 1);
    const nbNotes = new Map();
    for (const n of notes) nbNotes.set(n.evaluationId, (nbNotes.get(n.evaluationId) || 0) + 1);
    const liste = el('div', { class: 'liste-cartes' });
    for (const ev of [...evaluations].sort((a, b) => String(b.date).localeCompare(String(a.date)))) {
      const seq = seqDe(ev.sequenceId);
      const cl = seq ? classeDe(seq.classeId) : null;
      const bar = baremeDe(ev);
      const morceaux = [dateFR(ev.date), bar ? `/${bar}` : 'AFL', `coef ${ev.coef}`,
        `${nbNotes.get(ev.id) || 0}/${cl ? effectifs.get(cl.id) || 0 : '?'} notes`];
      const carteEv = carte(`${cl?.nom || '?'} — ${ev.titre}`, `${seq?.apsa || '?'} · ${morceaux.join(' · ')}`,
        ev.publieePronote ? `publiée ${dateFR(ev.publieePronote)} ✓` : '');
      const pastille = el('span', { class: 'pastille', 'aria-hidden': 'true' });
      pastille.style.background = cl?.couleur || 'var(--c-accent)';
      carteEv.querySelector('h2').prepend(pastille);
      liste.append(el('a', { class: 'carte-lien', href: `#/notes/eval/${ev.id}` }, carteEv));
    }
    c.append(liste);
  }

  // --- Relevés ---
  const actives = classes.filter((cl) => !cl.archivee).sort(trierClasses);
  if (actives.length && evaluations.length) {
    const carteR = carte('Relevés par classe', 'Toutes les notes d’une classe — imprimable et exportable.');
    for (const cl of actives) {
      const pastille = el('span', { class: 'pastille', 'aria-hidden': 'true' });
      pastille.style.background = cl.couleur || 'var(--c-accent)';
      carteR.append(el('a', { class: 'ligne-eleve', href: `#/notes/releve/${cl.id}` },
        pastille, el('span', { class: 'ligne-eleve-nom' }, cl.nom),
        el('span', { class: 'chevron pousse-droite', 'aria-hidden': 'true' }, '›')));
    }
    c.append(carteR);
  }
}

// ---------------------------------------------------------------------------
// Vue : grille de saisie d'une évaluation
// ---------------------------------------------------------------------------

async function vueEval(c, evalId) {
  const rafraichir = () => { c.innerHTML = ''; return vueEval(c, evalId); };
  c.append(el('a', { class: 'retour', href: '#/notes' }, '← Notes'));
  const ev = await lire('evaluations', evalId);
  if (!ev) { c.append(carte('Évaluation introuvable', 'Elle a peut-être été supprimée.')); return; }
  const sequence = await lire('sequences', ev.sequenceId);
  const classe = sequence ? await lire('classes', sequence.classeId) : null;
  if (!sequence || !classe) { c.append(carte('Évaluation orpheline', 'Sa séquence ou sa classe a été supprimée.')); return; }
  sauverPrefs({ derniereEvalId: evalId }); // raccourci « Reprendre » de l'accueil
  const eleves = (await parIndex('eleves', 'classeId', classe.id)).filter((e) => e.actif !== false).sort(trierEleves);
  const notesMap = new Map((await parIndex('notes', 'evaluationId', evalId)).map((n) => [n.eleveId, n]));
  const bareme = baremeDe(ev);
  const sauverEv = () => enregistrer('evaluations', ev);

  // --- En-tête ---
  const statsEl = el('p', { class: 'compteurs' });
  const carteTete = carte(`${classe.nom} — ${ev.titre}`, '', ev.publieePronote ? `publiée ${dateFR(ev.publieePronote)} ✓` : '');
  carteTete.append(
    el('p', {}, `${sequence.apsa} · ${bareme ? `noté /${bareme}` : 'AFL / positionnement'} · coef ${ev.coef}`),
    el('div', { class: 'rang-2' },
      champTexte({ id: 'ge-titre', libelle: 'Titre', valeur: ev.titre, onChange: async (v) => { if (v) { ev.titre = v; await sauverEv(); } } }),
      champTexte({ id: 'ge-date', libelle: 'Date', type: 'date', valeur: ev.date || '', onChange: async (v) => { ev.date = v; await sauverEv(); } }),
    ),
    statsEl,
  );
  c.append(carteTete);

  function majStats() {
    const nums = [...notesMap.values()].map((n) => n.valeur).filter((v) => typeof v === 'number');
    const enfants = [el('span', { class: 'note-inline' }, `${notesMap.size}/${eleves.length} saisies`)];
    if (bareme && nums.length) {
      const moy = nums.reduce((a, b) => a + b, 0) / nums.length;
      enfants.unshift(
        el('span', {}, el('strong', {}, formatFR(moy)), `/${bareme} de moyenne`),
        el('span', { class: 'note-inline' }, `min ${formatFR(Math.min(...nums))} · max ${formatFR(Math.max(...nums))}`),
      );
    }
    statsEl.replaceChildren(...enfants);
  }

  // --- Grille ---
  const carteGrille = carte('Saisie', bareme
    ? `Note (virgule acceptée) ou code : ABS, DISP, NN. Entrée = élève suivant. Vide = non saisi.`
    : 'Positionnement libre (ex. AFL1 D3). Non exportable vers Pronote.');
  const inputs = [];
  eleves.forEach((eleve, idx) => {
    const note = notesMap.get(eleve.id);
    const input = el('input', {
      class: 'input-note', type: 'text', inputmode: bareme ? 'decimal' : 'text',
      'aria-label': `Note de ${eleve.prenom} ${eleve.nom}`, autocomplete: 'off', placeholder: '—',
    });
    input.value = note ? (typeof note.valeur === 'number' ? formatFR(note.valeur) : note.valeur) : '';
    if (note && typeof note.valeur !== 'number') input.classList.add('code');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); (inputs[idx + 1] || input).focus(); inputs[idx + 1]?.select?.(); }
    });
    input.addEventListener('change', async () => {
      input.classList.remove('invalide', 'code');
      const idNote = `${evalId}_${eleve.id}`;
      if (!bareme) { // afl : texte libre
        const t = input.value.trim();
        if (!t) { await supprimer('notes', idNote); notesMap.delete(eleve.id); }
        else {
          const rec = { id: idNote, evaluationId: evalId, eleveId: eleve.id, valeur: t, commentaire: '' };
          await enregistrer('notes', rec); notesMap.set(eleve.id, rec);
        }
        majStats();
        return;
      }
      const r = parserValeur(input.value, bareme);
      if (r.invalide) { input.classList.add('invalide'); return; }
      if (r.vide) { await supprimer('notes', idNote); notesMap.delete(eleve.id); majStats(); return; }
      const valeur = r.code || r.nombre;
      const rec = { id: idNote, evaluationId: evalId, eleveId: eleve.id, valeur, commentaire: '' };
      await enregistrer('notes', rec);
      notesMap.set(eleve.id, rec);
      if (r.code) { input.value = r.code; input.classList.add('code'); }
      else input.value = formatFR(r.nombre);
      majStats();
    });
    inputs.push(input);
    carteGrille.append(el('div', { class: 'ligne-note' },
      el('span', { class: 'nom' }, `${eleve.nom} ${eleve.prenom}`), input));
  });
  c.append(carteGrille);
  majStats();

  // --- Export Pronote ---
  if (bareme) {
    const carteExp = carte('Vers Pronote', 'Dans Pronote, ouvrez le service de notation (même classe, même barème), cliquez sur la première case de la colonne et collez.');
    const statutExp = el('p', { class: 'statut' });
    const zoneSecours = el('div', {}); // textarea de copie manuelle (si presse-papiers indisponible)
    const zoneRecap = el('div', {});
    const btnCopier = el('button', { class: 'btn btn-principal' }, 'Copier pour Pronote');
    const btnCSV = el('button', { class: 'btn' }, 'Exporter CSV');

    const construireColonne = () => {
      const lignes = [];
      const codes = [];
      eleves.forEach((e, i) => {
        const v = notesMap.get(e.id)?.valeur;
        if (typeof v === 'number') lignes.push(formatFR(v));
        else {
          lignes.push('');
          if (v) codes.push(`ligne ${i + 1} — ${e.nom} ${e.prenom} : ${v}`);
        }
      });
      return { texte: lignes.join('\r\n'), codes };
    };

    const apresExport = async (codes) => {
      ev.publieePronote = isoAujourdhui();
      await sauverEv();
      zoneRecap.replaceChildren(
        el('p', { class: 'statut statut-ok' },
          `${eleves.length} lignes (ordre alphabétique). Garde-fou : vérifiez que le service Pronote compte bien ${eleves.length} élèves et le barème /${bareme}.`),
        ...(codes.length ? [el('p', {}, 'À saisir à la main dans Pronote :'),
          el('ul', {}, ...codes.map((t) => el('li', {}, t)))] : []),
      );
    };

    btnCopier.addEventListener('click', async () => {
      const { texte, codes } = construireColonne();
      try {
        await navigator.clipboard.writeText(texte);
        statutExp.textContent = 'Colonne copiée dans le presse-papiers ✓';
        statutExp.className = 'statut statut-ok';
        zoneSecours.replaceChildren();
      } catch {
        // Pas de presse-papiers (http réseau local…) : afficher la colonne à copier à la main.
        const zone = el('textarea', { rows: 8, 'aria-label': 'Colonne à copier' });
        zone.value = texte;
        zoneSecours.replaceChildren(el('p', {}, 'Copie automatique indisponible : sélectionnez tout puis copiez.'), zone);
        zone.focus(); zone.select();
        statutExp.textContent = '';
      }
      await apresExport(codes);
      carteTete.querySelector('h2 .badge')?.remove();
      carteTete.querySelector('h2').append(el('span', { class: 'badge' }, `publiée ${dateFR(ev.publieePronote)} ✓`));
    });

    btnCSV.addEventListener('click', async () => {
      const lignes = eleves.map((e) => {
        const v = notesMap.get(e.id)?.valeur;
        return [e.nom, e.prenom, typeof v === 'number' ? formatFR(v) : v || ''].join(';');
      });
      telechargerTexte(`notes_${classe.nom}_${ev.titre.replace(/[^\wàâéèêëîïôùûç -]/gi, '')}_${isoAujourdhui()}.csv`,
        ['Nom;Prénom;Note', ...lignes].join('\r\n'));
      await apresExport([]);
    });

    carteExp.append(el('div', { class: 'rang-btn' }, btnCopier, btnCSV), statutExp, zoneSecours, zoneRecap);
    c.append(carteExp);
  }

  // --- Suppression ---
  const carteS = carte('Supprimer cette évaluation', 'Supprime l’évaluation et toutes ses notes.');
  const btnSuppr = el('button', { class: 'btn btn-danger' }, 'Supprimer définitivement');
  btnSuppr.addEventListener('click', async () => {
    if (!confirm(`Supprimer « ${ev.titre} » et ses ${notesMap.size} notes ?`)) return;
    for (const n of await parIndex('notes', 'evaluationId', evalId)) await supprimer('notes', n.id);
    await supprimer('evaluations', evalId);
    location.hash = '#/notes';
  });
  carteS.append(el('div', { class: 'rang-btn' }, btnSuppr));
  c.append(carteS);
}

// ---------------------------------------------------------------------------
// Vue : relevé par classe (imprimable)
// ---------------------------------------------------------------------------

async function vueReleve(c, classeId) {
  c.append(el('a', { class: 'retour no-print', href: '#/notes' }, '← Notes'));
  const classe = await lire('classes', classeId);
  if (!classe) { c.append(carte('Classe introuvable', '')); return; }
  const eleves = (await parIndex('eleves', 'classeId', classeId)).filter((e) => e.actif !== false).sort(trierEleves);
  const sequencesCl = await parIndex('sequences', 'classeId', classeId);
  const seqIds = new Set(sequencesCl.map((s) => s.id));
  const evals = (await tous('evaluations')).filter((ev) => seqIds.has(ev.sequenceId))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const notes = await tous('notes');
  const noteDe = new Map(notes.map((n) => [`${n.evaluationId}_${n.eleveId}`, n.valeur]));
  const seqDe = (id) => sequencesCl.find((s) => s.id === id);

  const btnImprimer = el('button', { class: 'btn' }, 'Imprimer');
  btnImprimer.addEventListener('click', () => window.print());
  const btnCSV = el('button', { class: 'btn' }, 'Exporter CSV');
  const carteTete = carte(`Relevé de notes — ${classe.nom}`, 'Moyenne /20 pondérée par les coefficients ; les codes (ABS, DISP, NN) et les AFL ne comptent pas dans la moyenne.');
  carteTete.append(el('div', { class: 'rang-btn no-print' }, btnImprimer, btnCSV));
  c.append(carteTete);

  if (!evals.length) { c.append(carte('Aucune évaluation pour cette classe', '')); return; }

  const moyenneEleve = (eleveId) => {
    let somme = 0;
    let poids = 0;
    for (const ev of evals) {
      const bar = baremeDe(ev);
      const v = noteDe.get(`${ev.id}_${eleveId}`);
      if (bar && typeof v === 'number') { somme += (v / bar) * 20 * (ev.coef || 1); poids += ev.coef || 1; }
    }
    return poids ? somme / poids : null;
  };

  const lignes = eleves.map((e) => ({ e, moyenne: moyenneEleve(e.id) }));
  const table = el('table', { class: 'table-apercu table-recap' },
    el('thead', {}, el('tr', {},
      el('th', {}, 'Élève'),
      ...evals.map((ev) => el('th', { title: `${seqDe(ev.sequenceId)?.apsa || ''} · coef ${ev.coef}` },
        `${ev.titre} ${baremeDe(ev) ? `/${baremeDe(ev)}` : '(AFL)'}`)),
      el('th', {}, 'Moy. /20'),
    )),
    el('tbody', {},
      ...lignes.map(({ e, moyenne }) => el('tr', {},
        el('td', {}, `${e.nom} ${e.prenom}`),
        ...evals.map((ev) => el('td', {}, afficherValeur(noteDe.get(`${ev.id}_${e.id}`), null))),
        el('td', {}, moyenne === null ? '' : formatFR(moyenne)),
      )),
    ),
  );
  const moyennes = lignes.map((l) => l.moyenne).filter((m) => m !== null);
  c.append(table);
  if (moyennes.length) {
    c.append(el('p', { class: 'note-discrete' },
      `Moyenne de classe : ${formatFR(moyennes.reduce((a, b) => a + b, 0) / moyennes.length)}/20 (${moyennes.length} élèves notés)`));
  }

  btnCSV.addEventListener('click', () => {
    const tete = ['Nom', 'Prénom', ...evals.map((ev) => `${ev.titre}${baremeDe(ev) ? ` /${baremeDe(ev)}` : ' (AFL)'}`), 'Moyenne /20'].join(';');
    const corps = lignes.map(({ e, moyenne }) =>
      [e.nom, e.prenom,
        ...evals.map((ev) => afficherValeur(noteDe.get(`${ev.id}_${e.id}`), null)),
        moyenne === null ? '' : formatFR(moyenne)].join(';'));
    telechargerTexte(`releve_${classe.nom}_${isoAujourdhui()}.csv`, [tete, ...corps].join('\r\n'));
  });
}

// ---------------------------------------------------------------------------

export function initialiser() {
  enregistrerVue('notes', async (c, params = []) => {
    const [a, b] = params;
    if (a === 'eval' && b) return vueEval(c, b);
    if (a === 'releve' && b) return vueReleve(c, b);
    return vueListe(c);
  });
}
