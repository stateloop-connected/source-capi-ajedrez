/**
 * Búsqueda de la Capi-IA: negamax con poda alfa-beta, búsqueda de quietud,
 * ordenamiento de movimientos (MVV-LVA, killers e historia), tabla de transposición
 * y profundización iterativa con límite de tiempo.
 */
import type { Movimiento, Posicion } from '../core';
import { VALOR_PIEZA, evaluar } from './evaluacion';

export const PUNTUACION_MATE = 100_000;
/** Puntuaciones por encima de este umbral significan mate en N. */
const UMBRAL_MATE = PUNTUACION_MATE - 1_000;
const INFINITO = 1_000_000;
const PLY_MAXIMO = 64;

const EXACTA = 1;
const COTA_INFERIOR = 2;
const COTA_SUPERIOR = 3;

export interface OpcionesBusqueda {
  profundidadMaxima: number;
  tiempoMs: number;
}

export interface ResultadoBusqueda {
  movimiento: Movimiento | null;
  puntuacion: number;
  profundidad: number;
  nodos: number;
}

function ahora(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

/** Codifica un movimiento en un entero (0 significa "ninguno"). */
function codigo(m: Movimiento): number {
  return 1 + m.desde + (m.hasta << 6) + (m.coronacion << 12);
}

/** Tabla de transposición de tamaño fijo con arreglos tipados. */
class TablaTransposicion {
  private readonly mascara: number;
  private readonly verificacion: Int32Array;
  private readonly profundidad: Int8Array;
  private readonly puntuacion: Int32Array;
  private readonly tipo: Int8Array;
  private readonly movimiento: Int32Array;

  constructor(bits: number) {
    const tamano = 1 << bits;
    this.mascara = tamano - 1;
    this.verificacion = new Int32Array(tamano);
    this.profundidad = new Int8Array(tamano);
    this.puntuacion = new Int32Array(tamano);
    this.tipo = new Int8Array(tamano);
    this.movimiento = new Int32Array(tamano);
  }

  limpiar(): void {
    this.tipo.fill(0);
  }

  /** Devuelve el índice de la entrada si corresponde a la posición, o -1. */
  buscar(hashA: number, hashB: number): number {
    const i = hashA & this.mascara;
    return this.tipo[i] !== 0 && this.verificacion[i] === hashB ? i : -1;
  }

  guardar(hashA: number, hashB: number, prof: number, punt: number, tipo: number, mov: number): void {
    const i = hashA & this.mascara;
    // Reemplazo simple: se prefiere conservar las entradas más profundas de la misma posición.
    if (this.tipo[i] !== 0 && this.verificacion[i] === hashB && this.profundidad[i] > prof && tipo !== EXACTA) return;
    this.verificacion[i] = hashB;
    this.profundidad[i] = prof;
    this.puntuacion[i] = punt;
    this.tipo[i] = tipo;
    this.movimiento[i] = mov;
  }

  profundidadDe(i: number): number {
    return this.profundidad[i];
  }
  puntuacionDe(i: number): number {
    return this.puntuacion[i];
  }
  tipoDe(i: number): number {
    return this.tipo[i];
  }
  movimientoDe(i: number): number {
    return this.movimiento[i];
  }
}

/** Ajusta las puntuaciones de mate para guardarlas relativas al nodo y no a la raíz. */
function aTabla(punt: number, ply: number): number {
  if (punt > UMBRAL_MATE) return punt + ply;
  if (punt < -UMBRAL_MATE) return punt - ply;
  return punt;
}

function desdeTabla(punt: number, ply: number): number {
  if (punt > UMBRAL_MATE) return punt - ply;
  if (punt < -UMBRAL_MATE) return punt + ply;
  return punt;
}

export class Buscador {
  private readonly tabla = new TablaTransposicion(18);
  private readonly killers = new Int32Array(PLY_MAXIMO * 2);
  private readonly historia = new Int32Array(64 * 64);
  private nodos = 0;
  private limite = 0;
  private abortado = false;
  private mejorRaiz: Movimiento | null = null;
  private puntuacionRaiz = 0;

  /** Busca el mejor movimiento con profundización iterativa. */
  buscar(pos: Posicion, opciones: OpcionesBusqueda): ResultadoBusqueda {
    this.nodos = 0;
    this.abortado = false;
    this.limite = ahora() + opciones.tiempoMs;
    this.killers.fill(0);
    this.historia.fill(0);
    this.tabla.limpiar();

    const legales = pos.movimientosLegales();
    let resultado: ResultadoBusqueda = {
      movimiento: legales[0] ?? null,
      puntuacion: 0,
      profundidad: 0,
      nodos: 0,
    };
    if (legales.length <= 1) return resultado;

    for (let prof = 1; prof <= opciones.profundidadMaxima; prof++) {
      this.mejorRaiz = null;
      const puntuacion = this.alfaBeta(pos, prof, -INFINITO, INFINITO, 0);
      // Si la iteración se cortó, solo sirve el mejor movimiento si llegó a evaluarse alguno.
      if (this.mejorRaiz) {
        resultado = {
          movimiento: this.mejorRaiz,
          puntuacion: this.abortado ? this.puntuacionRaiz : puntuacion,
          profundidad: prof,
          nodos: this.nodos,
        };
      }
      if (this.abortado) break;
      // Un mate encontrado no va a mejorar buscando más profundo.
      if (Math.abs(puntuacion) > UMBRAL_MATE) break;
    }
    resultado.nodos = this.nodos;
    return resultado;
  }

  private comprobarTiempo(): void {
    if ((++this.nodos & 1023) === 0 && ahora() > this.limite) this.abortado = true;
  }

  private alfaBeta(pos: Posicion, prof: number, alfa: number, beta: number, ply: number): number {
    this.comprobarTiempo();
    if (this.abortado) return 0;

    if (ply > 0) {
      if (pos.medioMovs >= 100 || pos.vecesRepetida() >= 2 || pos.materialInsuficiente()) return 0;
      // Poda por distancia de mate: no hace falta buscar mates más largos que uno ya encontrado.
      alfa = Math.max(alfa, -PUNTUACION_MATE + ply);
      beta = Math.min(beta, PUNTUACION_MATE - ply - 1);
      if (alfa >= beta) return alfa;
    }

    const enJaque = pos.enJaque();
    if (enJaque) prof++; // Extensión de jaque: no se corta la búsqueda en medio de un ataque.
    if (prof <= 0 || ply >= PLY_MAXIMO - 1) return this.quietud(pos, alfa, beta, ply);

    let movimientoTabla = 0;
    const entrada = this.tabla.buscar(pos.hashA, pos.hashB);
    if (entrada >= 0) {
      movimientoTabla = this.tabla.movimientoDe(entrada);
      if (ply > 0 && this.tabla.profundidadDe(entrada) >= prof) {
        const punt = desdeTabla(this.tabla.puntuacionDe(entrada), ply);
        const tipo = this.tabla.tipoDe(entrada);
        if (tipo === EXACTA) return punt;
        if (tipo === COTA_INFERIOR && punt >= beta) return punt;
        if (tipo === COTA_SUPERIOR && punt <= alfa) return punt;
      }
    }

    const movimientos = this.ordenar(pos.generarPseudoLegales(), movimientoTabla, ply);
    const alfaOriginal = alfa;
    let mejor = -INFINITO;
    let mejorCodigo = 0;
    let legales = 0;

    for (const m of movimientos) {
      pos.hacer(m);
      if (pos.dejoReyEnJaque()) {
        pos.deshacer();
        continue;
      }
      legales++;
      const punt = -this.alfaBeta(pos, prof - 1, -beta, -alfa, ply + 1);
      pos.deshacer();
      if (this.abortado) return 0;

      if (punt > mejor) {
        mejor = punt;
        mejorCodigo = codigo(m);
        if (ply === 0) {
          this.mejorRaiz = m;
          this.puntuacionRaiz = punt;
        }
      }
      if (punt > alfa) alfa = punt;
      if (alfa >= beta) {
        if (m.capturada === 0 && m.coronacion === 0) this.registrarCorte(m, prof, ply);
        break;
      }
    }

    if (legales === 0) return enJaque ? -PUNTUACION_MATE + ply : 0;

    const tipo = mejor <= alfaOriginal ? COTA_SUPERIOR : mejor >= beta ? COTA_INFERIOR : EXACTA;
    this.tabla.guardar(pos.hashA, pos.hashB, prof, aTabla(mejor, ply), tipo, mejorCodigo);
    return mejor;
  }

  /** Búsqueda de quietud: solo capturas y coronaciones, para no evaluar en medio de un cambio. */
  private quietud(pos: Posicion, alfa: number, beta: number, ply: number): number {
    this.comprobarTiempo();
    if (this.abortado) return 0;

    const estatica = evaluar(pos);
    if (estatica >= beta) return estatica;
    if (estatica > alfa) alfa = estatica;
    if (ply >= PLY_MAXIMO - 1) return estatica;

    const movimientos = this.ordenar(pos.generarPseudoLegales([], true), 0, ply);
    for (const m of movimientos) {
      pos.hacer(m);
      if (pos.dejoReyEnJaque()) {
        pos.deshacer();
        continue;
      }
      const punt = -this.quietud(pos, -beta, -alfa, ply + 1);
      pos.deshacer();
      if (this.abortado) return 0;
      if (punt >= beta) return punt;
      if (punt > alfa) alfa = punt;
    }
    return alfa;
  }

  private registrarCorte(m: Movimiento, prof: number, ply: number): void {
    const c = codigo(m);
    if (this.killers[ply * 2] !== c) {
      this.killers[ply * 2 + 1] = this.killers[ply * 2];
      this.killers[ply * 2] = c;
    }
    this.historia[m.desde * 64 + m.hasta] += prof * prof;
  }

  /**
   * Ordena los movimientos: primero el de la tabla de transposición, luego capturas
   * por MVV-LVA (víctima más valiosa, atacante menos valioso), coronaciones, killers e historia.
   */
  private ordenar(movimientos: Movimiento[], movimientoTabla: number, ply: number): Movimiento[] {
    const killer1 = ply < PLY_MAXIMO ? this.killers[ply * 2] : 0;
    const killer2 = ply < PLY_MAXIMO ? this.killers[ply * 2 + 1] : 0;
    const puntuados = movimientos.map((m) => {
      const c = codigo(m);
      let valor: number;
      if (c === movimientoTabla) valor = 10_000_000;
      else if (m.capturada !== 0) valor = 1_000_000 + VALOR_PIEZA[m.capturada & 7] * 10 - VALOR_PIEZA[m.pieza & 7] / 10;
      else if (m.coronacion !== 0) valor = 900_000 + VALOR_PIEZA[m.coronacion];
      else if (c === killer1) valor = 800_000;
      else if (c === killer2) valor = 700_000;
      else valor = Math.min(this.historia[m.desde * 64 + m.hasta], 600_000);
      return { m, valor };
    });
    puntuados.sort((a, b) => b.valor - a.valor);
    return puntuados.map((p) => p.m);
  }
}
