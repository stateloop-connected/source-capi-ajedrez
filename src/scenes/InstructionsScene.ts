/**
 * Manual del juego organizado en pestañas y páginas (sin scroll largo).
 */
import Phaser from 'phaser';
import { ALFIL, CABALLO, CLARAS, DAMA, OSCURAS, PEON, REY, TORRE } from '../core';
import { Boton } from '../ui/Boton';
import { ALTO_TACTIL, COLORES, TEXTO, dibujarFondo, esVertical, estiloTexto, irAEscena, texturaPieza } from '../ui/tema';
import { ESCENAS, EVENTO_REORIENTAR } from './claves';

interface Bloque {
  titulo: string;
  texto: string;
  /** Texturas que ilustran el bloque. */
  imagenes?: string[];
}

type Pagina = { tipo: 'texto'; bloques: Bloque[] } | { tipo: 'piezas'; tipos: number[] };

interface Pestana {
  nombre: string;
  paginas: Pagina[];
}

const PIEZAS: Record<number, { nombre: string; movimiento: string }> = {
  [PEON]: {
    nombre: 'Capibebé (peón)',
    movimiento: 'Avanza 1 casilla (2 en su primer movimiento). Captura en diagonal hacia delante.',
  },
  [TORRE]: {
    nombre: 'Capi-Torre (torre)',
    movimiento: 'Se mueve en línea recta, horizontal o vertical, todas las casillas libres que quiera.',
  },
  [CABALLO]: {
    nombre: 'Capi-Caballero (caballo)',
    movimiento: 'Salta en forma de «L»: dos casillas en una dirección y una hacia el lado. Puede saltar piezas.',
  },
  [ALFIL]: {
    nombre: 'Capi-Obispo (alfil)',
    movimiento: 'Se mueve en diagonal todas las casillas que quiera. Siempre pisa casillas del mismo color.',
  },
  [DAMA]: {
    nombre: 'Reina Capibara (dama)',
    movimiento: 'La más poderosa: se mueve como la torre y como el obispo, en línea recta o diagonal.',
  },
  [REY]: {
    nombre: 'Rey Capibara (rey)',
    movimiento: 'Se mueve 1 casilla en cualquier dirección. ¡Nunca puede quedar en jaque!',
  },
};

