/**
 * Posición de ajedrez: tablero, generación de movimientos, hacer/deshacer y FEN.
 * Es lógica pura, sin dependencias de Phaser, para poder probarla y usarla en el worker de la IA.
 */
import {
  ATAQUES_PEON,
  PASOS_REY,
  RAYOS,
  SALTOS_CABALLO,
  columna,
  esCasillaClara,
  fila,
  indiceCasilla,
  nombreCasilla,
} from './casillas';
import {
  ALFIL,
  BANDERA_AL_PASO,
  BANDERA_DOBLE_PASO,
  BANDERA_ENROQUE_CORTO,
  BANDERA_ENROQUE_LARGO,
  BANDERA_NORMAL,
  CABALLO,
  CLARAS,
  DAMA,
  ENROQUE_CLARAS_CORTO,
  ENROQUE_CLARAS_LARGO,
  ENROQUE_OSCURAS_CORTO,
  ENROQUE_OSCURAS_LARGO,
  LETRAS_FEN,
  OSCURAS,
  PEON,
  REY,
  TIPOS_CORONACION,
  TORRE,
  type Color,
  type Movimiento,
} from './tipos';
import {
  Z_AL_PASO_A,
  Z_AL_PASO_B,
  Z_ENROQUE_A,
  Z_ENROQUE_B,
  Z_PIEZA_A,
  Z_PIEZA_B,
  Z_TURNO_A,
  Z_TURNO_B,
} from './zobrist';

export const FEN_INICIAL = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/** Máscara que conserva los derechos de enroque al mover desde o hacia cada casilla. */
const MASCARA_ENROQUE = new Int8Array(64).fill(15);
MASCARA_ENROQUE[0] = 15 & ~ENROQUE_CLARAS_LARGO;
MASCARA_ENROQUE[4] = 15 & ~(ENROQUE_CLARAS_CORTO | ENROQUE_CLARAS_LARGO);
MASCARA_ENROQUE[7] = 15 & ~ENROQUE_CLARAS_CORTO;
MASCARA_ENROQUE[56] = 15 & ~ENROQUE_OSCURAS_LARGO;
MASCARA_ENROQUE[60] = 15 & ~(ENROQUE_OSCURAS_CORTO | ENROQUE_OSCURAS_LARGO);
MASCARA_ENROQUE[63] = 15 & ~ENROQUE_OSCURAS_CORTO;

interface EstadoPrevio {
  mov: Movimiento;
  enroques: number;
  alPaso: number;
  alPasoHash: number;
  medioMovs: number;
  hashA: number;
  hashB: number;
}

function crearMovimiento(
  desde: number,
  hasta: number,
  pieza: number,
  capturada: number,
  coronacion: number,
  bandera: number,
): Movimiento {
  return { desde, hasta, pieza, capturada, coronacion, bandera };
}

export class Posicion {
  readonly tablero = new Int8Array(64);
  turno: Color = CLARAS;
  enroques = 0;
  /** Casilla de captura al paso (la casilla que se salta el peón) o -1. */
  alPaso = -1;
  /** Columna de al paso incluida en el hash (solo si hay un peón que pueda capturar) o -1. */
  private alPasoHash = -1;
  /** Medios movimientos desde la última captura o movimiento de peón (regla de los 50). */
  medioMovs = 0;
  numJugada = 1;
  hashA = 0;
  hashB = 0;
  private readonly reyes = [4, 60];
  private readonly pila: EstadoPrevio[] = [];

  constructor(fen: string = FEN_INICIAL) {
    this.cargarFen(fen);
  }

  // ---------------------------------------------------------------------------
  // FEN
  // ---------------------------------------------------------------------------

