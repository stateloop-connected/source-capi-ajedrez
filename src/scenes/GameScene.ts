/**
 * Escena de juego: tablero, piezas, input (toque, clic y arrastre), historial, relojes,
 * Capi-IA, coronación, guardado automático y fin de partida.
 */
import Phaser from 'phaser';
import { ClienteIA } from '../ai/clienteIA';
import type { Dificultad } from '../ai/ia';
import { sonidos } from '../audio/sonidos';
import {
  ALFIL,
  BANDERA_AL_PASO,
  BANDERA_ENROQUE_CORTO,
  BANDERA_ENROQUE_LARGO,
  CABALLO,
  CLARAS,
  COLUMNAS,
  DAMA,
  OSCURAS,
  Partida,
  TORRE,
  VALOR_MATERIAL,
  aSanEspanol,
  colorContrario,
  columna,
  desdeUci,
  fila,
  type Color,
  type JugadaRegistrada,
  type Movimiento,
  type ResultadoPartida,
} from '../core';
import {
  borrarPartida,
  cargarPartida,
  cargarPreferencias,
  guardarPartida,
  type MinutosReloj,
  type ModoJuego,
  type PartidaGuardada,
} from '../storage/almacen';
import { Boton } from '../ui/Boton';
import { Modal } from '../ui/Modal';
import { PanelHistorial } from '../ui/PanelHistorial';
import { ALTO_TACTIL, COLORES, TEXTO, dibujarFondo, esVertical, estiloTexto, irAEscena, texturaPieza } from '../ui/tema';
import { ESCENAS, EVENTO_REORIENTAR } from './claves';
import type { DatosJuego } from './MenuScene';

/** Retraso mínimo antes de que la IA mueva, para que se sienta natural. */
const RETRASO_IA_MS = 700;
const NOMBRE_DIFICULTAD: Record<Dificultad, string> = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil' };

/** El worker de la IA se comparte entre partidas. */
const clienteIA = new ClienteIA();

interface Rect {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

interface Diseno {
  tablero: Rect;
  tarjetaArriba: Rect;
  tarjetaAbajo: Rect;
  estado: Rect;
  historial: Rect;
  botones: Rect;
}

interface Tarjeta {
  fondo: Phaser.GameObjects.Graphics;
  retrato: Phaser.GameObjects.Image;
  nombre: Phaser.GameObjects.Text;
  capturas: Phaser.GameObjects.Container;
  ventaja: Phaser.GameObjects.Text;
  reloj: Phaser.GameObjects.Text;
  fondoReloj: Phaser.GameObjects.Graphics;
  rect: Rect;
}

interface Arrastre {
  casilla: number;
  x0: number;
  y0: number;
  moviendo: boolean;
  deseleccionarAlSoltar: boolean;
}

/** Datos para retomar la escena tras un cambio de orientación. */
interface DatosReanudar {
  reanudar: PartidaGuardada;
  terminado: ResultadoPartida | null;
}

export class GameScene extends Phaser.Scene {
  private partida!: Partida;
  private modo: ModoJuego = 'dos-jugadores';
  private dificultad: Dificultad = 'medio';
  private minutos: MinutosReloj = 0;
  private tiempos: [number, number] = [0, 0];
  private girado = false;
  private terminado: ResultadoPartida | null = null;

  private diseno!: Diseno;
  private borde = 0;
  private casilla = 0;
  private sprites = new Map<number, Phaser.GameObjects.Image>();
  private capaResaltes!: Phaser.GameObjects.Graphics;
  private capaMarcas!: Phaser.GameObjects.Graphics;
  private coordenadas: Phaser.GameObjects.Text[] = [];
  private tarjetas: Record<Color, Tarjeta> = {} as Record<Color, Tarjeta>;
  private historial!: PanelHistorial;
  private textoEstado!: Phaser.GameObjects.Text;
  private fondoEstado!: Phaser.GameObjects.Graphics;
  private botonDeshacer!: Boton;
  private botonSonido!: Boton;

  private seleccion = -1;
  private destinos: Movimiento[] = [];
  private arrastre: Arrastre | null = null;
  private animando = false;
  private modalAbierto: Modal | null = null;
  private iaPensando = false;
  private turnoIA = 0;
  private puntosPensando = 0;
  private ultimoTextoReloj: [string, string] = ['', ''];

  constructor() {
    super(ESCENAS.juego);
  }

  // ---------------------------------------------------------------------------
  // Creación
  // ---------------------------------------------------------------------------

  create(datos: DatosJuego & Partial<DatosReanudar> = {}): void {
    this.sprites = new Map();
    this.coordenadas = [];
    this.seleccion = -1;
    this.destinos = [];
    this.arrastre = null;
    this.animando = false;
    this.modalAbierto = null;
    this.iaPensando = false;
    this.ultimoTextoReloj = ['', ''];

    this.iniciarEstado(datos);
    dibujarFondo(this);
    this.cameras.main.fadeIn(300, 20, 40, 30);
    this.calcularDiseno();
    this.dibujarTablero();
    this.crearTarjetas();
    this.crearEstado();
    this.historial = new PanelHistorial(this, this.diseno.historial.x, this.diseno.historial.y, this.diseno.historial.ancho, this.diseno.historial.alto);
    this.crearBotones();
    this.sincronizarPiezas();
    this.actualizarTodo();
    this.guardar();

    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.alPulsar, this);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.alMover, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.alSoltar, this);

