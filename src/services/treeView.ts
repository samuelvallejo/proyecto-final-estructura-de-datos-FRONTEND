import type { BinaryReportTree, PlaceReportTree, TreeSnapshot } from '../types/trees';
import type { Report } from '../types';
export const traversalText = {
  inorder: { label: 'En orden: menor a mayor riesgo', help: 'Visita el hijo izquierdo, el nodo y el hijo derecho.' },
  descending: { label: 'Mayor a menor riesgo', help: 'Visita el hijo derecho, el nodo y el hijo izquierdo.' },
  preorder: { label: 'Preorden: raíz primero', help: 'Visita el nodo antes de sus hijos izquierdo y derecho.' },
  postorder: { label: 'Postorden: raíz al final', help: 'Visita los hijos izquierdo y derecho antes del nodo.' },
  level: { label: 'Por niveles: de arriba hacia abajo', help: 'Una cola visita primero los nodos más cercanos a la raíz.' },
};

export function scoreInput(value: string): string {
  const digits = value.replace(/[^0-9]/g, '').slice(0, 3);
  return digits ? String(Math.min(100, Number(digits))) : '';
}
