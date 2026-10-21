/**
 * Guardado de la partida en curso y de las preferencias en localStorage.
 * Todas las lecturas y escrituras están protegidas: si el almacenamiento no está
 * disponible (modo privado, cuota llena), el juego sigue funcionando sin guardar.
 */
import type { Dificultad } from '../ai/ia';

export type ModoJuego = 'dos-jugadores' | 'contra-ia';
/** Minutos por bando; 0 significa sin reloj. */
export type MinutosReloj = 0 | 5 | 10;

export interface PartidaGuardada {
  version: 1;
  modo: ModoJuego;
  dificultad: Dificultad;
  minutos: MinutosReloj;
  /** Milisegundos restantes de [claras, oscuras]. */
  tiempos: [number, number];
  fenInicial: string;
  jugadas: string[];
  girado: boolean;
}

export interface Preferencias {
  sonido: boolean;
  dificultad: Dificultad;
  minutos: MinutosReloj;
}

const CLAVE_PARTIDA = 'capi-ajedrez:partida';
const CLAVE_PREFERENCIAS = 'capi-ajedrez:preferencias';

const PREFERENCIAS_POR_DEFECTO: Preferencias = { sonido: true, dificultad: 'medio', minutos: 0 };

function leer(clave: string): unknown {
  try {
    const texto = localStorage.getItem(clave);
    return texto ? JSON.parse(texto) : null;
  } catch {
    return null;
  }
}

function escribir(clave: string, valor: unknown): void {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // Sin almacenamiento disponible: se ignora.
  }
}

function esDificultad(valor: unknown): valor is Dificultad {
  return valor === 'facil' || valor === 'medio' || valor === 'dificil';
}

function esMinutos(valor: unknown): valor is MinutosReloj {
  return valor === 0 || valor === 5 || valor === 10;
}

export function cargarPreferencias(): Preferencias {
  const datos = leer(CLAVE_PREFERENCIAS) as Partial<Preferencias> | null;
  return {
    sonido: typeof datos?.sonido === 'boolean' ? datos.sonido : PREFERENCIAS_POR_DEFECTO.sonido,
    dificultad: esDificultad(datos?.dificultad) ? datos.dificultad : PREFERENCIAS_POR_DEFECTO.dificultad,
    minutos: esMinutos(datos?.minutos) ? datos.minutos : PREFERENCIAS_POR_DEFECTO.minutos,
  };
}

export function guardarPreferencias(cambios: Partial<Preferencias>): Preferencias {
  const nuevas = { ...cargarPreferencias(), ...cambios };
  escribir(CLAVE_PREFERENCIAS, nuevas);
  return nuevas;
}

export function guardarPartida(partida: PartidaGuardada): void {
  escribir(CLAVE_PARTIDA, partida);
}

/** Devuelve la partida guardada si existe y tiene un formato válido. */
export function cargarPartida(): PartidaGuardada | null {
  const datos = leer(CLAVE_PARTIDA) as Partial<PartidaGuardada> | null;
  if (
    !datos ||
    datos.version !== 1 ||
    (datos.modo !== 'dos-jugadores' && datos.modo !== 'contra-ia') ||
    !esDificultad(datos.dificultad) ||
    !esMinutos(datos.minutos) ||
    !Array.isArray(datos.tiempos) ||
    typeof datos.fenInicial !== 'string' ||
    !Array.isArray(datos.jugadas)
  ) {
    return null;
  }
  return datos as PartidaGuardada;
}

export function borrarPartida(): void {
  try {
    localStorage.removeItem(CLAVE_PARTIDA);
  } catch {
    // Sin almacenamiento disponible: se ignora.
  }
}