const PESTANAS: Pestana[] = [
  {
    nombre: 'Objetivo',
    paginas: [
      {
        tipo: 'texto',
        bloques: [
          {
            titulo: '¡Bienvenido a Capi-Ajedrez!',
            texto:
              'Es ajedrez de verdad, pero con capibaras. Cada bando tiene 16 piezas: las Claras (pelaje beige) y las Oscuras (pelaje marrón).',
            imagenes: [texturaPieza(CLARAS | REY), texturaPieza(OSCURAS | REY)],
          },
          {
            titulo: 'Cómo se gana',
            texto:
              'Gana quien da jaque mate: atacar al Rey Capibara rival de forma que no pueda escapar de ninguna manera. Las Claras siempre empiezan y después se alternan los turnos.',
          },
          {
            titulo: 'También hay empates',
            texto: 'Algunas partidas terminan en tablas (empate). Lo verás en la pestaña «Reglas».',
          },
        ],
      },
    ],
  },
  {
    nombre: 'Cómo jugar',
    paginas: [
      {
        tipo: 'texto',
        bloques: [
          {
            titulo: 'Turnos',
            texto: 'Las Claras empiezan. El indicador de turno, junto al tablero, muestra a quién le toca.',
          },
          {
            titulo: 'Elegir y mover',
            texto:
              'Toca una de tus piezas: se ilumina y aparecen sus movimientos. Los puntos verdes son casillas libres y el anillo rojo indica una captura. Toca una casilla marcada para mover, o arrastra la pieza y suéltala allí.',
          },
          {
            titulo: 'Jaque',
            texto:
              'Si tu rey está atacado, su casilla se pone roja y aparece «¡Jaque!». Tu jugada tiene que salvarlo. La última jugada queda resaltada en amarillo.',
          },
        ],
      },
    ],
  },
  {
    nombre: 'Piezas',
    paginas: [
      { tipo: 'piezas', tipos: [PEON, TORRE, CABALLO] },
      { tipo: 'piezas', tipos: [ALFIL, DAMA, REY] },
    ],
  },
  {
    nombre: 'Reglas',
    paginas: [
      {
        tipo: 'texto',
        bloques: [
          {
            titulo: 'Enroque',
            texto:
              'Una vez por partida, el rey avanza dos casillas hacia una torre y la torre salta al otro lado. Solo si ninguno se ha movido, no hay piezas entre ellos, el rey no está en jaque y no pasa ni cae en una casilla atacada. Para enrocar, mueve el rey dos casillas.',
            imagenes: [texturaPieza(CLARAS | REY), texturaPieza(CLARAS | TORRE)],
          },
          {
            titulo: 'Captura al paso',
            texto:
              'Si un Capibebé rival avanza dos casillas y queda junto a tu Capibebé, puedes capturarlo como si hubiera avanzado solo una. Solo en la jugada inmediatamente siguiente.',
            imagenes: [texturaPieza(CLARAS | PEON), texturaPieza(OSCURAS | PEON)],
          },
        ],
      },
      {
        tipo: 'texto',
        bloques: [
          {
            titulo: 'Coronación',
            texto:
              'Cuando un Capibebé llega a la última fila, se convierte en Reina, Capi-Torre, Capi-Obispo o Capi-Caballero. Aparece una ventana para que elijas.',
            imagenes: [texturaPieza(CLARAS | PEON), texturaPieza(CLARAS | DAMA)],
          },
          {
            titulo: 'Rey ahogado',
            texto:
              'Si al jugador que le toca no le queda ninguna jugada legal y su rey NO está en jaque, la partida termina en tablas.',
          },
        ],
      },
      {
        tipo: 'texto',
        bloques: [
          {
            titulo: 'Material insuficiente',
            texto: 'Si ya nadie puede dar mate (por ejemplo, rey contra rey, o rey y caballo contra rey), son tablas.',
          },
          {
            titulo: 'Triple repetición',
            texto: 'Si la misma posición se repite tres veces con el mismo jugador por mover, son tablas.',
          },
          {
            titulo: 'Regla de los 50 movimientos',
            texto: 'Si pasan 50 jugadas de cada bando sin capturas ni movimientos de Capibebés, son tablas.',
          },
          {
            titulo: 'Tiempo agotado',
            texto: 'Con reloj, quien se queda sin tiempo pierde (o son tablas si el rival ya no puede dar mate).',
          },
        ],
      },
    ],
  },
  {
    nombre: 'Controles',
    paginas: [
      {
        tipo: 'texto',
        bloques: [
          {
            titulo: 'Modos de juego',
            texto:
              '2 jugadores: dos personas en el mismo dispositivo. Contra la Capi-IA: tú llevas las Claras. En Fácil juega casi al azar, en Medio piensa 2 jugadas y en Difícil piensa hasta 1,5 segundos.',
            imagenes: ['icono-dos', 'icono-robot'],
          },
          {
            titulo: 'Reloj',
            texto:
              'Elige sin reloj, 5 o 10 minutos por bando. El reloj empieza con la primera jugada de las Claras y solo corre en el turno de cada uno.',
          },
        ],
      },
      {
        tipo: 'texto',
        bloques: [
          {
            titulo: 'Botones de la partida',
            texto:
              'Deshacer: retrocede una jugada (contra la IA, tu jugada y su respuesta). Girar: da la vuelta al tablero. Sonido: activa o silencia los efectos. Reiniciar: empieza de nuevo. Menú: vuelve al inicio.',
            imagenes: ['icono-deshacer', 'icono-girar', 'icono-sonido-on'],
          },
          {
            titulo: 'Guardado automático',
            texto: 'La partida se guarda después de cada jugada. Usa «Continuar partida» en el menú para retomarla.',
          },
        ],
      },
    ],
  },
];

interface DatosInstrucciones {
  pestana?: number;
  pagina?: number;
}

export class InstructionsScene extends Phaser.Scene {
  private pestanaActual = 0;
  private paginaActual = 0;
  private botonesPestana: Boton[] = [];
  private contenido: Phaser.GameObjects.Container | null = null;
  private textoPagina: Phaser.GameObjects.Text | null = null;
  private botonAnterior: Boton | null = null;
  private botonSiguiente: Boton | null = null;
  private area = new Phaser.Geom.Rectangle();

  constructor() {
    super(ESCENAS.instrucciones);
  }

