/**
 * Botón grande y redondeado con sombra, icono opcional y animación al pasar o tocar.
 */
import Phaser from 'phaser';
import { sonidos } from '../audio/sonidos';
import { COLORES, TEXTO, estiloTexto } from './tema';

export interface OpcionesBoton {
  ancho: number;
  alto: number;
  texto: string;
  alPulsar: () => void;
  /** Clave de textura del icono. */
  icono?: string;
  /** Si es true, el icono va encima del texto (botones compactos). */
  iconoArriba?: boolean;
  color?: number;
  colorTexto?: string;
  tamanoTexto?: number;
  /** Lado del icono en unidades del juego. */
  tamanoIcono?: number;
  radio?: number;
}

function aclarar(color: number, cantidad: number): number {
  const c = Phaser.Display.Color.IntegerToColor(color);
  c.lighten(cantidad);
  return c.color;
}

export class Boton extends Phaser.GameObjects.Container {
  private readonly sombra: Phaser.GameObjects.Graphics;
  private readonly cara: Phaser.GameObjects.Graphics;
  private readonly etiqueta: Phaser.GameObjects.Text;
  private imagenIcono: Phaser.GameObjects.Image | null = null;
  private readonly opciones: Required<Omit<OpcionesBoton, 'icono' | 'tamanoIcono'>> & Pick<OpcionesBoton, 'icono' | 'tamanoIcono'>;
  private colorActual: number;
  private colorTextoActual: string;
  private habilitado = true;
  private presionado = false;

  constructor(escena: Phaser.Scene, x: number, y: number, opciones: OpcionesBoton) {
    super(escena, x, y);
    this.opciones = {
      color: COLORES.verde,
      colorTexto: TEXTO.crema,
      tamanoTexto: Math.min(40, Math.round(opciones.alto * 0.36)),
      radio: Math.min(28, opciones.alto / 2),
      iconoArriba: false,
      ...opciones,
    };
    this.colorActual = this.opciones.color;
    this.colorTextoActual = this.opciones.colorTexto;

    this.sombra = escena.add.graphics();
    this.cara = escena.add.graphics();
    this.etiqueta = escena.add
      .text(0, 0, this.opciones.texto, estiloTexto(this.opciones.tamanoTexto, this.colorTextoActual, { align: 'center' }))
      .setOrigin(0.5);
    this.add([this.sombra, this.cara, this.etiqueta]);
    if (this.opciones.icono) this.ponerIcono(this.opciones.icono);
    this.dibujar();

    this.setSize(this.opciones.ancho, this.opciones.alto);
    this.setInteractive({ useHandCursor: true });
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => this.animarEscala(1.05));
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => {
      this.presionado = false;
      this.cara.y = 0;
      this.animarEscala(1);
    });
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      if (!this.habilitado) return;
      sonidos.desbloquear();
      this.presionado = true;
      this.cara.y = 3;
      this.animarEscala(0.95);
    });
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      if (!this.habilitado || !this.presionado) return;
      this.presionado = false;
      this.cara.y = 0;
      this.animarEscala(1);
      sonidos.clic();
      this.opciones.alPulsar();
    });
    escena.add.existing(this);
  }

  private ponerIcono(clave: string): void {
    const { alto } = this.opciones;
    const tamano = this.opciones.tamanoIcono ?? (this.opciones.iconoArriba ? alto * 0.44 : alto * 0.5);
    if (!this.imagenIcono) {
      this.imagenIcono = this.scene.add.image(0, 0, clave);
      this.add(this.imagenIcono);
    } else {
      this.imagenIcono.setTexture(clave);
    }
    this.imagenIcono.setDisplaySize(tamano, tamano);
    this.colocarContenido();
  }

  private colocarContenido(): void {
    const { ancho } = this.opciones;
    if (!this.imagenIcono) {
      this.etiqueta.setPosition(0, 0);
      return;
    }
    if (this.opciones.iconoArriba) {
      const hayTexto = this.etiqueta.text.length > 0;
      const hueco = hayTexto ? this.etiqueta.height + 4 : 0;
      this.imagenIcono.setPosition(0, -hueco / 2);
      this.etiqueta.setPosition(0, this.imagenIcono.displayHeight / 2 + 4 - hueco / 2 + this.etiqueta.height / 2 - 2);
    } else {
      const total = this.imagenIcono.displayWidth + 14 + this.etiqueta.width;
      const inicio = -Math.min(total, ancho - 24) / 2;
      this.imagenIcono.setPosition(inicio + this.imagenIcono.displayWidth / 2, 0);
      this.etiqueta.setPosition(inicio + this.imagenIcono.displayWidth + 14 + this.etiqueta.width / 2, 0);
    }
  }

  private dibujar(): void {
    const { ancho, alto, radio } = this.opciones;
    const color = this.habilitado ? this.colorActual : 0xb8ad9c;
    this.sombra.clear();
    this.sombra.fillStyle(COLORES.sombra, 0.22);
    this.sombra.fillRoundedRect(-ancho / 2, -alto / 2 + 6, ancho, alto, radio);
    this.cara.clear();
    this.cara.fillStyle(Phaser.Display.Color.IntegerToColor(color).darken(18).color, 1);
    this.cara.fillRoundedRect(-ancho / 2, -alto / 2, ancho, alto, radio);
    this.cara.fillStyle(color, 1);
    this.cara.fillRoundedRect(-ancho / 2, -alto / 2, ancho, alto - 5, radio);
    this.cara.fillStyle(aclarar(color, 12), 1);
    this.cara.fillRoundedRect(-ancho / 2 + 8, -alto / 2 + 5, ancho - 16, alto * 0.32, { tl: radio * 0.8, tr: radio * 0.8, bl: 6, br: 6 });
    this.etiqueta.setColor(this.habilitado ? this.colorTextoActual : '#efe8dc');
    this.imagenIcono?.setAlpha(this.habilitado ? 1 : 0.55);
  }

  private animarEscala(escala: number): void {
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({ targets: this, scale: escala, duration: 110, ease: 'Quad.easeOut' });
  }

  setTexto(texto: string): this {
    this.etiqueta.setText(texto);
    this.colocarContenido();
    return this;
  }

  setIcono(clave: string): this {
    this.ponerIcono(clave);
    return this;
  }

  setHabilitado(habilitado: boolean): this {
    if (this.habilitado === habilitado) return this;
    this.habilitado = habilitado;
    if (this.input) this.input.cursor = habilitado ? 'pointer' : 'default';
    this.dibujar();
    return this;
  }

  /** Cambia los colores (por ejemplo, para marcar la opción elegida de un selector). */
  setColores(color: number, colorTexto: string): this {
    this.colorActual = color;
    this.colorTextoActual = colorTexto;
    this.dibujar();
    return this;
  }
}
