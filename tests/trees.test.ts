import test from 'node:test';
import assert from 'node:assert/strict';
import { BinarySearchTree } from '../src/data-structures/BinarySearchTree.ts';
import { ReportRiskIndex } from '../src/services/reportTree.ts';
import { TreeView } from '../src/services/treeView.ts';
import { example, keys, report, snapshot } from './tree-fixtures.ts';


test('null root and zero weight', () => {
  const tree=new BinarySearchTree<number,number>((a,b)=>a-b); assert.equal(tree.root,null); assert.equal(tree.size,0);
});


test('inserting the root', () => {
  const tree=new BinarySearchTree<number,string>((a,b)=>a-b);assert.equal(tree.insert(5,'raíz'),true);assert.equal(tree.root?.key,5);
});


test('left links hold smaller keys', () => {
  const tree=example();assert.equal(tree.root?.left?.key,2);assert.equal(tree.root?.left?.left?.key,1);
});


test('right links hold larger keys', () => {
  const tree=example();assert.equal(tree.root?.right?.key,7);assert.equal(tree.root?.right?.right?.key,8);
});


test('updating a key does not increase the weight', () => {
  const tree=example();assert.equal(tree.insert(3,'nuevo'),false);assert.equal(tree.search(3),'nuevo');assert.equal(tree.size,7);
});


test('searching descendants and missing keys', () => {
  const tree=example();assert.equal(tree.search(1),'1');assert.equal(tree.search(8),'8');assert.equal(tree.search(99),undefined);
});


test('membership of an undefined value', () => {
  const tree=new BinarySearchTree<number,undefined>((a,b)=>a-b);tree.insert(1,undefined);assert.equal(tree.contains(1),true);assert.equal(tree.contains(2),false);
});


test('in-order traversal of the PDF example', () => {
  assert.deepEqual(keys(example().inOrder()),[1,2,3,5,6,7,8]);
});


test('descending key order', () => {
  assert.deepEqual(keys(example().reverseOrder()),[8,7,6,5,3,2,1]);
});


test('preorder visits the root first', () => {
  assert.deepEqual(keys(example().preOrder()),[5,2,1,3,7,6,8]);
});


test('postorder visits the root last', () => {
  assert.deepEqual(keys(example().postOrder()),[1,3,2,6,8,7,5]);
});


test('FIFO level-order traversal', () => {
  assert.deepEqual([...example().levelOrder()].map(item=>[item.node.key,item.level]),[[5,1],[2,2],[7,2],[1,3],[3,3],[6,3],[8,3]]);
});


test('height of the empty tree', () => {
  const tree=new BinarySearchTree<number,number>((a,b)=>a-b);assert.equal(tree.height,-1);assert.equal(tree.metrics().levels,0);
});


test('height of a single root', () => {
  const tree=BinarySearchTree.fromItems([[1,1]],(a:number,b:number)=>a-b);assert.equal(tree.height,0);assert.equal(tree.metrics().leaves,1);
});


test('complete metrics of a binary tree', () => {
  assert.deepEqual(example().metrics(),{weight:7,height:2,levels:3,leaves:4,branches:2,internalNodes:3,order:2,maxDegree:2});
});


test('ranges with inclusive bounds', () => {
  assert.deepEqual(keys(example().between(2,7)),[2,3,5,6,7]);
});


test('empty ranges outside the domain', () => {
  assert.deepEqual(keys(example().between(20,30)),[]);
});


test('rejects inverted ranges', () => {
  assert.throws(()=>[...example().between(7,2)]);
});


test('removing a missing key leaves the nodes unchanged', () => {
  const tree=example();assert.equal(tree.remove(99),false);assert.equal(tree.size,7);
});


test('removing leaves on both sides', () => {
  const tree=example();tree.remove(1);tree.remove(8);assert.equal(tree.root?.left?.left,null);assert.equal(tree.root?.right?.right,null);assert.equal(tree.validate(),true);
});


test('removing the last root', () => {
  const tree=BinarySearchTree.fromItems([[1,1]],(a:number,b:number)=>a-b);tree.remove(1);assert.equal(tree.root,null);assert.equal(tree.size,0);
});


test('promotes a single left child', () => {
  const tree=new BinarySearchTree<number,number>((a,b)=>a-b);tree.insert(2,2);tree.insert(1,1);tree.remove(2);assert.equal(tree.root?.key,1);assert.equal(tree.validate(),true);
});


