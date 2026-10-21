import { describe, expect, it } from 'vitest';
import {
  CLARAS,
  DAMA,
  FEN_INICIAL,
  OSCURAS,
  PEON,
  Partida,
  Posicion,
  aSanEspanol,
  indiceCasilla,
} from '../src/core';

function sanes(partida: Partida): string[] {
  return partida.historial.map((j) => j.san);
}

function jugarTodas(partida: Partida, jugadas: string[]): void {
  for (const san of jugadas) {
    expect(partida.jugarSan(san), `la jugada ${san} debería ser legal`).not.toBeNull();
  }
}

describe('FEN', () => {
  it('genera de vuelta el mismo FEN que lee', () => {
    const fens = [
      FEN_INICIAL,
      'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',
      'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
      '8/8/8/4k3/8/8/8/4K3 b - - 37 80',
    ];
    for (const fen of fens) expect(new Posicion(fen).fen()).toBe(fen);
  });

  it('rechaza FEN inválidos', () => {
    expect(() => new Posicion('esto no es un fen')).toThrow();
    expect(() => new Posicion('8/8/8/8/8/8/8/8 w - - 0 1')).toThrow();
    expect(() => new Posicion('rnbqkbnr/ppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toThrow();
  });

  it('marca la casilla de al paso tras un doble paso', () => {
    const partida = new Partida();
    partida.jugarSan('e4');
    expect(partida.fen()).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
  });
});

describe('jaque mate y ahogado', () => {
  it('detecta el mate del pastor', () => {
    const partida = new Partida();
    jugarTodas(partida, ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#']);
    expect(sanes(partida).at(-1)).toBe('Qxf7#');
    expect(partida.enJaque()).toBe(true);
    expect(partida.movimientosLegales()).toHaveLength(0);
    expect(partida.resultado()).toEqual({ ganador: CLARAS, motivo: 'jaque-mate' });
  });

  it('detecta el rey ahogado', () => {
    const partida = new Partida('7k/8/6K1/5Q2/8/8/8/8 w - - 0 1');
    partida.jugarSan('Qf7');
    expect(partida.enJaque()).toBe(false);
    expect(partida.resultado()).toEqual({ ganador: null, motivo: 'ahogado' });
  });

  it('no permite jugar después del final', () => {
    const partida = new Partida('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
    expect(partida.resultado()?.motivo).toBe('ahogado');
    expect(partida.jugarUci('h8g8')).toBeNull();
  });

  it('marca con + los jaques', () => {
    const partida = new Partida();
    jugarTodas(partida, ['e4', 'f5', 'Qh5+']);
    expect(sanes(partida).at(-1)).toBe('Qh5+');
  });
});

describe('enroque', () => {
  it('permite ambos enroques cuando todo está libre', () => {
    const partida = new Partida('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    expect(partida.jugarSan('O-O')).not.toBeNull();
    expect(partida.fen()).toBe('r3k2r/8/8/8/8/8/8/R4RK1 b kq - 1 1');
    expect(partida.jugarSan('O-O-O')).not.toBeNull();
    expect(partida.fen()).toBe('2kr3r/8/8/8/8/8/8/R4RK1 w - - 2 2');
  });

  it('prohíbe el enroque corto si el rey pasa por una casilla atacada', () => {
    const partida = new Partida('5r1k/8/8/8/8/8/8/R3K2R w KQ - 0 1');
    expect(partida.jugarSan('O-O')).toBeNull();
    expect(partida.jugarSan('O-O-O')).not.toBeNull();
  });

  it('prohíbe el enroque si el rey cae en una casilla atacada', () => {
    const partida = new Partida('6rk/8/8/8/8/8/8/R3K2R w KQ - 0 1');
    expect(partida.jugarSan('O-O')).toBeNull();
  });

  it('prohíbe enrocar estando en jaque', () => {
    const partida = new Partida('4r2k/8/8/8/8/8/8/R3K2R w KQ - 0 1');
    expect(partida.movimientosLegales().some((m) => m.pieza === 6 && Math.abs(m.hasta - m.desde) === 2)).toBe(false);
  });

  it('permite el enroque largo aunque b1 esté atacada', () => {
    const partida = new Partida('1r5k/8/8/8/8/8/8/R3K2R w KQ - 0 1');
    expect(partida.jugarSan('O-O-O')).not.toBeNull();
  });

  it('prohíbe el enroque con casillas intermedias ocupadas', () => {
    const partida = new Partida('4k3/8/8/8/8/8/8/RN2K1NR w KQ - 0 1');
    expect(partida.jugarSan('O-O')).toBeNull();
    expect(partida.jugarSan('O-O-O')).toBeNull();
  });

  it('pierde el derecho a enrocar al mover el rey o la torre', () => {
    const partida = new Partida('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    jugarTodas(partida, ['Rh2', 'Ke7', 'Rh1', 'Ke8']);
    expect(partida.fen().split(' ')[2]).toBe('Q');
    expect(partida.jugarSan('O-O')).toBeNull();
  });
});

describe('captura al paso', () => {
  it('captura el peón que avanzó dos casillas y se puede deshacer', () => {
    const partida = new Partida();
    jugarTodas(partida, ['e4', 'a6', 'e5', 'd5']);
    const antes = partida.fen();
    expect(antes.split(' ')[3]).toBe('d6');
    const jugada = partida.jugarSan('exd6');
    expect(jugada?.san).toBe('exd6');
    expect(partida.posicion.tablero[indiceCasilla('d5')]).toBe(0);
    expect(partida.posicion.tablero[indiceCasilla('d6')]).toBe(CLARAS | PEON);
    partida.deshacer();
    expect(partida.fen()).toBe(antes);
  });

  it('solo es posible inmediatamente después del doble paso', () => {
    const partida = new Partida();
    jugarTodas(partida, ['e4', 'a6', 'e5', 'd5', 'h3', 'h6']);
    expect(partida.jugarSan('exd6')).toBeNull();
  });

  it('no se permite si deja al rey en jaque', () => {
    // Si el peón de e5 captura en d6, la torre de h5 daría jaque al rey de a5.
    const partida = new Partida('8/8/8/K2pP2r/8/8/8/7k w - d6 0 1');
    expect(partida.jugarSan('exd6')).toBeNull();
  });
});

describe('coronación', () => {
  it('ofrece las cuatro piezas y aplica la elegida', () => {
    const partida = new Partida('8/4P3/8/8/8/8/8/k6K w - - 0 1');
    const e7 = indiceCasilla('e7');
    const e8 = indiceCasilla('e8');
    expect(partida.esCoronacion(e7, e8)).toBe(true);
    expect(partida.movimientosDesde(e7).map((m) => m.coronacion).sort()).toEqual([2, 3, 4, 5]);
    const jugada = partida.jugar(partida.buscarMovimiento(e7, e8, DAMA)!);
    expect(jugada?.san).toBe('e8=Q');
    expect(partida.posicion.tablero[e8]).toBe(CLARAS | DAMA);
    partida.deshacer();
    expect(partida.jugarSan('e8=N')?.san).toBe('e8=N');
  });

  it('marca el jaque al coronar', () => {
    const partida = new Partida('k7/4P3/8/8/8/8/8/7K w - - 0 1');
    expect(partida.jugarSan('e8=R+')?.san).toBe('e8=R+');
  });
});

describe('SAN con desambiguación', () => {
  it('usa la columna cuando dos caballos llegan a la misma casilla', () => {
    const partida = new Partida('4k3/8/8/8/8/8/8/1N1NK3 w - - 0 1');
    expect(partida.jugarSan('Nbc3')?.san).toBe('Nbc3');
    partida.deshacer();
    expect(partida.jugarSan('Ndc3')?.san).toBe('Ndc3');
  });

  it('usa la fila cuando las piezas comparten columna', () => {
    const partida = new Partida('4k3/8/8/R7/8/8/8/R3K3 w - - 0 1');
    expect(partida.jugarSan('R1a3')?.san).toBe('R1a3');
    partida.deshacer();
    expect(partida.jugarSan('R5a3')?.san).toBe('R5a3');
  });

  it('usa la casilla completa cuando hace falta', () => {
    const partida = new Partida('4k3/8/8/8/8/Q7/8/Q1Q1K3 w - - 0 1');
    expect(partida.jugarSan('Qa1b2')?.san).toBe('Qa1b2');
    partida.deshacer();
    expect(partida.jugarSan('Qcb2')?.san).toBe('Qcb2');
    partida.deshacer();
    expect(partida.jugarSan('Q3b2')?.san).toBe('Q3b2');
  });

  it('no desambigua si la otra pieza está clavada', () => {
    // El caballo de d2 está clavado por el alfil de a5, así que solo el de g1 puede ir a f3.
    const partida = new Partida('4k3/8/8/b7/8/8/3N4/4K1N1 w - - 0 1');
    expect(partida.jugarSan('Nf3')?.san).toBe('Nf3');
  });

  it('traduce la SAN a notación española', () => {
    expect(aSanEspanol('Nbd7')).toBe('Cbd7');
    expect(aSanEspanol('Qxf7#')).toBe('Dxf7#');
    expect(aSanEspanol('e8=N+')).toBe('e8=C+');
    expect(aSanEspanol('O-O-O')).toBe('O-O-O');
    expect(aSanEspanol('Kxe2')).toBe('Rxe2');
    expect(aSanEspanol('Rxe2')).toBe('Txe2');
    expect(aSanEspanol('Bb5')).toBe('Ab5');
  });
});

describe('tablas', () => {
  it('por triple repetición', () => {
    const partida = new Partida();
    jugarTodas(partida, ['Nf3', 'Nf6', 'Ng1', 'Ng8', 'Nf3', 'Nf6', 'Ng1']);
    expect(partida.resultado()).toBeNull();
    partida.jugarSan('Ng8');
    expect(partida.resultado()).toEqual({ ganador: null, motivo: 'triple-repeticion' });
  });

  it('por la regla de los 50 movimientos', () => {
    const partida = new Partida('4k3/8/8/8/8/8/8/R3K3 w - - 99 80');
    expect(partida.resultado()).toBeNull();
    partida.jugarSan('Ra2');
    expect(partida.resultado()).toEqual({ ganador: null, motivo: 'cincuenta-movimientos' });
  });

  it('el mate tiene prioridad sobre la regla de los 50 movimientos', () => {
    const partida = new Partida('7k/R7/6K1/8/8/8/8/8 w - - 99 80');
    partida.jugarSan('Ra8#');
    expect(partida.resultado()?.motivo).toBe('jaque-mate');
  });

  it('por material insuficiente', () => {
    expect(new Partida('8/8/8/4k3/8/8/8/4K3 w - - 0 1').resultado()?.motivo).toBe('material-insuficiente');
    expect(new Partida('8/8/8/4k3/8/8/8/4K1N1 w - - 0 1').resultado()?.motivo).toBe('material-insuficiente');
    expect(new Partida('8/8/8/4k3/8/8/8/4KB2 w - - 0 1').resultado()?.motivo).toBe('material-insuficiente');
    // Alfiles en casillas del mismo color.
    expect(new Partida('8/8/2b5/4k3/8/8/8/4KB2 w - - 0 1').resultado()?.motivo).toBe('material-insuficiente');
    // Alfiles de distinto color: todavía hay mate posible.
    expect(new Partida('8/8/1b6/4k3/8/8/8/4KB2 w - - 0 1').resultado()).toBeNull();
    expect(new Partida('8/8/8/4k3/8/8/8/4KNN1 w - - 0 1').resultado()).toBeNull();
    expect(new Partida('8/8/8/4k3/8/8/4P3/4K3 w - - 0 1').resultado()).toBeNull();
  });

  it('el tiempo agotado contra material insuficiente es tablas', () => {
    const partida = new Partida('8/8/8/4k3/8/8/4P3/4K3 w - - 0 1');
    expect(partida.resultadoPorTiempo(OSCURAS)).toEqual({ ganador: CLARAS, motivo: 'tiempo' });
    expect(partida.resultadoPorTiempo(CLARAS)).toEqual({ ganador: null, motivo: 'tiempo' });
  });
});

describe('deshacer y reconstruir', () => {
  it('deshacer una partida aleatoria vuelve a la posición inicial con el mismo hash', () => {
    const partida = new Partida();
    const hashA = partida.posicion.hashA;
    const hashB = partida.posicion.hashB;
    let semilla = 12345;
    const azar = () => (semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648;
    for (let i = 0; i < 120 && !partida.resultado(); i++) {
      const legales = partida.movimientosLegales();
      partida.jugar(legales[Math.floor(azar() * legales.length)]);
    }
    const jugadas = partida.jugadasUci();
    const copia = Partida.desdeJugadas(FEN_INICIAL, jugadas);
    expect(copia.fen()).toBe(partida.fen());
    expect(copia.posicion.hashA).toBe(partida.posicion.hashA);
    while (partida.deshacer());
    expect(partida.fen()).toBe(FEN_INICIAL);
    expect(partida.posicion.hashA).toBe(hashA);
    expect(partida.posicion.hashB).toBe(hashB);
  });

  it('el hash incremental coincide con el calculado desde cero', () => {
    const partida = new Partida();
    jugarTodas(partida, ['e4', 'd5', 'exd5', 'c5', 'dxc6', 'Nf6', 'cxb7', 'e5', 'bxa8=Q', 'Bc5', 'Nf3', 'O-O']);
    const desdeCero = new Posicion(partida.fen());
    expect(partida.posicion.hashA).toBe(desdeCero.hashA);
    expect(partida.posicion.hashB).toBe(desdeCero.hashB);
  });

  it('calcula capturas y ventaja de material', () => {
    const partida = new Partida();
    jugarTodas(partida, ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qxa2']);
    const { porClaras, porOscuras } = partida.capturas();
    expect(porClaras).toEqual([OSCURAS | PEON]);
    expect(porOscuras).toEqual([CLARAS | PEON, CLARAS | PEON]);
    expect(partida.ventajaMaterial()).toBe(-1);
  });
});
