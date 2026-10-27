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
## Alcance de la consulta

El explorador consulta hasta 200 reportes activos de mayor riesgo dentro del intervalo. La pantalla informa cuántos cargó, cuántos coinciden y cuántos activos hay en la plataforma. Los filtros de riesgo se aplican en PostgreSQL antes de seleccionar la muestra.

Las métricas, búsquedas y recorridos se refieren a esos nodos. Cambiar el recorrido no convierte la muestra en todos los reportes de la base. Actualiza con «Consultar árbol» para obtener una instantánea nueva.

## Leer el diagrama

Cada círculo es un reporte y muestra su puntuación. La raíz aparece arriba. Sus hijos izquierdo y derecho siguen el orden de la clave compuesta: riesgo, fecha e identificador.

El dibujo muestra hasta cuatro niveles para conservar legibilidad. Todos los nodos, incluso los que quedan fuera del dibujo, participan en las métricas y búsquedas. En celular puedes deslizar horizontalmente y usar «Centrar raíz».
## Recorridos del árbol

«En orden» recorre izquierdo, nodo y derecho; «Mayor a menor riesgo» invierte ese recorrido. Preorden empieza por la raíz; postorden la visita después de sus hijos. Por niveles visita primero los nodos más próximos a la raíz.

El backend envía la secuencia de identificadores del recorrido y el cliente la valida antes de mostrarla. Cada recorrido conserva los mismos reportes de la instantánea.

## Pasos y selección

«Paso anterior» y «Paso siguiente» avanzan por la secuencia elegida. También puedes tocar un nodo del diagrama para seleccionarlo. La tarjeta inferior identifica el reporte, su origen y el acceso al mapa.

El camino resaltado muestra qué nodos visita la búsqueda binaria desde la raíz hasta la selección. El contador de nodos visitados corresponde a ese camino, no a solicitudes HTTP independientes.
## Buscar una puntuación

«Buscar puntuación exacta» acepta de 0 a 100 y consulta el BST TypeScript dentro de la muestra. Si varios reportes tienen el mismo riesgo, aparecen todos. Seleccionar una coincidencia mueve el recorrido a ese reporte.

La clave incluye fecha e identificador para conservar empates. Una búsqueda sin coincidencias muestra un estado vacío y no crea un reporte ni llama al modelo de visión.
## Ciudad, barrio, vía y bache

«Árbol por ubicación» muestra grupos que puedes abrir progresivamente. Las hojas de reporte ofrecen «Ver en mapa». Los conteos y riesgos máximos corresponden al subárbol de esa ubicación.

Los nombres sin identificar agrupan reportes con GPS cuya dirección no está resuelta. Una calle con el mismo nombre en barrios diferentes permanece separada por su ruta de padres.
## Abrir el mapa

«Ver bache seleccionado en mapa» y las hojas del árbol geográfico abren el reporte correspondiente. Se usan sus coordenadas guardadas, incluso si ese reporte no estaba dentro de los primeros resultados del listado principal.

La ubicación es aproximada según el GPS con el que se registró. El árbol organiza reportes existentes y no geolocaliza una imagen por su contenido.
## Métricas de clase

Peso es el número de nodos. La raíz tiene nivel 1. Altura es el número de aristas del camino más largo. El BST vacío usa altura -1 y cero niveles; un BST con una raíz tiene altura 0.

Una hoja no tiene hijos. Una rama es un padre que no es la raíz. El grado indica cuántos hijos tiene un nodo. El árbol binario admite como máximo dos; el geográfico puede tener varios barrios o vías como hijos.
## Teclado y celular

Los campos y botones tienen etiquetas visibles y foco de teclado. Los grupos geográficos usan details/summary nativos. El diagrama permite desplazamiento horizontal para mantener nodos de tamaño legible.

Los controles para cambiar de vista, centrar la raíz, recorrer y abrir el mapa están disponibles mediante teclado. El diseño claro conserva la paleta de BacheScan y adapta los indicadores a dos columnas en pantallas pequeñas.
## Implementación TypeScript

`src/data-structures/BinarySearchTree.ts` contiene nodos, inserción, búsqueda, eliminación, cinco recorridos, rangos y métricas. Las operaciones son iterativas para admitir árboles profundos. La construcción inicial ordena claves y conecta sus puntos medios.

La instantánea se construye equilibrada, pero la clase es un BST y no un AVL con rotaciones automáticas. Buscar, insertar o eliminar depende de la altura; reconstruir la instantánea conserva todos los valores.
## Consultas y errores

`useReportTree` cancela peticiones obsoletas al cambiar filtros, recorrido o cerrar la pantalla. Cada consulta tiene un límite de espera de 30 segundos. Una respuesta antigua no sustituye la consulta actual.

La interfaz muestra el indicador de carga del proyecto. En caso de fallo, ofrece un mensaje general y «Reintentar árboles». La validación del contrato comprueba límites de muestra, identificadores, padres, niveles y recorridos antes de dibujar.