  create(datos: DatosInstrucciones = {}): void {
    const { width } = this.scale;
    const vertical = esVertical(this);
    this.pestanaActual = datos.pestana ?? 0;
    this.paginaActual = datos.pagina ?? 0;
    this.botonesPestana = [];
    this.contenido = null;
    dibujarFondo(this);
    this.cameras.main.fadeIn(300, 20, 40, 30);

    this.add
      .text(width / 2, vertical ? 70 : 52, 'Instrucciones', estiloTexto(vertical ? 64 : 56, TEXTO.dorado, {
        fontStyle: '700',
        stroke: TEXTO.marron,
        strokeThickness: 12,
      }))
      .setOrigin(0.5);

    // Pestañas.
    const anchoPestanas = vertical ? 860 : 1480;
    const yPestanas = vertical ? 180 : 140;
    const separacion = 12;
    const anchoPestana = (anchoPestanas - separacion * (PESTANAS.length - 1)) / PESTANAS.length;
    PESTANAS.forEach((pestana, i) => {
      const boton = new Boton(this, width / 2 - anchoPestanas / 2 + anchoPestana / 2 + i * (anchoPestana + separacion), yPestanas, {
        ancho: anchoPestana,
        alto: ALTO_TACTIL,
        texto: pestana.nombre,
        tamanoTexto: vertical ? 28 : 32,
        alPulsar: () => this.mostrar(i, 0),
      });
      this.botonesPestana.push(boton);
    });

    // Panel de contenido.
    const panel = vertical
      ? new Phaser.Geom.Rectangle(20, 250, 860, 1090)
      : new Phaser.Geom.Rectangle(40, 210, 1520, 560);
    const fondo = this.add.graphics();
    fondo.fillStyle(COLORES.sombra, 0.16);
    fondo.fillRoundedRect(panel.x, panel.y + 8, panel.width, panel.height, 30);
    fondo.fillStyle(COLORES.crema, 0.95);
    fondo.fillRoundedRect(panel.x, panel.y, panel.width, panel.height, 30);
    this.area = new Phaser.Geom.Rectangle(panel.x + 36, panel.y + 30, panel.width - 72, panel.height - 60);

    // Paginación y volver.
    const yInferior = vertical ? 1405 : 838;
    const xPaginacion = vertical ? width / 2 : 420;
    this.botonAnterior = new Boton(this, xPaginacion - 170, yInferior, {
      ancho: 120, alto: ALTO_TACTIL, texto: '', icono: 'icono-izquierda', color: COLORES.madera,
      alPulsar: () => this.mostrar(this.pestanaActual, this.paginaActual - 1),
    });
    this.botonSiguiente = new Boton(this, xPaginacion + 170, yInferior, {
      ancho: 120, alto: ALTO_TACTIL, texto: '', icono: 'icono-derecha', color: COLORES.madera,
      alPulsar: () => this.mostrar(this.pestanaActual, this.paginaActual + 1),
    });
    this.textoPagina = this.add.text(xPaginacion, yInferior, '', estiloTexto(34, TEXTO.marron)).setOrigin(0.5);

    new Boton(this, vertical ? width / 2 : 1240, vertical ? 1528 : yInferior, {
      ancho: vertical ? 600 : 560,
      alto: ALTO_TACTIL,
      texto: 'Volver al menú',
      icono: 'icono-menu',
      color: COLORES.verdeOscuro,
      tamanoTexto: 36,
      alPulsar: () => irAEscena(this, ESCENAS.menu),
    });

    this.mostrar(this.pestanaActual, this.paginaActual);

    const reorientar = () => this.scene.restart({ pestana: this.pestanaActual, pagina: this.paginaActual });
    this.game.events.on(EVENTO_REORIENTAR, reorientar);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off(EVENTO_REORIENTAR, reorientar));
  }

  private mostrar(pestana: number, pagina: number): void {
    const paginas = PESTANAS[pestana].paginas;
    this.pestanaActual = pestana;
    this.paginaActual = Phaser.Math.Clamp(pagina, 0, paginas.length - 1);

    this.botonesPestana.forEach((b, i) =>
      b.setColores(i === pestana ? COLORES.verde : COLORES.beige, i === pestana ? TEXTO.crema : TEXTO.marron),
    );
    const variasPaginas = paginas.length > 1;
    this.textoPagina?.setText(variasPaginas ? `${this.paginaActual + 1} / ${paginas.length}` : '');
    this.botonAnterior?.setVisible(variasPaginas).setHabilitado(this.paginaActual > 0);
    this.botonSiguiente?.setVisible(variasPaginas).setHabilitado(this.paginaActual < paginas.length - 1);

    this.contenido?.destroy();
    const contenido = this.add.container(this.area.x, this.area.y);
    this.contenido = contenido;
    const datos = paginas[this.paginaActual];
    const alto = datos.tipo === 'piezas' ? this.dibujarPiezas(contenido, datos.tipos) : this.dibujarBloques(contenido, datos.bloques);

    // Si el contenido no cabe (pantallas muy justas), se reduce en lugar de cortarse.
    if (alto > this.area.height) contenido.setScale(this.area.height / alto);
    contenido.setAlpha(0);
    contenido.x += 30;
    this.tweens.add({ targets: contenido, alpha: 1, x: this.area.x, duration: 220, ease: 'Quad.easeOut' });
  }

  /** Dibuja bloques de texto; en horizontal se reparten en dos columnas. Devuelve el alto usado. */
  private dibujarBloques(contenedor: Phaser.GameObjects.Container, bloques: Bloque[]): number {
    const vertical = esVertical(this);
    const columnas = vertical || bloques.length === 1 ? 1 : 2;
    const separacionColumnas = 50;
    const anchoColumna = (this.area.width - separacionColumnas * (columnas - 1)) / columnas;
    const alturas = new Array<number>(columnas).fill(0);
    const tamanoTitulo = 40;
    const tamanoTexto = 32;

    bloques.forEach((bloque, i) => {
      const col = columnas === 1 ? 0 : i % columnas;
      const x = col * (anchoColumna + separacionColumnas);
      let y = alturas[col];
      const imagenes = bloque.imagenes ?? [];
      const ladoImagen = 96;
      const anchoImagenes = imagenes.length > 0 ? imagenes.length * (ladoImagen + 8) + 12 : 0;

      const titulo = this.add.text(x, y, bloque.titulo, estiloTexto(tamanoTitulo, TEXTO.verde, { fontStyle: '700' }));
      contenedor.add(titulo);
      y += titulo.height + 8;

      imagenes.forEach((clave, j) => {
        const img = this.add.image(x + j * (ladoImagen + 8) + ladoImagen / 2, y + ladoImagen / 2, clave).setDisplaySize(ladoImagen, ladoImagen);
        if (clave.startsWith('icono-')) img.setTint(COLORES.madera);
        contenedor.add(img);
      });

      const texto = this.add.text(x + anchoImagenes, y, bloque.texto, estiloTexto(tamanoTexto, TEXTO.marronOscuro, {
        fontStyle: '500',
        wordWrap: { width: anchoColumna - anchoImagenes, useAdvancedWrap: true },
        lineSpacing: 6,
      }));
      contenedor.add(texto);
      y += Math.max(texto.height, imagenes.length > 0 ? ladoImagen : 0) + (vertical ? 44 : 34);
      alturas[col] = y;
    });
    return Math.max(...alturas);
  }

  /** Dibuja las fichas de las piezas con su dibujo, nombre y movimiento. Devuelve el alto usado. */
  private dibujarPiezas(contenedor: Phaser.GameObjects.Container, tipos: number[]): number {
    const vertical = esVertical(this);
    const lado = vertical ? 200 : 150;
    const altoFila = vertical ? 340 : 170;
    tipos.forEach((tipo, i) => {
      const y = i * altoFila;
      const info = PIEZAS[tipo];
      const claro = this.add.image(lado / 2, y + lado / 2, texturaPieza(CLARAS | tipo)).setDisplaySize(lado, lado);
      const oscuro = this.add.image(lado * 1.5 - 30, y + lado / 2 + 10, texturaPieza(OSCURAS | tipo)).setDisplaySize(lado * 0.8, lado * 0.8);
      contenedor.add([oscuro, claro]);
      this.tweens.add({ targets: claro, y: claro.y - 8, duration: 1000 + i * 150, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      const xTexto = lado * 2 + 10;
      const nombre = this.add.text(xTexto, y + (vertical ? 16 : 4), info.nombre, estiloTexto(vertical ? 42 : 38, TEXTO.verde, { fontStyle: '700' }));
      const movimiento = this.add.text(xTexto, nombre.y + nombre.height + 8, info.movimiento, estiloTexto(32, TEXTO.marronOscuro, {
        fontStyle: '500',
        wordWrap: { width: this.area.width - xTexto, useAdvancedWrap: true },
        lineSpacing: 6,
      }));
      contenedor.add([nombre, movimiento]);
    });
    return tipos.length * altoFila - (altoFila - lado);
  }
}
