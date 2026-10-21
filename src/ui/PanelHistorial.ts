/**
 * Panel con el historial de jugadas en SAN, agrupadas por número de jugada y con scroll
 * (rueda del ratón o arrastre con el dedo).
 */
import Phaser from 'phaser';
import { COLORES, TEXTO, estiloTexto } from './tema';

const ALTO_FILA = 46;
const ALTO_TITULO = 56;

export class PanelHistorial extends Phaser.GameObjects.Container {
  private readonly contenido: Phaser.GameObjects.Container;
  private readonly mascara: Phaser.GameObjects.Graphics;
  private readonly vacio: Phaser.GameObjects.Text;
  private readonly barra: Phaser.GameObjects.Graphics;
  private readonly altoVisible: number;
  private desplazamiento = 0;
  private altoContenido = 0;
  private arrastre: { y: number; desplazamiento: number } | null = null;

  constructor(
    escena: Phaser.Scene,
    x: number,
    y: number,
    private readonly ancho: number,
    alto: number,
  ) {
    super(escena, x, y);
    this.altoVisible = alto - ALTO_TITULO - 14;

    const fondo = escena.add.graphics();
    fondo.fillStyle(COLORES.sombra, 0.18);
    fondo.fillRoundedRect(0, 6, ancho, alto, 24);
    fondo.fillStyle(COLORES.crema, 0.96);
    fondo.fillRoundedRect(0, 0, ancho, alto, 24);
    fondo.fillStyle(COLORES.beige, 1);
    fondo.fillRoundedRect(0, 0, ancho, ALTO_TITULO, { tl: 24, tr: 24, bl: 0, br: 0 });
    this.add(fondo);
    this.add(escena.add.text(24, ALTO_TITULO / 2, 'Jugadas', estiloTexto(30, TEXTO.marron, { fontStyle: '700' })).setOrigin(0, 0.5));

    this.contenido = escena.add.container(0, ALTO_TITULO + 6);
    this.add(this.contenido);
    this.vacio = escena.add
      .text(ancho / 2, ALTO_TITULO + this.altoVisible / 2, 'Aún no hay jugadas', estiloTexto(26, TEXTO.gris))
      .setOrigin(0.5);
    this.add(this.vacio);
    this.barra = escena.add.graphics();
    this.add(this.barra);

    // La máscara usa coordenadas de mundo, así que se dibuja en la posición absoluta.
    this.mascara = escena.make.graphics({}, false);
    this.mascara.fillStyle(0xffffff);
    this.mascara.fillRect(x, y + ALTO_TITULO + 4, ancho, this.altoVisible + 6);
    this.contenido.setMask(this.mascara.createGeometryMask());

    const zona = escena.add.zone(0, 0, ancho, alto).setOrigin(0).setInteractive();
    this.add(zona);
    zona.on(Phaser.Input.Events.GAMEOBJECT_WHEEL, (_p: Phaser.Input.Pointer, _dx: number, dy: number) => {
      this.desplazar(this.desplazamiento + dy * 0.6);
    });
    zona.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      this.arrastre = { y: p.y, desplazamiento: this.desplazamiento };
    });
    escena.input.on(Phaser.Input.Events.POINTER_MOVE, this.alMover, this);
    escena.input.on(Phaser.Input.Events.POINTER_UP, this.alSoltar, this);
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      escena.input.off(Phaser.Input.Events.POINTER_MOVE, this.alMover, this);
      escena.input.off(Phaser.Input.Events.POINTER_UP, this.alSoltar, this);
      this.mascara.destroy();
    });
    escena.add.existing(this);
  }

  private alMover(p: Phaser.Input.Pointer): void {
    if (this.arrastre && p.isDown) this.desplazar(this.arrastre.desplazamiento - (p.y - this.arrastre.y));
  }

  private alSoltar(): void {
    this.arrastre = null;
  }

  private desplazar(valor: number): void {
    const maximo = Math.max(0, this.altoContenido - this.altoVisible);
    this.desplazamiento = Phaser.Math.Clamp(valor, 0, maximo);
    this.contenido.y = ALTO_TITULO + 6 - this.desplazamiento;
    this.dibujarBarra();
  }

  private dibujarBarra(): void {
    this.barra.clear();
    if (this.altoContenido <= this.altoVisible) return;
    const proporcion = this.altoVisible / this.altoContenido;
    const altoBarra = Math.max(40, this.altoVisible * proporcion);
    const recorrido = this.altoVisible - altoBarra;
    const maximo = this.altoContenido - this.altoVisible;
    const yBarra = ALTO_TITULO + 6 + (recorrido * this.desplazamiento) / maximo;
    this.barra.fillStyle(COLORES.madera, 0.45);
    this.barra.fillRoundedRect(this.ancho - 16, yBarra, 8, altoBarra, 4);
  }

  /** Redibuja la lista de jugadas y se desplaza hasta la última. */
  actualizar(sanes: readonly string[]): void {
    this.contenido.removeAll(true);
    const filas = Math.ceil(sanes.length / 2);
    const columnaNumero = 70;
    const anchoJugada = (this.ancho - columnaNumero - 40) / 2;
    for (let i = 0; i < filas; i++) {
      const y = i * ALTO_FILA;
      if (i % 2 === 1) {
        const franja = this.scene.add.rectangle(10, y, this.ancho - 20, ALTO_FILA, COLORES.beige, 0.6).setOrigin(0);
        this.contenido.add(franja);
      }
      const ultimaFila = i === filas - 1;
      this.contenido.add(
        this.scene.add.text(columnaNumero, y + ALTO_FILA / 2, `${i + 1}.`, estiloTexto(26, TEXTO.gris)).setOrigin(1, 0.5),
      );
      for (let j = 0; j < 2; j++) {
        const indice = i * 2 + j;
        if (indice >= sanes.length) break;
        const esUltima = ultimaFila && indice === sanes.length - 1;
        const x = columnaNumero + 16 + j * anchoJugada;
        if (esUltima) {
          const marca = this.scene.add.graphics();
          marca.fillStyle(COLORES.dorado, 0.55);
          marca.fillRoundedRect(x - 8, y + 6, anchoJugada - 10, ALTO_FILA - 12, 10);
          this.contenido.add(marca);
        }
        this.contenido.add(
          this.scene.add
            .text(x, y + ALTO_FILA / 2, sanes[indice], estiloTexto(28, TEXTO.marronOscuro, { fontStyle: esUltima ? '700' : '500' }))
            .setOrigin(0, 0.5),
        );
      }
    }
    this.altoContenido = filas * ALTO_FILA;
    this.vacio.setVisible(sanes.length === 0);
    this.desplazar(this.altoContenido);
  }
}
