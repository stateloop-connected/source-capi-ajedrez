/**
 * Genera los SVG de las 12 piezas capibara, el emblema y el logo de Capi-Ajedrez.
 * Uso: node scripts/generar-piezas.mjs
 * Los archivos generados se guardan en public/assets/ y forman parte del repositorio.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const carpetaPiezas = join(raiz, 'public/assets/pieces');
const carpetaAssets = join(raiz, 'public/assets');
mkdirSync(carpetaPiezas, { recursive: true });

const PALETAS = {
  claro: {
    pelaje: '#e9c896',
    sombra: '#d2a873',
    hocico: '#c9955e',
    orejaInterior: '#b07a48',
    contorno: '#5b3a1d',
    ojos: '#2a1a0f',
    brillo: '#fff6e5',
  },
  oscuro: {
    pelaje: '#8b5a32',
    sombra: '#734826',
    hocico: '#5f391d',
    orejaInterior: '#472914',
    contorno: '#24140a',
    ojos: '#140b05',
    brillo: '#f5d7b3',
  },
};

/** Cabeza de capibara: orejas, cabeza redonda, ojos, hocico grande con fosas nasales y sonrisa. */
function cabeza(p, { orejas = true } = {}) {
  const orejasSvg = orejas
    ? `
    <g stroke="${p.contorno}" stroke-width="3">
      <ellipse cx="36" cy="46" rx="10" ry="9" fill="${p.sombra}"/>
      <ellipse cx="92" cy="46" rx="10" ry="9" fill="${p.sombra}"/>
    </g>
    <ellipse cx="36.5" cy="47" rx="5" ry="4.5" fill="${p.orejaInterior}"/>
    <ellipse cx="91.5" cy="47" rx="5" ry="4.5" fill="${p.orejaInterior}"/>`
    : '';
  return `${orejasSvg}
    <!-- Silueta con contorno unificado -->
    <g fill="${p.contorno}">
      <ellipse cx="64" cy="72" rx="41" ry="37"/>
      <ellipse cx="64" cy="94" rx="30" ry="22"/>
    </g>
    <ellipse cx="64" cy="72" rx="38" ry="34" fill="${p.pelaje}"/>
    <ellipse cx="64" cy="94" rx="27" ry="19" fill="${p.pelaje}"/>
    <!-- Brillo del pelaje -->
    <ellipse cx="60" cy="52" rx="20" ry="9" fill="#ffffff" opacity="0.16"/>
    <!-- Hocico -->
    <ellipse cx="64" cy="93" rx="24" ry="16.5" fill="${p.hocico}"/>
    <ellipse cx="64" cy="86" rx="15" ry="6" fill="#ffffff" opacity="0.12"/>
    <!-- Mejillas -->
    <ellipse cx="38" cy="85" rx="6.5" ry="4" fill="#ef8f7c" opacity="0.45"/>
    <ellipse cx="90" cy="85" rx="6.5" ry="4" fill="#ef8f7c" opacity="0.45"/>
    <!-- Ojos -->
    <ellipse cx="48" cy="66" rx="5" ry="5.6" fill="${p.ojos}"/>
    <ellipse cx="80" cy="66" rx="5" ry="5.6" fill="${p.ojos}"/>
    <circle cx="49.8" cy="64" r="1.8" fill="${p.brillo}"/>
    <circle cx="81.8" cy="64" r="1.8" fill="${p.brillo}"/>
    <!-- Fosas nasales -->
    <ellipse cx="56" cy="89" rx="3.4" ry="2.3" transform="rotate(-20 56 89)" fill="${p.ojos}"/>
    <ellipse cx="72" cy="89" rx="3.4" ry="2.3" transform="rotate(20 72 89)" fill="${p.ojos}"/>
    <!-- Sonrisa -->
    <path d="M64 94 v4.5 M57.5 99.5 Q64 105 70.5 99.5" fill="none" stroke="${p.ojos}" stroke-width="2.4" stroke-linecap="round"/>`;
}

const sombraSuelo = '<ellipse cx="64" cy="119" rx="34" ry="5.5" fill="#000000" opacity="0.22"/>';