test('promotes a single right child', () => {
  const tree=new BinarySearchTree<number,number>((a,b)=>a-b);tree.insert(1,1);tree.insert(2,2);tree.remove(1);assert.equal(tree.root?.key,2);assert.equal(tree.validate(),true);
});


test('deep successor keeps its child', () => {
  const tree=new BinarySearchTree<number,number>((a,b)=>a-b);for(const n of [10,5,20,15,17,25])tree.insert(n,n);tree.remove(10);assert.deepEqual(keys(tree.inOrder()),[5,15,17,20,25]);assert.equal(tree.validate(),true);
});


test('balanced construction of two hundred nodes', () => {
  const tree=BinarySearchTree.fromItems(Array.from({length:200},(_,n)=>[n,n] as [number,number]),(a,b)=>a-b);assert.equal(tree.height,7);assert.equal(tree.validate(),true);
});


test('last write wins for duplicated keys', () => {
  const tree=BinarySearchTree.fromItems([[2,'a'],[1,'b'],[2,'c']] as [number,string][],(a,b)=>a-b);assert.equal(tree.size,2);assert.equal(tree.search(2),'c');
});


test('rebalancing keeps every value', () => {
  const tree=new BinarySearchTree<number,number>((a,b)=>a-b);for(let n=0;n<30;n++)tree.insert(n,n);tree.rebalance();assert.equal(tree.height,4);assert.deepEqual(keys(tree.inOrder()),Array.from({length:30},(_,n)=>n));
});


test('detects cycles', () => {
  const tree=example();tree.root!.left!.left=tree.root;assert.equal(tree.validate(),false);
});


test('detects keys outside their branch', () => {
  const tree=example();tree.root!.left!.right!.key=99;assert.equal(tree.validate(),false);
});


test('clearing and reusing the tree', () => {
  const tree=example();tree.clear();tree.insert(9,'nueve');assert.equal(tree.size,1);assert.equal(tree.search(9),'nueve');
});


test('search paths for found and missing keys', () => {
  assert.deepEqual(keys(example().trace(1)),[5,2,1]);assert.deepEqual(keys(example().trace(4)),[5,2,3]);
});


test('traversals of an empty tree', () => {
  const tree=new BinarySearchTree<number,number>((a,b)=>a-b);for(const order of Object.keys(TreeView.traversalText))assert.deepEqual([...tree.traverse(order as keyof typeof TreeView.traversalText)],[]);
});


test('deep tree without recursion', () => {
  const tree=new BinarySearchTree<number,number>((a,b)=>a-b);for(let n=0;n<1200;n++)tree.insert(n,n);assert.equal(tree.height,1199);assert.equal([...tree.postOrder()].length,1200);
});


test('compares risk, date and identifier', () => {
  assert(ReportRiskIndex.compareRisk([70,1,'a'],[70,1,'b'])<0);assert(ReportRiskIndex.compareRisk([70,2,'a'],[70,1,'a'])>0);assert(ReportRiskIndex.compareRisk([20,99,'z'],[70,1,'a'])<0);
});


test('deduplicates by report identity', () => {
  const index=new ReportRiskIndex([report('a',20),report('a',90)]);assert.equal(index.tree.size,1);assert.equal(index.ordered()[0].hazardScore,90);
});


test('ties never drop potholes', () => {
  const index=new ReportRiskIndex([report('a',70),report('b',70)]);assert.deepEqual(index.ordered('inorder').map(r=>r.id),['a','b']);
});


test('updates that move the risk key', () => {
  const index=new ReportRiskIndex([report('a',20),report('b',60)]);index.upsert(report('a',90));assert.deepEqual(index.ordered().map(r=>r.id),['a','b']);assert.equal(index.tree.size,2);
});


test('invalid updates without data loss', () => {
  const index=new ReportRiskIndex([report('a',20)]);assert.throws(()=>index.upsert(report('a',101)));assert.equal(index.ordered()[0].hazardScore,20);
});


test('removes an identifier from the index', () => {
  const index=new ReportRiskIndex([report('a')]);assert.equal(index.remove('a'),true);assert.equal(index.remove('a'),false);assert.equal(index.tree.size,0);
});


