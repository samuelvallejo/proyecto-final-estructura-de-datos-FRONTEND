# BacheScan AI — frontend

Aplicación TypeScript/React en modo claro, con acceso obligatorio antes de mostrar las funcionalidades. Conserva los aportes e historial anteriores y añade autenticación, página de inicio, recorridos privados de A a B, múltiples detecciones YOLO y estados de carga con el logo.

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
