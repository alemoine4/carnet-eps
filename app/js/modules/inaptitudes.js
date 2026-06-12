// modules/inaptitudes.js — inaptitudes & certificats médicaux (phase 5).
// Sous-routes : #/inaptitudes (synthèse) · #/inaptitudes/nouvelle[/<eleveId>] · #/inaptitudes/<id>
// Règles : pré-remplit l'appel (statut « inapte », géré par appel.js via inaptitudesActives) ;
// alerte J-7 avant expiration ; inaptitude > 3 mois → rappel médecin scolaire (réglementation).

import { enregistrerVue, el, carte, champTexte, champSelect, champZone } from '../ui.js';
import { tous, lire, parIndex, enregistrer, supprimer } from '../io.js';
import { stockerFichier, supprimerFichier, urlDuFichier, ouvrirVisionneuse } from '../media.js';
import { isoAujourdhui, dateFR } from '../metier.js';

const RESTRICTIONS = [
  ['course', 'Course'],
  ['sauts', 'Sauts / impacts'],
  ['lancers', 'Lancers'],
  ['appuis', 'Appuis / poignets'],
  ['natation', 'Natation'],
  ['port_de_charge', 'Port de charge'],
];
const LIBELLE_RESTRICTION = Object.fromEntries(RESTRICTIONS);
const ORIGINES = [
  { value: 'certificat', label: 'Certificat médical' },
  { value: 'mot', label: 'Mot des parents' },
  { value: 'infirmerie', label: 'Infirmerie' },
];
const SEUIL_MEDECIN_JOURS = 90; // > 3 mois → médecin scolaire

const trierEleves = (a, b) => a.nom.localeCompare(b.nom, 'fr') || a.prenom.localeCompare(b.prenom, 'fr');
const trierClasses = (a, b) => a.nom.localeCompare(b.nom, 'fr', { numeric: true });

const jours = (de, a) => Math.round((new Date(`${a}T12:00:00`) - new Date(`${de}T12:00:00`)) / 86400000);

function etatDe(i, auj = isoAujourdhui()) {
  if (i.dateDebut && i.dateDebut > auj) return 'a_venir';
  if (i.dateFin && i.dateFin < auj) return 'terminee';
  return 'active';
}

// Badges d'état + alertes pour une inaptitude.
function badges(i, auj = isoAujourdhui()) {
  const liste = [];
  const etat = etatDe(i, auj);
  liste.push(el('span', { class: 'badge' }, i.type === 'totale' ? 'totale' : 'partielle'));
  if (etat === 'a_venir') liste.push(el('span', { class: 'badge' }, `débute le ${dateFR(i.dateDebut)}`));
  if (etat === 'active' && i.dateFin) {
    const restants = jours(auj, i.dateFin);
    if (restants <= 7) {
      const b = el('span', { class: 'badge badge-alerte' }, restants <= 0 ? 'dernier jour' : `fin dans ${restants} j`);
      liste.push(b);
    }
  }
  if (etat === 'terminee') liste.push(el('span', { class: 'badge' }, `terminée le ${dateFR(i.dateFin)}`));
  if (i.dateDebut && i.dateFin && jours(i.dateDebut, i.dateFin) > SEUIL_MEDECIN_JOURS) {
    liste.push(el('span', { class: 'badge badge-accent' }, '> 3 mois · médecin scolaire'));
  }
  return liste;
}

function resumeRestrictions(i) {
  if (i.type === 'totale') return 'Aucune pratique';
  const libs = (i.restrictions || []).map((r) => LIBELLE_RESTRICTION[r] || r);
  return libs.length ? 'Sans : ' + libs.join(', ') : 'Partielle (sans précision)';
}

// ---------------------------------------------------------------------------
// Vue : synthèse
// ---------------------------------------------------------------------------

