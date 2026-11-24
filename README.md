# BacheScan AI — frontend

Aplicación TypeScript/React en modo claro, con acceso obligatorio antes de mostrar las funcionalidades. Conserva los aportes e historial anteriores y añade autenticación, página de inicio, recorridos privados de A a B, múltiples detecciones YOLO y estados de carga con el logo.

## Detección en fotografías

Desde Inicio elige **Analizar una fotografía**, o desde Escanear cambia de Cámara en vivo a Analizar una fotografía. Puedes seleccionar o arrastrar JPEG, PNG o WebP estática de hasta 4 MB, lados de 32–8192 píxeles y hasta 16 megapíxeles. Se muestra una vista previa y el botón **Detectar baches**; durante el análisis aparece el logo de carga.

El componente `src/components/PhotoDetector.tsx` llama a `POST /api/detect/potholes` con `multipart/form-data` (campo `image`) y la cookie de sesión. Las coordenadas en píxeles se convierten a porcentajes del tamaño original orientado, manteniendo los rectángulos alineados al redimensionar la imagen. Se muestran confianza, conteo y ausencia de detecciones. Los errores usan mensajes fijos y no exponen datos internos.

La fotografía se analiza en el servidor con `best.pt` (PyTorch y Ultralytics no se ejecutan en el navegador). La foto no inventa coordenadas GPS ni crea reportes en el mapa. La cámara y los recorridos usan una exportación ONNX del mismo modelo en el teléfono (ver «YOLO en el teléfono») y el servidor confirma cada hallazgo antes de guardarlo.

## Novedades: administración, perfil y modo conducción

- **Acceso con cuentas demo**: debajo del formulario hay tres botones (Administrador, Operario, Conductor) y un desplegable con las credenciales para copiar y pegar. Solo aparecen si el backend tiene `DEMO_ACCOUNTS=true`.
- **Icono de perfil automático**: el avatar de la cabecera muestra las iniciales con un color estable por persona y abre un menú con Mi perfil, Panel de datos, Administración (solo administradores) y Cerrar sesión.
- **Mi perfil**: estadísticas de la cuenta, historial **por sesión** (duración, escaneos, baches y huella de eventos), historial de baches detectados y de baches por los que pasaste, y recorridos con su duración.
- **Modo conducción (moto o carro)**: desde Escanear. Escaneo automático; el símbolo de bache aparece sobre cada hueco detectado en el video, con vibración y sonido. Avisa de baches conocidos a menos de 80 m, registra los pasos y, al terminar, muestra cuánto duró la sesión, los baches del trayecto y la distancia. Mantiene la pantalla encendida cuando el navegador lo permite.
- **Mapa general**: en Mapa → Mapa general se ven todos los huecos registrados, incluidos los reparados, con cuántas personas han pasado por cada uno.
- **Panel de datos**: cada bloque (totales, actividad diaria, riesgo, baches más transitados y velocidad del escaneo) se carga por separado; una línea de carga muestra cuándo llegó cada uno y cuánto tardó en red y en servidor.
- **Administración**: resumen, usuarios (rol y acceso), baches (cambio de estado), sesiones, recorridos y huella de auditoría.
- **Escaneo más rápido**: fotogramas de 512 px reutilizando el lienzo, el siguiente análisis se pide en cuanto el servidor lo permite (descontando la latencia) y se omiten fotogramas casi idénticos cuando el vehículo está detenido.
- **Errores del servidor**: el cliente HTTP ahora muestra el mensaje real del backend (antes leía la respuesta dos veces y siempre mostraba un texto genérico).

## YOLO en el teléfono (escaneo rápido en vehículo)

El escaneo en vivo y el modo conducción ejecutan YOLO **en el propio dispositivo** con ONNX Runtime Web, dentro de un Web Worker, usando la GPU del teléfono (WebGPU) o su CPU (WebAssembly) si no hay GPU disponible.

- Cada fotograma se analiza en cuanto termina el anterior, sin esperar al servidor. Con el video de prueba: 16–25 FPS y 22–27 ms por fotograma en un portátil; en un teléfono depende de su GPU.
- Los recuadros siguen a cada bache entre fotogramas («Bache 0.81») y el símbolo de bache aparece encima. Un bache cuenta cuando se ve en dos fotogramas seguidos, lo que evita falsos positivos de un solo cuadro.
- Solo cuando aparece un bache nuevo se envía ese fotograma al servidor, que lo confirma con el mismo modelo y lo guarda con el GPS.
- Si el navegador no puede cargar el modelo, se usa automáticamente el escaneo por servidor anterior.
- **Probar la detección con un video** (en Escanear) reproduce un video elegido por el usuario con la misma detección, sin GPS ni reportes.