const ACCESORIOS = {
  // Capibebé: hojita verde con tallo.
  peon: () => `
    <path d="M63 41 Q61 33 66 25" fill="none" stroke="#2f6b22" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M66 27 C70 11 90 8 98 13 C93 29 79 35 66 27 Z" fill="#6cc04a" stroke="#2f6b22" stroke-width="3" stroke-linejoin="round"/>
    <path d="M69 26 Q81 19 93 14" fill="none" stroke="#2f6b22" stroke-width="2" stroke-linecap="round"/>
    <path d="M58 33 C50 26 40 28 37 32 C43 38 52 38 58 33 Z" fill="#8fd46b" stroke="#2f6b22" stroke-width="2.5" stroke-linejoin="round"/>`,

  // Capi-Torre: sombrero de torre almenada gris.
  torre: () => `
    <g fill="#a3acb4" stroke="#474e55" stroke-width="3" stroke-linejoin="round">
      <rect x="38" y="8" width="13" height="16" rx="2"/>
      <rect x="57.5" y="8" width="13" height="16" rx="2"/>
      <rect x="77" y="8" width="13" height="16" rx="2"/>
      <rect x="40" y="20" width="48" height="24" rx="2"/>
    </g>
    <g stroke="#6d757c" stroke-width="2" stroke-linecap="round">
      <path d="M42 32 H86"/>
      <path d="M54 22 V32 M74 22 V32 M64 32 V43 M48 32 V43 M80 32 V43"/>
    </g>
    <rect x="33" y="40" width="62" height="10" rx="5" fill="#868f97" stroke="#474e55" stroke-width="3"/>
    <rect x="58" y="26" width="12" height="10" rx="5" fill="#3d4349"/>`,

  // Capi-Caballero: casco gris con plumero rojo.
  caballo: () => `
    <path d="M60 24 C52 4 78 -2 96 8 C84 9 76 14 72 25 Z" fill="#e04848" stroke="#8e1f1f" stroke-width="3" stroke-linejoin="round"/>
    <path d="M66 22 C66 12 78 6 90 8" fill="none" stroke="#ff8a7a" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M27 58 C27 18 101 18 101 58 Z" fill="#aab3bb" stroke="#474e55" stroke-width="3" stroke-linejoin="round"/>
    <path d="M38 40 C44 28 56 24 64 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.5"/>
    <rect x="25" y="50" width="78" height="11" rx="5.5" fill="#8a939b" stroke="#474e55" stroke-width="3"/>
    <rect x="60" y="26" width="8" height="26" rx="3" fill="#8a939b" stroke="#474e55" stroke-width="2"/>
    <g fill="#5d656c">
      <circle cx="36" cy="55.5" r="2"/><circle cx="50" cy="55.5" r="2"/>
      <circle cx="78" cy="55.5" r="2"/><circle cx="92" cy="55.5" r="2"/>
    </g>`,

  // Capi-Obispo: mitra morada con cruz blanca.
  alfil: () => `
    <path d="M40 50 L40 30 Q40 11 64 3 Q88 11 88 30 L88 50 Z" fill="#7d3fa3" stroke="#3d1b55" stroke-width="3" stroke-linejoin="round"/>
    <path d="M48 44 L48 30 Q48 17 60 10" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.25"/>
    <rect x="37" y="42" width="54" height="10" rx="5" fill="#f2c14e" stroke="#9a6b12" stroke-width="2.5"/>
    <g fill="#ffffff" stroke="#3d1b55" stroke-width="2" stroke-linejoin="round">
      <path d="M60 14 H68 V22 H76 V30 H68 V40 H60 V30 H52 V22 H60 Z"/>
    </g>`,

  // Reina Capibara: corona dorada con gemas rojas.
  reina: () => `
    <path d="M34 50 L33 26 L46 36 L55 17 L64 33 L73 17 L82 36 L95 26 L94 50 Z" fill="#f5c542" stroke="#9a6b12" stroke-width="3" stroke-linejoin="round"/>
    <path d="M38 42 H90" stroke="#d99a1e" stroke-width="2"/>
    <g fill="#ffe08a" stroke="#9a6b12" stroke-width="2">
      <circle cx="33" cy="25" r="4"/><circle cx="55" cy="16" r="4"/>
      <circle cx="73" cy="16" r="4"/><circle cx="95" cy="25" r="4"/>
    </g>
    <g fill="#d93636" stroke="#7d1414" stroke-width="1.8">
      <circle cx="48" cy="45" r="3.6"/><circle cx="64" cy="45" r="4.2"/><circle cx="80" cy="45" r="3.6"/>
      <circle cx="64" cy="31" r="3"/>
    </g>
    <circle cx="62.8" cy="43.6" r="1.2" fill="#ffffff" opacity="0.8"/>`,

  // Rey Capibara: corona dorada más grande con cruz y gema azul.
  rey: () => `
    <g fill="#f5c542" stroke="#9a6b12" stroke-width="2.5" stroke-linejoin="round">
      <path d="M60 1 H68 V8 H75 V15 H68 V24 H60 V15 H53 V8 H60 Z"/>
    </g>
    <path d="M28 52 L27 24 L43 36 L52 18 L64 30 L76 18 L85 36 L101 24 L100 52 Z" fill="#f5c542" stroke="#9a6b12" stroke-width="3" stroke-linejoin="round"/>
    <rect x="26" y="44" width="76" height="10" rx="4" fill="#e9ad2c" stroke="#9a6b12" stroke-width="2.5"/>
    <g fill="#ffe08a" stroke="#9a6b12" stroke-width="2">
      <circle cx="27" cy="23" r="4"/><circle cx="101" cy="23" r="4"/>
      <circle cx="52" cy="17" r="3.5"/><circle cx="76" cy="17" r="3.5"/>
    </g>
    <ellipse cx="64" cy="40" rx="6.5" ry="8" fill="#3a7bd5" stroke="#173f7a" stroke-width="2"/>
    <ellipse cx="62" cy="37" rx="2" ry="2.6" fill="#ffffff" opacity="0.75"/>
    <g fill="#d93636" stroke="#7d1414" stroke-width="1.6">
      <circle cx="42" cy="49" r="3"/><circle cx="86" cy="49" r="3"/>
    </g>`,
};