  /** Carga una posición FEN. Lanza un Error si la cadena no es válida. */
  cargarFen(fen: string): void {
    const partes = fen.trim().split(/\s+/);
    if (partes.length < 4) throw new Error(`FEN incompleto: "${fen}"`);
    const [colocacion, turno, enroques, alPaso] = partes;
    const filas = colocacion.split('/');
    if (filas.length !== 8) throw new Error('El FEN debe tener 8 filas');

    this.tablero.fill(0);
    const reyesVistos = [0, 0];
    for (let i = 0; i < 8; i++) {
      const fil = 7 - i;
      let col = 0;
      for (const caracter of filas[i]) {
        if (caracter >= '1' && caracter <= '8') {
          col += Number(caracter);
          continue;
        }
        const tipo = LETRAS_FEN.indexOf(caracter.toLowerCase());
        if (tipo <= 0 || col > 7) throw new Error(`Carácter inválido en FEN: "${caracter}"`);
        const color = caracter === caracter.toLowerCase() ? OSCURAS : CLARAS;
        const casilla = fil * 8 + col;
        this.tablero[casilla] = color | tipo;
        if (tipo === REY) {
          this.reyes[color >> 3] = casilla;
          reyesVistos[color >> 3]++;
        }
        col++;
      }
      if (col !== 8) throw new Error(`La fila ${8 - i} del FEN no suma 8 casillas`);
    }
    if (reyesVistos[0] !== 1 || reyesVistos[1] !== 1) {
      throw new Error('Cada bando debe tener exactamente un rey');
    }

    if (turno !== 'w' && turno !== 'b') throw new Error('Turno inválido en FEN');
    this.turno = turno === 'w' ? CLARAS : OSCURAS;

    this.enroques = 0;
    if (enroques !== '-') {
      for (const c of enroques) {
        if (c === 'K') this.enroques |= ENROQUE_CLARAS_CORTO;
        else if (c === 'Q') this.enroques |= ENROQUE_CLARAS_LARGO;
        else if (c === 'k') this.enroques |= ENROQUE_OSCURAS_CORTO;
        else if (c === 'q') this.enroques |= ENROQUE_OSCURAS_LARGO;
        else throw new Error('Derechos de enroque inválidos en FEN');
      }
    }
    this.depurarEnroques();

    this.alPaso = alPaso === '-' ? -1 : indiceCasilla(alPaso);
    if (alPaso !== '-' && this.alPaso < 0) throw new Error('Casilla de al paso inválida en FEN');

    this.medioMovs = partes[4] !== undefined ? Number(partes[4]) || 0 : 0;
    this.numJugada = partes[5] !== undefined ? Math.max(1, Number(partes[5]) || 1) : 1;
    this.pila.length = 0;

    this.alPasoHash = this.alPaso >= 0 && this.peonPuedeCapturarAlPaso() ? columna(this.alPaso) : -1;
    this.recalcularHash();
  }

  /** Quita derechos de enroque imposibles (rey o torre fuera de su casilla inicial). */
  private depurarEnroques(): void {
    const t = this.tablero;
    if (t[4] !== (CLARAS | REY)) this.enroques &= ~(ENROQUE_CLARAS_CORTO | ENROQUE_CLARAS_LARGO);
    if (t[7] !== (CLARAS | TORRE)) this.enroques &= ~ENROQUE_CLARAS_CORTO;
    if (t[0] !== (CLARAS | TORRE)) this.enroques &= ~ENROQUE_CLARAS_LARGO;
    if (t[60] !== (OSCURAS | REY)) this.enroques &= ~(ENROQUE_OSCURAS_CORTO | ENROQUE_OSCURAS_LARGO);
    if (t[63] !== (OSCURAS | TORRE)) this.enroques &= ~ENROQUE_OSCURAS_CORTO;
    if (t[56] !== (OSCURAS | TORRE)) this.enroques &= ~ENROQUE_OSCURAS_LARGO;
  }

  fen(): string {
    const filas: string[] = [];
    for (let fil = 7; fil >= 0; fil--) {
      let texto = '';
      let vacias = 0;
      for (let col = 0; col < 8; col++) {
        const p = this.tablero[fil * 8 + col];
        if (p === 0) {
          vacias++;
          continue;
        }
        if (vacias > 0) texto += String(vacias);
        vacias = 0;
        const letra = LETRAS_FEN[p & 7];
        texto += (p & 8) === CLARAS ? letra.toUpperCase() : letra;
      }
      if (vacias > 0) texto += String(vacias);
      filas.push(texto);
    }
    let enroques = '';
    if (this.enroques & ENROQUE_CLARAS_CORTO) enroques += 'K';
    if (this.enroques & ENROQUE_CLARAS_LARGO) enroques += 'Q';
    if (this.enroques & ENROQUE_OSCURAS_CORTO) enroques += 'k';
    if (this.enroques & ENROQUE_OSCURAS_LARGO) enroques += 'q';
    return [
      filas.join('/'),
      this.turno === CLARAS ? 'w' : 'b',
      enroques || '-',
      this.alPaso >= 0 ? nombreCasilla(this.alPaso) : '-',
      String(this.medioMovs),
      String(this.numJugada),
    ].join(' ');
  }

