import test from 'node:test';
import assert from 'node:assert/strict';
import { BinarySearchTree } from '../src/data-structures/BinarySearchTree.ts';
import { ReportRiskIndex, compareRisk, orderReports, reportKey } from '../src/services/reportTree.ts';
import { binaryPath, binaryLayout, placeReports, scoreInput, treeReportLabel, validateTreeSnapshot, traversalText } from '../src/services/treeView.ts';
import { example, keys, report, snapshot } from './tree-fixtures.ts';


test('raiz nula y peso cero', () => {
  const tree=new BinarySearchTree<number,number>((a,b)=>a-b); assert.equal(tree.root,null); assert.equal(tree.size,0);
});


test('insercion de la raiz', () => {
  const tree=new BinarySearchTree<number,string>((a,b)=>a-b);assert.equal(tree.insert(5,'raíz'),true);assert.equal(tree.root?.key,5);
});


test('enlaces izquierdos de valores menores', () => {
  const tree=example();assert.equal(tree.root?.left?.key,2);assert.equal(tree.root?.left?.left?.key,1);
});


test('enlaces derechos de valores mayores', () => {
  const tree=example();assert.equal(tree.root?.right?.key,7);assert.equal(tree.root?.right?.right?.key,8);
});


test('actualizacion de una clave sin aumentar el peso', () => {
  const tree=example();assert.equal(tree.insert(3,'nuevo'),false);assert.equal(tree.search(3),'nuevo');assert.equal(tree.size,7);
});


test('busqueda de descendientes y claves ausentes', () => {
  const tree=example();assert.equal(tree.search(1),'1');assert.equal(tree.search(8),'8');assert.equal(tree.search(99),undefined);
});


test('pertenencia de un valor undefined', () => {
  const tree=new BinarySearchTree<number,undefined>((a,b)=>a-b);tree.insert(1,undefined);assert.equal(tree.contains(1),true);assert.equal(tree.contains(2),false);
});


test('ordenamiento del ejemplo del PDF', () => {
  assert.deepEqual(keys(example().inOrder()),[1,2,3,5,6,7,8]);
});


test('orden descendente de claves', () => {
  assert.deepEqual(keys(example().reverseOrder()),[8,7,6,5,3,2,1]);
});


test('preorden con raiz primero', () => {
  assert.deepEqual(keys(example().preOrder()),[5,2,1,3,7,6,8]);
});


test('postorden con raiz al final', () => {
  assert.deepEqual(keys(example().postOrder()),[1,3,2,6,8,7,5]);
});


test('recorrido FIFO por niveles', () => {
  assert.deepEqual([...example().levelOrder()].map(item=>[item.node.key,item.level]),[[5,1],[2,2],[7,2],[1,3],[3,3],[6,3],[8,3]]);
});


test('altura del arbol vacio', () => {
  const tree=new BinarySearchTree<number,number>((a,b)=>a-b);assert.equal(tree.height,-1);assert.equal(tree.metrics().levels,0);
});


test('altura de una sola raiz', () => {
  const tree=BinarySearchTree.fromItems([[1,1]],(a:number,b:number)=>a-b);assert.equal(tree.height,0);assert.equal(tree.metrics().leaves,1);
});


test('metricas completas de un arbol binario', () => {
  assert.deepEqual(example().metrics(),{weight:7,height:2,levels:3,leaves:4,branches:2,internalNodes:3,order:2,maxDegree:2});
});


test('intervalos con extremos inclusivos', () => {
  assert.deepEqual(keys(example().between(2,7)),[2,3,5,6,7]);
});


test('intervalos vacios fuera del dominio', () => {
  assert.deepEqual(keys(example().between(20,30)),[]);
});


test('rechazo de intervalos invertidos', () => {
  assert.throws(()=>[...example().between(7,2)]);
});


test('eliminacion inexistente sin alterar nodos', () => {
  const tree=example();assert.equal(tree.remove(99),false);assert.equal(tree.size,7);
});


test('eliminacion de hojas a ambos lados', () => {
  const tree=example();tree.remove(1);tree.remove(8);assert.equal(tree.root?.left?.left,null);assert.equal(tree.root?.right?.right,null);assert.equal(tree.validate(),true);
});


test('eliminacion de la ultima raiz', () => {
  const tree=BinarySearchTree.fromItems([[1,1]],(a:number,b:number)=>a-b);tree.remove(1);assert.equal(tree.root,null);assert.equal(tree.size,0);
});


