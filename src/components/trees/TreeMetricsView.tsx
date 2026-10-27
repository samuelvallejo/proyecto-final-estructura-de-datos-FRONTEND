import type { TreeMetrics } from '../../types/trees';
export default function TreeMetricsView({ metrics }: { metrics: TreeMetrics }) {
  const entries = [['Peso', metrics.weight, 'Número de nodos'], ['Altura', metrics.height, 'Aristas del camino más largo'], ['Niveles', metrics.levels, 'La raíz comienza en el nivel 1'], ['Hojas', metrics.leaves, 'Nodos sin hijos'], ['Ramas', metrics.branches, 'Padres que no son la raíz'], ['Grado máximo', metrics.maxDegree, 'Mayor número de hijos de un nodo']];
  return <dl className="tree-metrics" aria-label="Métricas del árbol">{entries.map(([label, value, help]) => <div key={label}><dt>{label}</dt><dd>{value}</dd><small>{help}</small></div>)}</dl>;
}