  private recalcularHash(): void {
    let a = 0;
    let b = 0;
    for (let c = 0; c < 64; c++) {
      const p = this.tablero[c];
      if (p !== 0) {
        a ^= Z_PIEZA_A[p * 64 + c];
        b ^= Z_PIEZA_B[p * 64 + c];
      }
    }
    a ^= Z_ENROQUE_A[this.enroques];
    b ^= Z_ENROQUE_B[this.enroques];
    if (this.alPasoHash >= 0) {
      a ^= Z_AL_PASO_A[this.alPasoHash];
      b ^= Z_AL_PASO_B[this.alPasoHash];
    }
    if (this.turno === OSCURAS) {
      a ^= Z_TURNO_A;
      b ^= Z_TURNO_B;
    }
    this.hashA = a;
    this.hashB = b;
  }

  /** Indica si algún peón del bando al que le toca puede capturar en la casilla de al paso. */
  private peonPuedeCapturarAlPaso(): boolean {
    const peon = this.turno | PEON;
    for (const origen of ATAQUES_PEON[(this.turno ^ 8) >> 3][this.alPaso]) {
      if (this.tablero[origen] === peon) return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Consultas
  // ---------------------------------------------------------------------------

  casillaRey(color: Color): number {
    return this.reyes[color >> 3];
  }

  /** Indica si la casilla está atacada por alguna pieza del color indicado. */
  casillaAtacada(casilla: number, porColor: Color): boolean {
    const t = this.tablero;
    const peon = porColor | PEON;
    for (const o of ATAQUES_PEON[(porColor ^ 8) >> 3][casilla]) if (t[o] === peon) return true;
    const caballo = porColor | CABALLO;
    for (const o of SALTOS_CABALLO[casilla]) if (t[o] === caballo) return true;
    const rey = porColor | REY;
    for (const o of PASOS_REY[casilla]) if (t[o] === rey) return true;

    const dama = porColor | DAMA;
    const torre = porColor | TORRE;
    const alfil = porColor | ALFIL;
    const rayos = RAYOS[casilla];
    for (let d = 0; d < 8; d++) {
      const rayo = rayos[d];
      const deslizante = d < 4 ? torre : alfil;
      for (let i = 0; i < rayo.length; i++) {
        const q = t[rayo[i]];
        if (q !== 0) {
          if (q === dama || q === deslizante) return true;
          break;
        }
      }
    }
    return false;
  }

  enJaque(color: Color = this.turno): boolean {
    return this.casillaAtacada(this.reyes[color >> 3], (color ^ 8) as Color);
  }

  /**
   * Cuántas veces ha aparecido la posición actual (incluida la actual),
   * mirando solo hacia atrás hasta el último movimiento irreversible.
   */
  vecesRepetida(): number {
    let veces = 1;
    const n = this.pila.length;
    const limite = Math.max(0, n - this.medioMovs);
    for (let i = n - 2; i >= limite; i -= 2) {
      const e = this.pila[i];
      if (e.hashA === this.hashA && e.hashB === this.hashB) veces++;
    }
    return veces;
  }

  /**
   * Material insuficiente para dar mate: rey solo, rey y una pieza menor contra rey,
   * o solo alfiles (de cualquier bando) en casillas del mismo color.
   */
  materialInsuficiente(): boolean {
    let caballos = 0;
    let alfilesClaros = 0;
    let alfilesOscuros = 0;
    for (let c = 0; c < 64; c++) {
      const tipo = this.tablero[c] & 7;
      if (tipo === 0 || tipo === REY) continue;
      if (tipo === PEON || tipo === TORRE || tipo === DAMA) return false;
      if (tipo === CABALLO) caballos++;
      else if (esCasillaClara(c)) alfilesClaros++;
      else alfilesOscuros++;
    }
    const menores = caballos + alfilesClaros + alfilesOscuros;
    if (menores <= 1) return true;
    return caballos === 0 && (alfilesClaros === 0 || alfilesOscuros === 0);
  }

  /** Indica si el color tiene material suficiente para poder dar mate en teoría (para el tiempo agotado). */
  tieneMaterialParaMatar(color: Color): boolean {
    let menores = 0;
    for (let c = 0; c < 64; c++) {
      const p = this.tablero[c];
      if (p === 0 || (p & 8) !== color) continue;
      const tipo = p & 7;
      if (tipo === PEON || tipo === TORRE || tipo === DAMA) return true;
      if (tipo === CABALLO || tipo === ALFIL) menores++;
    }
    return menores >= 2;
  }

  // ---------------------------------------------------------------------------
  // Generación de movimientos
  // ---------------------------------------------------------------------------

  /**
   * Genera los movimientos pseudo-legales (pueden dejar al rey en jaque).
   * Con soloTacticos se generan solo capturas y coronaciones a dama (búsqueda de quietud).
   */
  generarPseudoLegales(lista: Movimiento[] = [], soloTacticos = false): Movimiento[] {
    const t = this.tablero;
    const color = this.turno;
    for (let c = 0; c < 64; c++) {
      const p = t[c];
      if (p === 0 || (p & 8) !== color) continue;
      switch (p & 7) {
        case PEON:
          this.generarPeon(c, p, lista, soloTacticos);
          break;
        case CABALLO:
          this.generarSaltos(c, p, SALTOS_CABALLO[c], lista, soloTacticos);
          break;
        case ALFIL:
          this.generarDeslizantes(c, p, 4, 8, lista, soloTacticos);
          break;
        case TORRE:
          this.generarDeslizantes(c, p, 0, 4, lista, soloTacticos);
          break;
        case DAMA:
          this.generarDeslizantes(c, p, 0, 8, lista, soloTacticos);
          break;
        case REY:
          this.generarSaltos(c, p, PASOS_REY[c], lista, soloTacticos);
          if (!soloTacticos) this.generarEnroques(c, p, lista);
          break;
      }
    }
    return lista;
  }

  private generarPeon(c: number, p: number, lista: Movimiento[], soloTacticos: boolean): void {
    const t = this.tablero;
    const color = p & 8;
    const avance = color === CLARAS ? 8 : -8;
    const filaInicial = color === CLARAS ? 1 : 6;
    const filaFinal = color === CLARAS ? 7 : 0;
    const enemigo = color ^ 8;

    const adelante = c + avance;
    if (t[adelante] === 0) {
      if (fila(adelante) === filaFinal) {
        this.agregarCoronaciones(c, adelante, p, 0, lista, soloTacticos);
      } else if (!soloTacticos) {
        lista.push(crearMovimiento(c, adelante, p, 0, 0, BANDERA_NORMAL));
        if (fila(c) === filaInicial && t[adelante + avance] === 0) {
          lista.push(crearMovimiento(c, adelante + avance, p, 0, 0, BANDERA_DOBLE_PASO));
        }
      }
    }

    for (const destino of ATAQUES_PEON[color >> 3][c]) {
      const q = t[destino];
      if (q !== 0 && (q & 8) === enemigo) {
        if (fila(destino) === filaFinal) this.agregarCoronaciones(c, destino, p, q, lista, soloTacticos);
        else lista.push(crearMovimiento(c, destino, p, q, 0, BANDERA_NORMAL));
      } else if (destino === this.alPaso) {
        lista.push(crearMovimiento(c, destino, p, enemigo | PEON, 0, BANDERA_AL_PASO));
      }
    }
  }

  private agregarCoronaciones(
    desde: number,
    hasta: number,
    p: number,
    capturada: number,
    lista: Movimiento[],
    soloDama: boolean,
  ): void {
    if (soloDama) {
      lista.push(crearMovimiento(desde, hasta, p, capturada, DAMA, BANDERA_NORMAL));
      return;
    }
    for (const tipo of TIPOS_CORONACION) {
      lista.push(crearMovimiento(desde, hasta, p, capturada, tipo, BANDERA_NORMAL));
    }
  }

  private generarSaltos(
    c: number,
    p: number,
    destinos: readonly number[],
    lista: Movimiento[],
    soloTacticos: boolean,
  ): void {
    const t = this.tablero;
    const color = p & 8;
    for (const d of destinos) {
      const q = t[d];
      if (q === 0) {
        if (!soloTacticos) lista.push(crearMovimiento(c, d, p, 0, 0, BANDERA_NORMAL));
      } else if ((q & 8) !== color) {
        lista.push(crearMovimiento(c, d, p, q, 0, BANDERA_NORMAL));
      }
    }
  }

  private generarDeslizantes(
    c: number,
    p: number,
    dirDesde: number,
    dirHasta: number,
    lista: Movimiento[],
    soloTacticos: boolean,
  ): void {
    const t = this.tablero;
    const color = p & 8;
    const rayos = RAYOS[c];
    for (let d = dirDesde; d < dirHasta; d++) {
      for (const destino of rayos[d]) {
        const q = t[destino];
        if (q === 0) {
          if (!soloTacticos) lista.push(crearMovimiento(c, destino, p, 0, 0, BANDERA_NORMAL));
          continue;
        }
        if ((q & 8) !== color) lista.push(crearMovimiento(c, destino, p, q, 0, BANDERA_NORMAL));
        break;
      }
    }
  }

  /**
   * Enroques: requieren el derecho (rey y torre sin mover), casillas intermedias vacías,
   * rey fuera de jaque y que no pase ni caiga en casillas atacadas.
   */
  private generarEnroques(c: number, p: number, lista: Movimiento[]): void {
    const t = this.tablero;
    const color = p & 8;
    const base = color === CLARAS ? 0 : 56;
    if (c !== base + 4) return;
    const enemigo = (color ^ 8) as Color;
    const derechoCorto = color === CLARAS ? ENROQUE_CLARAS_CORTO : ENROQUE_OSCURAS_CORTO;
    const derechoLargo = color === CLARAS ? ENROQUE_CLARAS_LARGO : ENROQUE_OSCURAS_LARGO;
    const torre = color | TORRE;

    if (
      this.enroques & derechoCorto &&
      t[base + 5] === 0 &&
      t[base + 6] === 0 &&
      t[base + 7] === torre &&
      !this.casillaAtacada(base + 4, enemigo) &&
      !this.casillaAtacada(base + 5, enemigo) &&
      !this.casillaAtacada(base + 6, enemigo)
    ) {
      lista.push(crearMovimiento(base + 4, base + 6, p, 0, 0, BANDERA_ENROQUE_CORTO));
    }
    if (
      this.enroques & derechoLargo &&
      t[base + 3] === 0 &&
      t[base + 2] === 0 &&
      t[base + 1] === 0 &&
      t[base] === torre &&
      !this.casillaAtacada(base + 4, enemigo) &&
      !this.casillaAtacada(base + 3, enemigo) &&
      !this.casillaAtacada(base + 2, enemigo)
    ) {
      lista.push(crearMovimiento(base + 4, base + 2, p, 0, 0, BANDERA_ENROQUE_LARGO));
    }
  }

  /** Tras hacer(m), indica si el bando que movió dejó a su rey en jaque. */
  dejoReyEnJaque(): boolean {
    const quienMovio = (this.turno ^ 8) as Color;
    return this.casillaAtacada(this.reyes[quienMovio >> 3], this.turno);
  }

  /** Movimientos totalmente legales del bando al que le toca. */
  movimientosLegales(): Movimiento[] {
    const pseudo = this.generarPseudoLegales();
    const legales: Movimiento[] = [];
    for (const m of pseudo) {
      this.hacer(m);
      if (!this.dejoReyEnJaque()) legales.push(m);
      this.deshacer();
    }
    return legales;
  }

  /** Indica si el bando al que le toca tiene al menos un movimiento legal. */
  tieneMovimientoLegal(): boolean {
    const pseudo = this.generarPseudoLegales();
    for (const m of pseudo) {
      this.hacer(m);
      const ilegal = this.dejoReyEnJaque();
      this.deshacer();
      if (!ilegal) return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Hacer y deshacer
  // ---------------------------------------------------------------------------

  hacer(m: Movimiento): void {
    const t = this.tablero;
    const { desde, hasta, pieza, capturada, bandera } = m;
    const color = this.turno;

    this.pila.push({
      mov: m,
      enroques: this.enroques,
      alPaso: this.alPaso,
      alPasoHash: this.alPasoHash,
      medioMovs: this.medioMovs,
      hashA: this.hashA,
      hashB: this.hashB,
    });

    let a = this.hashA ^ Z_ENROQUE_A[this.enroques] ^ Z_TURNO_A;
    let b = this.hashB ^ Z_ENROQUE_B[this.enroques] ^ Z_TURNO_B;
    if (this.alPasoHash >= 0) {
      a ^= Z_AL_PASO_A[this.alPasoHash];
      b ^= Z_AL_PASO_B[this.alPasoHash];
    }

    t[desde] = 0;
    a ^= Z_PIEZA_A[pieza * 64 + desde];
    b ^= Z_PIEZA_B[pieza * 64 + desde];

    if (capturada !== 0) {
      const casillaCaptura = bandera === BANDERA_AL_PASO ? (color === CLARAS ? hasta - 8 : hasta + 8) : hasta;
      t[casillaCaptura] = 0;
      a ^= Z_PIEZA_A[capturada * 64 + casillaCaptura];
      b ^= Z_PIEZA_B[capturada * 64 + casillaCaptura];
    }

    const llega = m.coronacion !== 0 ? color | m.coronacion : pieza;
    t[hasta] = llega;
    a ^= Z_PIEZA_A[llega * 64 + hasta];
    b ^= Z_PIEZA_B[llega * 64 + hasta];

    if (bandera === BANDERA_ENROQUE_CORTO || bandera === BANDERA_ENROQUE_LARGO) {
      const torre = color | TORRE;
      const origenTorre = bandera === BANDERA_ENROQUE_CORTO ? desde + 3 : desde - 4;
      const destinoTorre = bandera === BANDERA_ENROQUE_CORTO ? desde + 1 : desde - 1;
      t[origenTorre] = 0;
      t[destinoTorre] = torre;
      a ^= Z_PIEZA_A[torre * 64 + origenTorre] ^ Z_PIEZA_A[torre * 64 + destinoTorre];
      b ^= Z_PIEZA_B[torre * 64 + origenTorre] ^ Z_PIEZA_B[torre * 64 + destinoTorre];
    }

    if ((pieza & 7) === REY) this.reyes[color >> 3] = hasta;

    this.enroques &= MASCARA_ENROQUE[desde] & MASCARA_ENROQUE[hasta];
    a ^= Z_ENROQUE_A[this.enroques];
    b ^= Z_ENROQUE_B[this.enroques];

    this.medioMovs = (pieza & 7) === PEON || capturada !== 0 ? 0 : this.medioMovs + 1;
    if (color === OSCURAS) this.numJugada++;
    this.turno = (color ^ 8) as Color;

    this.alPaso = -1;
    this.alPasoHash = -1;
    if (bandera === BANDERA_DOBLE_PASO) {
      this.alPaso = (desde + hasta) >> 1;
      if (this.peonPuedeCapturarAlPaso()) {
        this.alPasoHash = columna(hasta);
        a ^= Z_AL_PASO_A[this.alPasoHash];
        b ^= Z_AL_PASO_B[this.alPasoHash];
      }
    }

    this.hashA = a;
    this.hashB = b;
  }

  /** Deshace el último movimiento. Devuelve el movimiento deshecho o null si no había. */
  deshacer(): Movimiento | null {
    const e = this.pila.pop();
    if (!e) return null;
    const m = e.mov;
    const t = this.tablero;
    const color = (this.turno ^ 8) as Color;
    this.turno = color;
    if (color === OSCURAS) this.numJugada--;

    t[m.hasta] = 0;
    t[m.desde] = m.pieza;
    if (m.capturada !== 0) {
      const casillaCaptura =
        m.bandera === BANDERA_AL_PASO ? (color === CLARAS ? m.hasta - 8 : m.hasta + 8) : m.hasta;
      t[casillaCaptura] = m.capturada;
    }
    if (m.bandera === BANDERA_ENROQUE_CORTO) {
      t[m.desde + 1] = 0;
      t[m.desde + 3] = color | TORRE;
    } else if (m.bandera === BANDERA_ENROQUE_LARGO) {
      t[m.desde - 1] = 0;
      t[m.desde - 4] = color | TORRE;
    }
    if ((m.pieza & 7) === REY) this.reyes[color >> 3] = m.desde;

    this.enroques = e.enroques;
    this.alPaso = e.alPaso;
    this.alPasoHash = e.alPasoHash;
    this.medioMovs = e.medioMovs;
    this.hashA = e.hashA;
    this.hashB = e.hashB;
    return m;
  }
}

/** Cuenta los nodos hoja a la profundidad indicada (prueba estándar del generador). */
export function perft(pos: Posicion, profundidad: number): number {
  if (profundidad === 0) return 1;
  const movimientos = pos.movimientosLegales();
  if (profundidad === 1) return movimientos.length;
  let total = 0;
  for (const m of movimientos) {
    pos.hacer(m);
    total += perft(pos, profundidad - 1);
    pos.deshacer();
  }
  return total;
}