El modelo es `public/models/pothole-live.onnx` (bachescan-v2 exportado a 416 px) y `public/models/pothole-live.json` indica su tamaño de entrada, el preprocesado («stretch»: imagen estirada al cuadrado, como en el entrenamiento) y el umbral. El entrenamiento y la atribución de los datasets están en `backend/training/README.md`. Pruebas: `tests/yolo.test.ts` (preprocesado, decodificación de la salida, supresión de no máximos y seguimiento).

## Desarrollo

Ejecuta `npm ci` y `npm run dev`. Vite reenvía `/api` al backend Python de `http://127.0.0.1:3001`. Configura allí PostgreSQL, `DATA_ENCRYPTION_KEY` privada y `SECURE_COOKIES=false` exclusivamente en desarrollo. En producción, Vercel reenvía `/api` a Azure Container Apps mediante `vercel.json`, manteniendo las cookies en el mismo origen. Ya no se utiliza `VITE_API_URL`.

`npm run build` comprueba TypeScript y construye la aplicación. `npm run lint` revisa React y accesibilidad. El service worker solo guarda recursos públicos de la aplicación; no guarda las respuestas `/api` ni credenciales.

## Formularios y acceso

- La pantalla de acceso es la primera vista de un visitante sin sesión. La API verifica la sesión antes de montar la aplicación; las funcionalidades también requieren autenticación en el servidor.
- Nombre: 2–80 caracteres. Correo válido: máximo 180. Contraseña: 12–128 caracteres, mayúscula A-Z, minúscula a-z, número y símbolo. Confirmación idéntica en registro.
- HTML y los campos controlados impiden superar los máximos. Cada formulario explica sus requisitos debajo, con etiquetas visibles. Ambas contraseñas tienen un botón para mostrar u ocultar lo escrito.
- Autenticación con cookie HttpOnly. No se guardan tokens en localStorage, no se registran datos de formularios en consola y no se renderizan respuestas internas de error. Los mensajes de registro/login son genéricos.
- El propietario del navegador siempre puede inspeccionar sus propias entradas y los datos necesarios para mostrar mapas. No es posible ocultarlos absolutamente de DevTools. Los hashes, claves y datos internos de cuenta nunca se envían al frontend; HTTPS protege el transporte.

## Uso

1. Registra una cuenta y luego inicia sesión.
2. Desde Inicio elige Escanear, Mapa, Reportes o Mis recorridos.
3. Para un recorrido, permite GPS/cámara, completa el nombre y lugares A/B y pulsa «Iniciar recorrido y escaneo». El mapa se actualiza durante el escaneo y los hallazgos se guardan con GPS.
4. Puedes pausar y continuar la cámara. «Llegué a B: finalizar» guarda el final. Mis recorridos permite consultar después la trayectoria y los reportes asociados.

Los recuadros muestran múltiples detecciones YOLO, su confianza y el nivel de riesgo visual. La posición corresponde al GPS del teléfono con su precisión; no es una medición exacta individual del bache. El video se analiza por fotogramas muestreados, no cada fotograma. El sistema requiere internet y debe permanecer abierto. La operación real en moto necesita pruebas en campo; configura y fija el teléfono antes de conducir, sin manipularlo en movimiento.

## Verificacion

El flujo de control de calidad del frontend se ejecuta con `npm run lint`, `npm test` y `npm run build`, y se integra en GitHub Actions sobre `main`.

## Integracion con el backend

El frontend consume la API en el prefijo `/api` del backend desplegado. Las peticiones incluyen credenciales (`credentials: 'include'`) y gestionan errores via el servicio `ApiError` del cliente HTTP.

## Errores, pruebas y control de calidad

Si un componente falla al renderizar, el `src/components/ErrorBoundary.tsx` muestra una salida segura con opción de reintento en lugar de dejar la pantalla en blanco.

`npm run lint` ejecuta oxlint sobre React y accesibilidad; `npm test` ejecuta las pruebas nativas de Node sobre `tests/*.test.ts`; `npm run build` verifica TypeScript y genera el bundle. El workflow de GitHub Actions (`.github/workflows/ci.yml`) ejecuta lint, pruebas y build en cada push y pull request sobre `main`.

Las pruebas cubren las estructuras de datos del proyecto (árbol binario de búsqueda, pila de navegación), las herramientas de reportes (filtros normalizados, exportación CSV con escape de fórmulas) y las funciones puras de cercanía y GPS de la comunidad.

## Secciones

Inicio orienta al usuario con acciones y pasos. Escanear muestra cámara, detecciones, permisos y recorrido activo. Mapa explica marcadores y filtros. Reportes permite buscar (máximo 120 caracteres), filtrar, guardar favoritos y exportar los resultados cargados. Mis recorridos muestra únicamente caminos de la cuenta actual. Estructuras explica el uso de arrays, listas enlazadas, colas y pilas.


## Avisos comunitarios y alertas de cercanía

