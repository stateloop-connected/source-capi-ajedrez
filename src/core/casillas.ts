/**
 * Utilidades de casillas y tablas precalculadas de ataques.
 */

export const COLUMNAS = 'abcdefgh';

export function columna(casilla: number): number {
  return casilla & 7;
}

export function fila(casilla: number): number {
  return casilla >> 3;
}

export function casillaDe(col: number, fil: number): number {
  return fil * 8 + col;
}

export function nombreCasilla(casilla: number): string {
  return COLUMNAS[columna(casilla)] + String(fila(casilla) + 1);
}

/** Convierte "e4" en su índice. Devuelve -1 si el nombre no es válido. */
export function indiceCasilla(nombre: string): number {
  if (nombre.length !== 2) return -1;
  const col = COLUMNAS.indexOf(nombre[0]);
  const fil = nombre.charCodeAt(1) - 49;
  if (col < 0 || fil < 0 || fil > 7) return -1;
  return casillaDe(col, fil);
}

/** Indica si la casilla es clara (a1 es oscura). */
export function esCasillaClara(casilla: number): boolean {
  return (columna(casilla) + fila(casilla)) % 2 === 1;
}

function dentro(col: number, fil: number): boolean {
  return col >= 0 && col < 8 && fil >= 0 && fil < 8;
}

function saltos(desplazamientos: readonly (readonly [number, number])[]): number[][] {
  const tabla: number[][] = [];
  for (let c = 0; c < 64; c++) {
    const lista: number[] = [];
    for (const [dc, df] of desplazamientos) {
      const nc = columna(c) + dc;
      const nf = fila(c) + df;
      if (dentro(nc, nf)) lista.push(casillaDe(nc, nf));
    }
    tabla.push(lista);
  }
  return tabla;
}

/** Casillas alcanzables por un caballo desde cada casilla. */
export const SALTOS_CABALLO = saltos([
  [1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2],
]);

/** Casillas alcanzables por un rey desde cada casilla. */
export const PASOS_REY = saltos([
  [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1],
]);

/** Casillas que ataca un peón claro (índice 0) u oscuro (índice 1) desde cada casilla. */
export const ATAQUES_PEON: readonly number[][][] = [
  saltos([[-1, 1], [1, 1]]),
  saltos([[-1, -1], [1, -1]]),
];

/**
 * Rayos de las piezas deslizantes: RAYOS[casilla][direccion] es la lista ordenada
 * de casillas en esa dirección. Las direcciones 0..3 son ortogonales y 4..7 diagonales.
 */
export const RAYOS: readonly number[][][] = (() => {
  const direcciones: [number, number][] = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1],
  ];
  const tabla: number[][][] = [];
  for (let c = 0; c < 64; c++) {
    const porDireccion: number[][] = [];
    for (const [dc, df] of direcciones) {
      const rayo: number[] = [];
      let nc = columna(c) + dc;
      let nf = fila(c) + df;
      while (dentro(nc, nf)) {
        rayo.push(casillaDe(nc, nf));
        nc += dc;
        nf += df;
      }
      porDireccion.push(rayo);
    }
    tabla.push(porDireccion);
  }
  return tabla;
})();
