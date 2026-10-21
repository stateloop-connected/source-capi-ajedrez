Vas a construir de principio a fin un juego llamado "Capi-Ajedrez" en esta carpeta (está vacía). Trabaja de forma autónoma: NO me hagas preguntas, toma decisiones razonables y anótalas en el README. Es una entrega universitaria para HOY, así que prioriza que todo funcione y se vea pulido. Toda la interfaz, textos, comentarios y documentación van en ESPAÑOL.

Lo primero que debes hacer es guardar este prompt completo como CLAUDE.md en la raíz, para que no se pierda si el contexto se compacta. Después inicializa git y haz un commit al terminar cada fase.

# 1. Tecnología (no cambiar)
- Vite + TypeScript (estricto) + Phaser 3 (última versión 3.x estable).
- Vitest para tests.
- Sin otras dependencias de runtime. Nada de React ni frameworks de UI.
- La IA corre en un Web Worker.
- PWA manual: manifest.webmanifest + service worker simple para que se pueda instalar en el teléfono y funcione offline. Genera los íconos (192 y 512 px) a partir del SVG del Rey Capibara.

# 2. Concepto
Ajedrez 2D donde todas las piezas son capibaras. Hay dos bandos:
- Claras: pelaje beige, equivalen a las blancas y empiezan.
- Oscuras: pelaje marrón, equivalen a las negras.

Cada pieza es una cabeza redondeada de capibara con orejas, ojos, hocico grande con fosas nasales y una sonrisa pequeña. El tipo de pieza se distingue por el accesorio:
- Peón = "Capibebé": hojita verde en la cabeza.
- Torre = "Capi-Torre": sombrero de torre almenada gris.
- Caballo = "Capi-Caballero": casco gris con plumero rojo.
- Alfil = "Capi-Obispo": mitra morada con cruz blanca.
- Reina = "Reina Capibara": corona dorada con gemas rojas.
- Rey = "Rey Capibara": corona dorada más grande, con cruz y gema azul.

Dibuja las 12 piezas como archivos SVG reales y cuidados en public/assets/pieces/ (por ejemplo claro-rey.svg) y cárgalas como texturas. También haz un logo SVG de "Capi-Ajedrez" con una capibara.

# 3. Arquitectura
src/
  core/      lógica pura del ajedrez, SIN Phaser (tablero, movimientos, reglas, FEN, SAN)
  ai/        evaluación, búsqueda y worker
  scenes/    BootScene, MenuScene, InstructionsScene, GameScene, GameOverScene (o un modal)
  ui/        botones, paneles y componentes reutilizables hechos con Phaser
  audio/     sonidos sintetizados con WebAudio (sin archivos de audio)
  storage/   guardar y cargar partida y preferencias en localStorage
tests/       tests de core y de ai

Usa Phaser con Scale.FIT y autoCenter. Debe verse bien en móvil vertical, móvil horizontal y escritorio. El control es táctil y con mouse.

# 4. Fases (en este orden, sin saltarte ninguna)

## FASE 1 — Motor de reglas (src/core) + tests
- Representación del tablero, parser y generador de FEN.
- Movimientos legales de todas las piezas, sin dejar al propio rey en jaque.
- Enroque corto y largo con todas sus condiciones: rey y torre sin mover, casillas intermedias vacías, rey sin estar en jaque y sin pasar ni caer en casillas atacadas.
- Captura al paso.
- Coronación eligiendo entre reina, torre, alfil o caballo.
- Detección de jaque, jaque mate y rey ahogado.
- Tablas por material insuficiente, triple repetición y regla de los 50 movimientos.
- Notación algebraica (SAN) para el historial.
- Deshacer jugadas (pila de estados o unmake).
- Tests de perft con Vitest. DEBEN pasar:
  - Posición inicial: d1=20, d2=400, d3=8902, d4=197281.
  - "Kiwipete" r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1: d1=48, d2=2039, d3=97862.
  - 8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1: d1=14, d2=191, d3=2812, d4=43238.
- Tests puntuales de mate del pastor, ahogado, enroque bloqueado por ataque, captura al paso y SAN con desambiguación.
No avances a la fase 2 hasta que `npm test` pase completo.

## FASE 2 — IA (src/ai, en un Web Worker)
- Evaluación por material más tablas de posición (piece-square tables).
- Búsqueda minimax con poda alfa-beta, ordenamiento de movimientos (capturas MVV-LVA primero) y búsqueda de quietud en capturas.
- Profundización iterativa con límite de tiempo.
- Dificultades:
  - Fácil: mayormente aleatoria, aunque captura si regalan una pieza.
  - Medio: profundidad 2.
  - Difícil: profundización iterativa hasta unos 1,5 segundos. Debe encontrar mates cortos.
- Tests: la IA difícil encuentra un mate en 1 y en 2, y nunca devuelve un movimiento ilegal.
- Añade un pequeño retraso visual antes de que la IA mueva para que se sienta natural.

## FASE 3 — Escenas y jugabilidad completa
BootScene:
- Pantalla de carga con barra de progreso y logo.
- Genera o carga las texturas.

