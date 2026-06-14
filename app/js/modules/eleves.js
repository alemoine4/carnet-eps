// modules/eleves.js — référentiel classes & élèves + import CSV Pronote (phase 2).
// Sous-routes : #/eleves (classes) · #/eleves/classe/<id> · #/eleves/fiche/<id> · #/eleves/import
// Règles métier : docs/fonctionnalites.md §1 — minimisation RGPD (jamais d'INE ni d'adresse),
// suppression d'un élève = cascade documentée (io.supprimerEleveEnCascade).

import { enregistrerVue, el, carte, champTexte, champSelect, champZone, confirmer } from '../ui.js';
import {
  tous, lire, parIndex, enregistrer, supprimer, lireMeta,
  parserCSV, lireTexteCSV, supprimerEleveEnCascade,
  apercuSuppressionEleve, detailSuppression,
} from '../io.js';
import { STATUTS, SEUIL_ALERTE, dateFR } from '../metier.js';
import { stockerFichier, supprimerFichier, urlDuFichier } from '../media.js';
import { sauverPrefs } from '../state.js';

const PALETTE = ['#1d5fd6', '#178a52', '#c97a06', '#7c3aed', '#d03a3a', '#0e7490', '#be185d', '#4d7c0f'];

const normaliser = (s = '') => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const cleTexte = (s = '') => normaliser(s).replace(/[^a-z0-9]/g, '');
const trierEleves = (a, b) =>
  a.nom.localeCompare(b.nom, 'fr') || a.prenom.localeCompare(b.prenom, 'fr');
const trierClasses = (a, b) => a.nom.localeCompare(b.nom, 'fr', { numeric: true });

function devinerNiveau(nomClasse) {
  const m = String(nomClasse).trim().match(/^(\d)/);
  return m ? `${m[1]}e` : '';
}

