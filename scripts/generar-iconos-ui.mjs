/**
 * Genera los íconos SVG de los botones de la interfaz en public/assets/ui/.
 * Uso: node scripts/generar-iconos-ui.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const carpeta = join(dirname(fileURLToPath(import.meta.url)), '../public/assets/ui');
mkdirSync(carpeta, { recursive: true });

const trazo = 'fill="none" stroke="#fff6e5" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"';
const relleno = 'fill="#fff6e5"';

const ICONOS = {
  reiniciar: `<path d="M50 32 A18 18 0 1 1 44.7 19.3" ${trazo}/><path d="M46 8 L46 21 L33 21" ${trazo}/>`,
  deshacer: `<path d="M18 26 H40 A14 14 0 0 1 40 54 H26" ${trazo}/><path d="M28 14 L16 26 L28 38" ${trazo}/>`,
  girar: `<path d="M22 50 V14 M12 24 L22 14 L32 24" ${trazo}/><path d="M42 14 V50 M32 40 L42 50 L52 40" ${trazo}/>`,
  'sonido-on': `<path d="M10 25 H20 L33 13 V51 L20 39 H10 Z" ${relleno} stroke="#fff6e5" stroke-width="4" stroke-linejoin="round"/><path d="M41 23 A12 12 0 0 1 41 41 M47 15 A22 22 0 0 1 47 49" ${trazo}/>`,
  'sonido-off': `<path d="M10 25 H20 L33 13 V51 L20 39 H10 Z" ${relleno} stroke="#fff6e5" stroke-width="4" stroke-linejoin="round"/><path d="M41 24 L55 40 M55 24 L41 40" ${trazo}/>`,
  menu: `<path d="M10 31 L32 11 L54 31" ${trazo}/><path d="M17 27 V52 H27 V39 H37 V52 H47 V27" ${trazo}/>`,
  jugar: `<path d="M20 12 L52 32 L20 52 Z" ${relleno} stroke="#fff6e5" stroke-width="6" stroke-linejoin="round"/>`,
  robot: `<rect x="12" y="20" width="40" height="32" rx="10" ${trazo}/><circle cx="25" cy="35" r="4" ${relleno}/><circle cx="39" cy="35" r="4" ${relleno}/><path d="M32 20 V10 M26 45 H38" ${trazo}/>`,
  dos: `<circle cx="22" cy="22" r="8" ${trazo}/><circle cx="44" cy="22" r="8" ${trazo}/><path d="M8 52 A14 14 0 0 1 36 52 M30 52 A14 14 0 0 1 58 52" ${trazo}/>`,
  libro: `<path d="M32 18 C24 12 14 12 8 14 V52 C14 50 24 50 32 56 C40 50 50 50 56 52 V14 C50 12 40 12 32 18 Z M32 18 V56" ${trazo}/>`,
  continuar: `<path d="M14 12 L38 32 L14 52 Z M36 12 L60 32 L36 52 Z" ${relleno}/>`,
  izquierda: `<path d="M40 12 L20 32 L40 52" ${trazo}/>`,
  derecha: `<path d="M24 12 L44 32 L24 52" ${trazo}/>`,
};

for (const [nombre, contenido] of Object.entries(ICONOS)) {
  writeFileSync(
    join(carpeta, `${nombre}.svg`),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">${contenido}</svg>\n`,
  );
}
console.log(`Íconos de interfaz generados: ${Object.keys(ICONOS).length}`);
