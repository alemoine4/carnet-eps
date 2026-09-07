// modules/inaptitudes.js — inaptitudes & certificats médicaux (phase 5).
// Sous-routes : #/inaptitudes (synthèse) · #/inaptitudes/nouvelle[/<eleveId>] · #/inaptitudes/<id>
// Règles : pré-remplit l'appel (statut « inapte », géré par appel.js via inaptitudesActives) ;
// alerte J-7 avant expiration ; inaptitude > 3 mois → rappel médecin scolaire (réglementation).

import { enregistrerVue, el, carte, champ, champTexte, champSelect, champZone, confirmer, toast } from '../ui.js';
import { tous, lire, parIndex, enregistrer, supprimer, supprimerLot, restaurer } from '../io.js';
import { stockerFichier, supprimerFichier, urlDuFichier, ouvrirVisionneuse, mimeSur, revoquerURL } from '../media.js';
import { isoAujourdhui, dateFR, jours, trierEleves, trierClasses, SEUIL_MEDECIN_JOURS } from '../metier.js';

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
  // Sans date de fin, la durée court jusqu'à aujourd'hui : le rappel « > 3 mois » ne s'allumait
  // jamais pour une inaptitude ouverte (audit 2026-09-07, A09).
  if (i.dateDebut && jours(i.dateDebut, i.dateFin || auj) > SEUIL_MEDECIN_JOURS) {
    liste.push(el('span', { class: 'badge badge-accent' }, i.dateFin ? '> 3 mois · médecin scolaire' : '> 3 mois sans date de fin · médecin scolaire'));
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
  c.append(el('a', { class: 'retour', href: '#/plus' }, '← Retour'));
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
  const toutesClasses = (await tous('classes')).sort(trierClasses);
  const tousEleves = await tous('eleves');
  // L'élève d'origine (fiche → « + Nouvelle inaptitude ») est proposé même « parti » ou en classe
  // archivée : avant, le formulaire s'ouvrait en silence sur un AUTRE élève (audit 2026-09-07, B04).
  const initial = eleveIdInitial ? tousEleves.find((e) => e.id === eleveIdInitial) : null;
  if (eleveIdInitial && !initial) {
    c.append(carte('Élève introuvable', 'Il a peut-être été supprimé.'));
    return;
  }
  const classes = toutesClasses.filter((cl) => !cl.archivee || cl.id === initial?.classeId);
  const eleves = tousEleves.filter((e) => e.actif !== false || e.id === initial?.id);
  if (!classes.length || !eleves.length) {
    c.append(carte('Pas encore d’élèves', 'Importez ou créez vos classes et élèves d’abord (onglet Élèves).'));
    return;
  }

  const form = carte('Nouvelle inaptitude');

  // élève (classe → élève)
  const selClasse = el('select', { id: 'in-classe' }, ...classes.map((cl) => el('option', { value: cl.id }, `${cl.nom}${cl.archivee ? ' (archivée)' : ''}`)));
  const selEleve = el('select', { id: 'in-eleve' });
  const majEleves = () => {
    const liste = eleves.filter((e) => e.classeId === selClasse.value).sort(trierEleves);
    selEleve.replaceChildren(...liste.map((e) => el('option', { value: e.id }, `${e.nom} ${e.prenom}${e.actif === false ? ' (parti)' : ''}`)));
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
  const blocRestrictions = champ('', 'Restrictions (inaptitude partielle)', grilleR);
  selType.addEventListener('change', () => { blocRestrictions.hidden = selType.value === 'totale'; });

  const inpComm = el('input', { type: 'text', id: 'in-comm', placeholder: 'Ex. : pas d’appui sur le poignet droit', autocomplete: 'off' });

  // certificat (photo ou PDF)
  // Sans `capture` : Android propose Appareil photo / Fichiers / Galerie ; avec, il ouvrait la
  // caméra directement et le PDF annoncé était inaccessible (audit 2026-09-05, B13).
  const inpFichier = el('input', { type: 'file', id: 'in-fichier', accept: 'image/*,.pdf,application/pdf', class: 'champ-fichier' });
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
      statutForm.textContent = `Enregistrement impossible : ${e?.message || e}`;
      statutForm.className = 'statut statut-erreur';
      btnCreer.disabled = false;
    }
  });

  form.append(
    champ('in-classe', 'Classe', selClasse),
    champ('in-eleve', 'Élève *', selEleve),
    champ('in-type', 'Type', selType),
    champ('in-origine', 'Origine', selOrigine),
    el('div', { class: 'rang-2' }, champ('in-debut', 'Début *', inpDebut), champ('in-fin', 'Fin', inpFin)),
    blocRestrictions,
    champ('in-comm', 'Commentaire', inpComm),
    champ('in-fichier', 'Certificat / mot (photo ou PDF, optionnel)', inpFichier),
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
      // Fin avant début refusée à l'édition comme à la création (audit 2026-09-07, A16).
      champTexte({ id: 'di-debut', libelle: 'Début', type: 'date', valeur: inapt.dateDebut || '', onChange: async (v) => {
        if (v && inapt.dateFin && v > inapt.dateFin) throw new Error('le début est après la fin');
        inapt.dateDebut = v; await sauver(); rafraichir();
      } }),
      champTexte({ id: 'di-fin', libelle: 'Fin', type: 'date', valeur: inapt.dateFin || '', onChange: async (v) => {
        if (v && inapt.dateDebut && v < inapt.dateDebut) throw new Error('la fin est avant le début');
        inapt.dateFin = v; await sauver(); rafraichir();
      } }),
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
  const statutPiece = el('p', { class: 'statut' });
  const inpRemplace = el('input', { type: 'file', accept: 'image/*,.pdf,application/pdf', hidden: true }); // sans capture (B13)
  inpRemplace.addEventListener('change', async () => {
    const f = inpRemplace.files[0];
    if (!f) return;
    try {
      const rec = await stockerFichier(f); // d'abord stocker la nouvelle pièce : si ça échoue, l'ancienne reste en place
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
    } catch (e) {
      statutPiece.textContent = `Pièce non enregistrée : ${e?.message || e}`;
      statutPiece.className = 'statut statut-erreur';
    }
  });
  if (inapt.certificatId) {
    const cert = await lire('certificats', inapt.certificatId);
    const res = cert ? await urlDuFichier(cert.fichierId) : null;
    if (res) {
      const { url, fichier } = res;
      if (mimeSur(fichier).startsWith('image/')) { // mime absent (sauvegarde tierce) : plus de plantage (A05)
        // Vignette dans un vrai bouton : ouverture au clavier / lecteur d'écran (audit 2026-09-05, B09).
        const vignette = el('img', { class: 'vignette', src: url, alt: '' });
        vignette.addEventListener('load', () => URL.revokeObjectURL(url), { once: true }); // plus de fuite d'URL (B19)
        vignette.addEventListener('error', () => URL.revokeObjectURL(url), { once: true }); // blob illisible : idem (revue du lot 1)
        const btnVignette = el('button', { class: 'btn-vignette', type: 'button', 'aria-label': `Agrandir le certificat${eleve ? ` de ${eleve.prenom}` : ''}` }, vignette);
        btnVignette.addEventListener('click', () => ouvrirVisionneuse(c, fichier));
        carteC.append(btnVignette);
      } else {
        revoquerURL(url); // la visionneuse crée sa propre URL : celle-ci ne sert pas (fuite, revue du lot 1)
        const btnPdf = el('button', { class: 'btn' }, `Ouvrir ${fichier.nom || 'la pièce'}`);
        btnPdf.addEventListener('click', () => ouvrirVisionneuse(c, fichier));
        carteC.append(el('div', { class: 'rang-btn' }, btnPdf));
      }
      carteC.append(el('p', { class: 'note-inline' }, `Déposé le ${dateFR(cert.dateDepot)} · ${Math.round((fichier.taille ?? fichier.blob?.size ?? 0) / 1024)} Ko`));
    } else {
      carteC.append(el('p', {}, 'Pièce introuvable (absente de cette sauvegarde, ou supprimée).'));
    }
  } else {
    carteC.append(el('p', {}, 'Aucune pièce jointe pour cette inaptitude.'));
  }
  const labelAjout = el('label', { class: 'btn' }, inapt.certificatId ? 'Remplacer la pièce' : 'Ajouter une photo / un PDF', inpRemplace);
  carteC.append(el('div', { class: 'rang-btn' }, labelAjout), statutPiece);
  c.append(carteC);

  // --- Suppression ---
  const carteS = carte('Supprimer cette inaptitude', inapt.certificatId ? 'Le certificat joint sera supprimé aussi.' : '');
  const btnSuppr = el('button', { class: 'btn btn-danger' }, 'Supprimer définitivement');
  btnSuppr.addEventListener('click', async () => {
    if (!(await confirmer({
      titre: 'Supprimer l’inaptitude',
      message: `Inaptitude de ${eleve ? eleve.prenom + ' ' + eleve.nom : 'cet élève'}.`,
      detail: inapt.certificatId ? 'La pièce jointe (certificat) sera supprimée aussi.' : '',
    }))) return;
    // Collecte (lectures) puis UNE transaction : inaptitude + certificat + pièce (avis B29).
    const objets = { fichiers: [], certificats: [], inaptitudes: [inapt] };
    if (inapt.certificatId) {
      const cert = await lire('certificats', inapt.certificatId);
      if (cert) {
        objets.certificats.push(cert);
        const f = cert.fichierId ? await lire('fichiers', cert.fichierId) : null;
        if (f) objets.fichiers.push(f);
      }
    }
    await supprimerLot(objets);
    location.hash = '#/inaptitudes';
    toast('Inaptitude supprimée', { action: async () => { await restaurer(objets); location.hash = `#/inaptitudes/${id}`; } });
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
