// modules/documents.js — bibliothèque locale de documents (phase 7).
// Principe v1 (docs/fonctionnalites.md §8) : on stocke, on retrouve, on ouvre.
// Un document = un fichier (image compressée / PDF, store `fichiers`) OU un lien externe.
// Pas d'édition en v1 : supprimer puis recréer.

import { enregistrerVue, el, carte } from '../ui.js';
import { tous, lire, enregistrer, supprimer } from '../io.js';
import { stockerFichier, supprimerFichier, ouvrirVisionneuse } from '../media.js';
import { dateFR } from '../metier.js';

const TYPES_DOC = [
  ['fiche', 'Fiche / situation'],
  ['projet', 'Projet / séquence'],
  ['securite', 'Sécurité / protocole'],
  ['convocation', 'Convocation / sortie'],
  ['bareme', 'Barème / référentiel'],
  ['autre', 'Autre'],
];
const LIBELLE_TYPE = Object.fromEntries(TYPES_DOC);

const normaliser = (s = '') => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const trierClasses = (a, b) => a.nom.localeCompare(b.nom, 'fr', { numeric: true });

async function vueDocuments(c) {
  const rafraichir = () => { c.innerHTML = ''; return vueDocuments(c); };
  c.append(el('a', { class: 'retour', href: '#/plus' }, '← Retour'));
  const [documents, classes] = await Promise.all([tous('documents'), tous('classes')]);
  const actives = classes.filter((cl) => !cl.archivee).sort(trierClasses);
  const nomClasse = (id) => classes.find((cl) => cl.id === id)?.nom || '?';

  // --- Ajout ---
  const btnAjouter = el('button', { class: 'btn btn-principal' }, '+ Ajouter un document');
  c.append(el('div', { class: 'barre-actions' }, btnAjouter));

  const champF = (id, libelle, controle) => el('div', { class: 'champ' }, el('label', { for: id }, libelle), controle);
  const inpTitre = el('input', { type: 'text', id: 'doc-titre', placeholder: 'Fiche ateliers gym, protocole piscine…', autocomplete: 'off' });
  const selType = el('select', { id: 'doc-type' }, ...TYPES_DOC.map(([v, l]) => el('option', { value: v }, l)));
  const inpTags = el('input', { type: 'text', id: 'doc-tags', placeholder: 'gym, sécurité, cycle 4… (séparés par des virgules)', autocomplete: 'off' });
  const cochesClasses = new Set();
  const grilleClasses = el('div', { class: 'grille-statuts' });
  for (const cl of actives) {
    const chk = el('input', { type: 'checkbox', id: `doc-cl-${cl.id}` });
    chk.addEventListener('change', () => (chk.checked ? cochesClasses.add(cl.id) : cochesClasses.delete(cl.id)));
    grilleClasses.append(el('label', { class: 'ligne-option', for: `doc-cl-${cl.id}` }, chk, ` ${cl.nom}`));
  }
  const inpFichier = el('input', { type: 'file', id: 'doc-fichier', accept: 'image/*,.pdf,application/pdf', class: 'champ-fichier' });
  const inpUrl = el('input', { type: 'url', id: 'doc-url', placeholder: 'https://… (si pas de fichier)', autocomplete: 'off' });
  const statutForm = el('p', { class: 'statut' });
  const btnCreer = el('button', { class: 'btn btn-principal' }, 'Enregistrer');
  const form = carte('Nouveau document');
  form.append(
    champF('doc-titre', 'Titre *', inpTitre),
    champF('doc-type', 'Type', selType),
    champF('doc-tags', 'Mots-clés', inpTags),
    actives.length ? champF('', 'Classes concernées (optionnel)', grilleClasses) : '',
    champF('doc-fichier', 'Fichier (photo ou PDF)', inpFichier),
    champF('doc-url', 'ou lien externe', inpUrl),
    el('div', { class: 'rang-btn' }, btnCreer),
    statutForm,
  );
  form.hidden = true;
  c.append(form);
  btnAjouter.addEventListener('click', () => { form.hidden = !form.hidden; if (!form.hidden) inpTitre.focus(); });
  btnCreer.addEventListener('click', async () => {
    const titre = inpTitre.value.trim();
    if (!titre) { statutForm.textContent = 'Le titre est obligatoire.'; statutForm.className = 'statut statut-erreur'; return; }
    const f = inpFichier.files[0];
    const url = inpUrl.value.trim();
    if (!f && !url) { statutForm.textContent = 'Choisissez un fichier ou indiquez un lien.'; statutForm.className = 'statut statut-erreur'; return; }
    btnCreer.disabled = true;
    try {
      let fichierId = null;
      if (f) fichierId = (await stockerFichier(f)).id;
      await enregistrer('documents', {
        id: crypto.randomUUID(), titre, type: selType.value,
        tags: inpTags.value.split(',').map((t) => t.trim()).filter(Boolean),
        classeIds: [...cochesClasses],
        fichierId, url: f ? '' : url,
        dateAjout: new Date().toISOString().slice(0, 10),
      });
      rafraichir();
    } catch (e) {
      statutForm.textContent = `Enregistrement impossible : ${e.message}`;
      statutForm.className = 'statut statut-erreur';
      btnCreer.disabled = false;
    }
  });

  // --- Filtres + liste ---
  if (!documents.length) {
    c.append(carte('Bibliothèque vide', 'Rangez ici vos fiches, protocoles de sécurité, convocations, barèmes… en photo, PDF ou lien. Tout reste sur cet appareil.'));
    return;
  }

  const recherche = el('input', { type: 'search', class: 'recherche', placeholder: 'Rechercher (titre, mots-clés)…', 'aria-label': 'Rechercher un document' });
  const selFiltreClasse = el('select', { 'aria-label': 'Filtrer par classe' },
    el('option', { value: '' }, 'Toutes les classes'),
    ...actives.map((cl) => el('option', { value: cl.id }, cl.nom)));
  const selFiltreType = el('select', { 'aria-label': 'Filtrer par type' },
    el('option', { value: '' }, 'Tous les types'),
    ...TYPES_DOC.map(([v, l]) => el('option', { value: v }, l)));
  const carteListe = carte(`Documents (${documents.length})`);
  carteListe.append(el('div', { class: 'rang-2' }, selFiltreClasse, selFiltreType), recherche);
  const conteneurListe = el('div', { class: 'liste-eleves' });
  carteListe.append(conteneurListe);
  c.append(carteListe);

  const lignes = [];
  for (const doc of [...documents].sort((a, b) => String(b.dateAjout).localeCompare(String(a.dateAjout)))) {
    const icone = doc.url ? '🔗' : '📄';
    const btnOuvrir = el('button', { class: 'ligne-eleve ligne-doc', type: 'button' },
      el('span', { 'aria-hidden': 'true' }, icone),
      el('span', { class: 'ligne-eleve-nom' }, doc.titre),
      el('span', { class: 'badge' }, LIBELLE_TYPE[doc.type] || doc.type),
      ...(doc.classeIds || []).map((id) => el('span', { class: 'badge' }, nomClasse(id))),
      doc.tags?.length ? el('span', { class: 'note-inline' }, doc.tags.join(' · ')) : '',
      el('span', { class: 'note-inline pousse-droite' }, dateFR(doc.dateAjout)),
    );
    btnOuvrir.addEventListener('click', async () => {
      if (doc.url) { window.open(doc.url, '_blank', 'noopener'); return; }
      const fichier = await lire('fichiers', doc.fichierId);
      if (!fichier) { alert('Fichier introuvable (supprimé ?).'); return; }
      ouvrirVisionneuse(c, fichier);
    });
    const btnSuppr = el('button', { class: 'btn btn-mini', 'aria-label': `Supprimer ${doc.titre}` }, '✕');
    btnSuppr.addEventListener('click', async () => {
      if (!confirm(`Supprimer « ${doc.titre} » ?`)) return;
      if (doc.fichierId) await supprimerFichier(doc.fichierId);
      await supprimer('documents', doc.id);
      rafraichir();
    });
    const ligne = el('div', { class: 'rang-doc' }, btnOuvrir, btnSuppr);
    lignes.push({ doc, ligne });
    conteneurListe.append(ligne);
  }

  const filtrer = () => {
    const q = normaliser(recherche.value);
    for (const { doc, ligne } of lignes) {
      const texte = normaliser(`${doc.titre} ${(doc.tags || []).join(' ')}`);
      const okTexte = !q || texte.includes(q);
      const okClasse = !selFiltreClasse.value || (doc.classeIds || []).includes(selFiltreClasse.value);
      const okType = !selFiltreType.value || doc.type === selFiltreType.value;
      ligne.hidden = !(okTexte && okClasse && okType);
    }
  };
  recherche.addEventListener('input', filtrer);
  selFiltreClasse.addEventListener('change', filtrer);
  selFiltreType.addEventListener('change', filtrer);
}

export function initialiser() {
  enregistrerVue('documents', (c) => vueDocuments(c));
}
