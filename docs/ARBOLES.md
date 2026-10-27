# Árboles en la aplicación BacheScan

El proyecto adapta **Arboles.pdf**, material del docente Jhonatan Andres Mideros Narvaez del 26 de octubre de 2026. Los ejemplos de agenda telefónica y ordenamiento de las páginas 21-26 se convierten en índices de reportes viales.

Hay dos usos visibles: un BST organiza los baches por riesgo y un árbol con varios hijos agrupa sus ubicaciones. La implementación TypeScript contiene nodos con referencias left/right y se utiliza también para ordenar los resultados del listado de reportes.

## Dónde encontrarlo

Inicia sesión y abre **Reportes → Abrir explorador de árboles**. La consulta se carga cuando abres el explorador. En **Estructuras**, el explorador se abre directamente para mostrar la aplicación de los conceptos de clase.

Cerrar el explorador cancela la consulta pendiente. Las funcionalidades de fotografía, cámara, recorridos y mapa conservan sus accesos habituales.
## Ordenar el listado cargado

El selector «Ordenar los reportes cargados» ofrece conservar la consulta original, menor riesgo primero y mayor riesgo primero. Los órdenes de riesgo construyen y recorren `ReportRiskIndex`, basado en `BinarySearchTree`.

Los filtros de búsqueda, favoritos y exportación siguen usando la muestra cargada. Ordenar no cambia el arreglo original, no guarda datos nuevos y no modifica la prioridad de los reportes en PostgreSQL.

## Intervalo de riesgo

Escribe mínimo y máximo entre 0 y 100 y pulsa «Consultar árbol». Los campos eliminan caracteres ajenos a dígitos y limitan el valor a 100 mientras escribes. El mínimo no puede superar al máximo.

Un intervalo inválido muestra una explicación antes de enviar una petición. El backend vuelve a validar los parámetros. Estos límites describen puntuaciones orientativas, no una medición física del bache.
