#!/usr/bin/env node
/**
 * Candado de publicación del front (predeploy de Firebase Hosting, después de
 * verify-dist-prod.js). Existe por el incidente del 2026-10-16: la 2026.10.16.2
 * se compiló desde un commit viejo mientras otra sesión publicaba la .16.3, y
 * al desplegar la pisó; cuatro arreglos de comercios salieron de producción.
 *
 * Bloquea el despliegue si:
 *  1. la versión viva es igual o MAYOR que la que se va a publicar;
 *  2. la versión viva se compiló desde un commit que este build NO contiene;
 *  3. la rama de publicación tiene commits de código que este build no incluye;
 *  4. la versión viva se publicó con cambios sin commitear (no se sabe qué tiene);
 *  5. el build no dice desde qué commit se compiló (update-version.js viejo).
 *
 * Emergencias: KATUQ_PUBLICAR_FORZADO=1 firebase deploy --only hosting
 * (queda escrito en la consola por qué se forzó).
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const URL_VIVA = process.env.KATUQ_URL_VERSION || 'https://julsmind-katuq.web.app/assets/version.json';
const RAMA = process.env.KATUQ_RAMA_PUBLICACION || 'origin/feature/venta-asistida-mejorada';
const RAIZ = path.resolve(__dirname, '..');
/** Commits que no cambian lo que se compila: documentación, specs y la versión. */
const SOLO_DOCS = /^(specs\/|openspec\/|docs\/|ops\/|.*\.md$|src\/assets\/version\.json$)/;

const forzado = process.env.KATUQ_PUBLICAR_FORZADO === '1';
// Sin shell: los commits vienen de un JSON publicado y no se interpolan en un comando.
const git = (...args) => execFileSync('git', args, { cwd: RAIZ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const esCommit = (c) => /^[0-9a-f]{7,40}$/.test(String(c || ''));

function numero(version) {
  const m = /(\d{4})\.(\d{2})\.(\d{2})\.(\d+)/.exec(String(version || ''));
  return m ? [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])] : null;
}
function comparar(a, b) {
  for (let i = 0; i < 4; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

const problemas = [];
const avisos = [];

async function main() {
  // KATUQ_DIST_VERSION solo para las pruebas del candado.
  const propio = JSON.parse(fs.readFileSync(process.env.KATUQ_DIST_VERSION || path.join(RAIZ, 'dist', 'cuba', 'assets', 'version.json'), 'utf8'));
  let viva = null;
  try {
    const r = await fetch(`${URL_VIVA}?t=${Date.now()}`, { cache: 'no-store' });
    if (r.ok) viva = await r.json();
  } catch (e) {
    avisos.push(`No se pudo leer la versión viva (${e.message}).`);
  }

  // 1. Versión mayor que la viva.
  const nPropia = numero(propio.version);
  const nViva = viva && numero(viva.version);
  if (!nPropia) problemas.push(`El build no tiene una versión válida (${propio.version}).`);
  else if (nViva && comparar(nPropia, nViva) <= 0) {
    problemas.push(`La versión viva (${viva.version}) es igual o más nueva que la de este build (${propio.version}). Alguien publicó después: haz git pull, sube la versión y recompila.`);
  }

  // 5. El build dice desde qué commit se compiló.
  if (!propio.commit) {
    problemas.push('El build no dice desde qué commit se compiló: corre la versión actual de update-version.js antes de compilar.');
  } else {
    try { if (!esCommit(propio.commit)) throw new Error('formato'); git('cat-file', '-e', `${propio.commit}^{commit}`); } catch (e) {
      problemas.push(`El commit del build (${propio.commit.slice(0, 8)}) no existe en este repo.`);
    }
  }

  // 2. La versión viva salió de código que este build contiene.
  if (viva && viva.commit && propio.commit) {
    try {
      git('fetch', '-q', 'origin');
    } catch (e) { avisos.push('No se pudo hacer git fetch; se compara con lo que hay local.'); }
    try {
      if (!esCommit(viva.commit)) throw new Error('formato');
      git('merge-base', '--is-ancestor', viva.commit, propio.commit);
    } catch (e) {
      problemas.push(`La versión viva (${viva.version}) se compiló desde ${String(viva.commit).slice(0, 8)}, que este build NO contiene. Publicar quitaría esos cambios de producción. Haz git pull y recompila desde la punta.`);
    }
  } else if (viva && !viva.commit) {
    avisos.push(`La versión viva (${viva.version}) no dice su commit (publicada antes del candado): no se puede verificar que este build la contenga.`);
  }

  // 4. La versión viva no tenía cambios sin commitear.
  if (viva && Number(viva.cambiosSinCommit) > 0) {
    problemas.push(`La versión viva (${viva.version}) se publicó con ${viva.cambiosSinCommit} archivo(s) sin commitear: no se sabe qué tiene y este build podría quitarlo. Confirma con quien la publicó.`);
  }
  if (Number(propio.cambiosSinCommit) > 0) {
    avisos.push(`Este build lleva ${propio.cambiosSinCommit} archivo(s) sin commitear: la próxima publicación de otra sesión quedará bloqueada hasta confirmarlo.`);
  }

  // 3. La rama no tiene código que este build no incluya.
  if (propio.commit) {
    try {
      const faltan = git('log', '--format=%h', `${propio.commit}..${RAMA}`).split('\n').filter(Boolean);
      const deCodigo = faltan.filter((c) =>
        git('diff-tree', '--no-commit-id', '--name-only', '-r', c).split('\n').filter(Boolean).some((f) => !SOLO_DOCS.test(f))
      );
      if (deCodigo.length) {
        problemas.push(`${RAMA} tiene ${deCodigo.length} commit(s) de código que este build no incluye (${deCodigo.slice(0, 5).join(', ')}). Haz git pull y recompila.`);
      }
    } catch (e) {
      avisos.push(`No se pudo comparar con ${RAMA} (${e.message.split('\n')[0]}).`);
    }
  }

  avisos.forEach((a) => console.log(`⚠️  [guard-publicacion] ${a}`));
  if (problemas.length) {
    problemas.forEach((p) => console.error(`❌ [guard-publicacion] ${p}`));
    if (forzado) {
      console.error('⚠️  [guard-publicacion] KATUQ_PUBLICAR_FORZADO=1: se publica de todos modos.');
      return;
    }
    console.error('❌ [guard-publicacion] Despliegue BLOQUEADO.');
    process.exit(1);
  }
  console.log(`✅ [guard-publicacion] OK — ${propio.version} (${String(propio.commit).slice(0, 8)}) contiene la versión viva${viva ? ` ${viva.version}` : ''} y lo commiteado en ${RAMA}.`);
}

main().catch((e) => {
  console.error(`❌ [guard-publicacion] ${e.message}`);
  process.exit(forzado ? 0 : 1);
});
