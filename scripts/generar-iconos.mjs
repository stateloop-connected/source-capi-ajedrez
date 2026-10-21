/**
 * Genera los íconos PNG de la PWA a partir del SVG del Rey Capibara.
 * Uso: npm run iconos   (requiere la dependencia de desarrollo @resvg/resvg-js)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const carpeta = join(raiz, 'public/icons');
mkdirSync(carpeta, { recursive: true });

const rey = readFileSync(join(raiz, 'public/assets/pieces/claro-rey.svg'), 'utf8');
// Contenido interior del SVG (sin la etiqueta <svg> exterior), en coordenadas 0..128.
const interior = rey.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

/**
 * @param {number} radio radio de las esquinas del fondo (0 = cuadrado completo, para maskable)
 * @param {number} escala fracción del lado que ocupa el rey
 */
function icono(radio, escala) {
  const lado = 128 * escala;
  const desplazamiento = (128 - lado) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <radialGradient id="fondo" cx="50%" cy="38%" r="70%">
      <stop offset="0%" stop-color="#a6dc8f"/>
      <stop offset="100%" stop-color="#4f9a5a"/>
    </radialGradient>
  </defs>
  <rect width="128" height="128" rx="${radio}" fill="url(#fondo)"/>
  <g transform="translate(${desplazamiento} ${desplazamiento + 2}) scale(${escala})">${interior}</g>
</svg>`;
}

const salidas = [
  ['icono-192.png', 192, icono(28, 0.86)],
  ['icono-512.png', 512, icono(28, 0.86)],
  // Los íconos "maskable" dejan el dibujo dentro de la zona segura (círculo del 80 %).
  ['icono-maskable-192.png', 192, icono(0, 0.66)],
  ['icono-maskable-512.png', 512, icono(0, 0.66)],
  ['apple-touch-icon.png', 180, icono(0, 0.8)],
];

for (const [nombre, tamano, svg] of salidas) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: tamano } }).render().asPng();
  writeFileSync(join(carpeta, nombre), png);
}
writeFileSync(join(carpeta, 'icono.svg'), icono(28, 0.86));
console.log(`Íconos generados en public/icons: ${salidas.length + 1}`);
