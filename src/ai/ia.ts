/**
 * Selección de jugada según la dificultad de la Capi-IA.
 */
import type { Movimiento, Posicion } from '../core';
import { Buscador } from './busqueda';
import { VALOR_PIEZA } from './evaluacion';

export type Dificultad = 'facil' | 'medio' | 'dificil';

/** Tiempo de reflexión del modo difícil. */
export const TIEMPO_DIFICIL_MS = 1500;

let buscador: Buscador | null = null;

function obtenerBuscador(): Buscador {
  if (!buscador) buscador = new Buscador();
  return buscador;
}

/**
 * Modo fácil: juega al azar, salvo que el rival "regale" una pieza
 * (una captura que no se puede recuperar o que gana material claramente).
 */
function jugadaFacil(pos: Posicion, legales: Movimiento[], azar: () => number): Movimiento {
  let regalo: Movimiento | null = null;
  let valorRegalo = 0;
  for (const m of legales) {
    if (m.capturada === 0) continue;
    const valorCapturada = VALOR_PIEZA[m.capturada & 7];
    pos.hacer(m);
    const defendida = pos.casillaAtacada(m.hasta, pos.turno);
    pos.deshacer();
    const ganancia = defendida ? valorCapturada - VALOR_PIEZA[m.pieza & 7] : valorCapturada;
    if (ganancia > 0 && ganancia > valorRegalo) {
      regalo = m;
      valorRegalo = ganancia;
    }
  }
  if (regalo) return regalo;
  return legales[Math.floor(azar() * legales.length)];
}

/** Elige la jugada de la IA para el bando al que le toca, o null si no hay jugadas. */
export function elegirMovimiento(
  pos: Posicion,
  dificultad: Dificultad,
  azar: () => number = Math.random,
): Movimiento | null {
  const legales = pos.movimientosLegales();
  if (legales.length === 0) return null;

  switch (dificultad) {
    case 'facil':
      return jugadaFacil(pos, legales, azar);
    case 'medio':
      return obtenerBuscador().buscar(pos, { profundidadMaxima: 2, tiempoMs: 5000 }).movimiento;
    case 'dificil':
      return obtenerBuscador().buscar(pos, { profundidadMaxima: 32, tiempoMs: TIEMPO_DIFICIL_MS }).movimiento;
  }
}

