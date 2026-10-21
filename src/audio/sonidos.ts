/**
 * Sonidos sintetizados con WebAudio (no se usan archivos de audio).
 * El contexto se crea al primer gesto del usuario, como exigen los navegadores.
 */
import { cargarPreferencias, guardarPreferencias } from '../storage/almacen';

type FormaOnda = OscillatorType;

interface Nota {
  frecuencia: number;
  /** Segundos desde el inicio del sonido. */
  inicio: number;
  duracion: number;
  forma?: FormaOnda;
  volumen?: number;
  /** Frecuencia final para hacer un glissando. */
  hasta?: number;
}

class Sonidos {
  private contexto: AudioContext | null = null;
  private maestro: GainNode | null = null;
  private activado = cargarPreferencias().sonido;

  get estaActivado(): boolean {
    return this.activado;
  }

  /** Activa o desactiva el sonido y lo recuerda en localStorage. */
  alternar(): boolean {
    this.activado = !this.activado;
    guardarPreferencias({ sonido: this.activado });
    if (this.activado) this.clic();
    return this.activado;
  }

  /** Debe llamarse desde un gesto del usuario para desbloquear el audio. */
  desbloquear(): void {
    const ctx = this.obtenerContexto();
    if (ctx && ctx.state === 'suspended') void ctx.resume();
  }

  private obtenerContexto(): AudioContext | null {
    if (this.contexto) return this.contexto;
    const Constructor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Constructor) return null;
    try {
      this.contexto = new Constructor();
      this.maestro = this.contexto.createGain();
      this.maestro.gain.value = 0.5;
      this.maestro.connect(this.contexto.destination);
    } catch {
      this.contexto = null;
    }
    return this.contexto;
  }

  private tocar(notas: Nota[]): void {
    if (!this.activado) return;
    const ctx = this.obtenerContexto();
    if (!ctx || !this.maestro) return;
    if (ctx.state === 'suspended') void ctx.resume();
    const t0 = ctx.currentTime + 0.01;
    for (const n of notas) {
      const osc = ctx.createOscillator();
      const ganancia = ctx.createGain();
      osc.type = n.forma ?? 'sine';
      const inicio = t0 + n.inicio;
      const fin = inicio + n.duracion;
      osc.frequency.setValueAtTime(n.frecuencia, inicio);
      if (n.hasta) osc.frequency.exponentialRampToValueAtTime(n.hasta, fin);
      const volumen = n.volumen ?? 0.3;
      ganancia.gain.setValueAtTime(0.0001, inicio);
      ganancia.gain.exponentialRampToValueAtTime(volumen, inicio + 0.012);
      ganancia.gain.exponentialRampToValueAtTime(0.0001, fin);
      osc.connect(ganancia);
      ganancia.connect(this.maestro);
      osc.start(inicio);
      osc.stop(fin + 0.02);
    }
  }

  /** Ruido breve filtrado: suena como una pieza de madera sobre el tablero. */
  private golpe(volumen: number, frecuencia: number, inicio = 0): void {
    if (!this.activado) return;
    const ctx = this.obtenerContexto();
    if (!ctx || !this.maestro) return;
    const duracion = 0.09;
    const muestras = Math.floor(ctx.sampleRate * duracion);
    const buffer = ctx.createBuffer(1, muestras, ctx.sampleRate);
    const datos = buffer.getChannelData(0);
    for (let i = 0; i < muestras; i++) datos[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / muestras, 3);
    const fuente = ctx.createBufferSource();
    fuente.buffer = buffer;
    const filtro = ctx.createBiquadFilter();
    filtro.type = 'bandpass';
    filtro.frequency.value = frecuencia;
    filtro.Q.value = 1.4;
    const ganancia = ctx.createGain();
    ganancia.gain.value = volumen;
    fuente.connect(filtro);
    filtro.connect(ganancia);
    ganancia.connect(this.maestro);
    fuente.start(ctx.currentTime + 0.01 + inicio);
  }

  mover(): void {
    this.golpe(1.4, 900);
    this.tocar([{ frecuencia: 220, inicio: 0, duracion: 0.08, forma: 'triangle', volumen: 0.18 }]);
  }

  capturar(): void {
    this.golpe(1.8, 600);
    this.tocar([
      { frecuencia: 520, hasta: 180, inicio: 0, duracion: 0.18, forma: 'triangle', volumen: 0.25 },
      { frecuencia: 160, inicio: 0.02, duracion: 0.12, forma: 'sine', volumen: 0.25 },
    ]);
  }

  jaque(): void {
    this.tocar([
      { frecuencia: 880, inicio: 0, duracion: 0.12, forma: 'square', volumen: 0.12 },
      { frecuencia: 660, inicio: 0.13, duracion: 0.16, forma: 'square', volumen: 0.12 },
    ]);
  }

  enroque(): void {
    this.golpe(1.3, 900);
    this.golpe(1.3, 750, 0.11);
    this.tocar([
      { frecuencia: 392, inicio: 0, duracion: 0.1, forma: 'triangle', volumen: 0.2 },
      { frecuencia: 523, inicio: 0.11, duracion: 0.14, forma: 'triangle', volumen: 0.2 },
    ]);
  }

  coronar(): void {
    this.tocar(
      [523, 659, 784, 1047].map((f, i) => ({
        frecuencia: f,
        inicio: i * 0.08,
        duracion: 0.22,
        forma: 'triangle' as FormaOnda,
        volumen: 0.22,
      })),
    );
  }

  victoria(): void {
    const melodia = [523, 659, 784, 659, 784, 1047];
    this.tocar(
      melodia.map((f, i) => ({
        frecuencia: f,
        inicio: i * 0.13,
        duracion: i === melodia.length - 1 ? 0.6 : 0.16,
        forma: 'triangle' as FormaOnda,
        volumen: 0.25,
      })),
    );
    this.tocar([{ frecuencia: 262, inicio: 0.65, duracion: 0.6, forma: 'sine', volumen: 0.2 }]);
  }

  derrota(): void {
    this.tocar([
      { frecuencia: 392, inicio: 0, duracion: 0.28, forma: 'triangle', volumen: 0.22 },
      { frecuencia: 349, inicio: 0.3, duracion: 0.28, forma: 'triangle', volumen: 0.22 },
      { frecuencia: 311, inicio: 0.6, duracion: 0.28, forma: 'triangle', volumen: 0.22 },
      { frecuencia: 262, hasta: 196, inicio: 0.9, duracion: 0.7, forma: 'triangle', volumen: 0.22 },
    ]);
  }

  tablas(): void {
    this.tocar([
      { frecuencia: 440, inicio: 0, duracion: 0.2, forma: 'triangle', volumen: 0.2 },
      { frecuencia: 440, inicio: 0.22, duracion: 0.35, forma: 'triangle', volumen: 0.2 },
    ]);
  }

  clic(): void {
    this.tocar([{ frecuencia: 660, hasta: 990, inicio: 0, duracion: 0.07, forma: 'sine', volumen: 0.2 }]);
  }
}

/** Instancia única compartida por todas las escenas. */
export const sonidos = new Sonidos();
