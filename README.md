# QR Voxel Studio

Versión **v0.17** de QR Voxel Studio: creador de jardines QR voxel, compartibles, exportables y preparado para GitHub Pages.

## Estado actual

La pantalla principal dejó de ser una demo 2D. Ahora usa una escena 3D real basada en **Three.js + React Three Fiber**.

### Experiencia principal `/`

- bosque 3D generado desde los módulos activos del QR;
- árboles low-poly/voxel estilizados con tronco, varias masas de copa y variación individual;
- brote progresivo al cargar o reemplazar un QR;
- movimiento suave de copas y microanimación ambiental;
- partículas estacionales;
- plataforma 3D flotante con iluminación y sombras;
- transición de cámara isométrica a vista cenital;
- durante la transición, los árboles se compactan y sus copas convergen a módulos cuadrados;
- al llegar a la vista superior se reconstruye la geometría exacta del QR con zona silenciosa de 4 módulos;
- cuatro estaciones: Primavera, Verano, Otoño e Invierno;
- transición suave de colores al cambiar de estación;
- botón **Reproducir** para mostrar automáticamente Bosque → QR → Bosque;
- arrastrar y soltar un QR directamente sobre la escena;
- carga/reemplazo del QR desde el panel de Archivo, sin duplicar controles sobre la escena;
- interfaz principal visual y minimalista, separada de los datos técnicos;
- bienvenida de pantalla completa con un único árbol antes de cargar un QR;
- vista **Desde arriba** bloqueada hasta que exista un QR real;
- fondos y acentos estacionales con transición visual;
- modo adaptativo de rendimiento para móviles y equipos limitados;
- actualización del bosque y partículas limitada por frecuencia para reducir caídas de FPS;
- flores de primavera del suelo renderizadas con instancing para conservar detalle con muchas menos llamadas de dibujo;
- pétalos de primavera restaurados al comportamiento previo (caída individual), separándolos de las flores del suelo;
- panel Compartir minimizado colocado en el flujo de la página en lugar de flotar sobre la escena;
- favicon/ancla preparado mediante `app/icon.png` y `app/apple-icon.png` para el despliegue en GitHub Pages.

### Laboratorio `/lab`

La interfaz anterior se conserva como panel de diagnóstico:

- decoder;
- nombre del archivo;
- contenido decodificado;
- matriz reconstruida;
- estado y versión del QRSlot;
- perfil visual persistente.

## Motor

Flujo:

`Archivo → Normalización → Decoder → Reconstrucción → QRSlot → Renderer 3D`

El `QRSlot` sigue siendo reemplazable. Al adjuntar un nuevo archivo cambian el archivo, el contenido, la matriz y la versión, pero el perfil visual se conserva.

## Renderer 3D

Dependencias principales:

- `three`
- `@react-three/fiber`

El bosque usa instancing para no crear cientos de componentes React independientes. Troncos, copas y módulos QR comparten geometrías, lo que permite mantener una escena fluida incluso con matrices QR de varios cientos de módulos activos.

La vista cenital mantiene:

- cuadrícula exacta;
- módulos de alto contraste;
- fondo claro;
- quiet zone de 4 módulos;
- desaparición de partículas y elementos decorativos antes de completar el QR.

## Formatos

Procesados actualmente en navegador:

- PNG
- JPG / JPEG
- WebP
- SVG
- BMP

EPS está contemplado en la arquitectura, pero todavía necesita una etapa de conversión previa a SVG/PNG.

## Ejecutar

```bash
npm install
npm run dev
```

Abrir:

- Producto: `http://localhost:3000`
- Compartir: se genera desde la interfaz principal y abre `http://localhost:3000/share?garden=...`

En Windows también puedes ejecutar `start-dev.bat`.

## Validación local

```bash
npm run lint
npm run build
```

## Objetivo visual

La experiencia busca sentirse como un pequeño diorama mágico: amigable, animado, visual y limpio. El QR no se presenta como una simple imagen técnica; aparece como la vista cenital de una escena viva y vuelve a una matriz precisa cuando la cámara termina su recorrido.


## v0.14 — Crear y Compartir

- La pantalla principal ahora prioriza el Jardín Voxel y elimina el bloque introductorio grande.
- Se añadió una bienvenida compacta superpuesta que desaparece automáticamente.
- El encabezado usa una insignia de ancla temática para QR Voxel Studio.
- Debajo del jardín se muestran Archivo, Matriz y Contenido decodificado.
- El antiguo Lab deja de ser parte de la experiencia principal.
- Nuevo flujo de compartir: el creador genera un enlace que serializa la matriz QR y reconstruye el jardín sin volver a subir la imagen.
- `/share?garden=...` es una vista de solo lectura con Primavera, Verano, Otoño, Invierno y Reproducir.
- Reproducir recorre las cuatro estaciones y termina mostrando la transición cenital del QR antes de regresar al bosque.

### Compartir