test('promocion de un unico hijo izquierdo', () => {
  const tree=new BinarySearchTree<number,number>((a,b)=>a-b);tree.insert(2,2);tree.insert(1,1);tree.remove(2);assert.equal(tree.root?.key,1);assert.equal(tree.validate(),true);
});


test('promocion de un unico hijo derecho', () => {
  const tree=new BinarySearchTree<number,number>((a,b)=>a-b);tree.insert(1,1);tree.insert(2,2);tree.remove(1);assert.equal(tree.root?.key,2);assert.equal(tree.validate(),true);
});


test('sucesor profundo sin perder su hijo', () => {
  const tree=new BinarySearchTree<number,number>((a,b)=>a-b);for(const n of [10,5,20,15,17,25])tree.insert(n,n);tree.remove(10);assert.deepEqual(keys(tree.inOrder()),[5,15,17,20,25]);assert.equal(tree.validate(),true);
});


test('construccion equilibrada de doscientos nodos', () => {
  const tree=BinarySearchTree.fromItems(Array.from({length:200},(_,n)=>[n,n] as [number,number]),(a,b)=>a-b);assert.equal(tree.height,7);assert.equal(tree.validate(),true);
});


test('ultima escritura para claves duplicadas', () => {
  const tree=BinarySearchTree.fromItems([[2,'a'],[1,'b'],[2,'c']] as [number,string][],(a,b)=>a-b);assert.equal(tree.size,2);assert.equal(tree.search(2),'c');
});


test('reequilibrado conservando todos los valores', () => {
  const tree=new BinarySearchTree<number,number>((a,b)=>a-b);for(let n=0;n<30;n++)tree.insert(n,n);tree.rebalance();assert.equal(tree.height,4);assert.deepEqual(keys(tree.inOrder()),Array.from({length:30},(_,n)=>n));
});


test('deteccion de ciclos', () => {
  const tree=example();tree.root!.left!.left=tree.root;assert.equal(tree.validate(),false);
});


test('deteccion de claves fuera de su rama', () => {
  const tree=example();tree.root!.left!.right!.key=99;assert.equal(tree.validate(),false);
});


test('vaciado y posterior reutilizacion', () => {
  const tree=example();tree.clear();tree.insert(9,'nueve');assert.equal(tree.size,1);assert.equal(tree.search(9),'nueve');
});


test('caminos de busqueda encontrada y ausente', () => {
  assert.deepEqual(keys(example().trace(1)),[5,2,1]);assert.deepEqual(keys(example().trace(4)),[5,2,3]);
});


test('recorridos de un arbol vacio', () => {
  const tree=new BinarySearchTree<number,number>((a,b)=>a-b);for(const order of Object.keys(traversalText))assert.deepEqual([...tree.traverse(order as keyof typeof traversalText)],[]);
});


test('arbol profundo sin recursion', () => {
  const tree=new BinarySearchTree<number,number>((a,b)=>a-b);for(let n=0;n<1200;n++)tree.insert(n,n);assert.equal(tree.height,1199);assert.equal([...tree.postOrder()].length,1200);
});


test('comparacion de riesgo fecha e identificador', () => {
  assert(compareRisk([70,1,'a'],[70,1,'b'])<0);assert(compareRisk([70,2,'a'],[70,1,'a'])>0);assert(compareRisk([20,99,'z'],[70,1,'a'])<0);
});


test('deduplicacion por identidad de reporte', () => {
  const index=new ReportRiskIndex([report('a',20),report('a',90)]);assert.equal(index.tree.size,1);assert.equal(index.ordered()[0].hazardScore,90);
});


test('empates que no eliminan baches', () => {
  const index=new ReportRiskIndex([report('a',70),report('b',70)]);assert.deepEqual(index.ordered('inorder').map(r=>r.id),['a','b']);
});


test('actualizaciones que mueven la clave de riesgo', () => {
  const index=new ReportRiskIndex([report('a',20),report('b',60)]);index.upsert(report('a',90));assert.deepEqual(index.ordered().map(r=>r.id),['a','b']);assert.equal(index.tree.size,2);
});


test('actualizaciones invalidas sin perdida de datos', () => {
  const index=new ReportRiskIndex([report('a',20)]);assert.throws(()=>index.upsert(report('a',101)));assert.equal(index.ordered()[0].hazardScore,20);
});


