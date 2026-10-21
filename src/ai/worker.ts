/// <reference lib="webworker" />
/**
 * Web Worker de la Capi-IA: reconstruye la partida (para conocer las repeticiones)
 * y calcula la jugada sin bloquear la interfaz.
 */
import { Partida, aUci } from '../core';
import { elegirMovimiento } from './ia';
import type { PeticionIA, RespuestaIA } from './mensajes';

const ambito = self as unknown as DedicatedWorkerGlobalScope;

ambito.onmessage = (evento: MessageEvent<PeticionIA>) => {
  const { id, fenInicial, jugadas, dificultad } = evento.data;
  const partida = Partida.desdeJugadas(fenInicial, jugadas);
  const movimiento = elegirMovimiento(partida.posicion, dificultad);
  const respuesta: RespuestaIA = { id, uci: movimiento ? aUci(movimiento) : null };
  ambito.postMessage(respuesta);
};