En desarrollo local los enlaces usan `localhost`, por lo que solo funcionan en el mismo equipo. Una vez desplegado el sitio, el mismo mecanismo crea enlaces públicos que cualquier persona puede abrir.


## v0.16 — Exportación real + GitHub Pages + mobile

### Exportaciones desde el navegador

- **Imagen PNG:** captura el estado actual del jardín 3D.
- **Video:** graba una secuencia real del canvas con Primavera → Verano → Otoño → Invierno → vista QR → regreso al bosque. Se guarda como MP4 cuando el navegador lo permite y como WebM en los demás casos.
- **GIF:** genera un GIF animado íntegramente en el navegador usando `gifenc`; en teléfonos reduce resolución y FPS para evitar bloquear el dispositivo.
- **Insertar en sitio web:** copia un `iframe` de la vista compartida.
- **Enlace interactivo:** mantiene las estaciones y las animaciones sin necesidad de volver a subir la imagen original.

La exportación funciona completamente del lado del cliente; no necesita servidor ni API para crear los archivos.

### Primavera mejorada

- flores de cinco pétalos reconocibles en el aire;
- centros amarillos independientes;
- caída más lenta, flotante y con trayectoria ondulada;
- pétalos sueltos con mayor movimiento lateral;
- flores de suelo con pétalos redondeados en vez de bloques planos;
- los elementos ambientales desaparecen antes de completar la vista cenital para conservar el QR limpio.

### Preparado para GitHub Pages

`next.config.ts` utiliza `output: "export"`, `trailingSlash: true` y el `basePath` `/QRVoxelStudio` cuando compila dentro de GitHub Actions. Next.js genera el sitio estático en `out/`.

El repositorio incluye:

```text
.github/workflows/deploy-pages.yml
```

Para publicar:

1. Sube el proyecto al repositorio **QRVoxelStudio**.
2. En GitHub abre **Settings → Pages**.
3. En **Build and deployment → Source**, selecciona **GitHub Actions**.
4. Haz push a `main` o `master`.
5. El workflow compilará y publicará `out/`.

La URL objetivo queda preparada para:

```text
https://luics415.github.io/QRVoxelStudio/
```

### Diseño responsivo

En pantallas de teléfono:

- el panel Compartir inicia contraído como burbuja flotante;
- al abrirlo se convierte en un panel modal desplazable;
- las estaciones se desplazan horizontalmente;
- todos los controles táctiles mantienen un área cómoda;
- Archivo, Matriz y Contenido se apilan verticalmente;
- la escena ocupa la mayor parte del viewport;
- el render 3D limita el DPR máximo para reducir carga de GPU;
- GIF reduce tamaño y frecuencia de cuadros automáticamente.

## v0.18 — Branding aprobado, video de vista previa y modelo de almacenamiento

### Branding

Los recursos aprobados quedan dentro de `public/brand/`:

- `qr-voxel-studio-icon.png`: icono circular de ancla.
- `luics415-signature.png`: firma/banner visual Luics415 con temática QR Voxel Studio.
- `qr-voxel-studio-social.png`: versión 1200 × 630 preparada para Open Graph / WhatsApp y otras vistas sociales.

El icono también se genera como `src/app/icon.png` y `src/app/apple-icon.png`, y `public/anchor-studio.png` usa la misma versión centrada para el encabezado y la bienvenida.

### Vista previa de video en Compartir

La tarjeta de video de **Compartir tu jardín** ya no es decorativa. Al pulsarla después de cargar un QR:

1. reproduce una secuencia corta del jardín;
2. captura el canvas mediante `MediaRecorder`;
3. crea el video en memoria;
4. lo inserta dentro del propio panel como reproductor con controles, autoplay, loop y `playsInline`;
5. permite regenerarlo cuando cambie el QR.

La creación es bajo demanda para no sacrificar el rendimiento normal del jardín, especialmente en teléfonos.

### Dónde se guardan los QR

La versión actual no utiliza base de datos ni sube el QR a GitHub. El archivo que adjunta el usuario se procesa en su propio navegador. El enlace compartido contiene una representación compacta de la matriz QR, el contenido decodificado, el nombre y la estación; `/share/` reconstruye el jardín a partir de esos datos.

A partir de v0.18 la matriz se empaqueta en bits antes de serializarse, reduciendo mucho el tamaño del enlace y manteniendo compatibilidad con enlaces de la versión anterior.

Por esta arquitectura no existe una acumulación central de 1000 QR que haya que limpiar. Si en el futuro se añade una **Galería/Historial**, la recomendación para GitHub Pages es guardar solo un historial local en IndexedDB con `expiresAt` de 7 días y purgarlo al abrir la aplicación. Un almacenamiento central con expiración semanal solo sería necesario para URLs cortas, historial entre dispositivos o una galería pública; eso requeriría un servicio externo como Supabase/Firebase/Cloudflare, porque GitHub Pages es estático.
