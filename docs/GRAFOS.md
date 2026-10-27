# Explorar baches con grafos

Abre **Reportes → Abrir explorador de grafos**, o **Estructuras**, después de iniciar sesión.

1. Selecciona la distancia máxima de cada conexión (50, 100, 250, 500, 1000 o 2000 metros) y pulsa **Actualizar grafo**.
2. Revisa los vértices, aristas, grupos conectados y baches aislados. La consulta carga hasta 80 reportes activos de mayor riesgo de toda la plataforma; avisa si la muestra es parcial.
3. Elige origen/destino y BFS o DFS. Pulsa **Calcular camino y recorrido**. Dijkstra calcula el menor peso acumulado; si pertenecen a grupos distintos se indica que no existe conexión.
4. Avanza los pasos, toca un vértice o usa **Inspeccionar bache** para consultar ubicación, riesgo, grupo y vecinos con sus distancias. Los números son posiciones en la muestra y pueden cambiar al actualizar.
5. **Grafo sobre el mapa** dibuja conexiones sobre los puntos GPS y destaca el camino en verde. **Ver este bache en el mapa** abre el marcador habitual de la aplicación.

## Conceptos investigados

Un grafo representa vértices y aristas. Cada vértice es un reporte; se conectan dos reportes si su distancia geográfica no supera el límite elegido. El peso es esa distancia en metros. Las conexiones pueden recorrerse en ambos sentidos y formar ciclos. Una componente reúne vértices alcanzables entre sí.

- [Open Data Structures: adyacencia](https://opendatastructures.org/versions/edition-0.1e/ods-java/12_2_AdjacencyLists_Graph_a.html): cada punto conserva sus vecinos.
- [Open Data Structures: recorridos](https://opendatastructures.org/ods-cpp/12_3_Graph_Traversal.html): BFS usa una cola y DFS usa una pila. Nuestro backend reutiliza las estructuras existentes.
- [Cornell CS 2110: caminos mínimos](https://www.cs.cornell.edu/courses/cs2110/2025fa/lectures/lec23/): Dijkstra necesita pesos no negativos. Aquí son metros.

Fuentes consultadas el 27 de octubre de 2026 y adaptadas al proyecto.

## Archivos y conexión

| Archivo | Función |
| --- | --- |
| `src/types/graphs.ts` | Contrato de nodos, aristas, caminos, recorridos y muestra |
| `src/services/graphs.ts` | Consulta autenticada al endpoint Python `/api/data-structures/graphs/reports` |
| `src/services/graphView.ts` | Validación de límites/referencias/pesos, adyacencia con Map y posiciones del diagrama |
| `src/hooks/useReportGraph.ts` | Cancelación, timeout de 30 s y descarte de respuestas obsoletas |
| `src/components/graphs/` | Apertura diferida, controles, métricas, diagrama accesible, pasos y glosario |
| `src/components/ReportMap.tsx` | Conexiones discontinuas y camino destacado junto a los marcadores |
| `src/graphs.css` | Diseño claro, foco de teclado y desplazamiento para celular |
| `src/App.tsx` | Acceso desde Reportes y Estructuras |
| `tests/graphs.test.ts` | Pruebas de contrato, adyacencia, límites, caminos y posiciones |

El backend construye el grafo desde PostgreSQL, ejecuta BFS/DFS/Dijkstra y devuelve la instantánea. El frontend reconstruye la adyacencia para consultar vecinos y dibuja resultados reales. No requiere dependencias ni variables nuevas.

## Alcance

Las líneas expresan **cercanía geográfica y no representan calles ni rutas para conducir**. No se usan sentidos viales o barreras. El diagrama circular es esquemático; el mapa muestra coordenadas GPS aproximadas. La distancia del camino suma sus aristas y no mide un trayecto por carretera ni garantiza seguridad. El riesgo no se utiliza como peso y una fotografía no aporta la ubicación real del bache.

La consulta se actualiza manualmente. No expone autores ni recorridos privados. Usa opciones cerradas, mensajes de estado e indicador de carga. Cerrar el explorador cancela peticiones obsoletas. YOLO, los árboles y las demás funciones permanecen disponibles.

## Verificación

Ejecuta `npm test`, `npm run build` y `npm run lint`. Las pruebas comprueban adyacencia simétrica sin modificar la respuesta, límites, coordenadas, referencias, métricas y caminos inválidos. En navegador se comprueba sesión → explorador → API → PostgreSQL → diagrama → mapa, incluyendo destinos sin conexión.
