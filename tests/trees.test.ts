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