test('retiro de un identificador del indice', () => {
  const index=new ReportRiskIndex([report('a')]);assert.equal(index.remove('a'),true);assert.equal(index.remove('a'),false);assert.equal(index.tree.size,0);
});


test('busqueda exacta de puntuaciones compartidas', () => {
  const index=new ReportRiskIndex([report('a',70),report('b',70),report('c',90)]);assert.deepEqual(index.inRange(70,70).map(r=>r.id),['a','b']);
});


test('rechazo de riesgo no finito', () => {
  assert.throws(()=>reportKey(report('a',NaN)));assert.throws(()=>reportKey(report('a',Infinity)));
});


test('rechazo de fecha negativa', () => {
  assert.throws(()=>reportKey(report('a',70,-1)));
});


test('ordenamiento sin mutar el arreglo original', () => {
  const values=[report('a',20),report('b',90)];assert.deepEqual(orderReports(values,'descending').map(r=>r.id),['b','a']);assert.deepEqual(values.map(r=>r.id),['a','b']);
});


test('orden ascendente y preservacion del orden original', () => {
  const values=[report('a',90),report('b',20)];assert.deepEqual(orderReports(values,'ascending').map(r=>r.id),['b','a']);assert.deepEqual(orderReports(values,'original'),values);assert.notEqual(orderReports(values,'original'),values);
});


test('limite escrito de riesgo cien', () => {
  assert.equal(scoreInput('999'),'100');assert.equal(scoreInput('101'),'100');
});


test('entrada numerica sin letras ni separadores', () => {
  assert.equal(scoreInput('a7b0'),'70');assert.equal(scoreInput(''), '');assert.equal(scoreInput('000'),'0');
});


test('camino de un nodo recibido desde la API', () => {
  assert.deepEqual(binaryPath(snapshot().binary,'a'),['b','a']);assert.deepEqual(binaryPath(snapshot().binary,'missing'),[]);
});


test('rechazo de ciclos en caminos recibidos', () => {
  const value=snapshot();value.binary.nodes.find(n=>n.id==='a')!.parentId='a';assert.deepEqual(binaryPath(value.binary,'a'),[]);
});


test('posiciones simetricas del diagrama', () => {
  const layout=binaryLayout(snapshot().binary);assert.equal(layout.find(n=>n.id==='b')?.x,50);assert.equal(layout.find(n=>n.id==='a')?.x,25);assert.equal(layout.find(n=>n.id==='c')?.x,75);
});


test('limite de niveles dibujados', () => {
  assert.equal(binaryLayout(snapshot().binary,1).length,1);assert.equal(binaryLayout(snapshot().binary,0).length,0);
});


test('recorrido de las hojas geograficas', () => {
  assert.deepEqual(placeReports(snapshot().geography,'root'),['a','b','c']);assert.deepEqual(placeReports(snapshot().geography,'ra'),['a']);
});


test('rutas geograficas desconocidas', () => {
  assert.deepEqual(placeReports(snapshot().geography,'missing'),[]);
});


test('etiquetas con ubicacion legible', () => {
  assert.equal(treeReportLabel(report('a',70)),'Riesgo 70/100 · Calle 1, Centro, Cali');
});


test('etiquetas sin direccion disponible', () => {
  const value=report();value.zone={city:null,street:null,neighborhood:null,fullAddress:null};assert.match(treeReportLabel(value),/Ubicación GPS sin dirección/);
});


test('aceptacion de un contrato de arbol valido', () => {
  const value=snapshot();assert.equal(validateTreeSnapshot(value),value);
});


test('rechazo de limites de muestra incoherentes', () => {
  const value=snapshot();value.scope.loaded=99;assert.throws(()=>validateTreeSnapshot(value));
});


test('rechazo de identificadores duplicados en recorridos', () => {
  const value=snapshot();value.binary.traversal.reportIds=['a','a','c'];assert.throws(()=>validateTreeSnapshot(value));
});


test('rechazo de un hijo binario ajeno al arbol', () => {
  const value=snapshot();value.binary.nodes[0].leftId='missing';assert.throws(()=>validateTreeSnapshot(value));
});


test('rechazo de una rama geografica con nivel incorrecto', () => {
  const value=snapshot();value.geography.nodes[1].level=5;assert.throws(()=>validateTreeSnapshot(value));
});


test('rechazo de una raiz binaria ausente', () => {
  const value=snapshot();value.binary.rootId=null;assert.throws(()=>validateTreeSnapshot(value));
});