function dateFRversISO(v) {
  const t = String(v || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return '';
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

function normaliserSexe(v) {
  const c = String(v || '').trim().charAt(0).toUpperCase();
  if (c === 'G') return 'M'; // certains exports notent G(arçon)/F(ille)
  return c === 'M' || c === 'F' ? c : '';
}

function avatar(eleve, couleur) {
  const initiales = `${(eleve.prenom[0] || '').toUpperCase()}${(eleve.nom[0] || '').toUpperCase()}`;
  const a = el('span', { class: 'avatar', 'aria-hidden': 'true' }, initiales);
  a.style.background = couleur || 'var(--c-accent)';
  return a;
}

async function compterParClasse() {
  const comptes = new Map();
  for (const e of await tous('eleves')) comptes.set(e.classeId, (comptes.get(e.classeId) || 0) + 1);
  return comptes;
}

// ---------------------------------------------------------------------------
// Vue : liste des classes
// ---------------------------------------------------------------------------

async function vueListeClasses(c) {
  const rafraichir = () => { c.innerHTML = ''; return vueListeClasses(c); };
  const classes = (await tous('classes')).sort(trierClasses);
  const actives = classes.filter((cl) => !cl.archivee);
  const archivees = classes.filter((cl) => cl.archivee);
  const comptes = await compterParClasse();

  // Barre d'actions
  const btnNouvelle = el('button', { class: 'btn btn-principal' }, '+ Nouvelle classe');
  const btnImport = el('a', { class: 'btn', href: '#/eleves/import' }, 'Importer depuis Pronote (CSV)');
  c.append(el('div', { class: 'barre-actions' }, btnNouvelle, btnImport));

  // Formulaire nouvelle classe (replié par défaut)
  const inpNom = el('input', { type: 'text', id: 'nc-nom', placeholder: '6A, 5B, 3PM…', autocomplete: 'off' });
  const inpNiveau = el('input', { type: 'text', id: 'nc-niveau', placeholder: '6e (déduit du nom si vide)', autocomplete: 'off' });
  const statutForm = el('p', { class: 'statut' });
  const btnCreer = el('button', { class: 'btn btn-principal' }, 'Créer la classe');
  const formCarte = carte('Nouvelle classe');
  formCarte.append(
    el('div', { class: 'champ' }, el('label', { for: 'nc-nom' }, 'Nom *'), inpNom),
    el('div', { class: 'champ' }, el('label', { for: 'nc-niveau' }, 'Niveau'), inpNiveau),
    el('div', { class: 'rang-btn' }, btnCreer),
    statutForm,
  );
  formCarte.hidden = true;
  c.append(formCarte);
  btnNouvelle.addEventListener('click', () => {
    formCarte.hidden = !formCarte.hidden;
    if (!formCarte.hidden) inpNom.focus();
  });
  btnCreer.addEventListener('click', async () => {
    const nom = inpNom.value.trim();
    if (!nom) { statutForm.textContent = 'Le nom est obligatoire.'; statutForm.className = 'statut statut-erreur'; return; }
    if (classes.some((cl) => cleTexte(cl.nom) === cleTexte(nom))) {
      statutForm.textContent = 'Une classe porte déjà ce nom.'; statutForm.className = 'statut statut-erreur'; return;
    }
    await enregistrer('classes', {
      id: crypto.randomUUID(),
      nom,
      niveau: inpNiveau.value.trim() || devinerNiveau(nom),
      anneeScolaire: await lireMeta('anneeScolaire', ''),
      couleur: PALETTE[classes.length % PALETTE.length],
      ordre: classes.length,
      archivee: false,
    });
    rafraichir();
  });

  // Liste
  if (!actives.length) {
    const vide = carte('Aucune classe pour l’instant', 'Créez une classe à la main, ou importez directement vos listes d’élèves depuis Pronote : les classes seront créées automatiquement.');
    c.append(vide);
  } else {
    const liste = el('div', { class: 'liste-cartes' });
    for (const cl of actives) {
      const pastille = el('span', { class: 'pastille', 'aria-hidden': 'true' });
      pastille.style.background = cl.couleur || 'var(--c-accent)';
      const effectif = comptes.get(cl.id) || 0;
      const carteCl = carte(`${cl.nom}`, `${cl.niveau ? cl.niveau + ' · ' : ''}${effectif} élève${effectif > 1 ? 's' : ''}`);
      carteCl.querySelector('h2').prepend(pastille);
      liste.append(el('a', { class: 'carte-lien', href: `#/eleves/classe/${cl.id}` }, carteCl));
    }
    c.append(liste);
  }

  // Classes archivées
  if (archivees.length) {
    const carteArch = carte('Classes archivées', '');
    for (const cl of archivees) {
      const btnRestaurer = el('button', { class: 'btn' }, 'Restaurer');
      btnRestaurer.addEventListener('click', async () => {
        cl.archivee = false;
        await enregistrer('classes', cl);
        rafraichir();
      });
      carteArch.append(el('div', { class: 'info-ligne' }, el('span', {}, `${cl.nom} (${comptes.get(cl.id) || 0} élèves)`), btnRestaurer));
    }
    c.append(carteArch);
  }
}

// ---------------------------------------------------------------------------
// Vue : une classe (édition + liste des élèves)
// ---------------------------------------------------------------------------

async function vueClasse(c, id) {
  const rafraichir = () => { c.innerHTML = ''; return vueClasse(c, id); };
  const classe = await lire('classes', id);
  c.append(el('a', { class: 'retour', href: '#/eleves' }, '← Classes'));
  if (!classe) { c.append(carte('Classe introuvable', 'Elle a peut-être été supprimée.')); return; }
  sauverPrefs({ derniereClasseId: id }); // raccourci « Reprendre » de l'accueil
  const eleves = (await parIndex('eleves', 'classeId', id)).sort(trierEleves);

  // Carte classe (édition directe)
  const carteCl = carte(`Classe ${classe.nom}`, '', `${eleves.length} élève${eleves.length > 1 ? 's' : ''}`);
  const inpCouleur = el('input', { type: 'color', id: 'cl-couleur' });
  inpCouleur.value = classe.couleur || PALETTE[0];
  inpCouleur.addEventListener('change', async () => { classe.couleur = inpCouleur.value; await enregistrer('classes', classe); });
  carteCl.append(
    champTexte({ id: 'cl-nom', libelle: 'Nom', valeur: classe.nom, onChange: async (v) => { if (v) { classe.nom = v; await enregistrer('classes', classe); } } }),
    champTexte({ id: 'cl-niveau', libelle: 'Niveau', valeur: classe.niveau || '', onChange: async (v) => { classe.niveau = v; await enregistrer('classes', classe); } }),
    el('div', { class: 'champ' }, el('label', { for: 'cl-couleur' }, 'Couleur'), inpCouleur),
  );
  const btnArchiver = el('button', { class: 'btn' }, classe.archivee ? 'Restaurer' : 'Archiver');
  btnArchiver.addEventListener('click', async () => {
    classe.archivee = !classe.archivee;
    await enregistrer('classes', classe);
    location.hash = '#/eleves';
  });
  const actions = el('div', { class: 'rang-btn' }, btnArchiver);
  if (!eleves.length) {
    const btnSuppr = el('button', { class: 'btn btn-danger' }, 'Supprimer la classe');
    btnSuppr.addEventListener('click', async () => {
      if (!(await confirmer({ titre: 'Supprimer la classe', message: `Supprimer définitivement la classe ${classe.nom} (vide) ?` }))) return;
      await supprimer('classes', classe.id);
      location.hash = '#/eleves';
    });
    actions.append(btnSuppr);
  }
  carteCl.append(actions);
  c.append(carteCl);

  // Carte élèves
  const carteEl = carte('Élèves');
  const btnAjouter = el('button', { class: 'btn' }, '+ Ajouter un élève');
  carteEl.append(el('div', { class: 'rang-btn' }, btnAjouter));

  // mini-formulaire d'ajout (replié)
  const inpNom = el('input', { type: 'text', id: 'el-nom', placeholder: 'NOM', autocomplete: 'off' });
  const inpPrenom = el('input', { type: 'text', id: 'el-prenom', placeholder: 'Prénom', autocomplete: 'off' });
  const btnCreer = el('button', { class: 'btn btn-principal' }, 'Ajouter');
  const statutAjout = el('p', { class: 'statut' });
  const formAjout = el('div', {},
    el('div', { class: 'champ' }, el('label', { for: 'el-nom' }, 'Nom *'), inpNom),
    el('div', { class: 'champ' }, el('label', { for: 'el-prenom' }, 'Prénom *'), inpPrenom),
    el('div', { class: 'rang-btn' }, btnCreer),
    statutAjout,
  );
  formAjout.hidden = true;
  carteEl.append(formAjout);
  btnAjouter.addEventListener('click', () => { formAjout.hidden = !formAjout.hidden; if (!formAjout.hidden) inpNom.focus(); });
  btnCreer.addEventListener('click', async () => {
    const nom = inpNom.value.trim();
    const prenom = inpPrenom.value.trim();
    if (!nom || !prenom) { statutAjout.textContent = 'Nom et prénom obligatoires.'; statutAjout.className = 'statut statut-erreur'; return; }
    if (eleves.some((e) => cleTexte(e.nom) === cleTexte(nom) && cleTexte(e.prenom) === cleTexte(prenom))) {
      statutAjout.textContent = 'Cet élève existe déjà dans la classe.'; statutAjout.className = 'statut statut-erreur'; return;
    }
    await enregistrer('eleves', {
      id: crypto.randomUUID(), classeId: id, nom, prenom,
      sexe: '', dateNaissance: '', notesPerso: '', actif: true,
    });
    rafraichir();
  });

  // recherche + liste
  if (eleves.length) {
    const recherche = el('input', { type: 'search', class: 'recherche', placeholder: 'Rechercher…', 'aria-label': 'Rechercher un élève' });
    carteEl.append(recherche);
    const conteneurListe = el('div', { class: 'liste-eleves' });
    const lignes = eleves.map((e) => {
      const ligne = el('a', { class: 'ligne-eleve', href: `#/eleves/fiche/${e.id}` },
        avatar(e, classe.couleur),
        el('span', { class: 'ligne-eleve-nom' }, `${e.nom} ${e.prenom}`),
        e.notesPerso ? el('span', { class: 'badge' }, 'ℹ') : '',
        el('span', { class: 'chevron', 'aria-hidden': 'true' }, '›'),
      );
      return { e, ligne };
    });
    conteneurListe.append(...lignes.map((l) => l.ligne));
    carteEl.append(conteneurListe);
    recherche.addEventListener('input', () => {
      const q = cleTexte(recherche.value);
      for (const { e, ligne } of lignes) ligne.hidden = q !== '' && !cleTexte(e.nom + e.prenom).includes(q);
    });
  } else {
    carteEl.append(el('p', { class: 'vide' }, 'Aucun élève — ajoutez-les à la main ou via l’import Pronote.'));
  }
  c.append(carteEl);
}

// ---------------------------------------------------------------------------
// Vue : fiche élève
// ---------------------------------------------------------------------------

async function vueFiche(c, id) {
  const rafraichir = () => { c.innerHTML = ''; return vueFiche(c, id); };
  const eleve = await lire('eleves', id);
  if (!eleve) {
    c.append(el('a', { class: 'retour', href: '#/eleves' }, '← Classes'), carte('Élève introuvable', 'Il a peut-être été supprimé.'));
    return;
  }
  const classes = (await tous('classes')).sort(trierClasses);
  const classe = classes.find((cl) => cl.id === eleve.classeId);
  c.append(el('a', { class: 'retour', href: `#/eleves/classe/${eleve.classeId}` }, `← ${classe ? classe.nom : 'Classes'}`));

  const sauver = async () => { await enregistrer('eleves', eleve); };

  const carteId = carte(`${eleve.nom} ${eleve.prenom}`, '', classe ? classe.nom : '');
  // Photo de l'élève (stockée localement, compressée) ou initiales.
  const h2Fiche = carteId.querySelector('h2');
  let photoOK = false;
  if (eleve.photoFichierId) {
    const res = await urlDuFichier(eleve.photoFichierId);
    if (res) {
      h2Fiche.prepend(el('img', { class: 'avatar avatar-photo', src: res.url, alt: '' }));
      photoOK = true;
    }
  }
  if (!photoOK) h2Fiche.prepend(avatar(eleve, classe?.couleur));
  const inpPhoto = el('input', { type: 'file', accept: 'image/*', capture: 'user', hidden: true });
  inpPhoto.addEventListener('change', async () => {
    const f = inpPhoto.files[0];
    if (!f) return;
    const rec = await stockerFichier(f);
    if (eleve.photoFichierId) await supprimerFichier(eleve.photoFichierId);
    eleve.photoFichierId = rec.id;
    await sauver();
    rafraichir();
  });
  const rangPhoto = el('div', { class: 'rang-btn' }, el('label', { class: 'btn' }, photoOK ? 'Changer la photo' : 'Ajouter une photo', inpPhoto));
  if (photoOK) {
    const btnRetirer = el('button', { class: 'btn' }, 'Retirer la photo');
    btnRetirer.addEventListener('click', async () => {
      await supprimerFichier(eleve.photoFichierId);
      eleve.photoFichierId = null;
      await sauver();
      rafraichir();
    });
    rangPhoto.append(btnRetirer);
  }
  carteId.append(rangPhoto);
  carteId.append(
    champTexte({ id: 'f-nom', libelle: 'Nom', valeur: eleve.nom, onChange: async (v) => { if (v) { eleve.nom = v; await sauver(); } } }),
    champTexte({ id: 'f-prenom', libelle: 'Prénom', valeur: eleve.prenom, onChange: async (v) => { if (v) { eleve.prenom = v; await sauver(); } } }),
    champSelect({
      id: 'f-sexe', libelle: 'Sexe', valeur: eleve.sexe || '',
      options: [{ value: '', label: '—' }, { value: 'F', label: 'Fille' }, { value: 'M', label: 'Garçon' }],
      onChange: async (v) => { eleve.sexe = v; await sauver(); },
    }),
    champTexte({ id: 'f-naissance', libelle: 'Date de naissance', type: 'date', valeur: eleve.dateNaissance || '', onChange: async (v) => { eleve.dateNaissance = v; await sauver(); } }),
    champSelect({
      id: 'f-classe', libelle: 'Classe', valeur: eleve.classeId,
      options: classes.map((cl) => ({ value: cl.id, label: cl.nom })),
      onChange: async (v) => { eleve.classeId = v; await sauver(); },
    }),
    champZone({ id: 'f-notes', libelle: 'À savoir (PAI, asthme, lunettes…)', valeur: eleve.notesPerso || '', placeholder: 'Visible uniquement sur cet appareil', onChange: async (v) => { eleve.notesPerso = v; await sauver(); } }),
  );
  c.append(carteId);

  // --- Historique d'appel (phase 4) ---
  const appelsE = await parIndex('appels', 'eleveId', id);
  const carteAp = carte('Appels & absences EPS');
  if (!appelsE.length) {
    carteAp.append(el('p', {}, 'Aucun appel enregistré pour l’instant.'));
  } else {
    const cnt = {};
    for (const a of appelsE) cnt[a.statut] = (cnt[a.statut] || 0) + 1;
    const chips = el('div', { class: 'rang-chips' });
    for (const [cle, conf] of Object.entries(STATUTS)) {
      if (!cnt[cle]) continue;
      const chip = el('span', { class: 'badge' }, `${conf.libelle} ×${cnt[cle]}`);
      chip.style.background = conf.couleur;
      chip.style.color = '#fff';
      chips.append(chip);
    }
    carteAp.append(chips);
    if ((cnt.oubli_tenue || 0) >= SEUIL_ALERTE || (cnt.dispense || 0) >= SEUIL_ALERTE) {
      carteAp.append(el('p', { class: 'statut statut-erreur' }, `⚠ Signalement : ${SEUIL_ALERTE} oublis de tenue ou dispenses atteints — penser famille / vie scolaire.`));
    }
    const seancesT = await tous('seances');
    const seqT = await tous('sequences');
    const derniers = appelsE
      .map((a) => ({ a, s: seancesT.find((x) => x.id === a.seanceId) }))
      .filter((x) => x.s)
      .sort((x, y) => y.s.date.localeCompare(x.s.date))
      .slice(0, 8);
    const listeH = el('div', { class: 'liste-eleves' });
    for (const { a, s } of derniers) {
      const conf = STATUTS[a.statut] || STATUTS.present;
      const b = el('span', { class: 'badge' }, conf.court);
      b.style.background = conf.couleur;
      b.style.color = '#fff';
      const seq = seqT.find((q) => q.id === s.sequenceId);
      listeH.append(el('div', { class: 'ligne-eleve' }, b,
        el('span', { class: 'ligne-eleve-nom' },
          `${dateFR(s.date)} · ${seq?.apsa || '?'}${a.minutesRetard ? ` · ${a.minutesRetard} min` : ''}${a.commentaire ? ` · ${a.commentaire}` : ''}`)));
    }
    carteAp.append(listeH);
  }
  // --- Inaptitudes & certificats (phase 5) ---
  const inaptE = (await parIndex('inaptitudes', 'eleveId', id))
    .sort((a, b) => String(b.dateDebut).localeCompare(String(a.dateDebut)));
  const carteIn = carte('Inaptitudes & certificats');
  const aujF = new Date().toISOString().slice(0, 10);
  if (!inaptE.length) {
    carteIn.append(el('p', {}, 'Aucune inaptitude enregistrée.'));
  } else {
    const listeIn = el('div', { class: 'liste-eleves' });
    for (const i of inaptE) {
      const active = (!i.dateDebut || i.dateDebut <= aujF) && (!i.dateFin || aujF <= i.dateFin);
      listeIn.append(el('a', { class: 'ligne-eleve', href: `#/inaptitudes/${i.id}` },
        el('span', { class: 'badge' + (active ? ' badge-accent' : '') }, active ? 'en cours' : i.dateDebut > aujF ? 'à venir' : 'terminée'),
        el('span', { class: 'ligne-eleve-nom' }, `${i.type === 'totale' ? 'Totale' : 'Partielle'} · ${dateFR(i.dateDebut)} → ${i.dateFin ? dateFR(i.dateFin) : '?'}${i.certificatId ? ' · 📎' : ''}`),
        el('span', { class: 'chevron pousse-droite', 'aria-hidden': 'true' }, '›'),
      ));
    }
    carteIn.append(listeIn);
  }
  carteIn.append(el('div', { class: 'rang-btn' }, el('a', { class: 'btn', href: `#/inaptitudes/nouvelle/${id}` }, '+ Nouvelle inaptitude')));

  // --- Notes (phase 6) ---
  const notesE = await parIndex('notes', 'eleveId', id);
  const carteNo = carte('Notes');
  if (!notesE.length) {
    carteNo.append(el('p', {}, 'Aucune note pour l’instant.'));
  } else {
    const evalsT = await tous('evaluations');
    const seqsT = await tous('sequences');
    const baremeDe = (ev) => (ev.type === 'note20' ? 20 : ev.type === 'bareme' ? Number(ev.bareme) || 20 : null);
    const lignesN = notesE
      .map((n) => ({ n, ev: evalsT.find((x) => x.id === n.evaluationId) }))
      .filter((x) => x.ev)
      .sort((x, y) => String(y.ev.date).localeCompare(String(x.ev.date)));
    let somme = 0;
    let poids = 0;
    for (const { n, ev } of lignesN) {
      const bar = baremeDe(ev);
      if (bar && typeof n.valeur === 'number') { somme += (n.valeur / bar) * 20 * (ev.coef || 1); poids += ev.coef || 1; }
    }
    if (poids) {
      const moy = String(Math.round((somme / poids) * 100) / 100).replace('.', ',');
      carteNo.append(el('p', { class: 'compteurs' }, el('span', {}, el('strong', {}, moy), '/20 de moyenne générale')));
    }
    const listeN = el('div', { class: 'liste-eleves' });
    for (const { n, ev } of lignesN.slice(0, 8)) {
      const seq = seqsT.find((q) => q.id === ev.sequenceId);
      const bar = baremeDe(ev);
      const valeur = typeof n.valeur === 'number' ? `${String(n.valeur).replace('.', ',')}${bar ? '/' + bar : ''}` : String(n.valeur);
      listeN.append(el('div', { class: 'ligne-eleve' },
        el('span', { class: 'badge' }, valeur),
        el('span', { class: 'ligne-eleve-nom' }, `${dateFR(ev.date)} · ${seq?.apsa || '?'} · ${ev.titre}`)));
    }
    carteNo.append(listeN);
  }

  c.append(carteAp, carteIn, carteNo);

  const carteSuppr = carte('Supprimer cet élève', 'Supprime l’élève et TOUT son historique (appels, inaptitudes, certificats, notes). Pensez à faire une sauvegarde avant (Plus → Sauvegarde).');
  const btnSuppr = el('button', { class: 'btn btn-danger' }, 'Supprimer définitivement');
  btnSuppr.addEventListener('click', async () => {
    const comptes = await apercuSuppressionEleve(eleve.id);
    if (!(await confirmer({
      titre: `Supprimer ${eleve.prenom} ${eleve.nom} ?`,
      message: 'L’élève et tout son historique seront supprimés. Action définitive.',
      detail: detailSuppression(comptes),
    }))) return;
    await supprimerEleveEnCascade(eleve.id);
    location.hash = `#/eleves/classe/${eleve.classeId}`;
  });
  carteSuppr.append(el('div', { class: 'rang-btn' }, btnSuppr));
  c.append(carteSuppr);
}

// ---------------------------------------------------------------------------
// Vue : import CSV Pronote
// ---------------------------------------------------------------------------

function detecterColonnes(entetes) {
  const n = entetes.map((e) => cleTexte(e));
  const trouver = (test) => n.findIndex(test);
  return {
    prenom: trouver((h) => h.includes('prenom')),
    nom: trouver((h) => h === 'nom' || h === 'nomdefamille' || (h.includes('nom') && !h.includes('prenom'))),
    dateNaissance: trouver((h) => h.includes('naissance') || h === 'neele' || h === 'nele' || h === 'nee'),
    sexe: trouver((h) => h.includes('sexe') || h === 'genre'),
    classe: trouver((h) => h.includes('classe') || h === 'division'),
  };
}

async function executerImport(lignes, dest) {
  const annee = await lireMeta('anneeScolaire', '');
  const classes = await tous('classes');
  const parCle = new Map(classes.map((cl) => [cleTexte(cl.nom), cl]));
  let ordre = classes.length;
  const classesCreees = [];
  const assurerClasse = async (nom) => {
    const cle = cleTexte(nom);
    if (parCle.has(cle)) return parCle.get(cle);
    const cl = {
      id: crypto.randomUUID(), nom: String(nom).trim(), niveau: devinerNiveau(nom),
      anneeScolaire: annee, couleur: PALETTE[ordre % PALETTE.length], ordre: ordre++, archivee: false,
    };
    await enregistrer('classes', cl);
    parCle.set(cle, cl);
    classesCreees.push(cl.nom);
    return cl;
  };

  let classeFixe = null;
  if (dest.mode === 'existante') classeFixe = await lire('classes', dest.classeId);
  if (dest.mode === 'nouvelle') classeFixe = await assurerClasse(dest.nom);

  const existants = await tous('eleves');
  const dejaLa = new Set(existants.map((e) => `${cleTexte(e.nom)}|${cleTexte(e.prenom)}@${e.classeId}`));
  const resultat = { importes: 0, doublons: 0, ignores: 0, classesCreees, classesTouchees: new Set() };

  for (const l of lignes) {
    if (!l.nom || !l.prenom) { resultat.ignores++; continue; }
    const classe = classeFixe || (l.classe ? await assurerClasse(l.classe) : null);
    if (!classe) { resultat.ignores++; continue; }
    const cle = `${cleTexte(l.nom)}|${cleTexte(l.prenom)}@${classe.id}`;
    if (dejaLa.has(cle)) { resultat.doublons++; continue; }
    dejaLa.add(cle);
    await enregistrer('eleves', {
      id: crypto.randomUUID(), classeId: classe.id, nom: l.nom, prenom: l.prenom,
      sexe: normaliserSexe(l.sexe), dateNaissance: dateFRversISO(l.dateNaissance),
      notesPerso: '', actif: true,
    });
    resultat.importes++;
    resultat.classesTouchees.add(classe.nom);
  }
  return resultat;
}

async function vueImport(c) {
  c.append(el('a', { class: 'retour', href: '#/eleves' }, '← Classes'));

  // --- Étape 1 : source ---
  const carteSource = carte('1 · Source', 'Collez la liste copiée depuis Pronote, ou choisissez le fichier CSV exporté. Séparateur (; ou tabulation) et encodage (UTF-8 / Windows) détectés automatiquement.');
  const zone = el('textarea', { rows: 6, 'aria-label': 'Données CSV collées', placeholder: 'Nom;Prénom;Né(e) le;Sexe;Classe\nDUPONT;Léa;12/03/2014;F;6A\n…' });
  const inputFichier = el('input', { type: 'file', accept: '.csv,.txt,text/csv,text/plain', class: 'champ-fichier', 'aria-label': 'Fichier CSV Pronote' });
  const btnAnalyser = el('button', { class: 'btn btn-principal' }, 'Analyser');
  const btnExemple = el('button', { class: 'btn' }, 'Essayer avec l’exemple');
  const statutSource = el('p', { class: 'statut' });
  carteSource.append(el('div', { class: 'champ' }, zone), inputFichier, el('div', { class: 'rang-btn' }, btnAnalyser, btnExemple), statutSource);
  const suite = el('div', {});
  c.append(carteSource, suite);

  btnExemple.addEventListener('click', async () => {
    try {
      const rep = await fetch('data/exemple_eleves_pronote.csv');
      zone.value = await rep.text();
      statutSource.textContent = 'Exemple chargé (10 élèves fictifs) — cliquez sur Analyser.';
      statutSource.className = 'statut statut-ok';
    } catch {
      statutSource.textContent = 'Exemple indisponible.';
      statutSource.className = 'statut statut-erreur';
    }
  });

  btnAnalyser.addEventListener('click', async () => {
    try {
      const texte = inputFichier.files[0] ? await lireTexteCSV(inputFichier.files[0]) : zone.value;
      if (!texte.trim()) throw new Error('aucune donnée : collez du texte ou choisissez un fichier');
      const analyse = parserCSV(texte);
      statutSource.textContent = `${analyse.lignes.length} lignes lues (séparateur « ${analyse.separateur === '\t' ? 'tabulation' : analyse.separateur} »).`;
      statutSource.className = 'statut statut-ok';
      afficherMapping(suite, analyse);
    } catch (e) {
      statutSource.textContent = `Analyse impossible : ${e.message}`;
      statutSource.className = 'statut statut-erreur';
    }
  });
}

async function afficherMapping(c, analyse) {
  c.innerHTML = '';
  const { entetes, lignes } = analyse;
  const auto = detecterColonnes(entetes);

  // --- Étape 2 : correspondance des colonnes ---
  const carteMap = carte('2 · Colonnes', 'Vérifiez la correspondance détectée automatiquement.');
  const selects = {};
  const cibles = [
    ['nom', 'Nom *'], ['prenom', 'Prénom *'], ['dateNaissance', 'Date de naissance'],
    ['sexe', 'Sexe'], ['classe', 'Classe'],
  ];
  for (const [cle, libelle] of cibles) {
    const sel = el('select', { id: `map-${cle}` },
      el('option', { value: '-1' }, '— ignorer —'),
      ...entetes.map((e, i) => el('option', { value: String(i) }, e || `Colonne ${i + 1}`)),
    );
    sel.value = String(auto[cle] ?? -1);
    selects[cle] = sel;
    carteMap.append(el('div', { class: 'champ' }, el('label', { for: `map-${cle}` }, libelle), sel));
  }
  // aperçu brut des 3 premières lignes
  const table = el('table', { class: 'table-apercu' },
    el('thead', {}, el('tr', {}, ...entetes.map((e) => el('th', {}, e)))),
    el('tbody', {}, ...lignes.slice(0, 3).map((l) => el('tr', {}, ...entetes.map((_, i) => el('td', {}, l[i] || ''))))),
  );
  carteMap.append(table);
  c.append(carteMap);

  // --- Étape 3 : destination ---
  const carteDest = carte('3 · Classe de destination');
  const classes = (await tous('classes')).filter((cl) => !cl.archivee).sort(trierClasses);
  const radio = (valeur, libelle, controle = '') => {
    const r = el('input', { type: 'radio', name: 'dest-mode', value: valeur, id: `dest-${valeur}` });
    return { r, ligne: el('label', { class: 'ligne-option', for: `dest-${valeur}` }, r, ` ${libelle} `, controle) };
  };
  const selExistante = el('select', { 'aria-label': 'Classe existante' }, ...classes.map((cl) => el('option', { value: cl.id }, cl.nom)));
  const inpNouvelle = el('input', { type: 'text', placeholder: 'Nom de la nouvelle classe', 'aria-label': 'Nom de la nouvelle classe', autocomplete: 'off' });
  const rColonne = radio('colonne', 'Utiliser la colonne « Classe » (création automatique)');
  const rExistante = radio('existante', 'Tout mettre dans :', selExistante);
  const rNouvelle = radio('nouvelle', 'Créer la classe :', inpNouvelle);
  if (auto.classe < 0) rColonne.r.disabled = true;
  if (!classes.length) rExistante.r.disabled = true;
  (auto.classe >= 0 ? rColonne : classes.length ? rExistante : rNouvelle).r.checked = true;
  carteDest.append(rColonne.ligne, rExistante.ligne, rNouvelle.ligne);
  c.append(carteDest);

  // --- Étape 4 : import ---
  const carteGo = carte('4 · Importer');
  const btnImporter = el('button', { class: 'btn btn-principal' }, `Importer ${lignes.length} élèves`);
  const statutImport = el('p', { class: 'statut' });
  carteGo.append(el('div', { class: 'rang-btn' }, btnImporter), statutImport);
  c.append(carteGo);

  btnImporter.addEventListener('click', async () => {
    try {
      const colonne = (cle) => Number(selects[cle].value);
      if (colonne('nom') < 0 || colonne('prenom') < 0) throw new Error('les colonnes Nom et Prénom sont obligatoires');
      const valeur = (l, cle) => (colonne(cle) >= 0 ? l[colonne(cle)] || '' : '');
      const prep = lignes.map((l) => ({
        nom: valeur(l, 'nom').trim(),
        prenom: valeur(l, 'prenom').trim(),
        dateNaissance: valeur(l, 'dateNaissance'),
        sexe: valeur(l, 'sexe'),
        classe: valeur(l, 'classe').trim(),
      }));
      const mode = document.querySelector('input[name="dest-mode"]:checked')?.value;
      const dest = { mode };
      if (mode === 'existante') dest.classeId = selExistante.value;
      if (mode === 'nouvelle') {
        dest.nom = inpNouvelle.value.trim();
        if (!dest.nom) throw new Error('donnez un nom à la nouvelle classe');
      }
      btnImporter.disabled = true;
      const r = await executerImport(prep, dest);
      const morceaux = [`${r.importes} élève${r.importes > 1 ? 's' : ''} importé${r.importes > 1 ? 's' : ''}`];
      if (r.classesTouchees.size) morceaux.push(`dans ${[...r.classesTouchees].join(', ')}`);
      if (r.classesCreees.length) morceaux.push(`(${r.classesCreees.length} classe${r.classesCreees.length > 1 ? 's' : ''} créée${r.classesCreees.length > 1 ? 's' : ''})`);
      if (r.doublons) morceaux.push(`· ${r.doublons} doublon${r.doublons > 1 ? 's' : ''} ignoré${r.doublons > 1 ? 's' : ''}`);
      if (r.ignores) morceaux.push(`· ${r.ignores} ligne${r.ignores > 1 ? 's' : ''} incomplète${r.ignores > 1 ? 's' : ''}`);
      statutImport.textContent = morceaux.join(' ') + '.';
      statutImport.className = 'statut statut-ok';
      carteGo.append(el('div', { class: 'rang-btn' }, el('a', { class: 'btn btn-principal', href: '#/eleves' }, 'Voir les classes')));
    } catch (e) {
      statutImport.textContent = `Import impossible : ${e.message}`;
      statutImport.className = 'statut statut-erreur';
    } finally {
      btnImporter.disabled = false;
    }
  });
}

// ---------------------------------------------------------------------------

export function initialiser() {
  enregistrerVue('eleves', async (c, params = []) => {
    const [sous, id] = params;
    if (sous === 'classe' && id) return vueClasse(c, id);
    if (sous === 'fiche' && id) return vueFiche(c, id);
    if (sous === 'import') return vueImport(c);
    return vueListeClasses(c);
  });
}