MenuScene:
- Título "Capi-Ajedrez" con estilo llamativo.
- Fila de capibaras decorativas flotando con tweens suaves.
- Botones grandes y redondeados con sombra y animación al pasar el cursor o tocar:
  - "Jugar 2 jugadores" (mismo dispositivo).
  - "Jugar contra la Capi-IA" (el usuario lleva las claras).
  - Selector de dificultad: Fácil, Medio, Difícil.
  - Selector de reloj: Sin reloj, 5 min, 10 min.
  - "Continuar partida", solo si hay una guardada.
  - "Instrucciones".

InstructionsScene:
- Manual con pestañas o páginas (no scroll largo):
  - Objetivo.
  - Cómo jugar: las claras empiezan, tocar una pieza muestra sus movimientos, tocar una casilla marcada mueve, la casilla roja indica jaque.
  - Piezas: cada una con su dibujo, nombre temático y cómo se mueve.
  - Reglas especiales: enroque, captura al paso, coronación, ahogado y las demás tablas.
  - Modos de juego y controles: deshacer, sonido, girar tablero, reloj.
- Botón "Volver al menú".

GameScene:
- Tablero 8×8 de madera con borde marrón grueso, casillas crema y verde, y coordenadas a–h y 1–8.
- Indicador de turno con aviso visible de "¡Jaque!".
- Piezas capturadas de cada bando arriba y abajo del tablero, con la ventaja de material (+N).
- Resaltados:
  - Pieza seleccionada.
  - Última jugada (origen y destino).
  - Rey en jaque en rojo.
  - Puntos verdes para movimientos posibles y anillo rojo para capturas.
- Selección por toque o clic, y también arrastrar y soltar.
- Panel de historial de jugadas en SAN, por número de jugada, con scroll.
- Relojes por bando si se eligió reloj. Quien se queda sin tiempo pierde.
- Botones Reiniciar, Deshacer, Girar tablero, Sonido (on/off) y Menú.
- En modo IA, Deshacer revierte la jugada del usuario y la respuesta de la IA. Mientras la IA piensa, muestra un indicador ("La Capi-IA está pensando…") y bloquea el input.
- Al coronar, aparece un modal con las 4 capibaras para elegir.
- La partida se guarda automáticamente en localStorage después de cada jugada.

Fin de partida:
- Modal con el resultado (mate, ahogado, tablas con su motivo, o tiempo agotado).
- Botones "Nueva partida" y "Menú principal".
- Celebración con partículas cuando hay jaque mate.

## FASE 4 — Pulido visual y sonido
- Paleta cálida y natural: verdes, beige y marrones. Fondo con degradado verde-azulado suave. Tipografía Fredoka (Google Fonts) con respaldo a sans-serif redondeada; asegúrate de que la fuente cargue antes de crear textos.
- Tweens:
  - Las piezas se deslizan al moverse.
  - Pequeño rebote al seleccionar.
  - La pieza capturada se encoge y desaparece con partículas.
  - Sacudida suave de cámara en jaque.
  - Transiciones con fundido entre escenas.
- Sonidos sintetizados para mover, capturar, jaque, enroque, coronar, victoria, derrota y clic de botón. El estado de sonido se guarda en localStorage.
- Revisa la legibilidad, los tamaños táctiles (mínimo 44 px) y que nada se corte en pantallas pequeñas.

## FASE 5 — PWA, documentación y deploy
- Manifest, service worker, íconos y meta tags para móvil. Que se pueda instalar desde Chrome en Android y funcione offline.
- README.md en español con:
  - Descripción del juego.
  - Tecnologías usadas.
  - Arquitectura con un diagrama mermaid del flujo de escenas y de los módulos.
  - Cómo ejecutarlo (npm install, npm run dev, npm test, npm run build).
  - Cómo se verificaron las reglas (perft).
  - Cómo funciona la IA.
  - Decisiones tomadas.
- Deploy: si el CLI de Vercel ya está autenticado, haz `npx vercel --prod` y dame la URL. Si pide login, NO lo intentes; deja el comando exacto en el README.

# 5. Verificación obligatoria al final de CADA fase
- `npx tsc --noEmit` sin errores.
- `npm test` en verde.
- `npm run build` exitoso.
- Desde la fase 3: levanta `npm run dev`. Si tienes la extensión de Chrome disponible, abre la página, juega varias jugadas (incluyendo un enroque, una captura y una partida contra la IA en cada dificultad), revisa la consola y corrige cualquier error. Si no tienes navegador, revisa el código con especial cuidado en el flujo de input y de escenas.
- Commit con un mensaje descriptivo.

# 6. Reglas de trabajo
- Si algo se atasca después de 3 intentos, simplifícalo, anótalo en el README y sigue adelante. Es mejor un juego completo con una mejora menos que uno a medias.
- La prioridad, si el tiempo apremia, es: reglas correctas > jugable de punta a punta > IA > pulido visual > PWA/deploy.
- No dejes TODOs ni código muerto. Nombra variables y funciones en español o inglés, pero de forma consistente.
- Al terminar, dame un resumen con:
  - Qué se hizo.
  - Resultados de los tests.
  - URL de despliegue o cómo correrlo.
  - Cualquier cosa que haya quedado pendiente.

Empieza ya por guardar CLAUDE.md e inicializar el proyecto.
