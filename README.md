# BacheScan AI — frontend

Aplicación TypeScript/React en modo claro, con acceso obligatorio antes de mostrar las funcionalidades. Conserva los aportes e historial anteriores y añade autenticación, página de inicio, recorridos privados de A a B, múltiples detecciones YOLO y estados de carga con el logo.

## Detección en fotografías

Desde Inicio elige **Analizar una fotografía**, o desde Escanear cambia de Cámara en vivo a Analizar una fotografía. Puedes seleccionar o arrastrar JPEG, PNG o WebP estática de hasta 4 MB, lados de 32–8192 píxeles y hasta 16 megapíxeles. Se muestra una vista previa y el botón **Detectar baches**; durante el análisis aparece el logo de carga.

El componente `src/components/PhotoDetector.tsx` llama a `POST /api/detect/potholes` con `multipart/form-data` (campo `image`) y la cookie de sesión. Las coordenadas en píxeles se convierten a porcentajes del tamaño original orientado, manteniendo los rectángulos alineados al redimensionar la imagen. Se muestran confianza, conteo y ausencia de detecciones. Los errores usan mensajes fijos y no exponen datos internos.

Los pesos `.pt`, PyTorch y Ultralytics permanecen en el backend; no se descargan ni ejecutan en el navegador. La foto no inventa coordenadas GPS ni crea reportes en el mapa. La cámara y los recorridos continúan usando el modelo personalizado `best.pt` del backend. La clase del archivo es `0`, mapeada explícitamente a `pothole` por la configuración del servidor.

## Desarrollo

Ejecuta `npm ci` y `npm run dev`. Vite reenvía `/api` al backend Python de `http://127.0.0.1:3001`. Configura allí PostgreSQL, `DATA_ENCRYPTION_KEY` privada y `SECURE_COOKIES=false` exclusivamente en desarrollo. En producción, Vercel reenvía `/api` a Railway mediante `vercel.json`, manteniendo las cookies en el mismo origen. Ya no se utiliza `VITE_API_URL`.

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