    const reorientar = () => {
      this.cancelarIA();
      this.scene.restart({ reanudar: this.instantanea(), terminado: this.terminado } satisfies DatosReanudar);
    };
    const alOcultar = () => {
      if (document.visibilityState === 'hidden') this.guardar();
    };
    this.game.events.on(EVENTO_REORIENTAR, reorientar);
    document.addEventListener('visibilitychange', alOcultar);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(EVENTO_REORIENTAR, reorientar);
      document.removeEventListener('visibilitychange', alOcultar);
      this.input.off(Phaser.Input.Events.POINTER_DOWN, this.alPulsar, this);
      this.input.off(Phaser.Input.Events.POINTER_MOVE, this.alMover, this);
      this.input.off(Phaser.Input.Events.POINTER_UP, this.alSoltar, this);
      this.input.setDefaultCursor('default');
      this.guardar();
      this.cancelarIA();
    });

    if (this.terminado) this.time.delayedCall(400, () => this.mostrarFinal(false));
    else this.programarIASiToca();
  }

  /** Crea la partida nueva, la guardada o la que se estaba jugando antes de girar la pantalla. */
  private iniciarEstado(datos: DatosJuego & Partial<DatosReanudar>): void {
    const preferencias = cargarPreferencias();
    const guardada = datos.reanudar ?? (datos.continuar ? cargarPartida() : null);
    this.terminado = datos.reanudar ? (datos.terminado ?? null) : null;
    if (guardada) {
      try {
        this.partida = Partida.desdeJugadas(guardada.fenInicial, guardada.jugadas);
        this.modo = guardada.modo;
        this.dificultad = guardada.dificultad;
        this.minutos = guardada.minutos;
        this.tiempos = [...guardada.tiempos];
        this.girado = guardada.girado;
        return;
      } catch {
        // Partida guardada corrupta: se empieza una nueva.
        borrarPartida();
      }
    }
    this.partida = new Partida();
    this.modo = datos.modo ?? 'dos-jugadores';
    this.dificultad = datos.dificultad ?? preferencias.dificultad;
    this.minutos = datos.minutos ?? preferencias.minutos;
    this.tiempos = [this.minutos * 60_000, this.minutos * 60_000];
    this.girado = false;
    this.terminado = null;
  }

  private calcularDiseno(): void {
    if (esVertical(this)) {
      this.diseno = {
        tarjetaArriba: { x: 20, y: 18, ancho: 860, alto: 112 },
        tablero: { x: 20, y: 146, ancho: 860, alto: 860 },
        tarjetaAbajo: { x: 20, y: 1022, ancho: 860, alto: 112 },
        estado: { x: 20, y: 1148, ancho: 860, alto: 66 },
        historial: { x: 20, y: 1228, ancho: 860, alto: 222 },
        botones: { x: 20, y: 1466, ancho: 860, alto: 116 },
      };
    } else {
      this.diseno = {
        tablero: { x: 24, y: 20, ancho: 860, alto: 860 },
        tarjetaArriba: { x: 920, y: 20, ancho: 656, alto: 118 },
        estado: { x: 920, y: 152, ancho: 656, alto: 66 },
        historial: { x: 920, y: 232, ancho: 656, alto: 380 },
        botones: { x: 920, y: 628, ancho: 656, alto: 116 },
        tarjetaAbajo: { x: 920, y: 762, ancho: 656, alto: 118 },
      };
    }
    this.borde = Math.round(this.diseno.tablero.ancho * 0.045);
    this.casilla = (this.diseno.tablero.ancho - this.borde * 2) / 8;
  }

  // ---------------------------------------------------------------------------
  // Coordenadas del tablero
  // ---------------------------------------------------------------------------

  private centroCasilla(casilla: number): { x: number; y: number } {
    const col = this.girado ? 7 - columna(casilla) : columna(casilla);
    const filaVisual = this.girado ? fila(casilla) : 7 - fila(casilla);
    return {
      x: this.diseno.tablero.x + this.borde + col * this.casilla + this.casilla / 2,
      y: this.diseno.tablero.y + this.borde + filaVisual * this.casilla + this.casilla / 2,
    };
  }

  private casillaEn(x: number, y: number): number {
    const col = Math.floor((x - this.diseno.tablero.x - this.borde) / this.casilla);
    const filaVisual = Math.floor((y - this.diseno.tablero.y - this.borde) / this.casilla);
    if (col < 0 || col > 7 || filaVisual < 0 || filaVisual > 7) return -1;
    const c = this.girado ? 7 - col : col;
    const f = this.girado ? filaVisual : 7 - filaVisual;
    return f * 8 + c;
  }

  // ---------------------------------------------------------------------------
  // Dibujo del tablero y la interfaz
  // ---------------------------------------------------------------------------

  private dibujarTablero(): void {
    const { x, y, ancho } = this.diseno.tablero;
    const g = this.add.graphics().setDepth(0);
    // Sombra y marco de madera.
    g.fillStyle(COLORES.sombra, 0.25);
    g.fillRoundedRect(x + 4, y + 12, ancho, ancho, 26);
    g.fillStyle(COLORES.maderaOscura, 1);
    g.fillRoundedRect(x, y, ancho, ancho, 26);
    g.fillStyle(COLORES.madera, 1);
    g.fillRoundedRect(x + 6, y + 6, ancho - 12, ancho - 12, 22);
    // Vetas de la madera.
    g.lineStyle(3, COLORES.maderaClara, 0.35);
    for (let i = 0; i < 14; i++) {
      const yv = y + 14 + i * ((ancho - 28) / 13);
      g.beginPath();
      g.moveTo(x + 10, yv);
      for (let xv = x + 10; xv <= x + ancho - 10; xv += 40) {
        g.lineTo(xv, yv + Math.sin((xv + i * 37) / 60) * 4);
      }
      g.strokePath();
    }
    // Casillas.
    const interior = x + this.borde;
    const interiorY = y + this.borde;
    g.fillStyle(COLORES.maderaOscura, 1);
    g.fillRect(interior - 4, interiorY - 4, this.casilla * 8 + 8, this.casilla * 8 + 8);
    for (let f = 0; f < 8; f++) {
      for (let c = 0; c < 8; c++) {
        g.fillStyle((f + c) % 2 === 0 ? COLORES.casillaClara : COLORES.casillaOscura, 1);
        g.fillRect(interior + c * this.casilla, interiorY + f * this.casilla, Math.ceil(this.casilla), Math.ceil(this.casilla));
      }
    }
    this.capaResaltes = this.add.graphics().setDepth(2);
    this.capaMarcas = this.add.graphics().setDepth(20);
    this.dibujarCoordenadas();
  }

  private dibujarCoordenadas(): void {
    for (const t of this.coordenadas) t.destroy();
    this.coordenadas = [];
    const { x, y, ancho } = this.diseno.tablero;
    const tamano = Math.round(this.borde * 0.62);
    for (let i = 0; i < 8; i++) {
      const letra = COLUMNAS[this.girado ? 7 - i : i];
      const numero = String(this.girado ? i + 1 : 8 - i);
      const centro = this.borde + i * this.casilla + this.casilla / 2;
      this.coordenadas.push(
        this.add.text(x + centro, y + ancho - this.borde / 2, letra, estiloTexto(tamano, TEXTO.crema, { fontStyle: '700' })).setOrigin(0.5).setDepth(1),
        this.add.text(x + this.borde / 2, y + centro, numero, estiloTexto(tamano, TEXTO.crema, { fontStyle: '700' })).setOrigin(0.5).setDepth(1),
      );
    }
  }

  private crearTarjetas(): void {
    for (const color of [CLARAS, OSCURAS] as Color[]) {
      const fondo = this.add.graphics();
      const retrato = this.add.image(0, 0, texturaPieza(color | 6));
      const nombre = this.add.text(0, 0, this.nombreBando(color), estiloTexto(34, TEXTO.marron, { fontStyle: '700' }));
      const capturas = this.add.container(0, 0);
      const ventaja = this.add.text(0, 0, '', estiloTexto(28, TEXTO.verde, { fontStyle: '700' })).setOrigin(0, 0.5);
      const fondoReloj = this.add.graphics();
      const reloj = this.add.text(0, 0, '', estiloTexto(40, TEXTO.crema, { fontStyle: '700' })).setOrigin(0.5);
      this.tarjetas[color] = { fondo, retrato, nombre, capturas, ventaja, reloj, fondoReloj, rect: this.diseno.tarjetaArriba };
    }
    this.colocarTarjetas();
  }

  private colocarTarjetas(): void {
    const abajo: Color = this.girado ? OSCURAS : CLARAS;
    this.tarjetas[abajo].rect = this.diseno.tarjetaAbajo;
    this.tarjetas[colorContrario(abajo)].rect = this.diseno.tarjetaArriba;
    for (const color of [CLARAS, OSCURAS] as Color[]) {
      const t = this.tarjetas[color];
      const { x, y, alto, ancho } = t.rect;
      const lado = alto - 16;
      t.retrato.setPosition(x + 14 + lado / 2, y + alto / 2).setDisplaySize(lado, lado);
      t.nombre.setPosition(x + lado + 30, y + 10);
      t.capturas.setPosition(x + lado + 30, y + alto - 30);
      const anchoReloj = this.minutos > 0 ? 170 : 0;
      t.reloj.setPosition(x + ancho - 16 - anchoReloj / 2, y + alto / 2).setVisible(this.minutos > 0);
      t.fondoReloj.setVisible(this.minutos > 0);
    }
  }

  private crearEstado(): void {
    const { x, y, ancho, alto } = this.diseno.estado;
    this.fondoEstado = this.add.graphics();
    this.textoEstado = this.add.text(x + ancho / 2, y + alto / 2, '', estiloTexto(34, TEXTO.crema, { fontStyle: '700' })).setOrigin(0.5);
    this.time.addEvent({
      delay: 400,
      loop: true,
      callback: () => {
        if (!this.iaPensando) return;
        this.puntosPensando = (this.puntosPensando + 1) % 4;
        this.actualizarEstado();
      },
    });
  }

  private crearBotones(): void {
    const { x, y, ancho, alto } = this.diseno.botones;
    const separacion = 14;
    const anchoBoton = (ancho - separacion * 4) / 5;
    const definiciones: [string, string, number, () => void][] = [
      ['Reiniciar', 'icono-reiniciar', COLORES.madera, () => this.pedirReinicio()],
      ['Deshacer', 'icono-deshacer', COLORES.verde, () => this.deshacer()],
      ['Girar', 'icono-girar', COLORES.verde, () => this.girar()],
      ['Sonido', sonidos.estaActivado ? 'icono-sonido-on' : 'icono-sonido-off', COLORES.verde, () => this.alternarSonido()],
      ['Menú', 'icono-menu', COLORES.verdeOscuro, () => this.irAlMenu()],
    ];
    definiciones.forEach(([texto, icono, color, accion], i) => {
      const boton = new Boton(this, x + anchoBoton / 2 + i * (anchoBoton + separacion), y + alto / 2, {
        ancho: anchoBoton,
        alto: Math.max(alto, ALTO_TACTIL),
        texto,
        icono,
        iconoArriba: true,
        tamanoIcono: 50,
        tamanoTexto: 24,
        color,
        alPulsar: accion,
      });
      if (texto === 'Deshacer') this.botonDeshacer = boton;
      if (texto === 'Sonido') this.botonSonido = boton;
    });
  }

  // ---------------------------------------------------------------------------
  // Piezas
  // ---------------------------------------------------------------------------

  /** Coloca los sprites según el tablero, reutilizando los que ya están bien. */
  private sincronizarPiezas(): void {
    const tablero = this.partida.posicion.tablero;
    const nuevos = new Map<number, Phaser.GameObjects.Image>();
    const sobrantes = new Map(this.sprites);
    for (let c = 0; c < 64; c++) {
      const p = tablero[c];
      if (p === 0) continue;
      const clave = texturaPieza(p);
      let sprite = sobrantes.get(c);
      if (sprite && sprite.texture.key === clave) {
        sobrantes.delete(c);
      } else {
        sprite = this.add.image(0, 0, clave);
      }
      this.tweens.killTweensOf(sprite);
      const { x, y } = this.centroCasilla(c);
      sprite.setPosition(x, y).setDisplaySize(this.casilla * 0.94, this.casilla * 0.94).setDepth(10).setAngle(0).setAlpha(1);
      nuevos.set(c, sprite);
    }
    for (const sprite of sobrantes.values()) sprite.destroy();
    this.sprites = nuevos;
  }

  private escalaPieza(): number {
    const sprite = this.sprites.values().next().value;
    if (!sprite) return 1;
    return (this.casilla * 0.94) / sprite.width;
  }

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------

  private puedeMoverUsuario(): boolean {
    if (this.terminado || this.animando || this.iaPensando || this.modalAbierto) return false;
    return this.modo === 'dos-jugadores' || this.partida.turno === CLARAS;
  }

  private alPulsar(puntero: Phaser.Input.Pointer): void {
    sonidos.desbloquear();
    if (!this.puedeMoverUsuario()) return;
    const casilla = this.casillaEn(puntero.x, puntero.y);
    if (casilla < 0) return;

    if (this.seleccion >= 0 && this.destinos.some((m) => m.hasta === casilla)) {
      this.intentarMover(this.seleccion, casilla, false);
      return;
    }
    const pieza = this.partida.posicion.tablero[casilla];
    if (pieza !== 0 && (pieza & 8) === this.partida.turno) {
      const yaSeleccionada = casilla === this.seleccion;
      if (!yaSeleccionada) this.seleccionar(casilla);
      this.arrastre = { casilla, x0: puntero.x, y0: puntero.y, moviendo: false, deseleccionarAlSoltar: yaSeleccionada };
    } else {
      this.deseleccionar();
    }
  }

  private alMover(puntero: Phaser.Input.Pointer): void {
    const a = this.arrastre;
    if (!a || !puntero.isDown) {
      this.actualizarCursor(puntero);
      return;
    }
    const sprite = this.sprites.get(a.casilla);
    if (!sprite) return;
    if (!a.moviendo) {
      if (Phaser.Math.Distance.Between(a.x0, a.y0, puntero.x, puntero.y) < 12) return;
      a.moviendo = true;
      this.tweens.killTweensOf(sprite);
      sprite.setDepth(50).setScale(this.escalaPieza() * 1.15);
    }
    sprite.setPosition(puntero.x, puntero.y - this.casilla * 0.15);
    this.dibujarResaltes(this.casillaEn(puntero.x, puntero.y));
  }

  /** Mano sobre las piezas que se pueden mover y sobre las casillas de destino (escritorio). */
  private actualizarCursor(puntero: Phaser.Input.Pointer): void {
    const casilla = this.casillaEn(puntero.x, puntero.y);
    let util = false;
    if (casilla >= 0 && this.puedeMoverUsuario()) {
      const pieza = this.partida.posicion.tablero[casilla];
      util = (pieza !== 0 && (pieza & 8) === this.partida.turno) || this.destinos.some((m) => m.hasta === casilla);
    }
    this.input.setDefaultCursor(util ? 'pointer' : 'default');
  }

  private alSoltar(puntero: Phaser.Input.Pointer): void {
    const a = this.arrastre;
    this.arrastre = null;
    if (!a) return;
    if (!a.moviendo) {
      if (a.deseleccionarAlSoltar) this.deseleccionar();
      return;
    }
    const destino = this.casillaEn(puntero.x, puntero.y);
    if (destino >= 0 && this.destinos.some((m) => m.hasta === destino) && this.puedeMoverUsuario()) {
      this.intentarMover(a.casilla, destino, true);
    } else {
      this.devolverPieza(a.casilla);
      this.dibujarResaltes();
    }
  }

  private devolverPieza(casilla: number): void {
    const sprite = this.sprites.get(casilla);
    if (!sprite) return;
    const { x, y } = this.centroCasilla(casilla);
    const escala = this.escalaPieza();
    this.tweens.add({
      targets: sprite,
      x,
      y,
      scale: escala,
      duration: 180,
      ease: 'Back.easeOut',
      onComplete: () => sprite.setDepth(10),
    });
  }

  private seleccionar(casilla: number): void {
    this.seleccion = casilla;
    this.destinos = this.partida.movimientosDesde(casilla);
    const sprite = this.sprites.get(casilla);
    if (sprite) {
      const { y } = this.centroCasilla(casilla);
      const escala = this.escalaPieza();
      this.tweens.killTweensOf(sprite);
      sprite.setY(y).setScale(escala);
      this.tweens.add({ targets: sprite, y: y - this.casilla * 0.12, scale: escala * 1.08, duration: 110, yoyo: true, ease: 'Quad.easeOut' });
    }
    this.dibujarResaltes();
  }

  private deseleccionar(): void {
    if (this.seleccion < 0) return;
    this.seleccion = -1;
    this.destinos = [];
    this.dibujarResaltes();
  }

  // ---------------------------------------------------------------------------
  // Jugadas
  // ---------------------------------------------------------------------------

  private intentarMover(desde: number, hasta: number, arrastrado: boolean): void {
    if (this.partida.esCoronacion(desde, hasta)) {
      if (arrastrado) {
        const sprite = this.sprites.get(desde);
        const { x, y } = this.centroCasilla(hasta);
        sprite?.setPosition(x, y).setScale(this.escalaPieza());
      }
      this.elegirCoronacion(this.partida.turno, (tipo) => {
        if (tipo === 0) {
          this.devolverPieza(desde);
          this.dibujarResaltes();
          return;
        }
        const m = this.partida.buscarMovimiento(desde, hasta, tipo);
        if (m) this.ejecutar(m, true);
      });
      return;
    }
    const m = this.partida.buscarMovimiento(desde, hasta);
    if (m) this.ejecutar(m, arrastrado);
  }

  private ejecutar(m: Movimiento, arrastrado: boolean): void {
    const jugada = this.partida.jugar(m);
    if (!jugada) return;
    this.seleccion = -1;
    this.destinos = [];
    this.animando = true;
    this.dibujarResaltes();
    this.animarJugada(jugada.movimiento, arrastrado, () => {
      this.animando = false;
      this.trasJugada(jugada);
    });
  }

  private animarJugada(m: Movimiento, arrastrado: boolean, alTerminar: () => void): void {
    const sprite = this.sprites.get(m.desde);
    const destino = this.centroCasilla(m.hasta);
    const escala = this.escalaPieza();

    if (m.capturada !== 0) {
      const casillaCaptura = m.bandera === BANDERA_AL_PASO ? (m.pieza & 8 ? m.hasta + 8 : m.hasta - 8) : m.hasta;
      const capturado = this.sprites.get(casillaCaptura);
      if (capturado) {
        this.sprites.delete(casillaCaptura);
        capturado.setDepth(9);
        this.explosion(capturado.x, capturado.y, m.capturada & 8 ? [0x8b5a32, 0x5f391d, 0xf5c542] : [0xe9c896, 0xc9955e, 0xf5c542], 16);
        this.tweens.add({
          targets: capturado,
          scale: 0,
          angle: 120,
          alpha: 0,
          duration: 300,
          delay: arrastrado ? 0 : 120,
          ease: 'Back.easeIn',
          onComplete: () => capturado.destroy(),
        });
      }
    }

    if (m.bandera === BANDERA_ENROQUE_CORTO || m.bandera === BANDERA_ENROQUE_LARGO) {
      const corto = m.bandera === BANDERA_ENROQUE_CORTO;
      const origenTorre = corto ? m.desde + 3 : m.desde - 4;
      const destinoTorre = corto ? m.desde + 1 : m.desde - 1;
      const torre = this.sprites.get(origenTorre);
      if (torre) {
        const p = this.centroCasilla(destinoTorre);
        this.tweens.add({ targets: torre, x: p.x, y: p.y, duration: 260, delay: 80, ease: 'Cubic.easeOut' });
      }
    }

    if (!sprite) {
      this.sincronizarPiezas();
      alTerminar();
      return;
    }
    sprite.setDepth(40);
    this.tweens.killTweensOf(sprite);
    this.tweens.add({
      targets: sprite,
      x: destino.x,
      y: destino.y,
      scale: escala,
      duration: arrastrado ? 90 : 230,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        if (m.coronacion !== 0) {
          sprite.setTexture(texturaPieza((m.pieza & 8) | m.coronacion)).setDisplaySize(this.casilla * 0.94, this.casilla * 0.94);
          this.explosion(destino.x, destino.y, [0xf5c542, 0xfff6e5, 0x6cc04a], 22);
          this.tweens.add({ targets: sprite, scale: escala * 1.3, duration: 160, yoyo: true, ease: 'Quad.easeOut' });
        }
        this.time.delayedCall(m.coronacion !== 0 ? 330 : 60, () => {
          this.sincronizarPiezas();
          alTerminar();
        });
      },
    });
  }

  private trasJugada(jugada: JugadaRegistrada): void {
    const resultado = this.partida.resultado();
    const m = jugada.movimiento;
    if (!resultado) {
      if (this.partida.enJaque()) {
        sonidos.jaque();
        this.cameras.main.shake(260, 0.006);
      } else if (m.bandera === BANDERA_ENROQUE_CORTO || m.bandera === BANDERA_ENROQUE_LARGO) sonidos.enroque();
      else if (m.coronacion !== 0) sonidos.coronar();
      else if (m.capturada !== 0) sonidos.capturar();
      else sonidos.mover();
    }
    this.actualizarTodo();
    if (resultado) {
      this.finalizar(resultado);
      return;
    }
    this.guardar();
    this.programarIASiToca();
  }

  // ---------------------------------------------------------------------------
  // Capi-IA
  // ---------------------------------------------------------------------------

  private programarIASiToca(): void {
    if (this.modo !== 'contra-ia' || this.terminado || this.partida.turno !== OSCURAS) return;
    this.iaPensando = true;
    this.puntosPensando = 0;
    this.actualizarTodo();
    const turno = ++this.turnoIA;
    const inicio = Date.now();
    void clienteIA.pedirJugada(this.partida.fenInicial, this.partida.jugadasUci(), this.dificultad).then((uci) => {
      if (turno !== this.turnoIA || !this.scene.isActive()) return;
      const espera = Math.max(0, RETRASO_IA_MS - (Date.now() - inicio));
      this.time.delayedCall(espera, () => {
        if (turno !== this.turnoIA) return;
        this.iaPensando = false;
        const m = uci ? desdeUci(this.partida.posicion, uci) : null;
        if (m) this.ejecutar(m, false);
        else this.actualizarTodo();
      });
    });
  }

  private cancelarIA(): void {
    this.turnoIA++;
    if (this.iaPensando) clienteIA.cancelar();
    this.iaPensando = false;
  }

  // ---------------------------------------------------------------------------
  // Botones
  // ---------------------------------------------------------------------------

  private deshacer(): void {
    if (this.animando || this.iaPensando || (this.modalAbierto && !this.terminado)) return;
    if (this.partida.historial.length === 0 || this.terminado?.motivo === 'tiempo') return;
    if (this.modalAbierto) {
      this.modalAbierto.cerrar();
      this.modalAbierto = null;
    }
    this.terminado = null;
    this.partida.deshacer();
    // Contra la IA se deshace también su respuesta, hasta que vuelva a ser el turno del usuario.
    if (this.modo === 'contra-ia') {
      while (this.partida.turno !== CLARAS && this.partida.historial.length > 0) this.partida.deshacer();
    }
    this.seleccion = -1;
    this.destinos = [];
    this.sincronizarPiezas();
    this.actualizarTodo();
    this.guardar();
    this.programarIASiToca();
  }

  private pedirReinicio(): void {
    if (this.modalAbierto) return;
    if (this.partida.historial.length === 0 || this.terminado) {
      this.reiniciar();
      return;
    }
    const modal = new Modal(this, 680, 420, '¿Reiniciar?', 'Se perderá la partida actual.');
    this.modalAbierto = modal;
    const cerrar = (accion?: () => void) => {
      modal.cerrar(accion);
      this.modalAbierto = null;
    };
    modal.panel.add([
      new Boton(this, -150, 120, { ancho: 260, alto: ALTO_TACTIL, texto: 'Sí, reiniciar', color: COLORES.rojo, tamanoTexto: 32, alPulsar: () => cerrar(() => this.reiniciar()) }),
      new Boton(this, 150, 120, { ancho: 260, alto: ALTO_TACTIL, texto: 'Cancelar', color: COLORES.beige, colorTexto: TEXTO.marron, tamanoTexto: 32, alPulsar: () => cerrar() }),
    ]);
  }

  private reiniciar(): void {
    this.cancelarIA();
    this.modalAbierto?.destroy();
    this.modalAbierto = null;
    this.partida = new Partida();
    this.tiempos = [this.minutos * 60_000, this.minutos * 60_000];
    this.terminado = null;
    this.seleccion = -1;
    this.destinos = [];
    this.sincronizarPiezas();
    this.actualizarTodo();
    this.guardar();
  }

  private girar(): void {
    this.girado = !this.girado;
    this.dibujarCoordenadas();
    this.colocarTarjetas();
    for (const [casilla, sprite] of this.sprites) {
      const { x, y } = this.centroCasilla(casilla);
      this.tweens.add({ targets: sprite, x, y, duration: 380, ease: 'Cubic.easeInOut' });
    }
    this.actualizarTodo();
    this.guardar();
  }

  private alternarSonido(): void {
    const activado = sonidos.alternar();
    this.botonSonido.setIcono(activado ? 'icono-sonido-on' : 'icono-sonido-off');
  }

  private irAlMenu(): void {
    this.cancelarIA();
    this.guardar();
    irAEscena(this, ESCENAS.menu);
  }

  // ---------------------------------------------------------------------------
  // Relojes
  // ---------------------------------------------------------------------------

  override update(_tiempo: number, delta: number): void {
    if (this.minutos === 0 || this.terminado || this.partida.historial.length === 0) return;
    const indice = this.partida.turno >> 3;
    this.tiempos[indice] = Math.max(0, this.tiempos[indice] - delta);
    this.actualizarRelojes();
    if (this.tiempos[indice] === 0) {
      this.cancelarIA();
      this.finalizar(this.partida.resultadoPorTiempo(this.partida.turno));
    }
  }

  private formatoTiempo(ms: number): string {
    if (ms < 10_000) return `0:0${(ms / 1000).toFixed(1)}`;
    const total = Math.ceil(ms / 1000);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  }

  private actualizarRelojes(): void {
    if (this.minutos === 0) return;
    for (const color of [CLARAS, OSCURAS] as Color[]) {
      const i = color >> 3;
      const texto = this.formatoTiempo(this.tiempos[i]);
      const activo = !this.terminado && this.partida.turno === color;
      const clave = `${texto}|${activo}`;
      if (this.ultimoTextoReloj[i] === clave) continue;
      this.ultimoTextoReloj[i] = clave;
      const t = this.tarjetas[color];
      t.reloj.setText(texto);
      const urgente = this.tiempos[i] < 30_000;
      t.fondoReloj.clear();
      t.fondoReloj.fillStyle(urgente ? COLORES.rojo : activo ? COLORES.verdeOscuro : COLORES.madera, activo ? 1 : 0.55);
      t.fondoReloj.fillRoundedRect(t.reloj.x - 80, t.reloj.y - 34, 160, 68, 20);
    }
  }

  // ---------------------------------------------------------------------------
  // Actualización de la interfaz
  // ---------------------------------------------------------------------------

  private actualizarTodo(): void {
    this.dibujarResaltes();
    this.actualizarTarjetas();
    this.ultimoTextoReloj = ['', ''];
    this.actualizarRelojes();
    this.actualizarEstado();
    this.historial.actualizar(this.partida.historial.map((j) => aSanEspanol(j.san)));
    const puedeDeshacer =
      this.partida.historial.length > 0 && !this.iaPensando && this.terminado?.motivo !== 'tiempo';
    this.botonDeshacer.setHabilitado(puedeDeshacer);
  }

  private dibujarResaltes(casillaBajoPuntero = -1): void {
    const g = this.capaResaltes;
    const marcas = this.capaMarcas;
    g.clear();
    marcas.clear();
    const lado = this.casilla;
    const rellenar = (casilla: number, color: number, alfa: number) => {
      const { x, y } = this.centroCasilla(casilla);
      g.fillStyle(color, alfa);
      g.fillRect(x - lado / 2, y - lado / 2, lado, lado);
    };

    const ultima = this.partida.ultimaJugada();
    if (ultima) {
      rellenar(ultima.movimiento.desde, COLORES.ultimaJugada, 0.42);
      rellenar(ultima.movimiento.hasta, COLORES.ultimaJugada, 0.55);
    }
    if (this.partida.enJaque()) {
      const rey = this.partida.posicion.casillaRey(this.partida.turno);
      const { x, y } = this.centroCasilla(rey);
      g.fillStyle(COLORES.jaque, 0.85);
      g.fillRect(x - lado / 2, y - lado / 2, lado, lado);
      g.fillStyle(0xffd0c0, 0.5);
      g.fillCircle(x, y, lado * 0.36);
    }
    if (this.seleccion >= 0) {
      rellenar(this.seleccion, COLORES.seleccion, 0.7);
      const vistos = new Set<number>();
      for (const m of this.destinos) {
        if (vistos.has(m.hasta)) continue;
        vistos.add(m.hasta);
        const { x, y } = this.centroCasilla(m.hasta);
        if (m.capturada !== 0) {
          marcas.lineStyle(lado * 0.08, COLORES.jaque, 0.85);
          marcas.strokeCircle(x, y, lado * 0.44);
        } else {
          marcas.fillStyle(COLORES.punto, 0.6);
          marcas.fillCircle(x, y, lado * 0.16);
        }
      }
      if (casillaBajoPuntero >= 0 && vistos.has(casillaBajoPuntero)) {
        const { x, y } = this.centroCasilla(casillaBajoPuntero);
        g.lineStyle(6, COLORES.crema, 0.9);
        g.strokeRect(x - lado / 2 + 3, y - lado / 2 + 3, lado - 6, lado - 6);
      }
    }
  }

  private nombreBando(color: Color): string {
    if (this.modo === 'contra-ia') return color === CLARAS ? 'Tú (Claras)' : `Capi-IA · ${NOMBRE_DIFICULTAD[this.dificultad]}`;
    return color === CLARAS ? 'Claras' : 'Oscuras';
  }

  private actualizarTarjetas(): void {
    const { porClaras, porOscuras } = this.partida.capturas();
    const ventaja = this.partida.ventajaMaterial();
    for (const color of [CLARAS, OSCURAS] as Color[]) {
      const t = this.tarjetas[color];
      const { x, y, ancho, alto } = t.rect;
      const activo = !this.terminado && this.partida.turno === color;
      t.fondo.clear();
      t.fondo.fillStyle(COLORES.sombra, 0.16);
      t.fondo.fillRoundedRect(x, y + 6, ancho, alto, 24);
      if (activo) {
        t.fondo.fillStyle(COLORES.dorado, 1);
        t.fondo.fillRoundedRect(x - 5, y - 5, ancho + 10, alto + 10, 28);
      }
      t.fondo.fillStyle(COLORES.crema, 0.96);
      t.fondo.fillRoundedRect(x, y, ancho, alto, 24);
      t.nombre.setText(this.nombreBando(color));

      // Piezas capturadas por este bando, de mayor a menor valor.
      const capturadas = [...(color === CLARAS ? porClaras : porOscuras)].sort(
        (a, b) => VALOR_MATERIAL[b & 7] - VALOR_MATERIAL[a & 7] || (b & 7) - (a & 7),
      );
      t.capturas.removeAll(true);
      const lado = 40;
      let cx = 0;
      capturadas.forEach((p, i) => {
        if (i > 0 && (capturadas[i - 1] & 7) !== (p & 7)) cx += 10;
        t.capturas.add(this.add.image(cx + lado / 2, 0, texturaPieza(p)).setDisplaySize(lado, lado));
        cx += lado * 0.6;
      });
      // Si hay muchas capturas, se encogen para no invadir el reloj.
      const anchoDisponible = ancho - (t.capturas.x - x) - (this.minutos > 0 ? 200 : 30) - 70;
      const escala = cx > anchoDisponible ? anchoDisponible / cx : 1;
      t.capturas.setScale(escala);
      const propia = color === CLARAS ? ventaja : -ventaja;
      t.ventaja.setText(propia > 0 ? `+${propia}` : '');
      t.ventaja.setPosition(t.capturas.x + cx * escala + (capturadas.length > 0 ? 24 : 0), t.capturas.y);
    }
  }

  private actualizarEstado(): void {
    const { x, y, ancho, alto } = this.diseno.estado;
    let texto: string;
    let color: number = COLORES.verde;
    const turno = this.partida.turno;
    if (this.terminado) {
      texto = this.textoResultado(this.terminado).titulo;
      color = COLORES.madera;
    } else if (this.iaPensando) {
      texto = `La Capi-IA está pensando${'.'.repeat(this.puntosPensando)}`;
      color = COLORES.verdeOscuro;
    } else if (this.partida.enJaque()) {
      texto = this.modo === 'contra-ia' ? '¡Jaque! Salva a tu rey' : `¡Jaque a las ${turno === CLARAS ? 'Claras' : 'Oscuras'}!`;
      color = COLORES.jaque;
    } else if (this.modo === 'contra-ia') {
      texto = 'Tu turno: mueven las Claras';
    } else {
      texto = `Turno de las ${turno === CLARAS ? 'Claras' : 'Oscuras'}`;
      color = turno === CLARAS ? COLORES.verde : COLORES.maderaOscura;
    }
    this.fondoEstado.clear();
    this.fondoEstado.fillStyle(COLORES.sombra, 0.18);
    this.fondoEstado.fillRoundedRect(x, y + 5, ancho, alto, alto / 2);
    this.fondoEstado.fillStyle(color, 1);
    this.fondoEstado.fillRoundedRect(x, y, ancho, alto, alto / 2);
    if (this.textoEstado.text !== texto) {
      this.textoEstado.setText(texto);
      if (color === COLORES.jaque) {
        this.tweens.add({ targets: this.textoEstado, scale: { from: 1.25, to: 1 }, duration: 300, ease: 'Back.easeOut' });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Coronación
  // ---------------------------------------------------------------------------

  /** Muestra el modal con las cuatro capibaras. Llama a alElegir con el tipo, o 0 si se cancela. */
  private elegirCoronacion(color: Color, alElegir: (tipo: number) => void): void {
    const vertical = esVertical(this);
    const ancho = vertical ? 820 : 1000;
    const alto = vertical ? 900 : 620;
    const modal = new Modal(this, ancho, alto, '¡Coronación!', 'Elige en qué se convierte tu Capibebé');
    this.modalAbierto = modal;
    const opciones: [number, string][] = [
      [DAMA, 'Reina'],
      [TORRE, 'Capi-Torre'],
      [ALFIL, 'Capi-Obispo'],
      [CABALLO, 'Caballero'],
    ];
    const cerrar = (tipo: number) => {
      this.modalAbierto = null;
      modal.cerrar(() => alElegir(tipo));
    };
    const lado = vertical ? 300 : 210;
    opciones.forEach(([tipo, nombre], i) => {
      const bx = vertical ? (i % 2 === 0 ? -165 : 165) : -330 + i * 220;
      const by = vertical ? (i < 2 ? -70 : 250) : 40;
      modal.panel.add(
        new Boton(this, bx, by, {
          ancho: vertical ? 300 : 200,
          alto: lado,
          texto: nombre,
          icono: texturaPieza(color | tipo),
          iconoArriba: true,
          tamanoIcono: lado * 0.62,
          tamanoTexto: 28,
          color: COLORES.beige,
          colorTexto: TEXTO.marron,
          alPulsar: () => cerrar(tipo),
        }),
      );
    });
    modal.panel.add(
      new Boton(this, 0, alto / 2 - 80, {
        ancho: 280,
        alto: ALTO_TACTIL,
        texto: 'Cancelar',
        color: COLORES.madera,
        tamanoTexto: 30,
        alPulsar: () => cerrar(0),
      }),
    );
  }

  // ---------------------------------------------------------------------------
  // Fin de partida
  // ---------------------------------------------------------------------------

  private textoResultado(r: ResultadoPartida): { titulo: string; detalle: string } {
    const nombre = (c: Color) => (c === CLARAS ? 'las Claras' : 'las Oscuras');
    const ganador = r.ganador;
    const contraIA = this.modo === 'contra-ia';
    const quienGana =
      ganador === null
        ? ''
        : contraIA
          ? ganador === CLARAS
            ? '¡Le ganaste a la Capi-IA!'
            : 'La Capi-IA gana esta vez.'
          : `¡Ganan ${nombre(ganador)}!`;
    switch (r.motivo) {
      case 'jaque-mate':
        return { titulo: '¡Jaque mate!', detalle: quienGana };
      case 'ahogado':
        return { titulo: '¡Rey ahogado!', detalle: 'Tablas: no quedan jugadas legales, pero el rey no está en jaque.' };
      case 'material-insuficiente':
        return { titulo: 'Tablas', detalle: 'Material insuficiente: ya nadie puede dar jaque mate.' };
      case 'triple-repeticion':
        return { titulo: 'Tablas', detalle: 'La misma posición se repitió tres veces.' };
      case 'cincuenta-movimientos':
        return { titulo: 'Tablas', detalle: '50 jugadas sin capturas ni movimientos de Capibebés.' };
      case 'tiempo': {
        const sinTiempo = ganador === null ? this.partida.turno : colorContrario(ganador);
        const base = `Se acabó el tiempo de ${nombre(sinTiempo)}.`;
        return {
          titulo: '¡Tiempo agotado!',
          detalle: ganador === null ? `${base} Tablas: el rival no tiene material para dar mate.` : `${base} ${quienGana}`,
        };
      }
    }
  }

  private finalizar(resultado: ResultadoPartida): void {
    this.terminado = resultado;
    this.seleccion = -1;
    this.destinos = [];
    this.arrastre = null;
    borrarPartida();
    this.actualizarTodo();
    if (resultado.ganador === null) sonidos.tablas();
    else if (this.modo === 'contra-ia' && resultado.ganador === OSCURAS) sonidos.derrota();
    else sonidos.victoria();
    this.time.delayedCall(resultado.motivo === 'jaque-mate' ? 900 : 500, () => this.mostrarFinal(true));
  }

  private mostrarFinal(celebrar: boolean): void {
    const r = this.terminado;
    if (!r || this.modalAbierto) return;
    const { titulo, detalle } = this.textoResultado(r);
    const vertical = esVertical(this);
    const ancho = vertical ? 800 : 860;
    const alto = vertical ? 860 : 780;
    const modal = new Modal(this, ancho, alto, titulo, detalle);
    this.modalAbierto = modal;

    // Retrato del ganador (o de ambos reyes si son tablas).
    // Debajo del título y del detalle (que puede ocupar dos líneas).
    const yRetrato = -alto / 2 + 300;
    const reyes = r.ganador === null ? [CLARAS, OSCURAS] : [r.ganador];
    reyes.forEach((c, i) => {
      const x = reyes.length === 1 ? 0 : i === 0 ? -100 : 100;
      const rey = this.add.image(x, yRetrato, texturaPieza(c | 6)).setDisplaySize(150, 150);
      modal.panel.add(rey);
      this.tweens.add({ targets: rey, y: yRetrato - 16, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 200 });
    });

    const cerrar = (accion: () => void) => {
      this.modalAbierto = null;
      modal.cerrar(accion);
    };
    const yBotones = yRetrato + 170;
    modal.panel.add([
      new Boton(this, 0, yBotones, {
        ancho: 520, alto: ALTO_TACTIL + 6, texto: 'Nueva partida', icono: 'icono-jugar', color: COLORES.verde, tamanoTexto: 36,
        alPulsar: () => cerrar(() => this.reiniciar()),
      }),
      new Boton(this, 0, yBotones + 124, {
        ancho: 520, alto: ALTO_TACTIL + 6, texto: 'Menú principal', icono: 'icono-menu', color: COLORES.verdeOscuro, tamanoTexto: 36,
        alPulsar: () => cerrar(() => this.irAlMenu()),
      }),
      new Boton(this, 0, yBotones + 236, {
        ancho: 340, alto: ALTO_TACTIL - 10, texto: 'Ver tablero', color: COLORES.beige, colorTexto: TEXTO.marron, tamanoTexto: 28,
        alPulsar: () => cerrar(() => this.actualizarTodo()),
      }),
    ]);

    if (celebrar && r.motivo === 'jaque-mate') this.celebrar();
  }

  /** Lluvia de confeti y hojas para celebrar el jaque mate. */
  private celebrar(): void {
    const { width } = this.scale;
    const confeti = this.add.particles(0, -20, 'confeti', {
      x: { min: 0, max: width },
      speedY: { min: 220, max: 420 },
      speedX: { min: -80, max: 80 },
      rotate: { min: 0, max: 360 },
      lifespan: 3200,
      quantity: 3,
      frequency: 40,
      scale: { min: 1, max: 2 },
      tint: [0xf5c542, 0xe04848, 0x6cc04a, 0x3a7bd5, 0xfff6e5, 0x7d3fa3],
      gravityY: 120,
      duration: 2600,
    }).setDepth(1100);
    const hojas = this.add.particles(0, -20, 'hoja', {
      x: { min: 0, max: width },
      speedY: { min: 120, max: 260 },
      speedX: { min: -60, max: 60 },
      rotate: { start: 0, end: 540 },
      lifespan: 4200,
      frequency: 160,
      scale: { min: 1.2, max: 2.2 },
      tint: [0x6cc04a, 0x8fd46b, 0x2f6b3a],
      duration: 2600,
    }).setDepth(1100);
    this.time.delayedCall(7500, () => {
      confeti.destroy();
      hojas.destroy();
    });
  }

  private explosion(x: number, y: number, colores: number[], cantidad: number): void {
    const emisor = this.add.particles(x, y, 'particula', {
      speed: { min: 120, max: 320 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.9, end: 0 },
      lifespan: 520,
      tint: colores,
      gravityY: 400,
      emitting: false,
    }).setDepth(45);
    emisor.explode(cantidad);
    this.time.delayedCall(800, () => emisor.destroy());
  }

  // ---------------------------------------------------------------------------
  // Guardado
  // ---------------------------------------------------------------------------

  private instantanea(): PartidaGuardada {
    return {
      version: 1,
      modo: this.modo,
      dificultad: this.dificultad,
      minutos: this.minutos,
      tiempos: [...this.tiempos],
      fenInicial: this.partida.fenInicial,
      jugadas: this.partida.jugadasUci(),
      girado: this.girado,
    };
  }

  /** Guarda la partida en curso. Las terminadas o sin jugadas no se guardan. */
  private guardar(): void {
    if (this.terminado || this.partida.historial.length === 0) {
      borrarPartida();
      return;
    }
    guardarPartida(this.instantanea());
  }
}