async function vueSynthese(c) {
  c.append(el('a', { class: 'retour', href: '#/plus' }, '← Plus'));
  const [inaptitudes, eleves, classes] = await Promise.all([tous('inaptitudes'), tous('eleves'), tous('classes')]);
  const eleveDe = (id) => eleves.find((e) => e.id === id);
  const classeDe = (id) => classes.find((cl) => cl.id === id);
  const auj = isoAujourdhui();

  c.append(el('div', { class: 'barre-actions' },
    el('a', { class: 'btn btn-principal', href: '#/inaptitudes/nouvelle' }, '+ Nouvelle inaptitude')));

  if (!inaptitudes.length) {
    c.append(carte('Aucune inaptitude enregistrée', 'Quand un élève apporte un certificat ou un mot, saisissez l’inaptitude ici (ou depuis sa fiche) : il sera automatiquement signalé à l’appel pendant toute la période.'));
    return;
  }

  const ligne = (i) => {
    const e = eleveDe(i.eleveId);
    const cl = e ? classeDe(e.classeId) : null;
    const a = el('a', { class: 'ligne-eleve', href: `#/inaptitudes/${i.id}` },
      el('span', { class: 'ligne-eleve-nom' }, `${e ? `${e.nom} ${e.prenom}` : 'Élève supprimé'}${cl ? ' · ' + cl.nom : ''}`),
      ...badges(i, auj),
      el('span', { class: 'chevron pousse-droite', 'aria-hidden': 'true' }, '›'),
    );
    a.append(el('span', { class: 'note-inline ligne-pleine' }, `${resumeRestrictions(i)} · du ${dateFR(i.dateDebut)} au ${i.dateFin ? dateFR(i.dateFin) : '?'}`));
    return a;
  };

  const actives = inaptitudes.filter((i) => etatDe(i, auj) === 'active')
    .sort((a, b) => String(a.dateFin || '9999').localeCompare(String(b.dateFin || '9999')));
  const aVenir = inaptitudes.filter((i) => etatDe(i, auj) === 'a_venir')
    .sort((a, b) => a.dateDebut.localeCompare(b.dateDebut));
  const recentes = inaptitudes.filter((i) => etatDe(i, auj) === 'terminee' && jours(i.dateFin, auj) <= 7)
    .sort((a, b) => b.dateFin.localeCompare(a.dateFin));

  const carteActives = carte(`En cours (${actives.length})`);
  if (actives.length) actives.forEach((i) => carteActives.append(ligne(i)));
  else carteActives.append(el('p', {}, 'Aucune inaptitude active aujourd’hui.'));
  c.append(carteActives);

  if (recentes.length) {
    const carteFin = carte('Terminées cette semaine', 'Ces élèves redeviennent aptes : penser à les réintégrer (et récupérer un certificat de reprise si besoin).');
    recentes.forEach((i) => carteFin.append(ligne(i)));
    c.append(carteFin);
  }
  if (aVenir.length) {
    const carteAV = carte(`À venir (${aVenir.length})`);
    aVenir.forEach((i) => carteAV.append(ligne(i)));
    c.append(carteAV);
  }

  const terminees = inaptitudes.filter((i) => etatDe(i, auj) === 'terminee' && jours(i.dateFin, auj) > 7);
  if (terminees.length) {
    const carteHist = carte(`Historique (${terminees.length})`);
    terminees.sort((a, b) => b.dateFin.localeCompare(a.dateFin)).slice(0, 10).forEach((i) => carteHist.append(ligne(i)));
    c.append(carteHist);
  }
}

// ---------------------------------------------------------------------------
// Formulaire : nouvelle inaptitude
// ---------------------------------------------------------------------------

