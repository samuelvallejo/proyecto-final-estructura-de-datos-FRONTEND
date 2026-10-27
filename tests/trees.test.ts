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
