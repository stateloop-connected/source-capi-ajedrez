/**
 * Cliente de la IA para el hilo principal. Envía la partida al worker y devuelve
 * la jugada elegida. Si el navegador no admite workers de módulo, calcula en el hilo principal.
 */
import { Partida, aUci } from '../core';
import { elegirMovimiento, type Dificultad } from './ia';
import type { PeticionIA, RespuestaIA } from './mensajes';

export class ClienteIA {
  private worker: Worker | null = null;
  private sinWorker = false;
  private siguienteId = 1;
  private readonly pendientes = new Map<number, (uci: string | null) => void>();

  private obtenerWorker(): Worker | null {
    if (this.worker || this.sinWorker) return this.worker;
    try {
      this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (evento: MessageEvent<RespuestaIA>) => {
        const resolver = this.pendientes.get(evento.data.id);
        if (!resolver) return;
        this.pendientes.delete(evento.data.id);
        resolver(evento.data.uci);
      };
      this.worker.onerror = () => {
        // Si el worker falla, se resuelven las peticiones calculando aquí mismo.
        this.sinWorker = true;
        this.worker?.terminate();
        this.worker = null;
      };
    } catch {
      this.sinWorker = true;
      this.worker = null;
    }
    return this.worker;
  }

  /** Pide una jugada (en UCI) para la posición que resulta de jugar 'jugadas' desde 'fenInicial'. */
  pedirJugada(fenInicial: string, jugadas: string[], dificultad: Dificultad): Promise<string | null> {
    const worker = this.obtenerWorker();
    if (!worker) return Promise.resolve(this.calcularLocal(fenInicial, jugadas, dificultad));
    const id = this.siguienteId++;
    return new Promise((resolver) => {
      this.pendientes.set(id, resolver);
      const peticion: PeticionIA = { id, fenInicial, jugadas, dificultad };
      worker.postMessage(peticion);
      // Respaldo por si el worker muere sin responder.
      worker.addEventListener('error', () => {
        if (!this.pendientes.has(id)) return;
        this.pendientes.delete(id);
        resolver(this.calcularLocal(fenInicial, jugadas, dificultad));
      }, { once: true });
    });
  }

  private calcularLocal(fenInicial: string, jugadas: string[], dificultad: Dificultad): string | null {
    const partida = Partida.desdeJugadas(fenInicial, jugadas);
    const m = elegirMovimiento(partida.posicion, dificultad);
    return m ? aUci(m) : null;
  }

  /** Cancela cualquier cálculo en curso: las respuestas pendientes se descartan. */
  cancelar(): void {
    this.pendientes.clear();
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
