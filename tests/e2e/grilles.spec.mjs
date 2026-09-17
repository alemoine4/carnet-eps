import {test,expect} from '@playwright/test';
import {nouvelleGrille,calculerGrille,validerGrille} from '../../app/js/grilles-calcul.js';

const seed = async page => {
  await page.goto('/');
  return page.evaluate(async () => {
    const io=await import('/js/io.js'); await io.viderTout();
    const {nouvelleGrille}=await import('/js/grilles-calcul.js'); const g=nouvelleGrille();g.id='g';g.titre='Badminton test';
    await io.restaurer({grilles:[g],classes:[{id:'c',nom:'6TEST',archivee:false}],eleves:[{id:'a',classeId:'c',nom:'FICTIF',prenom:'Alice',actif:true},{id:'b',classeId:'c',nom:'SECOND',prenom:'Bob',actif:true}],sequences:[{id:'s',classeId:'c',apsa:'Badminton',dateDebut:'2026-09-01',dateFin:'2027-07-01'}],evaluations:[{id:'v',sequenceId:'s',titre:'Grille test',date:'2026-09-10',type:'grille',bareme:20,coef:1,grilleId:'g',grille:structuredClone(g),publieePronote:null}]});
    return g;
  });
};
const choisir = async (page,i,niveau) => {
  await page.locator('.grille-critere').nth(i).getByRole('button',{name:new RegExp('^'+niveau)}).click();
  await expect(page.locator('#vue > .statut')).toHaveText('Enregistré ✓');
};

function grilleAjustable() {
  const g=nouvelleGrille();
  g.pointsAjustables=true;g.pasPoints=1;g.arrondi='exact';
  g.niveaux=[{cle:'bas',libelle:'En progrès',points:5,minimum:0,couleur:'orange'},{cle:'haut',libelle:'Acquis',points:10,minimum:6,couleur:'vert'}];
  g.criteres=[{id:'technique',libelle:'Technique',poids:1}];
  return g;
}
async function seedAjustable(page) {
  await seed(page);
  await page.evaluate(async g=>{
    const io=await import('/js/io.js');g.id='g';await io.enregistrer('grilles',g);
    const ev=await io.lire('evaluations','v');ev.grille=structuredClone(g);await io.enregistrer('evaluations',ev);
  },grilleAjustable());
  await page.goto('/#/grilles/saisie/v');
}
const noteAjustee=page=>page.evaluate(async()=>(await import('/js/io.js')).lire('notes','v_a'));
async function ajusterPoints(page,niveau,valeur) {
  await page.getByRole('button',{name:`Ajuster ${niveau} — Technique`,exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:String(valeur),exact:true}).click();
  await expect(page.locator('#vue > .statut')).toHaveText('Enregistré ✓');
}

test('Points ajustables : calcul pondéré, pas, bornes et anciennes notes',()=>{
  const g=grilleAjustable();g.criteres.push({id:'role',libelle:'Rôle',poids:2});
  const detail={technique:{niveau:'haut',points:8},role:'bas'};
  expect(calculerGrille(g,detail,10)).toMatchObject({brut:18,maximum:30,valeur:6,sur20:12});
  expect(calculerGrille(g,{technique:{niveau:'bas',points:0}})).toMatchObject({valeur:0,evalues:1});
  expect(calculerGrille(g,{}).valeur).toBeNull();
  for(const points of [-1,5.5,6.25,11,NaN,Infinity,'8'])expect(()=>calculerGrille(g,{technique:{niveau:'haut',points}})).toThrow();
  expect(()=>calculerGrille({...g,pointsAjustables:false},detail)).toThrow();
  expect(()=>calculerGrille(g,{technique:{niveau:'inconnu',points:8}})).toThrow();
  expect(()=>validerGrille({...g,pasPoints:0})).toThrow();
  expect(()=>validerGrille({...g,niveaux:[{...g.niveaux[0],minimum:6},g.niveaux[1]]})).toThrow();
  for(const pasPoints of [.5,.25])expect(calculerGrille({...g,pasPoints},{technique:{niveau:'haut',points:6+pasPoints}}).brut).toBe(6+pasPoints);
  expect(calculerGrille({...g,pointsAjustables:false},{technique:'haut'}).valeur).toBe(20);
});

