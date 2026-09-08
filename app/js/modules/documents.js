// modules/documents.js — bibliothèque locale de documents (phase 7).
// Principe v1 (docs/fonctionnalites.md §8) : on stocke, on retrouve, on ouvre.
// Un document = un fichier (image compressée / PDF, store `fichiers`) OU un lien externe.
// Pas d'édition en v1 : supprimer puis recréer.

import { enregistrerVue, el, carte, champ, groupe, confirmer, toast } from '../ui.js';
import { tous, lire, enregistrer, enregistrerLot, supprimerLot, restaurer } from '../io.js';
import { preparerFichier, ouvrirVisionneuse } from '../media.js';
import { dateFR, isoAujourdhui, normaliser, trierClasses } from '../metier.js';

const TYPES_DOC = [
  ['fiche', 'Fiche / situation'],
  ['projet', 'Projet / séquence'],
  ['securite', 'Sécurité / protocole'],
  ['convocation', 'Convocation / sortie'],
  ['bareme', 'Barème / référentiel'],
  ['autre', 'Autre'],
];
const LIBELLE_TYPE = Object.fromEntries(TYPES_DOC);

async function vueDocuments(c) {
  const rafraichir = () => { c.replaceChildren(); return vueDocuments(c); };
  c.append(el('a', { class: 'retour', href: '#/plus' }, '← Retour'));
  const [documents, classes] = await Promise.all([tous('documents'), tous('classes')]);
  const actives = classes.filter((cl) => !cl.archivee).sort(trierClasses);
  const nomClasse = (id) => classes.find((cl) => cl.id === id)?.nom || '?';

  // --- Ajout ---
  const btnAjouter = el('button', { class: 'btn btn-principal', 'aria-expanded': 'false' }, '+ Ajouter un document');
  c.append(el('div', { class: 'barre-actions' }, btnAjouter));

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
  const statutForm = el('p', { class: 'statut', role: 'status' });
  const btnCreer = el('button', { class: 'btn btn-principal' }, 'Enregistrer');
  const form = carte('Nouveau document');
  form.append(
    champ('doc-titre', 'Titre *', inpTitre),
    champ('doc-type', 'Type', selType),
    champ('doc-tags', 'Mots-clés', inpTags),
    actives.length ? groupe('Classes concernées (optionnel)', grilleClasses) : '', // fieldset nommé (B47)
    champ('doc-fichier', 'Fichier (photo ou PDF)', inpFichier),
    champ('doc-url', 'ou lien externe', inpUrl),
    el('div', { class: 'rang-btn' }, btnCreer),
    statutForm,
  );
  form.hidden = true;
  c.append(form);
  btnAjouter.addEventListener('click', () => { form.hidden = !form.hidden; btnAjouter.setAttribute('aria-expanded', String(!form.hidden)); if (!form.hidden) inpTitre.focus(); });
  btnCreer.addEventListener('click', async () => {
    const titre = inpTitre.value.trim();
    if (!titre) { statutForm.textContent = 'Le titre est obligatoire.'; statutForm.className = 'statut statut-erreur'; return; }
    const f = inpFichier.files[0];
    let url = inpUrl.value.trim();
    if (!f && !url) { statutForm.textContent = 'Choisissez un fichier ou indiquez un lien.'; statutForm.className = 'statut statut-erreur'; return; }
    // « www.site.fr » (sans schéma) → https:// d'office ; tout autre schéma que http(s) est refusé.
    if (!f && url && !/^[a-z][a-z0-9+.-]*:/i.test(url)) url = `https://${url}`;
    if (!f && !/^https?:\/\//i.test(url)) { statutForm.textContent = 'Le lien doit commencer par http:// ou https:// (ou coller l’adresse sans préfixe).'; statutForm.className = 'statut statut-erreur'; return; }
    btnCreer.disabled = true;
    try {
      let fichierId = null;
      // Pièce et document écrits d'un bloc : une coupure entre les deux laissait un blob orphelin
      // (avis lot 2, D-04).
      const operations = [];
      if (f) {
        statutForm.textContent = f.type.startsWith('image/') ? 'Compression de l’image…' : 'Enregistrement de la pièce…'; statutForm.className = 'statut'; // retour pendant l'attente (C44)
        const rec = await preparerFichier(f); // compression HORS transaction (asynchrone)
        fichierId = rec.id;
        operations.push({ store: 'fichiers', op: 'put', valeur: rec });
      }
      operations.push({ store: 'documents', op: 'put', valeur: {
        id: crypto.randomUUID(), titre, type: selType.value,
        tags: inpTags.value.split(',').map((t) => t.trim()).filter(Boolean),
        classeIds: [...cochesClasses],
        fichierId, url: f ? '' : url,
        dateAjout: isoAujourdhui(), // date LOCALE, comme partout (audit 2026-09-07, C49)
      } });
      await enregistrerLot(operations);
      rafraichir();
    } catch (e) {
      statutForm.textContent = `Enregistrement impossible : ${e?.message || e}`;
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
      if (doc.url) {
        // Défense en profondeur : un lien non http(s) (sauvegarde JSON venue d'ailleurs) n'est pas ouvert.
        if (/^https?:\/\//i.test(doc.url)) window.open(doc.url, '_blank', 'noopener');
        else toast('Lien non ouvert : adresse non http/https.');
        return;
      }
      const fichier = await lire('fichiers', doc.fichierId);
      if (fichier && !fichier.blob) { toast('Pièce absente de cette sauvegarde.'); return; } // même garde que les inaptitudes (revue du lot 4)
      if (!fichier) { toast('Fichier introuvable (supprimé ?).'); return; }
      ouvrirVisionneuse(fichier);
    });
    const btnSuppr = el('button', { class: 'btn btn-mini', 'aria-label': `Supprimer ${doc.titre}` }, '✕');
    btnSuppr.addEventListener('click', async () => {
      if (!(await confirmer({ titre: 'Supprimer le document', message: `Supprimer « ${doc.titre} » ?` }))) return;
      const fichier = doc.fichierId ? await lire('fichiers', doc.fichierId) : null;
      const objets = { fichiers: fichier ? [fichier] : [], documents: [doc] };
      await supprimerLot(objets); // une transaction : document + pièce, annulation idem (avis B29)
      rafraichir();
      toast('Document supprimé', { action: async () => { await restaurer(objets); rafraichir(); } });
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