async function vueNouvelle(c, eleveIdInitial) {
  c.append(el('a', { class: 'retour', href: '#/inaptitudes' }, '← Inaptitudes'));
  const classes = (await tous('classes')).filter((cl) => !cl.archivee).sort(trierClasses);
  const eleves = (await tous('eleves')).filter((e) => e.actif !== false);
  if (!classes.length || !eleves.length) {
    c.append(carte('Pas encore d’élèves', 'Importez ou créez vos classes et élèves d’abord (onglet Élèves).'));
    return;
  }
  const initial = eleveIdInitial ? eleves.find((e) => e.id === eleveIdInitial) : null;

  const form = carte('Nouvelle inaptitude');
  const champF = (id, libelle, controle) => el('div', { class: 'champ' }, el('label', { for: id }, libelle), controle);

  // élève (classe → élève)
  const selClasse = el('select', { id: 'in-classe' }, ...classes.map((cl) => el('option', { value: cl.id }, cl.nom)));
  const selEleve = el('select', { id: 'in-eleve' });
  const majEleves = () => {
    const liste = eleves.filter((e) => e.classeId === selClasse.value).sort(trierEleves);
    selEleve.replaceChildren(...liste.map((e) => el('option', { value: e.id }, `${e.nom} ${e.prenom}`)));
  };
  selClasse.addEventListener('change', majEleves);
  selClasse.value = initial ? initial.classeId : classes[0].id;
  majEleves();
  if (initial) selEleve.value = initial.id;

  // type + origine
  const selType = el('select', { id: 'in-type' },
    el('option', { value: 'partielle' }, 'Partielle (restrictions)'),
    el('option', { value: 'totale' }, 'Totale (aucune pratique)'));
  const selOrigine = el('select', { id: 'in-origine' }, ...ORIGINES.map((o) => el('option', { value: o.value }, o.label)));

  // dates
  const inpDebut = el('input', { type: 'date', id: 'in-debut' });
  inpDebut.value = isoAujourdhui();
  const inpFin = el('input', { type: 'date', id: 'in-fin' });

  // restrictions
  const coches = new Set();
  const grilleR = el('div', { class: 'grille-statuts' });
  for (const [cle, lib] of RESTRICTIONS) {
    const chk = el('input', { type: 'checkbox', id: `in-r-${cle}` });
    chk.addEventListener('change', () => (chk.checked ? coches.add(cle) : coches.delete(cle)));
    grilleR.append(el('label', { class: 'ligne-option', for: `in-r-${cle}` }, chk, ` ${lib}`));
  }
  const blocRestrictions = champF('', 'Restrictions (inaptitude partielle)', grilleR);
  selType.addEventListener('change', () => { blocRestrictions.hidden = selType.value === 'totale'; });

  const inpComm = el('input', { type: 'text', id: 'in-comm', placeholder: 'Ex. : pas d’appui sur le poignet droit', autocomplete: 'off' });

  // certificat (photo ou PDF)
  const inpFichier = el('input', { type: 'file', id: 'in-fichier', accept: 'image/*,.pdf,application/pdf', capture: 'environment', class: 'champ-fichier' });
  const statutFichier = el('p', { class: 'statut' });
  inpFichier.addEventListener('change', () => {
    const f = inpFichier.files[0];
    statutFichier.textContent = f ? `Pièce prête : ${f.name} (${Math.round(f.size / 1024)} Ko${f.type.startsWith('image/') ? ', sera compressée' : ''})` : '';
    statutFichier.className = 'statut statut-ok';
  });

  const statutForm = el('p', { class: 'statut' });
  const btnCreer = el('button', { class: 'btn btn-principal' }, 'Enregistrer l’inaptitude');
  btnCreer.addEventListener('click', async () => {
    if (!selEleve.value) { statutForm.textContent = 'Choisissez un élève.'; statutForm.className = 'statut statut-erreur'; return; }
    if (!inpDebut.value) { statutForm.textContent = 'La date de début est obligatoire.'; statutForm.className = 'statut statut-erreur'; return; }
    if (inpFin.value && inpFin.value < inpDebut.value) { statutForm.textContent = 'La fin est avant le début.'; statutForm.className = 'statut statut-erreur'; return; }
    btnCreer.disabled = true;
    try {
      const id = crypto.randomUUID();
      let certificatId = null;
      const f = inpFichier.files[0];
      if (f) {
        const rec = await stockerFichier(f);
        certificatId = crypto.randomUUID();
        await enregistrer('certificats', {
          id: certificatId, eleveId: selEleve.value, dateDepot: isoAujourdhui(),
          dateDebut: inpDebut.value, dateFin: inpFin.value || '', fichierId: rec.id, commentaire: '',
        });
      }
      await enregistrer('inaptitudes', {
        id, eleveId: selEleve.value, type: selType.value,
        dateDebut: inpDebut.value, dateFin: inpFin.value || '',
        origine: selOrigine.value,
        restrictions: selType.value === 'totale' ? [] : [...coches],
        certificatId, commentaire: inpComm.value.trim(),
      });
      location.hash = `#/inaptitudes/${id}`;
    } catch (e) {
      statutForm.textContent = `Enregistrement impossible : ${e.message}`;
      statutForm.className = 'statut statut-erreur';
      btnCreer.disabled = false;
    }
  });

  form.append(
    champF('in-classe', 'Classe', selClasse),
    champF('in-eleve', 'Élève *', selEleve),
    champF('in-type', 'Type', selType),
    champF('in-origine', 'Origine', selOrigine),
    el('div', { class: 'rang-2' }, champF('in-debut', 'Début *', inpDebut), champF('in-fin', 'Fin', inpFin)),
    blocRestrictions,
    champF('in-comm', 'Commentaire', inpComm),
    champF('in-fichier', 'Certificat / mot (photo ou PDF, optionnel)', inpFichier),
    statutFichier,
    el('div', { class: 'rang-btn' }, btnCreer),
    statutForm,
  );
  c.append(form);
}

