/// <reference types="vitest/config" />
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/** Lista recursiva de archivos de una carpeta, con rutas relativas a ella. */
function listarArchivos(carpeta: string, base = carpeta): string[] {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    return statSync(ruta).isDirectory() ? listarArchivos(ruta, base) : [relative(base, ruta).split('\\').join('/')];
  });
}

/**
 * Plugin propio para la PWA: genera sw.js con la lista de todos los archivos
 * del build (incluidos los que llevan hash) y una versión única.
 */
function serviceWorker(): Plugin {
  return {
    name: 'capi-ajedrez-service-worker',
    apply: 'build',
    generateBundle(_opciones, bundle) {
      const archivos = new Set<string>(['./', './index.html']);
      for (const nombre of Object.keys(bundle)) archivos.add(`./${nombre}`);
      for (const nombre of listarArchivos('public')) archivos.add(`./${nombre}`);
      const lista = [...archivos].sort();
      const version = createHash('sha256').update(lista.join('\n')).update(String(Date.now())).digest('hex').slice(0, 12);
      const plantilla = readFileSync('src/pwa/sw-plantilla.js', 'utf8');
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: plantilla.replace('__VERSION__', version).replace('__PRECARGA__', JSON.stringify(lista, null, 2)),
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [serviceWorker()],
  worker: { format: 'es' },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
