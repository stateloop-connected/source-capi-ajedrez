/**
 * Punto de entrada: crea el juego de Phaser con Scale.FIT y un tamaño virtual
 * vertical u horizontal según la pantalla, y registra el service worker.
 */
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { EVENTO_REORIENTAR } from './scenes/claves';
import { GameScene } from './scenes/GameScene';
import { InstructionsScene } from './scenes/InstructionsScene';
import { MenuScene } from './scenes/MenuScene';
import { TAMANO_HORIZONTAL, TAMANO_VERTICAL } from './ui/tema';

function pantallaVertical(): boolean {
  return window.innerHeight > window.innerWidth;
}

function tamanoPara(vertical: boolean): { ancho: number; alto: number } {
  return vertical ? TAMANO_VERTICAL : TAMANO_HORIZONTAL;
}

let vertical = pantallaVertical();
const inicial = tamanoPara(vertical);

const juego = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'juego',
  width: inicial.ancho,
  height: inicial.alto,
  backgroundColor: '#a3d6c4',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { activePointers: 2 },
  // Los sonidos se sintetizan aparte con WebAudio (src/audio), así que Phaser no necesita audio.
  audio: { noAudio: true },
  render: { antialias: true, roundPixels: false },
  scene: [BootScene, MenuScene, InstructionsScene, GameScene],
});

// Al girar el teléfono se cambia el tamaño virtual y las escenas se recolocan.
let temporizador = 0;
window.addEventListener('resize', () => {
  window.clearTimeout(temporizador);
  temporizador = window.setTimeout(() => {
    const ahora = pantallaVertical();
    if (ahora === vertical) return;
    vertical = ahora;
    const tamano = tamanoPara(vertical);
    juego.scale.setGameSize(tamano.ancho, tamano.alto);
    juego.events.emit(EVENTO_REORIENTAR);
  }, 200);
});

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Sin service worker el juego funciona igual, solo que no offline.
    });
  });
}
