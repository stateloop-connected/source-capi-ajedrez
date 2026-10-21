/**
 * Paleta, tipografía y medidas compartidas por todas las escenas.
 */
import Phaser from 'phaser';

export const FUENTE = "Fredoka, 'Varela Round', 'Nunito', 'Arial Rounded MT Bold', 'Trebuchet MS', sans-serif";

export const COLORES = {
  fondoArriba: 0xbfe6d3,
  fondoAbajo: 0x7fbfae,
  madera: 0x7a4a26,
  maderaOscura: 0x4f2d14,
  maderaClara: 0xa8703f,
  casillaClara: 0xf3e6c8,
  casillaOscura: 0x7fae6b,
  seleccion: 0xf5d547,
  ultimaJugada: 0xf0c75e,
  jaque: 0xe2463b,
  punto: 0x2f7d3b,
  crema: 0xfff6e5,
  beige: 0xf3e3c3,
  marron: 0x5b3a1d,
  verde: 0x4f9a5a,
  verdeOscuro: 0x2f6b3a,
  dorado: 0xf5c542,
  rojo: 0xd9534f,
  sombra: 0x000000,
} as const;

/** Colores en formato CSS para los textos. */
export const TEXTO = {
  marron: '#5b3a1d',
  marronOscuro: '#3b2410',
  crema: '#fff6e5',
  verde: '#2f6b3a',
  rojo: '#c0392b',
  dorado: '#f5c542',
  gris: '#7a6a58',
} as const;

/** Tamaños virtuales del juego según la orientación (Scale.FIT los ajusta a la pantalla). */
export const TAMANO_HORIZONTAL = { ancho: 1600, alto: 900 } as const;
export const TAMANO_VERTICAL = { ancho: 900, alto: 1600 } as const;

/**
 * Altura mínima de los controles táctiles en unidades del juego. En un teléfono de
 * 390 px de ancho, 900 unidades ocupan 390 px, así que 104 unidades ≈ 45 px CSS (> 44 px).
 */
export const ALTO_TACTIL = 104;

export function esVertical(escena: Phaser.Scene): boolean {
  return escena.scale.height > escena.scale.width;
}

export function estiloTexto(tamano: number, color: string = TEXTO.marron, extra: Phaser.Types.GameObjects.Text.TextStyle = {}): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FUENTE,
    fontSize: `${tamano}px`,
    color,
    fontStyle: '600',
    ...extra,
  };
}

/** Texturas de pieza: nombre de archivo de cada tipo (índice = tipo del motor). */
export const NOMBRES_PIEZA = ['', 'peon', 'caballo', 'alfil', 'torre', 'reina', 'rey'] as const;

/** Clave de textura para una pieza del motor (color | tipo). */
export function texturaPieza(pieza: number): string {
  const color = (pieza & 8) === 0 ? 'claro' : 'oscuro';
  return `${color}-${NOMBRES_PIEZA[pieza & 7]}`;
}

/** Fundido de salida y cambio de escena. */
export function irAEscena(escena: Phaser.Scene, clave: string, datos?: object): void {
  escena.input.enabled = false;
  escena.cameras.main.fadeOut(260, 20, 40, 30);
  escena.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
    escena.scene.start(clave, datos);
  });
}

/** Fondo con degradado verde-azulado suave y unas hojas decorativas. */
export function dibujarFondo(escena: Phaser.Scene): void {
  const { width, height } = escena.scale;
  const clave = `fondo-${width}x${height}`;
  if (!escena.textures.exists(clave)) {
    const lienzo = escena.textures.createCanvas(clave, width, height);
    if (lienzo) {
      const ctx = lienzo.getContext();
      const degradado = ctx.createLinearGradient(0, 0, width * 0.3, height);
      degradado.addColorStop(0, '#cdeedc');
      degradado.addColorStop(0.55, '#a3d6c4');
      degradado.addColorStop(1, '#6fb3a3');
      ctx.fillStyle = degradado;
      ctx.fillRect(0, 0, width, height);
      // Destellos suaves de luz.
      const luz = ctx.createRadialGradient(width * 0.2, height * 0.12, 10, width * 0.2, height * 0.12, width * 0.6);
      luz.addColorStop(0, 'rgba(255,255,240,0.45)');
      luz.addColorStop(1, 'rgba(255,255,240,0)');
      ctx.fillStyle = luz;
      ctx.fillRect(0, 0, width, height);
      // Hojas decorativas semitransparentes.
      const semilla = [0.08, 0.83, 0.32, 0.61, 0.95, 0.17, 0.72, 0.44, 0.27, 0.88];
      for (let i = 0; i < 10; i++) {
        const x = semilla[i] * width;
        const y = semilla[(i + 3) % 10] * height;
        const r = 30 + semilla[(i + 5) % 10] * 50;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(semilla[(i + 7) % 10] * Math.PI * 2);
        ctx.fillStyle = 'rgba(47,107,58,0.08)';
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      lienzo.refresh();
    }
  }
  escena.add.image(0, 0, clave).setOrigin(0).setDepth(-100);
}