// ---------------------------------------------------------------------------
// Vue : détail / édition
// ---------------------------------------------------------------------------

async function vueDetail(c, id) {
  const rafraichir = () => { c.innerHTML = ''; return vueDetail(c, id); };
  c.append(el('a', { class: 'retour', href: '#/inaptitudes' }, '← Inaptitudes'));
  const inapt = await lire('inaptitudes', id);
  if (!inapt) { c.append(carte('Inaptitude introuvable', 'Elle a peut-être été supprimée.')); return; }
  const eleve = await lire('eleves', inapt.eleveId);
  const classe = eleve ? await lire('classes', eleve.classeId) : null;
  const sauver = () => enregistrer('inaptitudes', inapt);

  const carteI = carte(eleve ? `${eleve.nom} ${eleve.prenom}` : 'Élève supprimé', '', classe?.nom || '');
  const h2 = carteI.querySelector('h2');
  badges(inapt).forEach((b) => h2.append(b));
  if (eleve) {
    carteI.append(el('p', {}, el('a', { href: `#/eleves/fiche/${eleve.id}` }, 'Voir la fiche élève →')));
  }
  carteI.append(
    champSelect({
      id: 'di-type', libelle: 'Type', valeur: inapt.type,
      options: [{ value: 'partielle', label: 'Partielle (restrictions)' }, { value: 'totale', label: 'Totale (aucune pratique)' }],
      onChange: async (v) => { inapt.type = v; await sauver(); rafraichir(); },
    }),
    champSelect({ id: 'di-origine', libelle: 'Origine', valeur: inapt.origine || 'certificat', options: ORIGINES, onChange: async (v) => { inapt.origine = v; await sauver(); } }),
    el('div', { class: 'rang-2' },
      champTexte({ id: 'di-debut', libelle: 'Début', type: 'date', valeur: inapt.dateDebut || '', onChange: async (v) => { inapt.dateDebut = v; await sauver(); rafraichir(); } }),
      champTexte({ id: 'di-fin', libelle: 'Fin', type: 'date', valeur: inapt.dateFin || '', onChange: async (v) => { inapt.dateFin = v; await sauver(); rafraichir(); } }),
    ),
  );
  if (inapt.type !== 'totale') {
    const grilleR = el('div', { class: 'grille-statuts' });
    for (const [cle, lib] of RESTRICTIONS) {
      const chk = el('input', { type: 'checkbox', id: `di-r-${cle}` });
      chk.checked = (inapt.restrictions || []).includes(cle);
      chk.addEventListener('change', async () => {
        const set = new Set(inapt.restrictions || []);
        chk.checked ? set.add(cle) : set.delete(cle);
        inapt.restrictions = [...set];
        await sauver();
      });
      grilleR.append(el('label', { class: 'ligne-option', for: `di-r-${cle}` }, chk, ` ${lib}`));
    }
    carteI.append(el('div', { class: 'champ' }, el('label', {}, 'Restrictions'), grilleR));
  }
  carteI.append(champZone({ id: 'di-comm', libelle: 'Commentaire', valeur: inapt.commentaire || '', onChange: async (v) => { inapt.commentaire = v; await sauver(); } }));
  c.append(carteI);

  // --- Certificat ---
  const carteC = carte('Certificat / pièce jointe', '');
  const inpRemplace = el('input', { type: 'file', accept: 'image/*,.pdf,application/pdf', capture: 'environment', hidden: true });
  inpRemplace.addEventListener('change', async () => {
    const f = inpRemplace.files[0];
    if (!f) return;
    const rec = await stockerFichier(f);
    if (inapt.certificatId) {
      const ancien = await lire('certificats', inapt.certificatId);
      if (ancien) { await supprimerFichier(ancien.fichierId); await supprimer('certificats', ancien.id); }
    }
    const certificatId = crypto.randomUUID();
    await enregistrer('certificats', {
      id: certificatId, eleveId: inapt.eleveId, dateDepot: isoAujourdhui(),
      dateDebut: inapt.dateDebut, dateFin: inapt.dateFin, fichierId: rec.id, commentaire: '',
    });
    inapt.certificatId = certificatId;
    await sauver();
    rafraichir();
  });
  if (inapt.certificatId) {
    const cert = await lire('certificats', inapt.certificatId);
    const res = cert ? await urlDuFichier(cert.fichierId) : null;
    if (res) {
      const { url, fichier } = res;
      if (fichier.mime.startsWith('image/')) {
        const vignette = el('img', { class: 'vignette', src: url, alt: `Certificat de ${eleve?.prenom || ''}` });
        vignette.addEventListener('click', () => ouvrirVisionneuse(c, fichier));
        carteC.append(vignette);
      } else {
        const btnPdf = el('button', { class: 'btn' }, `Ouvrir ${fichier.nom}`);
        btnPdf.addEventListener('click', () => ouvrirVisionneuse(c, fichier));
        carteC.append(el('div', { class: 'rang-btn' }, btnPdf));
      }
      carteC.append(el('p', { class: 'note-inline' }, `Déposé le ${dateFR(cert.dateDepot)} · ${Math.round(fichier.taille / 1024)} Ko`));
    } else {
      carteC.append(el('p', {}, 'Pièce introuvable (supprimée ?).'));
    }
  } else {
    carteC.append(el('p', {}, 'Aucune pièce jointe pour cette inaptitude.'));
  }
  const labelAjout = el('label', { class: 'btn' }, inapt.certificatId ? 'Remplacer la pièce' : 'Ajouter une photo / un PDF', inpRemplace);
  carteC.append(el('div', { class: 'rang-btn' }, labelAjout));
  c.append(carteC);

  // --- Suppression ---
  const carteS = carte('Supprimer cette inaptitude', inapt.certificatId ? 'Le certificat joint sera supprimé aussi.' : '');
  const btnSuppr = el('button', { class: 'btn btn-danger' }, 'Supprimer définitivement');
  btnSuppr.addEventListener('click', async () => {
    if (!confirm(`Supprimer l’inaptitude de ${eleve ? eleve.prenom + ' ' + eleve.nom : 'cet élève'} (et sa pièce jointe) ?`)) return;
    if (inapt.certificatId) {
      const cert = await lire('certificats', inapt.certificatId);
      if (cert) { await supprimerFichier(cert.fichierId); await supprimer('certificats', cert.id); }
    }
    await supprimer('inaptitudes', id);
    location.hash = '#/inaptitudes';
  });
  carteS.append(el('div', { class: 'rang-btn' }, btnSuppr));
  c.append(carteS);
}

// ---------------------------------------------------------------------------

export function initialiser() {
  enregistrerVue('inaptitudes', async (c, params = []) => {
    const [a, b] = params;
    if (a === 'nouvelle') return vueNouvelle(c, b);
    if (a) return vueDetail(c, a);
    return vueSynthese(c);
  });
}
