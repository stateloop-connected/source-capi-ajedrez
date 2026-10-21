/**
 * Selector de opciones excluyentes (por ejemplo, dificultad o reloj) hecho con botones.
 */
import Phaser from 'phaser';
import { Boton } from './Boton';
import { COLORES, TEXTO, estiloTexto } from './tema';

export interface OpcionSelector<T> {
  valor: T;
  texto: string;
}

export class Selector<T> extends Phaser.GameObjects.Container {
  private readonly botones: Boton[] = [];
  private valorActual: T;

  constructor(
    escena: Phaser.Scene,
    x: number,
    y: number,
    titulo: string,
    ancho: number,
    altoBoton: number,
    opciones: OpcionSelector<T>[],
    inicial: T,
    alCambiar: (valor: T) => void,
  ) {
    super(escena, x, y);
    this.valorActual = inicial;
    const etiqueta = escena.add.text(0, 0, titulo, estiloTexto(28, TEXTO.marronOscuro)).setOrigin(0.5, 0);
    this.add(etiqueta);

    const separacion = 14;
    const anchoBoton = (ancho - separacion * (opciones.length - 1)) / opciones.length;
    const yBotones = etiqueta.height + 8 + altoBoton / 2;
    opciones.forEach((opcion, i) => {
      const bx = -ancho / 2 + anchoBoton / 2 + i * (anchoBoton + separacion);
      const boton = new Boton(escena, bx, yBotones, {
        ancho: anchoBoton,
        alto: altoBoton,
        texto: opcion.texto,
        tamanoTexto: Math.min(32, Math.round(altoBoton * 0.32)),
        alPulsar: () => {
          this.valorActual = opcion.valor;
          this.actualizar(opciones);
          alCambiar(opcion.valor);
        },
      });
      this.botones.push(boton);
      this.add(boton);
    });
    this.actualizar(opciones);
    escena.add.existing(this);
  }

  /** Alto total del selector (título + botones). */
  static alto(altoBoton: number): number {
    return 34 + 8 + altoBoton;
  }

  get valor(): T {
    return this.valorActual;
  }

  private actualizar(opciones: OpcionSelector<T>[]): void {
    opciones.forEach((opcion, i) => {
      const elegido = opcion.valor === this.valorActual;
      this.botones[i].setColores(elegido ? COLORES.verde : COLORES.beige, elegido ? TEXTO.crema : TEXTO.marron);
    });
  }
}
