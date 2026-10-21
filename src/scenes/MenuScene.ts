/**
 * Menú principal: título, capibaras flotando, modos de juego, dificultad y reloj.
 */
import Phaser from 'phaser';
import type { Dificultad } from '../ai/ia';
import { CLARAS, OSCURAS, PEON, CABALLO, ALFIL, TORRE, DAMA, REY } from '../core';
import { cargarPartida, cargarPreferencias, guardarPreferencias, type MinutosReloj, type ModoJuego } from '../storage/almacen';
import { Boton } from '../ui/Boton';
import { Selector } from '../ui/Selector';
import { ALTO_TACTIL, COLORES, FUENTE, TEXTO, dibujarFondo, esVertical, estiloTexto, irAEscena, texturaPieza } from '../ui/tema';
import { ESCENAS, EVENTO_REORIENTAR } from './claves';

/** Datos con los que se abre la escena de juego. */
export interface DatosJuego {
  modo?: ModoJuego;
  dificultad?: Dificultad;
  minutos?: MinutosReloj;
  /** Continuar la partida guardada en localStorage. */
  continuar?: boolean;
}

interface Elemento {
  alto: number;
  crear: (y: number) => void;
}

export class MenuScene extends Phaser.Scene {
  constructor() {
    super(ESCENAS.menu);
  }

  create(): void {
    const { width, height } = this.scale;
    const vertical = esVertical(this);
    dibujarFondo(this);
    this.cameras.main.fadeIn(300, 20, 40, 30);

    const preferencias = cargarPreferencias();
    const hayGuardada = cargarPartida() !== null;

    // Zona de título: arriba en vertical, a la izquierda en horizontal.
    const centroTitulo = vertical ? width / 2 : 430;
    const yEmblema = vertical ? 200 : 210;
    const emblema = this.add.image(centroTitulo, yEmblema, 'emblema').setDisplaySize(vertical ? 250 : 290, vertical ? 250 : 290);
    this.tweens.add({ targets: emblema, angle: { from: -3, to: 3 }, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const titulo = this.add
      .text(centroTitulo, yEmblema + (vertical ? 180 : 205), 'Capi-Ajedrez', {
        fontFamily: FUENTE,
        fontSize: vertical ? '104px' : '100px',
        fontStyle: '700',
        color: TEXTO.dorado,
        stroke: TEXTO.marron,
        strokeThickness: 16,
        shadow: { offsetX: 0, offsetY: 8, color: 'rgba(0,0,0,0.25)', blur: 6, fill: true, stroke: true },
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: titulo, scale: 1.04, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add
      .text(centroTitulo, titulo.y + 86, 'El ajedrez más tranquilo del mundo', estiloTexto(vertical ? 36 : 34, TEXTO.verde))
      .setOrigin(0.5);

    this.crearFilaCapibaras(centroTitulo, titulo.y + (vertical ? 210 : 240), vertical ? 820 : 760);

    // Columna de botones.
    const anchoColumna = vertical ? 720 : 640;
    const centroBotones = vertical ? width / 2 : 1170;
    const altoBoton = ALTO_TACTIL + 6;
    const separacion = vertical ? 26 : 16;
    let dificultad = preferencias.dificultad;
    let minutos = preferencias.minutos;

    const boton = (texto: string, icono: string, color: number, colorTexto: string, alPulsar: () => void): Elemento => ({
      alto: altoBoton,
      crear: (y) => {
        new Boton(this, centroBotones, y + altoBoton / 2, {
          ancho: anchoColumna,
          alto: altoBoton,
          texto,
          icono,
          color,
          colorTexto,
          tamanoTexto: 38,
          alPulsar,
        });
      },
    });

    const elementos: Elemento[] = [];
    if (hayGuardada) {
      elementos.push(
        boton('Continuar partida', 'icono-continuar', COLORES.dorado, TEXTO.marron, () =>
          irAEscena(this, ESCENAS.juego, { continuar: true } satisfies DatosJuego),
        ),
      );
    }
    elementos.push(
      boton('Jugar 2 jugadores', 'icono-dos', COLORES.verde, TEXTO.crema, () =>
        irAEscena(this, ESCENAS.juego, { modo: 'dos-jugadores', dificultad, minutos } satisfies DatosJuego),
      ),
      boton('Jugar contra la Capi-IA', 'icono-robot', COLORES.verdeOscuro, TEXTO.crema, () =>
        irAEscena(this, ESCENAS.juego, { modo: 'contra-ia', dificultad, minutos } satisfies DatosJuego),
      ),
      {
        alto: Selector.alto(ALTO_TACTIL),
        crear: (y) => {
          new Selector<Dificultad>(
            this, centroBotones, y, 'Dificultad de la Capi-IA', anchoColumna, ALTO_TACTIL,
            [
              { valor: 'facil', texto: 'Fácil' },
              { valor: 'medio', texto: 'Medio' },
              { valor: 'dificil', texto: 'Difícil' },
            ],
            dificultad,
            (valor) => {
              dificultad = valor;
              guardarPreferencias({ dificultad: valor });
            },
          );
        },
      },
      {
        alto: Selector.alto(ALTO_TACTIL),
        crear: (y) => {
          new Selector<MinutosReloj>(
            this, centroBotones, y, 'Reloj', anchoColumna, ALTO_TACTIL,
            [
              { valor: 0, texto: 'Sin reloj' },
              { valor: 5, texto: '5 min' },
              { valor: 10, texto: '10 min' },
            ],
            minutos,
            (valor) => {
              minutos = valor;
              guardarPreferencias({ minutos: valor });
            },
          );
        },
      },
      boton('Instrucciones', 'icono-libro', COLORES.madera, TEXTO.crema, () => irAEscena(this, ESCENAS.instrucciones)),
    );

    const altoTotal = elementos.reduce((suma, e) => suma + e.alto, 0) + separacion * (elementos.length - 1);
    const zonaInicio = vertical ? 680 : 0;
    const zonaAlto = vertical ? height - zonaInicio - 30 : height;
    let y = zonaInicio + Math.max(10, (zonaAlto - altoTotal) / 2);
    for (const e of elementos) {
      e.crear(y);
      y += e.alto + separacion;
    }

    const reorientar = () => this.scene.restart();
    this.game.events.on(EVENTO_REORIENTAR, reorientar);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off(EVENTO_REORIENTAR, reorientar));
  }

  /** Fila de capibaras decorativas que flotan suavemente. */
  private crearFilaCapibaras(centroX: number, y: number, ancho: number): void {
    const tipos = [PEON, CABALLO, ALFIL, REY, DAMA, TORRE];
    const paso = ancho / tipos.length;
    tipos.forEach((tipo, i) => {
      const color = i % 2 === 0 ? CLARAS : OSCURAS;
      const x = centroX - ancho / 2 + paso / 2 + i * paso;
      const capi = this.add.image(x, y, texturaPieza(color | tipo)).setDisplaySize(paso * 0.95, paso * 0.95);
      this.tweens.add({
        targets: capi,
        y: y - 18,
        angle: { from: -4, to: 4 },
        duration: 1300 + i * 140,
        delay: i * 180,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      capi.setInteractive({ useHandCursor: true });
      capi.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
        this.tweens.add({ targets: capi, scaleX: capi.scaleX * 1.15, scaleY: capi.scaleY * 0.85, duration: 120, yoyo: true });
      });
    });
  }
}
