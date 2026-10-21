/**
 * Escena de carga: muestra el emblema con una barra de progreso, carga las piezas SVG
 * como texturas, genera las texturas de partículas y espera a que cargue la fuente Fredoka.
 */
import Phaser from 'phaser';
import { CLARAS, OSCURAS } from '../core';
import { COLORES, TEXTO, dibujarFondo, estiloTexto, irAEscena, texturaPieza } from '../ui/tema';
import { ESCENAS } from './claves';

const ICONOS_UI = [
  'reiniciar', 'deshacer', 'girar', 'sonido-on', 'sonido-off', 'menu',
  'jugar', 'robot', 'dos', 'libro', 'continuar', 'izquierda', 'derecha',
];

/** Espera a que la fuente esté lista, con un límite para no bloquear sin conexión. */
function esperarFuente(limiteMs: number): Promise<void> {
  if (!('fonts' in document)) return Promise.resolve();
  const carga = Promise.all([
    document.fonts.load('500 32px Fredoka'),
    document.fonts.load('600 32px Fredoka'),
    document.fonts.load('700 32px Fredoka'),
  ]).then(() => undefined);
  const limite = new Promise<void>((resolver) => setTimeout(resolver, limiteMs));
  return Promise.race([carga, limite]).catch(() => undefined);
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super(ESCENAS.carga);
  }

  preload(): void {
    this.load.svg('emblema', 'assets/emblema.svg', { width: 420, height: 420 });
  }

  create(): void {
    const { width, height } = this.scale;
    dibujarFondo(this);
    const emblema = this.add.image(width / 2, height / 2 - 110, 'emblema').setDisplaySize(300, 300);
    this.tweens.add({ targets: emblema, y: emblema.y - 14, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const anchoBarra = Math.min(560, width - 160);
    const yBarra = height / 2 + 110;
    const marco = this.add.graphics();
    marco.fillStyle(COLORES.maderaOscura, 1);
    marco.fillRoundedRect(width / 2 - anchoBarra / 2 - 8, yBarra - 22, anchoBarra + 16, 44, 22);
    marco.fillStyle(COLORES.beige, 1);
    marco.fillRoundedRect(width / 2 - anchoBarra / 2, yBarra - 14, anchoBarra, 28, 14);
    const barra = this.add.graphics();
    const texto = this.add.text(width / 2, yBarra + 60, 'Despertando a las capibaras…', estiloTexto(32, TEXTO.marron)).setOrigin(0.5);

    const dibujarProgreso = (valor: number) => {
      barra.clear();
      barra.fillStyle(COLORES.verde, 1);
      barra.fillRoundedRect(width / 2 - anchoBarra / 2, yBarra - 14, Math.max(28, anchoBarra * valor), 28, 14);
    };
    dibujarProgreso(0);

    for (const color of [CLARAS, OSCURAS]) {
      for (let tipo = 1; tipo <= 6; tipo++) {
        const clave = texturaPieza(color | tipo);
        this.load.svg(clave, `assets/pieces/${clave}.svg`, { width: 160, height: 160 });
      }
    }
    for (const icono of ICONOS_UI) {
      this.load.svg(`icono-${icono}`, `assets/ui/${icono}.svg`, { width: 96, height: 96 });
    }

    let cargado = false;
    let fuenteLista = false;
    const continuar = () => {
      if (!cargado || !fuenteLista) return;
      texto.setText('¡Listo!');
      this.time.delayedCall(250, () => irAEscena(this, ESCENAS.menu));
    };
    this.load.on(Phaser.Loader.Events.PROGRESS, dibujarProgreso);
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      this.generarTexturas();
      cargado = true;
      continuar();
    });
    void esperarFuente(3500).then(() => {
      fuenteLista = true;
      texto.setStyle(estiloTexto(32, TEXTO.marron));
      continuar();
    });
    this.load.start();
  }

  /** Texturas pequeñas para las partículas (sin archivos externos). */
  private generarTexturas(): void {
    const g = this.make.graphics({}, false);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(8, 8, 8);
    g.generateTexture('particula', 16, 16);
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 14, 8);
    g.generateTexture('confeti', 14, 8);
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillEllipse(12, 7, 24, 12);
    g.generateTexture('hoja', 24, 14);
    g.destroy();
  }
}
