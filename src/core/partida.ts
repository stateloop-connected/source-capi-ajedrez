/**
 * Partida completa: posición, historial con SAN, deshacer y detección del final.
 */
import { FEN_INICIAL, Posicion } from './posicion';
import { aSan, aUci, desdeSan, desdeUci } from './san';
import { CLARAS, OSCURAS, VALOR_MATERIAL, colorContrario, type Color, type Movimiento } from './tipos';

export type MotivoFin =
  | 'jaque-mate'
  | 'ahogado'
  | 'material-insuficiente'
  | 'triple-repeticion'
  | 'cincuenta-movimientos'
  | 'tiempo';

export interface ResultadoPartida {
  /** Color ganador o null si son tablas. */
  ganador: Color | null;
  motivo: MotivoFin;
}

export interface JugadaRegistrada {
  movimiento: Movimiento;
  san: string;
  uci: string;
}

export class Partida {
  readonly fenInicial: string;
  readonly posicion: Posicion;
  private readonly jugadas: JugadaRegistrada[] = [];
  private legalesEnCache: Movimiento[] | null = null;

  constructor(fen: string = FEN_INICIAL) {
    this.posicion = new Posicion(fen);
    this.fenInicial = this.posicion.fen();
  }

  /** Reconstruye una partida a partir de su FEN inicial y la lista de jugadas en UCI. */
  static desdeJugadas(fenInicial: string, jugadasUci: readonly string[]): Partida {
    const partida = new Partida(fenInicial);
    for (const uci of jugadasUci) {
      if (!partida.jugarUci(uci)) throw new Error(`Jugada ilegal al reconstruir la partida: ${uci}`);
    }
    return partida;
  }

  get turno(): Color {
    return this.posicion.turno;
  }

  get historial(): readonly JugadaRegistrada[] {
    return this.jugadas;
  }

  fen(): string {
    return this.posicion.fen();
  }

  jugadasUci(): string[] {
    return this.jugadas.map((j) => j.uci);
  }

  ultimaJugada(): JugadaRegistrada | null {
    return this.jugadas.length > 0 ? this.jugadas[this.jugadas.length - 1] : null;
  }

  movimientosLegales(): Movimiento[] {
    if (!this.legalesEnCache) this.legalesEnCache = this.posicion.movimientosLegales();
    return this.legalesEnCache;
  }

  movimientosDesde(casilla: number): Movimiento[] {
    return this.movimientosLegales().filter((m) => m.desde === casilla);
  }

  /** Busca un movimiento legal. Si hay coronación y no se indica pieza, devuelve null. */
  buscarMovimiento(desde: number, hasta: number, coronacion = 0): Movimiento | null {
    return (
      this.movimientosLegales().find(
        (m) => m.desde === desde && m.hasta === hasta && m.coronacion === coronacion,
      ) ?? null
    );
  }

  /** Indica si mover de 'desde' a 'hasta' es una coronación (requiere elegir pieza). */
  esCoronacion(desde: number, hasta: number): boolean {
    return this.movimientosLegales().some((m) => m.desde === desde && m.hasta === hasta && m.coronacion !== 0);
  }

  /** Juega un movimiento legal y lo registra. Devuelve null si no es legal o la partida terminó. */
  jugar(m: Movimiento): JugadaRegistrada | null {
    if (this.resultado()) return null;
    const legales = this.movimientosLegales();
    const legal = legales.find(
      (o) => o.desde === m.desde && o.hasta === m.hasta && o.coronacion === m.coronacion,
    );
    if (!legal) return null;
    const jugada: JugadaRegistrada = { movimiento: legal, san: aSan(this.posicion, legal, legales), uci: aUci(legal) };
    this.posicion.hacer(legal);
    this.jugadas.push(jugada);
    this.legalesEnCache = null;
    return jugada;
  }

  jugarSan(san: string): JugadaRegistrada | null {
    const m = desdeSan(this.posicion, san);
    return m ? this.jugar(m) : null;
  }

  jugarUci(uci: string): JugadaRegistrada | null {
    const m = desdeUci(this.posicion, uci);
    return m ? this.jugar(m) : null;
  }

  deshacer(): JugadaRegistrada | null {
    const jugada = this.jugadas.pop();
    if (!jugada) return null;
    this.posicion.deshacer();
    this.legalesEnCache = null;
    return jugada;
  }

  enJaque(): boolean {
    return this.posicion.enJaque();
  }

  /** Resultado de la partida según las reglas (sin contar el reloj), o null si sigue. */
  resultado(): ResultadoPartida | null {
    const pos = this.posicion;
    if (this.movimientosLegales().length === 0) {
      return pos.enJaque()
        ? { ganador: colorContrario(pos.turno), motivo: 'jaque-mate' }
        : { ganador: null, motivo: 'ahogado' };
    }
    if (pos.medioMovs >= 100) return { ganador: null, motivo: 'cincuenta-movimientos' };
    if (pos.materialInsuficiente()) return { ganador: null, motivo: 'material-insuficiente' };
    if (pos.vecesRepetida() >= 3) return { ganador: null, motivo: 'triple-repeticion' };
    return null;
  }

  /** Resultado cuando a un bando se le acaba el tiempo. */
  resultadoPorTiempo(sinTiempo: Color): ResultadoPartida {
    const rival = colorContrario(sinTiempo);
    return {
      ganador: this.posicion.tieneMaterialParaMatar(rival) ? rival : null,
      motivo: 'tiempo',
    };
  }

  /** Piezas capturadas por cada bando, en orden de captura. */
  capturas(): { porClaras: number[]; porOscuras: number[] } {
    const porClaras: number[] = [];
    const porOscuras: number[] = [];
    for (const j of this.jugadas) {
      if (j.movimiento.capturada === 0) continue;
      if ((j.movimiento.pieza & 8) === CLARAS) porClaras.push(j.movimiento.capturada);
      else porOscuras.push(j.movimiento.capturada);
    }
    return { porClaras, porOscuras };
  }

  /** Ventaja de material de las claras (negativa si van ganando las oscuras). */
  ventajaMaterial(): number {
    let suma = 0;
    for (const p of this.posicion.tablero) {
      if (p === 0) continue;
      suma += (p & 8) === OSCURAS ? -VALOR_MATERIAL[p & 7] : VALOR_MATERIAL[p & 7];
    }
    return suma;
  }
}
