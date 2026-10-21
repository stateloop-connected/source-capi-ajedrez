import { describe, expect, it } from 'vitest';
import { Partida, Posicion, aUci, type Movimiento } from '../src/core';
import { elegirMovimiento, type Dificultad } from '../src/ai/ia';
import { Buscador } from '../src/ai/busqueda';
import { evaluar } from '../src/ai/evaluacion';

function esMate(pos: Posicion): boolean {
  return pos.enJaque() && pos.movimientosLegales().length === 0;
}

function hayMateEnUno(pos: Posicion): boolean {
  for (const m of pos.movimientosLegales()) {
    pos.hacer(m);
    const mate = esMate(pos);
    pos.deshacer();
    if (mate) return true;
  }
  return false;
}

/** Indica si, tras jugar m, cualquier respuesta del rival permite un mate en 1. */
function fuerzaMateEnDos(pos: Posicion, m: Movimiento): boolean {
  pos.hacer(m);
  const respuestas = pos.movimientosLegales();
  let forzado = respuestas.length > 0 || esMate(pos);
  for (const r of respuestas) {
    pos.hacer(r);
    const mate = hayMateEnUno(pos);
    pos.deshacer();
    if (!mate) {
      forzado = false;
      break;
    }
  }
  pos.deshacer();
  return forzado;
}

function esLegal(pos: Posicion, m: Movimiento | null): boolean {
  if (!m) return false;
  return pos.movimientosLegales().some((o) => aUci(o) === aUci(m));
}

describe('evaluación', () => {
  it('la posición inicial está equilibrada', () => {
    expect(evaluar(new Posicion())).toBe(0);
  });

  it('es simétrica para ambos bandos', () => {
    const claras = new Posicion('4k3/8/8/8/8/8/8/3QK3 w - - 0 1');
    const oscuras = new Posicion('3qk3/8/8/8/8/8/8/4K3 b - - 0 1');
    expect(evaluar(claras)).toBe(evaluar(oscuras));
    expect(evaluar(claras)).toBeGreaterThan(800);
  });
});

describe('Capi-IA difícil', () => {
  it('encuentra un mate en 1 con las claras', () => {
    const pos = new Posicion('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1');
    const m = elegirMovimiento(pos, 'dificil');
    expect(m && aUci(m)).toBe('a1a8');
  });

  it('encuentra un mate en 1 con las oscuras', () => {
    const pos = new Posicion('r5k1/8/8/8/8/8/5PPP/6K1 b - - 0 1');
    const m = elegirMovimiento(pos, 'dificil');
    expect(m && aUci(m)).toBe('a8a1');
  });

  it('encuentra un mate en 2 con torres', () => {
    const pos = new Posicion('7k/8/8/8/8/8/R7/1R4K1 w - - 0 1');
    expect(hayMateEnUno(pos)).toBe(false);
    const m = elegirMovimiento(pos, 'dificil');
    expect(esLegal(pos, m)).toBe(true);
    expect(fuerzaMateEnDos(pos, m!)).toBe(true);
  });

  it('encuentra un mate en 2 con sacrificio (mate de Legal)', () => {
    // 1.Nf6+ gxf6 2.Bxf7#
    const pos = new Posicion('r2qkb1r/pp2nppp/3p4/2pNN1B1/2BnP3/3P4/PPP2PPP/R2bK2R w KQkq - 1 1');
    expect(hayMateEnUno(pos)).toBe(false);
    const m = elegirMovimiento(pos, 'dificil');
    expect(esLegal(pos, m)).toBe(true);
    expect(fuerzaMateEnDos(pos, m!)).toBe(true);
  });

  it('no regala la dama', () => {
    // La dama oscura de d5 está atacada por el peón de c4: hay que moverla o defenderla.
    const pos = new Posicion('rnb1kbnr/ppp1pppp/8/3q4/2P5/8/PP1PPPPP/RNBQKBNR b KQkq - 0 3');
    const m = elegirMovimiento(pos, 'dificil');
    expect(m && m.desde).toBe(35);
  });
});

describe('Capi-IA media y fácil', () => {
  it('la media ve un mate en 1', () => {
    const pos = new Posicion('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1');
    const m = elegirMovimiento(pos, 'medio');
    expect(m && aUci(m)).toBe('a1a8');
  });

  it('la fácil captura una pieza regalada', () => {
    // La dama oscura de h4 está indefensa y el caballo de f3 la puede capturar.
    const pos = new Posicion('rnb1kbnr/pppp1ppp/8/4p3/4P2q/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3');
    for (let i = 0; i < 5; i++) {
      const m = elegirMovimiento(pos, 'facil');
      expect(m && aUci(m)).toBe('f3h4');
    }
  });

  it('devuelve null si no hay jugadas', () => {
    const pos = new Posicion('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
    for (const d of ['facil', 'medio', 'dificil'] as Dificultad[]) expect(elegirMovimiento(pos, d)).toBeNull();
  });
});

describe('legalidad', () => {
  it('nunca devuelve un movimiento ilegal en posiciones aleatorias', () => {
    let semilla = 2024;
    const azar = () => (semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648;
    const dificultades: Dificultad[] = ['facil', 'medio'];
    for (let partidaN = 0; partidaN < 6; partidaN++) {
      const partida = new Partida();
      const largo = 10 + Math.floor(azar() * 50);
      for (let i = 0; i < largo && !partida.resultado(); i++) {
        const legales = partida.movimientosLegales();
        partida.jugar(legales[Math.floor(azar() * legales.length)]);
      }
      if (partida.resultado()) continue;
      for (const d of dificultades) {
        expect(esLegal(partida.posicion, elegirMovimiento(partida.posicion, d, azar))).toBe(true);
      }
      const rapida = new Buscador().buscar(partida.posicion, { profundidadMaxima: 32, tiempoMs: 250 });
      expect(esLegal(partida.posicion, rapida.movimiento)).toBe(true);
      // La búsqueda no debe alterar la posición.
      expect(Partida.desdeJugadas(partida.fenInicial, partida.jugadasUci()).fen()).toBe(partida.fen());
    }
  }, 60_000);

  it('la difícil juega una partida corta contra sí misma sin errores', () => {
    const partida = new Partida();
    for (let i = 0; i < 6 && !partida.resultado(); i++) {
      const m = new Buscador().buscar(partida.posicion, { profundidadMaxima: 32, tiempoMs: 200 }).movimiento;
      expect(partida.jugar(m!)).not.toBeNull();
    }
  }, 30_000);
});
