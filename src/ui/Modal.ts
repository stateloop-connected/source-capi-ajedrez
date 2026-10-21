/**
 * Ventana modal: oscurece el fondo, bloquea el input de debajo y muestra un panel.
 */
import Phaser from 'phaser';
import { COLORES, TEXTO, estiloTexto } from './tema';

export class Modal extends Phaser.GameObjects.Container {
  readonly panel: Phaser.GameObjects.Container;
  private readonly velo: Phaser.GameObjects.Rectangle;

  constructor(escena: Phaser.Scene, ancho: number, alto: number, titulo: string, subtitulo = '') {
    const { width, height } = escena.scale;
    super(escena, 0, 0);
    this.setDepth(1000);

    this.velo = escena.add.rectangle(0, 0, width, height, 0x1d2b22, 0.55).setOrigin(0).setInteractive();
    this.add(this.velo);

    this.panel = escena.add.container(width / 2, height / 2);
    const fondo = escena.add.graphics();
    fondo.fillStyle(COLORES.sombra, 0.25);
    fondo.fillRoundedRect(-ancho / 2, -alto / 2 + 10, ancho, alto, 36);
    fondo.fillStyle(COLORES.madera, 1);
    fondo.fillRoundedRect(-ancho / 2, -alto / 2, ancho, alto, 36);
    fondo.fillStyle(COLORES.crema, 1);
    fondo.fillRoundedRect(-ancho / 2 + 12, -alto / 2 + 12, ancho - 24, alto - 24, 28);
    this.panel.add(fondo);

    const textoTitulo = escena.add
      .text(0, -alto / 2 + 44, titulo, estiloTexto(54, TEXTO.marron, { fontStyle: '700', align: 'center' }))
      .setOrigin(0.5, 0);
    this.panel.add(textoTitulo);
    if (subtitulo) {
      const textoSub = escena.add
        .text(0, textoTitulo.y + textoTitulo.height + 10, subtitulo, estiloTexto(32, TEXTO.verde, {
          align: 'center',
          wordWrap: { width: ancho - 80 },
        }))
        .setOrigin(0.5, 0);
      this.panel.add(textoSub);
    }
    this.add(this.panel);
    escena.add.existing(this);

    // Entrada animada.
    this.velo.setAlpha(0);
    this.panel.setScale(0.7).setAlpha(0);
    escena.tweens.add({ targets: this.velo, alpha: 1, duration: 200 });
    escena.tweens.add({ targets: this.panel, scale: 1, alpha: 1, duration: 320, ease: 'Back.easeOut' });
  }

  cerrar(alTerminar?: () => void): void {
    this.scene.tweens.add({
      targets: this.panel,
      scale: 0.8,
      alpha: 0,
      duration: 160,
      ease: 'Quad.easeIn',
    });
    this.scene.tweens.add({
      targets: this.velo,
      alpha: 0,
      duration: 180,
      onComplete: () => {
        this.destroy();
        alTerminar?.();
      },
    });
  }
}