test('exact search of shared scores', () => {
  const index=new ReportRiskIndex([report('a',70),report('b',70),report('c',90)]);assert.deepEqual(index.inRange(70,70).map(r=>r.id),['a','b']);
});


test('rejects a non-finite risk', () => {
  assert.throws(()=>ReportRiskIndex.reportKey(report('a',NaN)));assert.throws(()=>ReportRiskIndex.reportKey(report('a',Infinity)));
});


test('rejects a negative date', () => {
  assert.throws(()=>ReportRiskIndex.reportKey(report('a',70,-1)));
});


test('sorting does not mutate the original array', () => {
  const values=[report('a',20),report('b',90)];assert.deepEqual(ReportRiskIndex.orderReports(values,'descending').map(r=>r.id),['b','a']);assert.deepEqual(values.map(r=>r.id),['a','b']);
});


test('ascending order and preserving the original order', () => {
  const values=[report('a',90),report('b',20)];assert.deepEqual(ReportRiskIndex.orderReports(values,'ascending').map(r=>r.id),['b','a']);assert.deepEqual(ReportRiskIndex.orderReports(values,'original'),values);assert.notEqual(ReportRiskIndex.orderReports(values,'original'),values);
});


test('typed risk is capped at one hundred', () => {
  assert.equal(TreeView.scoreInput('999'),'100');assert.equal(TreeView.scoreInput('101'),'100');
});


test('numeric input without letters or separators', () => {
  assert.equal(TreeView.scoreInput('a7b0'),'70');assert.equal(TreeView.scoreInput(''), '');assert.equal(TreeView.scoreInput('000'),'0');
});


test('path of a node received from the API', () => {
  assert.deepEqual(TreeView.binaryPath(snapshot().binary,'a'),['b','a']);assert.deepEqual(TreeView.binaryPath(snapshot().binary,'missing'),[]);
});


test('rejects cycles in received paths', () => {
  const value=snapshot();value.binary.nodes.find(n=>n.id==='a')!.parentId='a';assert.deepEqual(TreeView.binaryPath(value.binary,'a'),[]);
});


test('symmetric diagram positions', () => {
  const layout=TreeView.binaryLayout(snapshot().binary);assert.equal(layout.find(n=>n.id==='b')?.x,50);assert.equal(layout.find(n=>n.id==='a')?.x,25);assert.equal(layout.find(n=>n.id==='c')?.x,75);
});


test('limit of drawn levels', () => {
  assert.equal(TreeView.binaryLayout(snapshot().binary,1).length,1);assert.equal(TreeView.binaryLayout(snapshot().binary,0).length,0);
});


test('walks the geographic leaves', () => {
  assert.deepEqual(TreeView.placeReports(snapshot().geography,'root'),['a','b','c']);assert.deepEqual(TreeView.placeReports(snapshot().geography,'ra'),['a']);
});


test('unknown geographic routes', () => {
  assert.deepEqual(TreeView.placeReports(snapshot().geography,'missing'),[]);
});


test('labels with a readable location', () => {
  assert.equal(TreeView.treeReportLabel(report('a',70)),'Riesgo 70/100 · Calle 1, Centro, Cali');
});


test('labels without an available address', () => {
  const value=report();value.zone={city:null,street:null,neighborhood:null,fullAddress:null};assert.match(TreeView.treeReportLabel(value),/Ubicación GPS sin dirección/);
});


test('accepts a valid tree contract', () => {
  const value=snapshot();assert.equal(TreeView.validateTreeSnapshot(value),value);
});


test('rejects inconsistent sample limits', () => {
  const value=snapshot();value.scope.loaded=99;assert.throws(()=>TreeView.validateTreeSnapshot(value));
});


test('rejects duplicated identifiers in traversals', () => {
  const value=snapshot();value.binary.traversal.reportIds=['a','a','c'];assert.throws(()=>TreeView.validateTreeSnapshot(value));
});


test('rejects a binary child outside the tree', () => {
  const value=snapshot();value.binary.nodes[0].leftId='missing';assert.throws(()=>TreeView.validateTreeSnapshot(value));
});


test('rejects a geographic branch with the wrong level', () => {
  const value=snapshot();value.geography.nodes[1].level=5;assert.throws(()=>TreeView.validateTreeSnapshot(value));
});


test('rejects a missing binary root', () => {
  const value=snapshot();value.binary.rootId=null;assert.throws(()=>TreeView.validateTreeSnapshot(value));
});