function pieza(color, tipo) {
  const p = PALETAS[color];
  const sinOrejas = tipo === 'caballo';
  // El Capibebé es un poco más pequeño que el resto de la familia.
  const escala = tipo === 'peon' ? 'transform="translate(64 120) scale(0.86) translate(-64 -120)"' : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  ${sombraSuelo}
  <g ${escala}>
    ${cabeza(p, { orejas: !sinOrejas })}
    ${ACCESORIOS[tipo]()}
  </g>
</svg>
`;
}

for (const color of Object.keys(PALETAS)) {
  for (const tipo of Object.keys(ACCESORIOS)) {
    writeFileSync(join(carpetaPiezas, `${color}-${tipo}.svg`), pieza(color, tipo));
  }
}

/** Emblema: insignia redonda con un tablero y el Rey Capibara. */
function emblema() {
  const p = PALETAS.claro;
  let casillas = '';
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if ((i + j) % 2 === 0) casillas += `<rect x="${i * 32}" y="${j * 32}" width="32" height="32"/>`;
    }
  }
  return `
    <defs>
      <clipPath id="circulo"><circle cx="128" cy="128" r="112"/></clipPath>
      <radialGradient id="fondo" cx="50%" cy="40%" r="65%">
        <stop offset="0%" stop-color="#9fd98a"/>
        <stop offset="100%" stop-color="#4f9a5a"/>
      </radialGradient>
    </defs>
    <circle cx="128" cy="128" r="124" fill="#6b4226"/>
    <circle cx="128" cy="128" r="116" fill="#f3e3c3"/>
    <circle cx="128" cy="128" r="112" fill="url(#fondo)"/>
    <g clip-path="url(#circulo)" fill="#ffffff" opacity="0.12">${casillas}</g>
    <g transform="translate(28 24) scale(1.56)">
      ${sombraSuelo}
      ${cabeza(p)}
      ${ACCESORIOS.rey()}
    </g>`;
}

writeFileSync(
  join(carpetaAssets, 'emblema.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">${emblema()}
</svg>
`,
);

writeFileSync(
  join(carpetaAssets, 'logo.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 860 256" width="860" height="256">
  ${emblema()}
  <g font-family="Fredoka, 'Varela Round', 'Nunito', 'Arial Rounded MT Bold', sans-serif" font-weight="700">
    <text x="276" y="150" font-size="96" textLength="560" lengthAdjust="spacingAndGlyphs" fill="#5b3a1d" stroke="#5b3a1d" stroke-width="14" stroke-linejoin="round">Capi-Ajedrez</text>
    <text x="276" y="150" font-size="96" textLength="560" lengthAdjust="spacingAndGlyphs" fill="#f5c542">Capi-Ajedrez</text>
    <text x="282" y="204" font-size="34" textLength="548" lengthAdjust="spacingAndGlyphs" font-weight="500" fill="#3f7a46">El ajedrez más tranquilo del mundo</text>
  </g>
</svg>
`,
);

console.log('Piezas, emblema y logo generados.');