Desde **Mapa → Reportar un hueco aquí**, una persona puede publicar un aviso con su GPS actual, descripción y riesgo indicado. Otras cuentas lo ven con un símbolo de hueco. **Activar alertas** muestra «Este hueco es peligroso, cuidado» al estar a menos de 200 m. Los avisos se actualizan cada 15 segundos con la aplicación abierta y GPS permitido. La distancia y el riesgo son orientativos.


## Árboles de reportes

BacheScan adapta los ejemplos de árbol binario del material docente Arboles.pdf. El BST permite ordenar, consultar intervalos y recorrer reportes por riesgo; la jerarquía de ubicaciones agrupa ciudad, barrio, vía y bache. La pantalla **Reportes → Abrir explorador de árboles** y la sección **Estructuras** muestran nodos, recorridos y métricas con datos guardados.

Consulta [la guía de árboles](docs/ARBOLES.md) para el uso, la correspondencia con el PDF, los archivos, las restricciones y las pruebas. Las respuestas requieren sesión y representan una muestra explícita de hasta 200 reportes activos. PostgreSQL conserva la persistencia y no se requiere una migración adicional.

## Grafos de cercanía

En **Reportes → Abrir explorador de grafos**, o **Estructuras**, consulta conexiones entre baches, grupos conectados y vecinos. Selecciona origen/destino y BFS o DFS; Dijkstra destaca el camino de menor distancia acumulada. Puedes abrir el diagrama y la vista geográfica de la red. La muestra incluye hasta 80 reportes activos de mayor riesgo y admite conexiones de 50 a 2000 metros. Las líneas representan cercanía, no calles o rutas para conducir.

Consulta [GRAFOS.md](docs/GRAFOS.md) para los conceptos investigados, referencias académicas, archivos, pasos de uso, restricciones y pruebas. Requiere sesión y el backend actualizado; no necesita dependencias nuevas.

## Búsqueda en toda la plataforma

En **Reportes**, desde dos letras la búsqueda se hace en el servidor (`GET /api/reports/search`), que usa un índice invertido y un árbol de prefijos: encuentra baches que no estén cargados en el navegador y completa la última palabra (`panam` → Avenida Panamericana). Las sugerencias de calles, barrios y ciudades salen de `GET /api/reports/suggest`. Los filtros de riesgo, daño y favoritos, el orden y el CSV se aplican sobre esos resultados. Si el servidor no responde, se filtran los reportes cargados.

## Modo de demostración seguro

Cuando `GET /api/me` indica `readOnly` (cuentas demo con `DEMO_READ_ONLY=true` en el backend), la administración y el mantenimiento muestran un aviso y desactivan los cambios de rol, acceso, estado y fusión. El backend los rechaza igualmente con 403 y enmascara los correos y lugares de las cuentas reales.

## Mantenimiento vial (rol Operario)

Las cuentas con rol **Operario** o **Administrador** ven **Mantenimiento vial** en el inicio y en el menú del avatar:

- **Cola de trabajo**: baches abiertos ordenados por el montículo binario indexado del backend (`GET /api/operator/queue`), con el desglose de la prioridad y los cambios de estado permitidos (`POST /api/operator/reports/{id}/transition`) y su historial.
- **Plan de jornada**: los baches más urgentes ordenados con vecino más cercano + 2-opt (`GET /api/operator/plan`). El mapa dibuja el orden de visita y la pantalla compara la distancia con el orden de prioridad. Son distancias en línea recta, no rutas por calles.
- **Duplicados**: grupos de reportes tan cercanos que probablemente son el mismo hueco (`GET /api/operator/duplicates`), con las comparaciones que evita la rejilla espacial frente a la fuerza bruta. La persona desmarca los que sean huecos distintos y fusiona el resto (`POST /api/operator/duplicates/merge`).

### Estructuras de datos del frontend (TypeScript)

| Archivo | Estructura | Uso real |
|---|---|---|
| `src/data-structures/RouteList.ts` | Lista doblemente enlazada + tabla hash por id | Paradas pendientes del plan: «Visitado» y «Dejar para el final» en O(1), con la distancia restante actualizada en O(1) |
| `src/data-structures/LruCache.ts` | Caché LRU: tabla hash + lista doblemente enlazada | Reutiliza durante un minuto las últimas 30 respuestas de la búsqueda al escribir y borrar letras |
| `src/data-structures/Stack.ts` | Pila | Historial del botón «Volver» (ya existía) |

Pruebas: `tests/routeList.test.ts` y `tests/lruCache.test.ts`, con secuencias aleatorias comparadas contra un modelo de referencia.

Archivos: `src/components/operator/`, `src/services/operator.ts`, `src/types/operator.ts`, `src/operator.css` y `tests/operator.test.ts`. El Conductor no ve la sección y el backend le responde 403.