test('Points ajustables : option et plages éditables sans changer une évaluation existante',async({page})=>{
  await seed(page);await page.goto('/#/grilles/modifier/g');
  await expect(page.getByRole('checkbox',{name:'Points ajustables dans les cases'})).not.toBeChecked();
  await page.getByRole('checkbox',{name:'Points ajustables dans les cases'}).check();
  await page.getByLabel('Pas des points ajustables').selectOption('0.5');
  await page.getByLabel('Minimum niveau 2',{exact:true}).fill('2');
  await page.getByRole('button',{name:'Enregistrer la grille',exact:true}).click();
  await expect(page.locator('.statut-erreur')).toContainText('minimum');
  await page.getByLabel('Minimum niveau 2',{exact:true}).fill('0.5');
  await page.getByLabel('Couleur niveau 2',{exact:true}).selectOption('violet');
  await page.getByRole('button',{name:'Enregistrer la grille',exact:true}).click();
  await expect(page).toHaveURL(/#\/grilles$/);
  const r=await page.evaluate(async()=>{const io=await import('/js/io.js');return {g:await io.lire('grilles','g'),ev:await io.lire('evaluations','v')};});
  expect(r.g).toMatchObject({pointsAjustables:true,pasPoints:.5});expect(r.g.niveaux[1]).toMatchObject({minimum:.5,couleur:'violet'});
  expect(r.ev.grille.pointsAjustables).toBeUndefined();
});

test('Points ajustables : clavier PC, annulation, zéro, changement de niveau et persistance',async({page})=>{
  await seedAjustable(page);
  const ouvrir=page.getByRole('button',{name:'Ajuster Acquis — Technique',exact:true});
  await ouvrir.focus();await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');
  await expect(ouvrir).toBeFocused();expect(await noteAjustee(page)).toBeUndefined();
  await ajusterPoints(page,'Acquis',8);
  await expect(ouvrir).toBeFocused();
  await expect(page.locator('.grille-total')).toContainText('8/10 points → 16/20');
  await expect(page.getByRole('button',{name:'Acquis · 8 / 10 points',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.reload();await expect(page.locator('.grille-total')).toContainText('16/20');
  await choisir(page,0,'En progrès');expect((await noteAjustee(page)).detail.technique).toBe('bas');
  await choisir(page,0,'Acquis');expect((await noteAjustee(page)).valeur).toBe(20);
  await ajusterPoints(page,'En progrès',0);expect((await noteAjustee(page)).valeur).toBe(0);
  await choisir(page,0,'En progrès');expect(await noteAjustee(page)).toBeUndefined();
});

test('Points ajustables : appui long réel au pointeur, clic fantôme et défilement annulé',async({page,context},testInfo)=>{
  await seedAjustable(page);
  const cible=page.getByRole('button',{name:'Acquis · 10 pt',exact:true});
  await cible.scrollIntoViewIfNeeded();
  if(testInfo.project.name==='mobile') {
    await cible.tap();await expect(page.locator('.grille-total')).toContainText('20/20');
    await cible.tap();await expect(page.locator('.grille-total')).toContainText('Aucune note');
  }
  const box=await cible.boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
  if(testInfo.project.name==='mobile') {
    const client=await context.newCDPSession(page);
    await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.waitForTimeout(2200); // Le garde-fou reste actif même si le doigt reste posé longtemps.
    await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await client.detach();
  } else {
    await page.mouse.move(x,y);await page.mouse.down();await expect(page.getByRole('dialog')).toBeVisible();await page.waitForTimeout(2200);await page.mouse.up();
  }
  expect(await noteAjustee(page)).toBeUndefined();
  await page.getByRole('dialog').getByRole('button',{name:'7',exact:true}).click();
  await expect(page.locator('.grille-total')).toContainText('14/20');
  await cible.or(page.getByRole('button',{name:'Acquis · 7 / 10 points',exact:true})).dispatchEvent('pointerdown',{isPrimary:true,button:0,clientX:10,clientY:10,pointerId:3,pointerType:'touch'});
  const choisi=page.getByRole('button',{name:'Acquis · 7 / 10 points',exact:true});
  await choisi.dispatchEvent('pointermove',{isPrimary:true,clientX:10,clientY:80,pointerId:3,pointerType:'touch'});
  await page.waitForTimeout(650);await expect(page.getByRole('dialog')).toHaveCount(0);
  await choisi.dispatchEvent('pointercancel',{pointerId:3});expect((await noteAjustee(page)).valeur).toBe(14);
});

test('Points ajustables : sauvegarde complète, altérations rejetées, export et bilan',async({page})=>{
  await seedAjustable(page);await ajusterPoints(page,'Acquis',8);
  const r=await page.evaluate(async()=>{
    const io=await import('/js/io.js'),dump=await io.exporterJSON();await io.viderTout();await io.importerJSON(dump);
    const erreurs=[];
    for(const points of [5,11,8.5]){const copie=structuredClone(dump);copie.stores.notes[0].detail.technique.points=points;try{await io.importerJSON(copie);erreurs.push(false);}catch{erreurs.push(true);}}
    return {note:await io.lire('notes','v_a'),erreurs};
  });expect(r.note).toMatchObject({valeur:16,detail:{technique:{niveau:'haut',points:8}}});expect(r.erreurs).toEqual([true,true,true]);
  await page.reload();await page.getByLabel('Mode de saisie').selectOption('bilan');await expect(page.locator('tbody')).toContainText('80 %');
  await page.goto('/#/notes/eval/v');await expect(page.locator('.input-note').first()).toHaveValue('16');
  await page.evaluate(()=>{navigator.clipboard.writeText=async t=>{window.__copie=t;};});
  await page.getByRole('button',{name:'Copier pour Pronote',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.__copie)).toBe('16\r\n');
});

test('Points ajustables : statuts ABS DISP NN conservés puis reprise du calcul',async({page})=>{
  await seedAjustable(page);
  for(const code of ['ABS','DISP','NN']) {
    await page.getByLabel('Statut de l’élève').selectOption(code);await expect(page.locator('.grille-total')).toContainText(code);
    await ajusterPoints(page,'Acquis',8);expect((await noteAjustee(page)).valeur).toBe(code);
  }
  await page.getByLabel('Statut de l’élève').selectOption('');await expect(page.locator('.grille-total')).toContainText('16/20');
});

test('Points ajustables : panne et écriture concurrente ne perdent aucune note',async({page,context})=>{
  await seedAjustable(page);await ajusterPoints(page,'Acquis',8);
  const autre=await context.newPage();await autre.goto('/#/grilles/saisie/v');
  await ajusterPoints(page,'Acquis',9);
  await autre.getByRole('button',{name:'Ajuster Acquis — Technique',exact:true}).click();
  await autre.getByRole('dialog').getByRole('button',{name:'6',exact:true}).click();
  await expect(autre.locator('.statut-erreur')).toContainText('autre onglet');expect((await noteAjustee(page)).valeur).toBe(18);await autre.close();
  await page.evaluate(()=>{window.__put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){if(this.name==='notes')throw new DOMException('Disque plein','QuotaExceededError');return window.__put.apply(this,args);};});
  await page.getByRole('button',{name:'Ajuster Acquis — Technique',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'7',exact:true}).click();
  await expect(page.locator('.statut-erreur')).toBeVisible();expect((await noteAjustee(page)).valeur).toBe(18);
  await page.evaluate(()=>{IDBObjectStore.prototype.put=window.__put;});
});

test('Points ajustables : grandes plages et quart de point via champ borné',async({page})=>{
  await seedAjustable(page);
  await page.evaluate(async()=>{const io=await import('/js/io.js'),ev=await io.lire('evaluations','v');ev.grille.pasPoints=.25;ev.grille.niveaux[1].points=100;await io.enregistrer('evaluations',ev);});
  await page.reload();await page.getByRole('button',{name:'Ajuster Acquis — Technique',exact:true}).click();
  const input=page.getByLabel('Points à attribuer');await input.fill('100.25');await page.getByRole('button',{name:'Appliquer',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();
  await input.fill('6.25');await page.getByRole('button',{name:'Appliquer',exact:true}).click();
  await expect(page.locator('.grille-total')).toContainText('6,25/100 points → 1,25/20');
});

test('Points ajustables : rendu mobile PC sombre et impression sans débordement',async({page},testInfo)=>{
  await seedAjustable(page);await ajusterPoints(page,'Acquis',8);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:testInfo.outputPath(`POINTS-${testInfo.project.name}-clair.png`),fullPage:true});
  await page.getByRole('button',{name:'Ajuster Acquis — Technique',exact:true}).click();
  await page.screenshot({path:testInfo.outputPath(`POINTS-${testInfo.project.name}-choix.png`)});
  for(const b of await page.getByRole('dialog').getByRole('button').all()){const box=await b.boundingBox();expect(box.height).toBeGreaterThanOrEqual(44);}
  await page.keyboard.press('Escape');await page.evaluate(()=>{document.documentElement.dataset.theme='sombre';});
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:testInfo.outputPath(`POINTS-${testInfo.project.name}-sombre.png`),fullPage:true});
  await page.emulateMedia({media:'print'});await expect(page.locator('.grille-selection')).toHaveText('Acquis · 8 points');await expect(page.locator('.grille-niveaux')).toBeHidden();
});

test('Grilles correction : observer un critère ne retire pas une dispense',async({page})=>{
  await seed(page);await page.goto('/#/grilles/saisie/v');
  await page.getByLabel('Statut de l’élève').selectOption('DISP');
  await expect(page.locator('.grille-total')).toContainText('DISP');
  await choisir(page,0,'Maîtrisé');
  await expect(page.locator('.grille-total')).toContainText('DISP');
  expect(await page.evaluate(async()=>(await(await import('/js/io.js')).lire('notes','v_a')).valeur)).toBe('DISP');
});

test('Grilles correction : le focus clavier reste sur le niveau après sauvegarde',async({page})=>{
  await seed(page);await page.goto('/#/grilles/saisie/v');
  const niveau=page.locator('.grille-critere').first().getByRole('button',{name:/^Maîtrisé/});
  await niveau.focus();await page.keyboard.press('Enter');
  await expect(page.locator('#vue > .statut')).toHaveText('Enregistré ✓');
  await expect(niveau).toBeFocused();
});

test('Grilles confort : navigation et réutilisation de l’instantané historique',async({page})=>{
  const g=await seed(page);
  await page.evaluate(async()=>{const io=await import('/js/io.js');const g=await io.lire('grilles','g');g.niveaux[3].points=99;await io.enregistrer('grilles',g);});
  await page.goto('/#/grilles/saisie/v');
  await page.getByRole('button',{name:'Élève suivant',exact:true}).click();
  await expect(page.getByRole('heading',{name:'SECOND Bob',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Élève précédent',exact:true}).click();
  await expect(page.getByRole('heading',{name:'FICTIF Alice',exact:true})).toBeVisible();
  await page.getByLabel('Mode de saisie').selectOption('critere');
  await page.getByRole('button',{name:'Critère suivant',exact:true}).click();
  await expect(page.getByLabel('Critère à évaluer')).toHaveValue(g.criteres[1].id);
  await page.getByRole('button',{name:'Réutiliser cette grille',exact:true}).click();
  await expect(page.getByLabel('Points niveau 4',{exact:true})).toHaveValue('3');
  await page.getByRole('button',{name:'Enregistrer la grille',exact:true}).click();
  const donnees=await page.evaluate(async()=>{const io=await import('/js/io.js');return {grilles:await io.tous('grilles'),ev:await io.lire('evaluations','v')};});
  expect(donnees.grilles).toHaveLength(2);
  expect(donnees.ev.grille.niveaux[3].points).toBe(3);
});

test('Grilles calcul : 18/24 = 15/20, poids, non évalué distinct de zéro, arrondis',() => {
  const g=nouvelleGrille(), detail=Object.fromEntries(g.criteres.map((c,i)=>[c.id,g.niveaux[[3,3,2,1][i]].cle]));
  expect(calculerGrille(g,detail)).toMatchObject({brut:18,maximum:24,valeur:15,sur20:15,evalues:4});
  expect(calculerGrille(g,{},20).valeur).toBeNull();
  const un={[g.criteres[0].id]:g.niveaux[3].cle};
  expect(calculerGrille(g,un).valeur).toBe(20);
  expect(calculerGrille({...g,nonEvalue:'zero'},un).valeur).toBe(5);
  expect(calculerGrille({...g,nonEvalue:'zero'},{}).valeur).toBeNull();
  expect(calculerGrille(g,{[g.criteres[0].id]:g.niveaux[0].cle}).valeur).toBe(0);
  expect(calculerGrille(g,detail,10)).toMatchObject({valeur:7.5,sur20:15});
  for(const [arrondi,attendu] of [['exact',6.67],['0.25',6.75],['0.5',6.5],['1',7]]) expect(calculerGrille({...g,arrondi},{[g.criteres[0].id]:g.niveaux[1].cle}).valeur).toBe(attendu);
  expect(()=>validerGrille({...g,criteres:[{...g.criteres[0],poids:0}]})).toThrow();
  expect(()=>calculerGrille(g,{inconnu:'niveau'})).toThrow();
});

test('Grilles bibliothèque : création, édition, duplication et archivage par interface',async({page}) => {
  await seed(page);await page.goto('/#/grilles/nouvelle');
  await page.getByLabel('Titre de la grille',{exact:true}).fill('Grille créée au clavier');
  await page.getByLabel('Points niveau 4',{exact:true}).fill('4');
  await expect(page.locator('.grille-total')).toContainText('32');
  await page.getByRole('button',{name:'Enregistrer la grille',exact:true}).click();
  await expect(page).toHaveURL(/#\/grilles$/);
  const bloc=page.locator('.carte').filter({has:page.getByRole('heading',{name:'Grille créée au clavier',exact:true})});
  await bloc.getByRole('button',{name:'Dupliquer',exact:true}).click();
  await expect(page.getByLabel('Titre de la grille',{exact:true})).toHaveValue('Grille créée au clavier — copie');
  await page.getByRole('button',{name:'Enregistrer la grille',exact:true}).click();
  const copie=page.locator('.carte').filter({has:page.getByRole('heading',{name:'Grille créée au clavier — copie',exact:true})});
  await copie.getByRole('button',{name:'Archiver',exact:true}).click();
  await expect(copie).toContainText('archivée');
  await copie.getByRole('button',{name:'Restaurer',exact:true}).click();
  await expect(copie.getByRole('button',{name:'Archiver',exact:true})).toBeVisible();
});

test('Grilles parcours : créer évaluation, saisir 18/24, copier 15, moyenne et copie figée',async({page}) => {
  await seed(page);await page.goto('/#/notes');
  await page.getByRole('button',{name:'+ Nouvelle évaluation',exact:true}).click();
  await page.locator('#ev-titre').fill('Évaluation créée');
  await page.locator('#ev-type').selectOption('grille');
  await page.locator('#ev-grille').selectOption('g');
  await expect(page.locator('#ev-bareme')).toHaveValue('20');
  await page.getByRole('button',{name:'Créer et saisir les notes',exact:true}).click();
  await expect(page).toHaveURL(/#\/grilles\/saisie\//);
  for(const [i,n] of ['Maîtrisé','Maîtrisé','Satisfaisant','Fragile'].entries())await choisir(page,i,n);
  await expect(page.locator('.grille-total')).toContainText('18/24 points → 15/20');
  const id=page.url().split('/').at(-1);
  await page.evaluate(async()=>{const io=await import('/js/io.js');const g=await io.lire('grilles','g');g.niveaux[3].points=99;await io.enregistrer('grilles',g);});
  await page.reload();await expect(page.locator('.grille-total')).toContainText('15/20');
  await page.goto(`/#/notes/eval/${id}`);
  await expect(page.locator('.input-note').first()).toHaveValue('15');
  await expect(page.locator('.input-note').first()).toHaveAttribute('readonly','');
  await page.evaluate(()=>{navigator.clipboard.writeText=async t=>{window.__copie=t;};});
  await page.getByRole('button',{name:'Copier pour Pronote',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.__copie)).toBe('15\r\n');
  await page.goto('/#/notes/releve/c');await expect(page.locator('tbody tr').first().locator('td').last()).toHaveText('15');
});

test('Grilles terrain : saisie par critère, code, bilan et impression mobile',async({page},testInfo) => {
  await seed(page);await page.setViewportSize({width:375,height:812});await page.goto('/#/grilles/saisie/v');
  await page.getByLabel('Mode de saisie').selectOption('critere');
  await choisir(page,1,'Satisfaisant');
  await page.getByLabel('Mode de saisie').selectOption('eleve');await page.getByLabel('Élève à évaluer').selectOption('1');
  await expect(page.locator('.grille-total')).toContainText('13,25/20');
  await page.getByLabel('Statut de l’élève').selectOption('ABS');await expect(page.locator('.grille-total')).toContainText('ABS');
  await page.getByLabel('Statut de l’élève').selectOption('');await expect(page.locator('.grille-total')).toContainText('13,25');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.locator('#vue').focus();await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:testInfo.outputPath('GRILLES-MOBILE.png'),fullPage:true});
  await page.emulateMedia({media:'print'});await expect(page.locator('.grille-selection').first()).toContainText('Satisfaisant');await expect(page.locator('.grille-niveaux').first()).toBeHidden();
  await page.emulateMedia({media:'screen'});await page.getByLabel('Mode de saisie').selectOption('bilan');
  await expect(page.locator('tbody tr').first()).toContainText('66,67');
});

test('Grilles échec : la note et le marquage restent inchangés si écriture refusée',async({page}) => {
  await seed(page);await page.evaluate(async()=>{const io=await import('/js/io.js');const e=await io.lire('evaluations','v');await io.enregistrer('evaluations',{...e,publieePronote:'2026-09-01'});});
  await page.goto('/#/grilles/saisie/v');await page.evaluate(()=>{const put=IDBObjectStore.prototype.put;window.__panne=true;IDBObjectStore.prototype.put=function(...a){if(this.name==='evaluations'&&window.__panne)throw new Error('Panne test');return put.apply(this,a);};});
  await page.locator('.grille-critere').first().getByRole('button',{name:/^Maîtrisé/}).click();
  await expect(page.locator('#vue > .statut')).toContainText('Non enregistré');
  expect(await page.evaluate(async()=>(await(await import('/js/io.js')).tous('notes')).length)).toBe(0);
  await page.evaluate(()=>{window.__panne=false;});await choisir(page,0,'Maîtrisé');
  expect(await page.evaluate(async()=>(await(await import('/js/io.js')).lire('evaluations','v')).publieeObsolete)).toBe(true);
  await choisir(page,0,'Maîtrisé');await expect(page.locator('.grille-total')).toContainText('Aucune note');
});

test('Grilles sauvegarde : aller-retour et refus de détail ou note altérés',async({page}) => {
  await seed(page);await page.goto('/#/grilles/saisie/v');await choisir(page,0,'Maîtrisé');
  const r=await page.evaluate(async()=>{
    const io=await import('/js/io.js'),dump=await io.exporterJSON();await io.viderTout();await io.importerJSON(dump);
    const mauvais=structuredClone(dump);mauvais.stores.notes[0].valeur=3;
    let refuse=false;try{await io.importerJSON(mauvais);}catch{refuse=true;}
    const detail=structuredClone(dump);detail.stores.notes[0].detail.inconnu='mauvais';
    let refuseDetail=false;try{await io.importerJSON(detail);}catch{refuseDetail=true;}
    return {schema:dump.schemaVersion,grilles:(await io.tous('grilles')).length,valeur:(await io.tous('notes'))[0].valeur,refuse,refuseDetail};
  });expect(r).toEqual({schema:3,grilles:1,valeur:20,refuse:true,refuseDetail:true});
});

test('Grilles migration : base v2 préexistante conservée, ancien export restaurable',async({page}) => {
  // Contexte neuf : créer v2 avant que l'application et son module io ne soient chargés.
  await page.goto('/css/base.css');
  await page.evaluate(async()=>{await new Promise((ok,ko)=>{const r=indexedDB.open('carnet-eps',2);r.onupgradeneeded=()=>{const s=r.result.createObjectStore('classes',{keyPath:'id'});s.put({id:'ancien',nom:'ANCIENNE'});};r.onsuccess=()=>{r.result.close();ok();};r.onerror=()=>ko(r.error);});});
  await page.goto('/');
  const r=await page.evaluate(async()=>{const io=await import('/js/io.js');const conserve=await io.lire('classes','ancien');const db=await io.ouvrirDB();await io.importerJSON({app:'carnet-eps',schemaVersion:2,stores:{classes:[{id:'restauree',nom:'RESTAUREE'}]}});return {nom:conserve.nom,version:db.version,grilles:db.objectStoreNames.contains('grilles'),ancienImport:(await io.lire('classes','restauree')).nom};});
  expect(r).toEqual({nom:'ANCIENNE',version:3,grilles:true,ancienImport:'RESTAUREE'});
});

test('Grilles bureau : éditeur lisible, niveaux sauvegardés et thème sombre',async({page},testInfo)=>{
  await seed(page);await page.setViewportSize({width:1280,height:900});await page.goto('/#/grilles/modifier/g');
  await expect(page.getByLabel('Titre de la grille',{exact:true})).toHaveValue('Badminton test');
  await page.screenshot({path:testInfo.outputPath('GRILLES-BUREAU.png'),fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.evaluate(()=>{document.documentElement.dataset.theme='sombre';});
  await page.screenshot({path:testInfo.outputPath('GRILLES-SOMBRE.png'),fullPage:true});
});

test('Grilles hors ligne : création et relecture avec service-worker réel',async({page,context})=>{
  const base='http://app.localhost:8160';
  await page.goto(base+'/');
  await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  try {
    await page.goto(base+'/#/grilles/nouvelle');
    await page.getByLabel('Titre de la grille',{exact:true}).fill('Grille créée hors ligne');
    await page.getByRole('button',{name:'Enregistrer la grille',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Grille créée hors ligne',exact:true})).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading',{name:'Grille créée hors ligne',exact:true})).toBeVisible();
    await page.evaluate(async g=>{
      const io=await import('/js/io.js');
      await io.restaurer({classes:[{id:'c',nom:'CLASSE FICTIVE'}],eleves:[{id:'a',classeId:'c',nom:'FICTIF',prenom:'Alice',actif:true}],
        sequences:[{id:'s',classeId:'c',apsa:'Test'}],evaluations:[{id:'v',sequenceId:'s',titre:'Test hors ligne',type:'grille',bareme:20,grille:g}]});
    },grilleAjustable());
    await page.goto(base+'/#/grilles/saisie/v');await ajusterPoints(page,'Acquis',8);
    await page.reload();await expect(page.locator('.grille-total')).toContainText('8/10 points → 16/20');
  } finally {await context.setOffline(false);}
});

// ---- Saisie au téléphone (essai du 2026-09-17, v0.13.4) : « un élève à la fois », mais sur UN écran. Avant : première
// case à 982 px sur 812, « Élève suivant » à 1 921 px, 237 px par élève en mode « Par critère ». Classe de 24 élèves
// fictifs, grille par défaut (4 niveaux × 4 critères). Complétés après la revue, la contre-revue et la troisième revue.
// Libellés de niveau COURTS par défaut : la place d'un mot dépend de la police installée (Segoe sous Windows, DejaVu
// sous Linux en intégration continue) ; les libellés longs ont leur propre test, fondé sur des invariants.
const seedClasse = async (page,niveaux=['Non acquis','Fragile','Acquis','Expert']) => {
  await page.goto('/');
  await page.evaluate(async niveaux => {
    const io=await import('/js/io.js'); await io.viderTout();
    const {nouvelleGrille}=await import('/js/grilles-calcul.js'); const g=nouvelleGrille();g.id='g';g.titre='Badminton test';
    if(niveaux)g.niveaux=g.niveaux.map((n,i) => ({...n,libelle:niveaux[i]}));
    const eleves=Array.from({length:24},(_,i) => ({id:`e${i+1}`,classeId:'c',nom:`ELEVE${String(i+1).padStart(2,'0')}`,prenom:'Fictif',actif:true}));
    await io.restaurer({grilles:[g],classes:[{id:'c',nom:'6TEST',archivee:false}],eleves,sequences:[{id:'s',classeId:'c',apsa:'Badminton',dateDebut:'2026-09-01',dateFin:'2027-07-01'}],evaluations:[{id:'v',sequenceId:'s',titre:'Grille test',date:'2026-09-10',type:'grille',bareme:20,coef:1,grilleId:'g',grille:structuredClone(g),publieePronote:null}]});
  },niveaux);
};
// Ouvre (ou rouvre) la saisie sur le premier élève : revenir à la même adresse ne redessine pas la vue.
const ouvrirClasse = async (page,largeur,hauteur) => {
  await page.setViewportSize({width:largeur,height:hauteur});
  await page.goto('/#/accueil');await page.goto('/#/grilles/saisie/v');
  await expect(page.getByRole('heading',{level:2,name:'ELEVE01 Fictif',exact:true})).toBeVisible();
  await expect(page.locator('.grille-critere')).toHaveCount(4);
};
// Ce que voit et touche le pouce : une case est visible si elle est entre l'en-tête et la barre et si le toucher en son
// centre arrive sur ELLE (pas sur un <span> que la fin de rafale remplace, ni sur ce qui la recouvre) ; nom et rang de
// l'élève visibles ; entre la barre et la nav, le toucher reste à la barre.
const ecranEleve = page => page.evaluate(() => {
  const haut=document.querySelector('.entete').getBoundingClientRect().bottom, barre=document.querySelector('.grille-barre').getBoundingClientRect();
  const nav=document.querySelector('.nav').getBoundingClientRect().top;
  const visible=x => {const r=x.getBoundingClientRect();return r.top>=haut && r.bottom<=barre.top && document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)===x;};
  const cases=[...document.querySelectorAll('.grille-niveaux button[data-niveau-cle]')];
  return {cases:cases.length,cachees:cases.filter(b => !visible(b)).length,
    nomVisible:visible(document.querySelector('.grille-entete-eleve h2')) && visible(document.querySelector('.grille-rang')),
    bande:Boolean(document.elementFromPoint(innerWidth/2,(barre.bottom+nav)/2)?.closest('.grille-barre'))};
});
// Un nom de niveau ne se coupe qu'aux espaces : les caractères de chaque MOT sont sur une seule ligne, et rien ne
// déborde de la case. (Compter les lignes ne suffit pas : « Exceptionnelleme | nt maîtrisé » fait 2 lignes pour 2 mots.)
const motsCoupes = page => page.evaluate(() => [...document.querySelectorAll('.grille-niveaux button[data-niveau-cle]')].filter(b => {
  const nom=b.querySelector('.grille-niveau-nom'), texte=nom.firstChild, r=document.createRange();
  for(const m of texte.textContent.matchAll(/\S+/g)) {
    r.setStart(texte,m.index);r.setEnd(texte,m.index+m[0].length);
    if(new Set([...r.getClientRects()].filter(x => x.width>0).map(x => Math.round(x.top))).size>1)return true;
  }
  return b.scrollWidth>b.clientWidth+1;
}).map(b => b.getAttribute('aria-label')));
// Barre fixe : même place (±2 px), toujours fixe, et un vrai clic au centre de ses boutons les atteint.
const barreAuPouce = page => page.evaluate(() => {
  const b=document.querySelector('.grille-barre'), boutons=[...b.querySelectorAll('button')];
  return {position:getComputedStyle(b).position,boutons:boutons.map(x => {const r=x.getBoundingClientRect();return {y:Math.round(r.top),atteint:document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)===x};})};
});

test('Grilles téléphone : un élève tient sur un écran, « Élève suivant » reste sous le pouce et ramène le suivant en haut',async({page})=>{
  await seedClasse(page);
  for(const [largeur,hauteur] of [[360,800],[375,812],[412,915]]) {
    const taille=`${largeur}×${hauteur}`;
    await ouvrirClasse(page,largeur,hauteur);
    const suivant=page.locator('.grille-barre').getByRole('button',{name:'Élève suivant',exact:true});
    await expect(suivant,`${taille} à l’ouverture`).toBeInViewport({ratio:1});
    const place=async () => Math.round((await suivant.boundingBox()).y);
    const aLouverture=await place();
    // Depuis l'ouverture : la barre ne change pas de place (un double tap ne tombe pas à côté).
    await suivant.click();
    await expect(page.getByRole('heading',{level:2,name:'ELEVE02 Fictif',exact:true})).toBeVisible();
    expect(Math.abs(await place()-aLouverture),taille).toBeLessThanOrEqual(2);
    expect(await ecranEleve(page),taille).toEqual({cases:16,cachees:0,nomVisible:true,bande:true});
    // Depuis le bas de page, où l'on finit un élève : la barre est à la même place, le suivant revient en haut.
    await page.evaluate(() => window.scrollTo(0,document.documentElement.scrollHeight));
    expect(Math.abs(await place()-aLouverture),`${taille} en bas de page`).toBeLessThanOrEqual(2);
    await suivant.click();
    await expect(page.getByRole('heading',{level:2,name:'ELEVE03 Fictif',exact:true})).toBeVisible();
    expect(Math.abs(await place()-aLouverture),`${taille} après le bas de page`).toBeLessThanOrEqual(2);
    expect(await ecranEleve(page),taille).toEqual({cases:16,cachees:0,nomVisible:true,bande:true});
    // Nom du niveau au-dessus de ses points, sans mot coupé (la grille par défaut tient sur 4 colonnes).
    expect(await page.evaluate(() => [...document.querySelectorAll('.grille-niveaux button[data-niveau-cle]')]
      .filter(b => b.querySelector('.grille-niveau-points').getBoundingClientRect().top<b.querySelector('.grille-niveau-nom').getBoundingClientRect().bottom-1).length),taille).toBe(0);
    expect(await motsCoupes(page),taille).toEqual([]);
  }
  await expect(page.locator('.grille-critere').first().locator('.grille-niveaux button[data-niveau-cle]').nth(2)).toHaveAccessibleName('Acquis · 4 pt');
});

test('Grilles téléphone : dès l’ouverture, la première rangée est visible, et sur PC les actions de bureau aussi',async({page})=>{
  await seedClasse(page);
  await ouvrirClasse(page,375,812);
  const rangee=await page.evaluate(() => {
    const barre=document.querySelector('.grille-barre').getBoundingClientRect().top;
    return [...document.querySelector('.grille-critere').querySelectorAll('.grille-niveaux button[data-niveau-cle]')].map(b => b.getBoundingClientRect().bottom<=barre);
  });
  expect(rangee).toEqual([true,true,true,true]);
  // En bas de page, les actions de bureau passent au-dessus de la barre fixe, pas dessous.
  await page.evaluate(() => window.scrollTo(0,document.documentElement.scrollHeight));
  await expect.poll(() => page.evaluate(() => document.querySelector('.grille-outils').getBoundingClientRect().bottom<=document.querySelector('.grille-barre').getBoundingClientRect().top)).toBe(true);
  // Grand écran de bureau : pas de vide réservé, « Notes et export Pronote » visible sans défiler.
  await ouvrirClasse(page,1920,1080);
  await expect(page.locator('.grille-outils').getByRole('link',{name:'Notes et export Pronote',exact:true})).toBeInViewport({ratio:1});
});

test('Grilles téléphone : en mode « Par critère », une ligne compacte par élève, « Critère suivant » sous le pouce et choix du critère dans la liste',async({page})=>{
  await seedClasse(page);
  await ouvrirClasse(page,375,812);
  await page.getByLabel('Mode de saisie').selectOption('critere');
  await expect(page.locator('.grille-critere')).toHaveCount(24);
  const parEleve=await page.evaluate(() => {
    const blocs=document.querySelectorAll('.grille-critere'), scores=document.querySelectorAll('[data-score-eleve]');
    return (scores[scores.length-1].getBoundingClientRect().bottom-blocs[0].getBoundingClientRect().top)/24;
  });
  expect(parEleve).toBeLessThanOrEqual(120); // 112 mesurés ; environ 270 avant
  const titreEnHaut=() => page.evaluate(() => {
    const t=document.querySelector('.grille-saisie > h2'), h=t.getBoundingClientRect(), haut=document.querySelector('.entete').getBoundingClientRect().bottom;
    return {sousEntete:h.top>=haut,procheDuHaut:h.top<haut+120,touchable:document.elementFromPoint(h.left+10,h.top+h.height/2)===t};
  });
  await page.evaluate(() => window.scrollTo(0,document.documentElement.scrollHeight/2));
  const suivant=page.locator('.grille-barre').getByRole('button',{name:'Critère suivant',exact:true});
  await expect(suivant).toBeInViewport({ratio:1});
  await suivant.click();
  const criteres=await page.evaluate(async () => (await (await import('/js/io.js')).lire('evaluations','v')).grille.criteres.map(c => c.id));
  const liste=page.getByLabel('Critère à évaluer');
  await expect(liste).toHaveValue(criteres[1]);
  expect(await titreEnHaut()).toEqual({sousEntete:true,procheDuHaut:true,touchable:true});
  // Choix dans la liste, au doigt ou à la souris : le critère choisi commence aussi en haut.
  await page.evaluate(() => window.scrollTo(0,document.documentElement.scrollHeight/2));
  await liste.dispatchEvent('pointerdown');await liste.selectOption(criteres[2]);
  expect(await titreEnHaut()).toEqual({sousEntete:true,procheDuHaut:true,touchable:true});
  // Au clavier, chaque flèche change de critère : la liste focalisée reste à l'écran.
  if(test.info().project.name==='chromium') {
    await page.evaluate(() => window.scrollTo(0,0));
    await liste.focus();await page.keyboard.press('ArrowDown');
    await expect(liste).toHaveValue(criteres[3]);
    await expect(liste).toBeFocused();
    await expect(liste).toBeInViewport({ratio:1});
  }
});

test('Grilles texte agrandi (320 px, 200 %) et paysage : rien ne déborde, et la barre ne prend pas l’écran',async({page})=>{
  await seedClasse(page);
  // Un vrai nom de famille peut être long : un seul mot de 22 capitales, dernier dans l'ordre alphabétique.
  await page.evaluate(async () => {const io=await import('/js/io.js');const e=await io.lire('eleves','e1');await io.enregistrer('eleves',{...e,nom:'ELEVEAUNOMTRESTRESLONG'});});
  const barreLegere=() => page.evaluate(() => {const b=document.querySelector('.grille-barre');return getComputedStyle(b).position==='static' || b.getBoundingClientRect().height<=innerHeight*0.15;});
  for(const [largeur,hauteur] of [[320,640],[360,780]]) {
    const taille=`${largeur}×${hauteur} à 200 %`;
    await page.setViewportSize({width:largeur,height:hauteur});
    await page.goto('/#/accueil');await page.goto('/#/grilles/saisie/v');await expect(page.locator('.grille-critere')).toHaveCount(4);
    await page.getByLabel('Élève à évaluer').selectOption({label:'ELEVEAUNOMTRESTRESLONG Fictif'});
    await expect(page.getByRole('heading',{level:2,name:'ELEVEAUNOMTRESTRESLONG Fictif',exact:true})).toBeVisible();
    await page.evaluate(() => { document.documentElement.style.fontSize='200%'; });
    // La barre ne garde sa place fixe que si elle coûte peu (≤ 15 % de la hauteur) ; sinon elle redevient un bloc.
    await expect.poll(barreLegere,taille).toBe(true);
    const m=await page.evaluate(() => {
      const cases=[...document.querySelectorAll('.grille-niveaux button[data-niveau-cle]')], barre=[...document.querySelectorAll('.grille-barre .btn')];
      const deborde=b => b.scrollWidth>b.clientWidth+1 || b.scrollHeight>b.clientHeight+1;
      return {page:document.documentElement.scrollWidth>document.documentElement.clientWidth,cases:cases.filter(deborde).length,barre:barre.filter(deborde).length,
        petite:cases.some(b => b.getBoundingClientRect().height<44 || b.getBoundingClientRect().width<44)};
    });
    expect(m,taille).toEqual({page:false,cases:0,barre:0,petite:false});
    await page.evaluate(() => { document.documentElement.style.fontSize=''; });
  }
  // La hauteur de la fenêtre change seule (écran partagé) : la règle des 15 % suit, dans les deux sens. Les hauteurs
  // d'écran sont DÉDUITES de la barre réellement rendue : sa hauteur dépend de la police installée (DejaVu en CI).
  await page.setViewportSize({width:412,height:915});
  await page.evaluate(() => { document.documentElement.style.fontSize='200%'; });
  const barre=() => page.evaluate(() => ({hauteur:document.querySelector('.grille-barre').getBoundingClientRect().height,position:getComputedStyle(document.querySelector('.grille-barre')).position}));
  await expect.poll(async () => (await barre()).hauteur>0).toBe(true);
  const h=(await barre()).hauteur;
  const grand=Math.ceil(h/0.13)+120, petit=Math.floor(h/0.15)-60;
  expect(petit,'la barre doit être assez haute pour que la règle joue au-dessus de 481 px').toBeGreaterThanOrEqual(481);
  await page.setViewportSize({width:412,height:grand});
  await expect.poll(async () => (await barre()).position,`412×${grand} (barre de ${Math.round(h)} px)`).toBe('fixed');
  await page.setViewportSize({width:412,height:petit});
  await expect.poll(async () => (await barre()).position,`412×${petit}`).toBe('static');
  // Bascule en cours de saisie : elle est annoncée aux lecteurs d'écran, et une marge (13 %) évite les allers-retours.
  const region=page.locator('#vue > p.sr-only[role="status"]');
  await expect(region).toContainText('passent à la fin de la saisie');
  await page.setViewportSize({width:412,height:Math.round(h/0.14)});
  await expect.poll(async () => (await barre()).position,`412×${Math.round(h/0.14)} : marge de bascule`).toBe('static');
  await page.setViewportSize({width:412,height:grand});
  await expect.poll(async () => (await barre()).position,`412×${grand} au retour`).toBe('fixed');
  await expect(region).toContainText('de nouveau en bas de l’écran');
  await page.evaluate(() => { document.documentElement.style.fontSize=''; });
  // Paysage : au milieu de la saisie, la barre ne recouvre rien.
  await page.setViewportSize({width:800,height:360});
  await expect.poll(() => page.evaluate(() => {
    window.scrollTo(0,(document.documentElement.scrollHeight-innerHeight)/2);
    const barre=document.querySelector('.grille-barre').getBoundingClientRect();
    const haut=document.querySelector('.entete').getBoundingClientRect().bottom, nav=document.querySelector('.nav').getBoundingClientRect().top;
    return barre.bottom<=haut || barre.top>=nav;
  })).toBe(true);
});

test('Grilles téléphone : une écriture refusée reste affichée dans la barre sans la recouvrir, jusqu’à ce que ce niveau soit enregistré, même après rechargement',async({page})=>{
  await seedClasse(page);
  await ouvrirClasse(page,375,812);
  const suivant=page.locator('.grille-barre').getByRole('button',{name:'Élève suivant',exact:true});
  await suivant.click();
  await expect(page.getByRole('heading',{level:2,name:'ELEVE02 Fictif',exact:true})).toBeVisible();
  await page.evaluate(() => {
    const put=IDBObjectStore.prototype.put;window.__panne=true;
    IDBObjectStore.prototype.put=function(...a){if(this.name==='notes'&&window.__panne){window.__panne=false;throw new DOMException('Panne test','QuotaExceededError');}return put.apply(this,a);};
  });
  await page.locator('.grille-critere').nth(1).getByRole('button',{name:/^Acquis/}).click();
  const echec=page.locator('.grille-barre .grille-echec');
  const texteEchec='Non enregistré — Panne test : ELEVE02 Fictif · Maîtrise technique';
  await expect(echec).toHaveText(texteEchec);
  await expect(page.locator('.grille-critere').nth(1).locator('.grille-niveaux button[data-niveau-cle]').nth(2)).toHaveAttribute('aria-pressed','false');
  // Au premier plan, sans rien recouvrir ; un seul message, et une seule annonce pour les lecteurs d'écran.
  const plan=() => page.evaluate(() => {
    const au=x => {const r=x.getBoundingClientRect();return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)===x;};
    const e=document.querySelector('.grille-echec'), boutons=[...document.querySelectorAll('.grille-barre button')];
    return {echec:e.contains(document.elementFromPoint(e.getBoundingClientRect().left+8,e.getBoundingClientRect().top+8)),
      boutons:boutons.every(au),toasts:document.querySelectorAll('.toast').length,
      annonces:[...document.querySelectorAll('[role="status"],[aria-live]')].filter(x => x.textContent.includes('Non enregistré')).length};
  });
  expect(await plan()).toEqual({echec:true,boutons:true,toasts:0,annonces:1});
  // La barre agrandie par la ligne d'erreur réserve toujours sa place : en bas de page, rien ne passe dessous.
  await page.evaluate(() => window.scrollTo(0,document.documentElement.scrollHeight));
  await expect.poll(() => page.evaluate(() => document.querySelector('.grille-outils').getBoundingClientRect().bottom<=document.querySelector('.grille-barre').getBoundingClientRect().top)).toBe(true);
  // Le succès d'un AUTRE critère du même élève ne l'efface pas : le niveau refusé manque toujours.
  await page.locator('.grille-critere').nth(0).getByRole('button',{name:/^Fragile/}).click();
  await expect(page.locator('#vue > .statut')).toHaveText('Enregistré ✓');
  await expect(echec).toHaveText(texteEchec);
  // Changer d'élève ne la cache pas (vérifié AVANT tout toucher), et le même critère réussi pour un AUTRE élève non plus.
  await suivant.click();
  await expect(page.getByRole('heading',{level:2,name:'ELEVE03 Fictif',exact:true})).toBeVisible();
  await expect(echec).toHaveText(texteEchec);
  await expect(echec).toBeInViewport({ratio:1});
  await page.locator('.grille-critere').nth(1).getByRole('button',{name:/^Expert/}).click();
  await expect(page.locator('#vue > .statut')).toHaveText('Enregistré ✓');
  await expect(echec).toHaveText(texteEchec);
  // Le message de conflit demande de recharger : la liste survit au rechargement.
  await page.reload();
  await expect(page.getByRole('heading',{level:2,name:'ELEVE01 Fictif',exact:true})).toBeVisible();
  await expect(echec).toHaveText(texteEchec);
  // Le niveau réécrit pour ELEVE02 l'efface, ici et pour la session.
  await page.getByLabel('Élève à évaluer').selectOption('1');
  await expect(page.getByRole('heading',{level:2,name:'ELEVE02 Fictif',exact:true})).toBeVisible();
  await page.locator('.grille-critere').nth(1).getByRole('button',{name:/^Acquis/}).click();
  await expect(page.locator('#vue > .statut')).toHaveText('Enregistré ✓');
  await expect(echec).toBeHidden();
  await page.reload();
  await expect(page.getByRole('heading',{level:2,name:'ELEVE01 Fictif',exact:true})).toBeVisible();
  await expect(echec).toBeHidden();
  // Un statut refusé survit lui aussi au rechargement, et ne disparaît que si la base porte CE statut.
  await page.getByLabel('Élève à évaluer').selectOption('3');
  await expect(page.getByRole('heading',{level:2,name:'ELEVE04 Fictif',exact:true})).toBeVisible();
  await page.evaluate(() => {
    const put=IDBObjectStore.prototype.put;window.__panne=true;
    IDBObjectStore.prototype.put=function(...a){if(this.name==='notes'&&window.__panne){window.__panne=false;throw new DOMException('Panne test','QuotaExceededError');}return put.apply(this,a);};
  });
  await page.getByLabel('Statut de l’élève').selectOption('ABS');
  await expect(echec).toContainText('ELEVE04 Fictif · statut ABS');
  await page.reload();
  await expect(page.getByRole('heading',{level:2,name:'ELEVE01 Fictif',exact:true})).toBeVisible();
  await expect(echec).toContainText('ELEVE04 Fictif · statut ABS');
  // Un AUTRE statut en base ne rattrape rien : la ligne reste.
  await page.evaluate(async () => {const io=await import('/js/io.js');await io.enregistrer('notes',{id:'v_e4',evaluationId:'v',eleveId:'e4',valeur:'DISP',detail:{},commentaire:''});});
  await page.reload();
  await expect(page.getByRole('heading',{level:2,name:'ELEVE01 Fictif',exact:true})).toBeVisible();
  await expect(echec).toContainText('ELEVE04 Fictif · statut ABS');
  // Le bon statut en base, lui, l'efface.
  await page.evaluate(async () => {const io=await import('/js/io.js');await io.enregistrer('notes',{id:'v_e4',evaluationId:'v',eleveId:'e4',valeur:'ABS',detail:{},commentaire:''});});
  await page.reload();
  await expect(page.getByRole('heading',{level:2,name:'ELEVE01 Fictif',exact:true})).toBeVisible();
  await expect(echec).toBeHidden();
  // Un échec rattrapé AILLEURS (l'autre onglet a écrit le même niveau) n'est plus signalé à la réouverture.
  await page.evaluate(() => {
    const put=IDBObjectStore.prototype.put;window.__panne=true;
    IDBObjectStore.prototype.put=function(...a){if(this.name==='notes'&&window.__panne){window.__panne=false;throw new DOMException('Panne test','QuotaExceededError');}return put.apply(this,a);};
  });
  await page.locator('.grille-critere').nth(0).getByRole('button',{name:/^Fragile/}).click();
  await expect(echec).toHaveText('Non enregistré — Panne test : ELEVE01 Fictif · Efficacité');
  await page.evaluate(async () => {
    const io=await import('/js/io.js');const ev=await io.lire('evaluations','v');
    await io.enregistrer('notes',{id:'v_e1',evaluationId:'v',eleveId:'e1',valeur:5,detail:{[ev.grille.criteres[0].id]:ev.grille.niveaux[1].cle},commentaire:''});
  });
  await page.reload();
  await expect(page.getByRole('heading',{level:2,name:'ELEVE01 Fictif',exact:true})).toBeVisible();
  await expect(echec).toBeHidden();
});

test('Grilles téléphone : avec un vrai conflit d’écriture, la barre garde sa place et « Élève suivant » ou « Critère suivant » fonctionnent',async({page})=>{
  await seedClasse(page);
  // Un nom composé et le vrai message de conflit (note écrite derrière la vue, comme depuis un autre onglet).
  await page.evaluate(async () => {const io=await import('/js/io.js');const e=await io.lire('eleves','e2');await io.enregistrer('eleves',{...e,nom:'ELEVE02 NOM COMPOSÉ',prenom:'Prénom-Composé'});});
  const conflit=eleve => page.evaluate(async eleve => {const io=await import('/js/io.js');await io.enregistrer('notes',{id:`v_${eleve}`,evaluationId:'v',eleveId:eleve,valeur:'NN',detail:{},commentaire:''});},eleve);
  // 360 × 680 : la ligne d'erreur ferait passer la barre ENTIÈRE au-dessus de 15 %, pas la rangée de boutons.
  for(const [largeur,hauteur] of [[360,680],[412,839]]) {
    const taille=`${largeur}×${hauteur}`;
    await page.evaluate(() => { try { sessionStorage.clear(); } catch {} });
    await page.setViewportSize({width:largeur,height:hauteur});
    await page.goto('/#/accueil');await page.goto('/#/grilles/saisie/v');
    await page.getByLabel('Élève à évaluer').selectOption('1');
    await expect(page.getByRole('heading',{level:2,name:'ELEVE02 NOM COMPOSÉ Prénom-Composé',exact:true})).toBeVisible();
    // Toucher une toast persistante et une toast « Annuler » : elles passent au-dessus de la barre, pas dessus.
    await page.evaluate(async () => {const {toast}=await import('/js/ui.js');toast('Nouvelle version installée',{action:() => {},libelleAction:'Recharger',duree:Infinity});toast('Élève supprimé',{action:() => {}});});
    const avant=await barreAuPouce(page);
    expect(avant.position,taille).toBe('fixed');
    expect(avant.boutons.every(x => x.atteint),`${taille} : messages au-dessus de la barre`).toBe(true);
    await conflit('e2');
    await page.locator('.grille-critere').nth(3).getByRole('button',{name:/^Expert/}).click();
    await expect(page.locator('.grille-barre .grille-echec')).toContainText('Non enregistré — note modifiée dans un autre onglet : rechargez la page avant de réessayer : ELEVE02 NOM COMPOSÉ Prénom-Composé · Rôle social');
    const apres=await barreAuPouce(page);
    // La ligne d'erreur est bornée à deux lignes : un long message ne fait pas grandir la barre sans fin.
    expect(await page.locator('.grille-barre .grille-echec').evaluate(e => e.getBoundingClientRect().height<=parseFloat(getComputedStyle(e).fontSize)*3),taille).toBe(true);
    expect(apres.position,taille).toBe('fixed');
    expect(Math.abs(apres.boutons[1].y-avant.boutons[1].y),taille).toBeLessThanOrEqual(2);
    expect(apres.boutons.every(x => x.atteint),taille).toBe(true);
    await expect(page.locator('.grille-barre .grille-echec')).toBeInViewport({ratio:1});
    // Le tap à la place habituelle change d'élève, et n'écrit rien pour personne.
    const notesAvant=await page.evaluate(async () => (await (await import('/js/io.js')).tous('notes')).length);
    await page.evaluate(() => window.scrollTo(0,document.documentElement.scrollHeight));
    await page.locator('.grille-barre').getByRole('button',{name:'Élève suivant',exact:true}).click();
    await expect(page.getByRole('heading',{level:2,name:'ELEVE03 Fictif',exact:true})).toBeVisible();
    expect(await page.evaluate(async () => (await (await import('/js/io.js')).tous('notes')).length),taille).toBe(notesAvant);
    // Mode « Par critère », au milieu de la liste : même chose pour « Critère suivant ».
    await page.getByLabel('Mode de saisie').selectOption('critere');
    await expect(page.locator('.grille-critere')).toHaveCount(24);
    await conflit('e15');
    await page.locator('.grille-critere').nth(14).scrollIntoViewIfNeeded();
    await page.locator('.grille-critere').nth(14).getByRole('button',{name:/^Expert/}).click();
    await expect(page.locator('.grille-barre .grille-echec')).toContainText('ELEVE15 Fictif · Efficacité');
    const critere=await barreAuPouce(page);
    expect(critere.position,taille).toBe('fixed');
    expect(critere.boutons.every(x => x.atteint),taille).toBe(true);
    await expect(page.locator('.grille-barre .grille-echec')).toBeInViewport({ratio:1});
    await page.locator('.grille-barre').getByRole('button',{name:'Critère suivant',exact:true}).click();
    await expect(page.locator('.grille-saisie > h2')).toHaveText('Maîtrise technique');
    await page.locator('.grille-critere').nth(17).getByRole('button',{name:/^Expert/}).click();
    await expect(page.locator('#vue > .statut')).toHaveText('Enregistré ✓');
    // Panne d'écriture (déterministe) pour le troisième échec : la ligne doit alors résumer, sans faire défiler l'écran.
    await page.evaluate(() => {
      const put=IDBObjectStore.prototype.put;window.__panne=true;
      IDBObjectStore.prototype.put=function(...a){if(this.name==='notes'&&window.__panne){window.__panne=false;throw new DOMException('Mémoire pleine (test)','QuotaExceededError');}return put.apply(this,a);};
    });
    await page.evaluate(() => window.scrollTo(0,150));
    const avantEchec=await page.evaluate(() => scrollY);
    await page.evaluate(() => document.querySelectorAll('.grille-critere')[9].querySelectorAll('.grille-niveaux button[data-niveau-cle]')[3].click());
    await expect(page.locator('#vue > .statut')).toContainText('ELEVE10 Fictif');
    await expect(page.locator('.grille-barre .grille-echec')).toContainText('et 1 autre'); // au-delà de deux, la ligne résume
    expect(await page.locator('.grille-barre .grille-echec').getAttribute('title'),taille).toContain('ELEVE10 Fictif'); // le détail vit dans l'infobulle
    expect(Math.abs(await page.evaluate(() => scrollY)-avantEchec),`${taille} : l'écran ne bouge pas quand la ligne s'allonge`).toBeLessThanOrEqual(2);
    // …ni quand la fenêtre change de hauteur (barre d'adresse Android, écran partagé).
    await page.evaluate(() => window.scrollTo(0,600));
    const avantResize=await page.evaluate(() => scrollY);
    await page.setViewportSize({width:largeur,height:hauteur-115});
    await expect.poll(() => page.evaluate(() => innerHeight),`${taille} : nouvelle hauteur appliquée`).toBe(hauteur-115);
    expect(Math.abs(await page.evaluate(() => scrollY)-avantResize),`${taille} : l'écran ne bouge pas au redimensionnement`).toBeLessThanOrEqual(60);
    await page.setViewportSize({width:largeur,height:hauteur});
    // La cause est lisible EN PREMIER (la ligne tient en deux lignes, ce sont les noms qui sont résumés), et le détail
    // complet reste dans l'infobulle ; rien ne recouvre la ligne.
    const ligne=await page.evaluate(() => {
      const e=document.querySelector('.grille-echec'), r=e.getBoundingClientRect();
      const points=[];for(let y=r.top+3;y<r.bottom-3;y+=3)points.push(Boolean(document.elementFromPoint(r.left+8,y)?.closest('.grille-echec')));
      return {texte:e.textContent,titre:e.getAttribute('title'),recouverte:points.filter(x => !x).length,
        variable:getComputedStyle(document.documentElement).getPropertyValue('--h-barre-grille'),
        barre:Math.ceil(document.querySelector('.grille-barre').getBoundingClientRect().height)};
    });
    expect(ligne.texte,taille).toMatch(/^Non enregistré — plusieurs causes : /); // la CAUSE en premier, jamais coupée
    expect(ligne.titre,taille).toContain('ELEVE10 Fictif');
    expect(ligne.recouverte,`${taille} : ligne d'erreur recouverte`).toBe(0);
    expect(ligne.variable.trim(),taille).toBe(`${ligne.barre}px`);
    await page.evaluate(async () => {for(const t of document.querySelectorAll('.toast'))t.remove();const io=await import('/js/io.js');await io.supprimer('notes','v_e2');await io.supprimer('notes','v_e15');});
  }
});

test('Grilles téléphone : un tap ne fait jamais défiler l’écran, même quand la barre grandit sous le doigt',async({page})=>{
  // Le défaut bloquant de la v0.13.4 : la case touchée ramenée en vue faisait sauter l'écran de plusieurs centaines de
  // pixels, et le tap suivant écrivait une note pour un AUTRE élève. Le tap doit être RÉEL : un clic programmatique ne
  // déplace pas le focus, et la preuve serait vide.
  await seedClasse(page);
  await page.setViewportSize({width:412,height:839});
  await page.goto('/#/accueil');await page.goto('/#/grilles/saisie/v');
  await page.getByLabel('Mode de saisie').selectOption('critere');
  await expect(page.locator('.grille-critere')).toHaveCount(24);
  await expect(page.locator('.grille-barre .grille-echec')).toBeHidden(); // aucune erreur encore : la barre va GRANDIR
  await page.evaluate(() => window.scrollTo(0,900));
  const cible=await page.evaluate(() => [...document.querySelectorAll('.grille-critere')]
    .findIndex((r,i) => i!==9 && r.getBoundingClientRect().top>60 && r.getBoundingClientRect().top<220));
  expect(cible,'une rangée à toucher en haut de l’écran').toBeGreaterThanOrEqual(0);
  await page.locator('.grille-critere').nth(cible).getByRole('button',{name:/^Expert/}).click();
  await expect(page.locator('#vue > .statut')).toHaveText('Enregistré ✓');
  // La case touchée glisse sous la barre : encore à l'écran, mais recouverte, et sans focus CLAVIER (c'est un tap).
  const pose=await page.evaluate(() => {
    window.scrollBy(0,document.activeElement.getBoundingClientRect().top-(innerHeight-30));
    const f=document.activeElement, r=f.getBoundingClientRect(), b=document.querySelector('.grille-barre').getBoundingClientRect();
    return {saisie:Boolean(f.closest('.grille-critere')),clavier:f.matches(':focus-visible'),
      ecran:r.top<innerHeight && r.bottom>0,sousBarre:r.bottom>b.top,y:scrollY,barre:b.height};
  });
  expect(pose.saisie,'le focus est resté sur la case touchée').toBe(true);
  expect(pose.clavier,'un tap ne donne pas le focus clavier').toBe(false);
  expect(pose.ecran && pose.sousBarre,'la case touchée est à l’écran et recouverte par la barre').toBe(true);
  // Panne d'écriture déterministe sur un AUTRE élève : la ligne d'erreur apparaît et la barre grandit, le doigt étant
  // encore sur sa case. Le clic est programmatique exprès : il ne doit pas déplacer le focus.
  await page.evaluate(() => {
    const put=IDBObjectStore.prototype.put;window.__panne=true;
    IDBObjectStore.prototype.put=function(...a){if(this.name==='notes'&&window.__panne){window.__panne=false;throw new DOMException('Mémoire pleine (test)','QuotaExceededError');}return put.apply(this,a);};
  });
  await page.evaluate(() => document.querySelectorAll('.grille-critere')[9].querySelectorAll('.grille-niveaux button[data-niveau-cle]')[3].click());
  await expect(page.locator('.grille-barre .grille-echec')).toContainText('ELEVE10 Fictif');
  const apres=await page.evaluate(() => ({y:scrollY,barre:document.querySelector('.grille-barre').getBoundingClientRect().height,
    saisie:Boolean(document.activeElement.closest('.grille-critere'))}));
  expect(apres.barre,'la barre a bien grandi (sans quoi la preuve serait vide)').toBeGreaterThan(pose.barre);
  expect(apres.saisie,'le focus est toujours sur la case touchée').toBe(true);
  expect(Math.abs(apres.y-pose.y),'l’écran ne bouge pas sous le doigt').toBeLessThanOrEqual(2);
  // …ni quand la fenêtre change de hauteur (barre d'adresse Android, écran partagé) alors que la case est hors champ.
  await page.setViewportSize({width:412,height:724});
  await expect.poll(() => page.evaluate(() => innerHeight),'nouvelle hauteur appliquée').toBe(724);
  expect(Math.abs(await page.evaluate(() => scrollY)-apres.y),'l’écran ne bouge pas au redimensionnement').toBeLessThanOrEqual(2);
});

test('Grilles clavier : une case atteinte avec Tab n’est jamais cachée sous la barre (2.4.11), même en texte agrandi ou quand la barre grandit',async({page})=>{
  await seedClasse(page);
  for(const [largeur,hauteur,police] of [[375,812,''],[320,640,'200%']]) {
    await ouvrirClasse(page,largeur,hauteur);
    await page.evaluate(p => { document.documentElement.style.fontSize=p; },police);
    await page.locator('.grille-niveaux button[data-niveau-cle]').first().focus();
    for(let i=0;i<16;i++) {
      if(i)await page.keyboard.press('Tab');
      const r=await page.evaluate(() => {
        const b=document.activeElement, q=b.getBoundingClientRect(), barre=document.querySelector('.grille-barre');
        const fixe=getComputedStyle(barre).position==='fixed';
        return {case:b.matches('.grille-niveaux button[data-niveau-cle]'),dessus:!fixe || q.bottom<=barre.getBoundingClientRect().top,touchable:document.elementFromPoint(q.left+q.width/2,q.top+q.height/2)===b};
      });
      expect(r,`${largeur}×${hauteur} ${police||'100 %'}, case ${i+1}`).toEqual({case:true,dessus:true,touchable:true});
    }
    await page.evaluate(() => { document.documentElement.style.fontSize=''; });
  }
  // La case focalisée juste au-dessus de la barre, une écriture refusée l'agrandit : la case reste entièrement visible.
  await ouvrirClasse(page,375,812);
  const derniere=page.locator('.grille-critere').nth(3).locator('.grille-niveaux button[data-niveau-cle]').first();
  await page.locator('.grille-niveaux button[data-niveau-cle]').first().focus();
  for(let i=0;i<12;i++)await page.keyboard.press('Tab'); // clavier : le focus est « visible », seul cas où l'écran suit
  await expect(derniere).toBeFocused();
  await page.evaluate(() => {
    const put=IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put=function(...a){if(this.name==='notes')throw new DOMException('Le stockage de l’appareil est plein : exportez une sauvegarde, puis libérez de l’espace','QuotaExceededError');return put.apply(this,a);};
  });
  await page.keyboard.press('Enter');
  await expect(page.locator('.grille-barre .grille-echec')).toBeVisible();
  await expect.poll(() => derniere.evaluate(b => b.getBoundingClientRect().bottom<=document.querySelector('.grille-barre').getBoundingClientRect().top)).toBe(true);
  await expect(derniere).toBeFocused();
});

test('Grilles téléphone : choisir un élève dans la liste le montre en entier, sans faire fuir la liste au clavier',async({page})=>{
  await seedClasse(page);
  await ouvrirClasse(page,375,812);
  // Le geste réel : le doigt ou la souris touche la liste (pointerdown) avant de choisir.
  const liste=page.getByLabel('Élève à évaluer');
  await liste.dispatchEvent('pointerdown');await liste.focus();await liste.selectOption('11');
  await expect(page.getByRole('heading',{level:2,name:'ELEVE12 Fictif',exact:true})).toBeVisible();
  expect(await ecranEleve(page)).toEqual({cases:16,cachees:0,nomVisible:true,bande:true});
  if(test.info().project.name==='chromium') {
    // Au clavier, chaque flèche change d'élève : la liste focalisée reste à l'écran.
    await page.evaluate(() => window.scrollTo(0,0));
    await liste.focus();await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('heading',{level:2,name:'ELEVE13 Fictif',exact:true})).toBeAttached();
    await expect(liste).toBeFocused();
    await expect(liste).toBeInViewport({ratio:1});
    // Puis de nouveau au pointeur : le dernier geste fait foi, la saisie remonte.
    await liste.dispatchEvent('pointerdown');await liste.selectOption('5');
    await expect(page.getByRole('heading',{level:2,name:'ELEVE06 Fictif',exact:true})).toBeVisible();
    expect(await ecranEleve(page)).toEqual({cases:16,cachees:0,nomVisible:true,bande:true});
  }
});

test('Grilles lecteur d’écran : « Élève suivant » et « Critère suivant » annoncent ce qui est affiché, dans une région qui existait déjà',async({page})=>{
  await seedClasse(page);
  await ouvrirClasse(page,375,812);
  const region=await page.locator('#vue > p.sr-only[role="status"]').elementHandle();
  expect(await region.textContent()).toBe('');
  const suivant=page.locator('.grille-barre').getByRole('button',{name:'Élève suivant',exact:true});
  await suivant.focus();await page.keyboard.press('Enter');
  await expect(suivant).toBeFocused();
  expect(await region.evaluate(x => x.isConnected)).toBe(true);
  await expect.poll(() => region.textContent()).toBe('ELEVE02 Fictif, élève 2 sur 24');
  await page.getByLabel('Mode de saisie').selectOption('critere');
  await page.locator('.grille-barre').getByRole('button',{name:'Critère suivant',exact:true}).click();
  await expect(page.locator('.grille-saisie > h2')).toHaveText('Maîtrise technique');
  await expect.poll(() => region.textContent()).toBe('Critère : Maîtrise technique');
});

test('Grilles téléphone : des libellés de niveau longs ne sont jamais coupés au milieu d’un mot, les cases s’élargissent',async({page})=>{
  // « Exceptionnellement » (18 lettres) ne tient dans aucune case de 4 colonnes ; « Anticonstitutionnellement » (25) dans
  // aucune case de 3 : il faut une seule colonne, jamais un mot coupé.
  await seedClasse(page,['Maîtrise insuffisante','Maîtrise satisfaisante','Exceptionnellement maîtrisé','Anticonstitutionnellement maîtrisé']);
  const tailles={};
  const colonnes=() => page.evaluate(() => new Set([...document.querySelector('.grille-critere').querySelectorAll('.grille-niveaux button[data-niveau-cle]')].map(b => Math.round(b.getBoundingClientRect().left))).size);
  for(const [largeur,hauteur] of [[360,800],[412,915],[430,932]]) {
    await ouvrirClasse(page,largeur,hauteur);
    expect(await motsCoupes(page),`${largeur}×${hauteur}`).toEqual([]);
    expect(await colonnes(),`${largeur}×${hauteur} : cases élargies`).toBeLessThan(4);
    tailles[largeur]=await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.grille-niveau-nom')).fontSize));
  }
  // Précaution pour les écrans étroits : la police des cases diminue un peu à 360 px (sans descendre sous 0,7 rem).
  expect(tailles[360]).toBeLessThan(tailles[412]);
  expect(tailles[360]).toBeGreaterThanOrEqual(11.2);
  // Le palier posé est le PLUS FAIBLE qui ne coupe rien : en retirer le dernier fait déborder une case. On mesure la
  // RÈGLE, pas un résultat : « aucun palier » ou « trois paliers » dépendent de la police installée (Segoe ici, DejaVu,
  // plus large, en intégration continue).
  const palierMinimal=() => page.evaluate(() => {
    const saisie=document.querySelector('.grille-saisie');
    const paliers=['grille-niveaux-coupe','grille-niveaux-seule','grille-niveaux-larges'].filter(p => saisie.classList.contains(p));
    if(!paliers.length)return 'aucun palier posé';
    saisie.classList.remove(paliers[0]);
    const deborde=[...document.querySelectorAll('.grille-niveaux button[data-niveau-cle]')].some(b => b.scrollWidth>b.clientWidth+1);
    saisie.classList.add(paliers[0]);
    return deborde ? 'minimal' : `palier ${paliers[0]} inutile`;
  });
  await ouvrirClasse(page,360,800);
  expect(await palierMinimal(),'360×800 : un écran étroit exige au moins un palier, et le plus faible qui suffise').toBe('minimal');
  // Rotation sans changer d'écran (paysage puis portrait, puis retour) : les cases se réajustent dans les DEUX sens, et
  // le palier reste le plus faible qui ne coupe rien — au retour au paysage, il ne reste donc jamais celui du portrait.
  await ouvrirClasse(page,850,412);
  const paliersPoses=() => page.evaluate(() => [...document.querySelector('.grille-saisie').classList].filter(x => x.startsWith('grille-niveaux-')));
  const enPaysage=(await paliersPoses()).length;
  await page.setViewportSize({width:412,height:850});
  await expect.poll(() => motsCoupes(page)).toEqual([]);
  await expect.poll(colonnes).toBeLessThan(4);
  const enPortrait=(await paliersPoses()).length;
  expect(enPortrait,'portrait : au moins autant de paliers qu’en paysage').toBeGreaterThanOrEqual(enPaysage);
  await page.setViewportSize({width:850,height:412});
  await expect.poll(async () => (await paliersPoses()).length,'retour au paysage : les paliers redescendent').toBe(enPaysage);
  expect(await palierMinimal(),'retour au paysage : le palier posé reste le plus faible qui suffise').toMatch(/^(minimal|aucun palier posé)$/);
  await expect.poll(() => motsCoupes(page)).toEqual([]);
});
