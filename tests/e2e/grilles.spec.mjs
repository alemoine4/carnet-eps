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
