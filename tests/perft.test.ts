import { describe, expect, it } from 'vitest';
import { FEN_INICIAL, Posicion, perft } from '../src/core';

const KIWIPETE = 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1';
const POSICION_3 = '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1';

// Además de las profundidades exigidas, se comprueban Kiwipete d4 y la posición 3 d5.
const casos: [string, string, number[]][] = [
  ['posición inicial', FEN_INICIAL, [20, 400, 8902, 197281]],
  ['Kiwipete', KIWIPETE, [48, 2039, 97862, 4085603]],
  ['posición 3 (finales y jaques descubiertos)', POSICION_3, [14, 191, 2812, 43238, 674624]],
];

describe('perft', () => {
  for (const [nombre, fen, esperados] of casos) {
    esperados.forEach((esperado, i) => {
      const profundidad = i + 1;
      it(`${nombre}: profundidad ${profundidad} = ${esperado}`, () => {
        const pos = new Posicion(fen);
        expect(perft(pos, profundidad)).toBe(esperado);
        // Hacer/deshacer debe dejar la posición exactamente igual.
        expect(pos.fen()).toBe(new Posicion(fen).fen());
      }, 60_000);
    });
  }
});
