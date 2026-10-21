/**
 * Claves de Zobrist para identificar posiciones.
 * Se usan dos claves de 32 bits (A y B) para tener 64 bits efectivos:
 * sirven para detectar repeticiones y para la tabla de transposición de la IA.
 */

function generador(semilla: number): () => number {
  let estado = semilla >>> 0;
  return () => {
    // mulberry32: rápido, determinista y suficiente para claves de hash.
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) | 0;
  };
}

function tabla(azar: () => number, tamano: number): Int32Array {
  const t = new Int32Array(tamano);
  for (let i = 0; i < tamano; i++) t[i] = azar();
  return t;
}

const azarA = generador(0xc4b1ba7a);
const azarB = generador(0x5eed1234);

/** Índice: pieza (0..15) * 64 + casilla. */
export const Z_PIEZA_A = tabla(azarA, 16 * 64);
export const Z_PIEZA_B = tabla(azarB, 16 * 64);
/** Índice: máscara de derechos de enroque (0..15). */
export const Z_ENROQUE_A = tabla(azarA, 16);
export const Z_ENROQUE_B = tabla(azarB, 16);
/** Índice: columna de la casilla de captura al paso. */
export const Z_AL_PASO_A = tabla(azarA, 8);
export const Z_AL_PASO_B = tabla(azarB, 8);
export const Z_TURNO_A = azarA();
export const Z_TURNO_B = azarB();
