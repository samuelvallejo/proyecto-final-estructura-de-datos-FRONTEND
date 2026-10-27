import type { Report } from '../src/types.ts';
import type { TreeSnapshot, PlaceReportNode } from '../src/types/trees.ts';
import { BinarySearchTree } from '../src/data-structures/BinarySearchTree.ts';
import { ReportRiskIndex } from '../src/services/reportTree.ts';
export function report(id = 'a', score = 70, timestamp = 100): Report {
  return { id, timestamp, hazardScore: score, hazardLevel: score >= 80 ? 'CRITICAL' : score >= 60 ? 'HIGH' : score >= 35 ? 'MEDIUM' : 'LOW',
    isPothole: true, potholeType: 'BACHE', aiDescription: 'Prueba local de árboles.', riskFactors: [],
    location: { lat: 3.45, lng: -76.53, accuracy: 8 },
    zone: { city: 'Cali', neighborhood: 'Centro', street: 'Calle 1', fullAddress: null }, source: 'COMMUNITY', status: 'UNVERIFIED' };
}
export function example() {
  const tree = new BinarySearchTree<number, string>((a,b) => a-b);
  for (const n of [5,2,7,1,3,6,8]) tree.insert(n,String(n));
  return tree;
}
export const keys = <K,V>(nodes: Iterable<{ key: K; value: V }>): K[] => [...nodes].map(node => node.key);
export function snapshot(): TreeSnapshot {
  const reports = [report('a',20), report('b',50), report('c',90)]; const index = new ReportRiskIndex(reports);
  const nodes = [...index.tree.levelOrder()].map(({node,level,parent}) => ({ id: node.value.id, score: node.key[0],
    leftId: node.left?.value.id || null, rightId: node.right?.value.id || null, parentId: parent?.value.id || null,
    level, degree: Number(Boolean(node.left))+Number(Boolean(node.right)), isLeaf: !node.left && !node.right }));
  const root: PlaceReportNode = { id:'root',label:'Reportes',kind:'root',level:1,parentId:null,childIds:['ra','rb','rc'],reportId:null,reportCount:3,highestScore:90 };
  return { generatedAt:1000,scope:{totalReports:3,totalMatched:3,loaded:3,limit:200,hasMore:false,minScore:0,maxScore:100,selection:'highest-risk'},
    binary:{rootId:index.tree.root!.value.id,nodes,metrics:index.tree.metrics(),traversal:{order:'inorder',reportIds:['a','b','c']}},
    geography:{rootId:'root',nodes:[root,...reports.map(r => ({id:'r'+r.id,label:r.id,kind:'report' as const,level:2,parentId:'root',childIds:[],reportId:r.id,reportCount:1,highestScore:r.hazardScore}))],metrics:{weight:4,height:1,levels:2,leaves:3,branches:0,maxDegree:3,reports:3}},reports };
}
