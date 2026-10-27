const fs = require('fs');
const path = require('path');

// Función para formatear la fecha en español (para mostrar en UI)
function formatDate(date) {
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return `${date.getDate()} de ${months[date.getMonth()]} ${date.getFullYear()}`;
}

// Función para generar el número de versión basado en la fecha
function generateVersionNumber(buildNumber = 1) {
  const today = new Date();
  const year = today.getFullYear();
  // Mes con dos dígitos (añadimos +1 porque los meses en JavaScript van de 0-11)
  const month = String(today.getMonth() + 1).padStart(2, '0');
  // Día con dos dígitos
  const day = String(today.getDate()).padStart(2, '0');
  
  return `${year}.${month}.${day}.${buildNumber}`;
}

// Función para obtener el último buildNumber del día
function getLatestBuildNumber(currentVersion) {
  // Si ya existe una versión con el formato año.mes.día.buildNumber
  const dateVersionPattern = /(\d{4})\.(\d{2})\.(\d{2})\.(\d+)/;
  const match = currentVersion ? currentVersion.match(dateVersionPattern) : null;
  
  if (match) {
    const versionYear = match[1];
    const versionMonth = match[2];
    const versionDay = match[3];
    const buildNumber = parseInt(match[4]);
    
    const today = new Date();
    const currentYear = today.getFullYear().toString();
    const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
    const currentDay = String(today.getDate()).padStart(2, '0');
    
    // Si la versión es de hoy, incrementamos el buildNumber
    if (versionYear === currentYear && versionMonth === currentMonth && versionDay === currentDay) {
      return buildNumber + 1;
    }
  }
  
  // Si la versión es de otro día o no tiene el formato, comenzar desde 1
  return 1;
}

// Versión de src/assets/version.json (la última publicada que trae git)
function versionPublicadaEnGit() {
  try {
    const json = JSON.parse(fs.readFileSync(path.join(__dirname, 'src', 'assets', 'version.json'), 'utf8'));
    return json && json.version ? String(json.version) : null;
  } catch (e) {
    return null;
  }
}

// Mayor versión de hoy en los commits "chore(release): AAAA.MM.DD.N" de todas
// las ramas: una publicación hecha desde otra copia no siempre deja su
// version.json en esta rama.
function ultimoReleaseDeHoyEnGit() {
  try {
    const { execFileSync } = require('child_process');
    const hoy = generateVersionNumber(0).replace(/\.0$/, '');
    const salida = execFileSync('git', ['log', '--all', '--since=36 hours ago', '--format=%s', '--grep=^chore(release): ' + hoy.replace(/\./g, '\\.')], { cwd: __dirname, encoding: 'utf8' });
    let mayor = 0;
    salida.split('\n').forEach((linea) => {
      const m = linea.match(/^chore\(release\): (\d{4})\.(\d{2})\.(\d{2})\.(\d+)/);
      if (m && `${m[1]}.${m[2]}.${m[3]}` === hoy) mayor = Math.max(mayor, parseInt(m[4], 10));
    });
    return mayor ? `${hoy}.${mayor}` : null;
  } catch (e) {
    return null;
  }
}

// Función para actualizar la versión en un archivo
function updateVersion(filePath, isBeta = true) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Buscar la línea de versión actual
  const versionPattern = /version: "([^"]+)"/;
  const match = content.match(versionPattern);
  
  let currentVersion = null;
  if (match) {
    currentVersion = match[1];
  }

  // Obtener el último buildNumber. Los environments no se versionan (cada copia
  // del repo lleva su propio contador), así que también se mira
  // src/assets/version.json, que sí viaja con git: si otra copia ya publicó la
  // .10, aquí no se vuelve a la .4.
  const buildNumber = Math.max(
    getLatestBuildNumber(currentVersion),
    getLatestBuildNumber(versionPublicadaEnGit()),
    getLatestBuildNumber(ultimoReleaseDeHoyEnGit())
  );
  
  // Generar la nueva versión con formato año.mes.día.buildNumber
  const versionNumber = generateVersionNumber(buildNumber);
  
  const today = new Date();
  const formattedDate = formatDate(today);
  const betaTag = isBeta ? ' (Beta)' : '';
  
  // Nueva versión completa con fecha para mostrar
  const newVersion = `${versionNumber} - ${formattedDate}${betaTag}`;
  
  // Reemplaza la versión en el archivo
  const newContent = content.replace(
    versionPattern,
    `version: "${newVersion}"`
  );
  
  fs.writeFileSync(filePath, newContent);
  console.log(`Versión actualizada en ${path.basename(filePath)}: ${newVersion}`);
  return newVersion;
}

/**
 * Publica la versión recién generada como archivo estático.
 *
 * La app compilada lleva su versión "quemada" en el bundle (environment.version);
 * este JSON es la única forma de saber, sin recargar, qué versión está publicada
 * en el servidor. VersionCheckService lo consulta cada cierto tiempo y compara.
 *
 * `notas` es opcional: si se llena a mano antes de publicar, el aviso de
 * actualización muestra el detalle de novedades.
 */
/**
 * Commit de HEAD y archivos de código con cambios sin commitear (sin contar la
 * versión ni los environments, que cambian en cada build). Sin git, vacío.
 */
function origenDelBuild() {
  try {
    const { execFileSync } = require('child_process');
    const opts = { cwd: __dirname, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] };
    const commit = execFileSync('git', ['rev-parse', 'HEAD'], opts).trim();
    const sucios = execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], opts)
      .split('\n')
      .map((l) => l.slice(3).trim())
      .filter((f) => f && !/^src\/assets\/version\.json$|^src\/environments\//.test(f));
    return { commit, cambiosSinCommit: sucios.length };
  } catch (e) {
    return {};
  }
}

/**
 * Ticket 1377 (ALMARA): cada versión explica en palabras sencillas qué mejoró.
 * Quien sube un cambio que ve el comercio agrega su nota a `notas-version.json`
 * (raíz del repo): `{ "fecha": "2026-10-26T20:00", "tipo": "NUEVO" | "MEJORA" | "CORRIGE", "texto": "..." }`.
 * La versión lleva las notas agregadas DESPUÉS de la última publicación (la
 * `publicada` del version.json que trae git). No se vacía el archivo: este
 * script corre en cada build, también en los locales, y no debe comerse las notas.
 * Antes se copiaban las notas de la versión anterior.
 */
const NOTAS_VERSION = path.join(__dirname, 'notas-version.json');

/** Fecha de la última publicación según git (el version.json local cambia en cada build). */
function ultimaPublicacionEnGit() {
  try {
    const { execFileSync } = require('child_process');
    const json = execFileSync('git', ['show', 'HEAD:src/assets/version.json'], { cwd: __dirname, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return JSON.parse(json).publicada || '';
  } catch (e) {
    return '';
  }
}

function notasDeEstaVersion() {
  try {
    const lista = JSON.parse(fs.readFileSync(NOTAS_VERSION, 'utf8'));
    if (!Array.isArray(lista)) return [];
    const desde = Date.parse(ultimaPublicacionEnGit()) || 0;
    return lista
      .filter((n) => n && typeof n.texto === 'string' && n.texto.trim())
      .filter((n) => (Date.parse(n.fecha) || 0) > desde)
      .map((n) => ({ tipo: String(n.tipo || 'MEJORA').toUpperCase(), texto: n.texto.trim() }));
  } catch (e) {
    return [];
  }
}

function writeVersionJson(version) {
  const outPath = path.join(__dirname, 'src', 'assets', 'version.json');

  const notas = notasDeEstaVersion();

  const payload = {
    version,
    publicada: new Date().toISOString(),
    notas,
    // Desde qué código se compiló. Lo usa scripts/guard-publicacion.js (predeploy
    // de Firebase) para que una publicación no pise otra más nueva o con código
    // que este build no tiene (incidente 2026-10-16: la .16.2 pisó la .16.3).
    ...origenDelBuild(),
  };

  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n');
  console.log(`Versión publicada en assets/version.json: ${version}`);
  if (notas.length) {
    console.log(`Notas de la versión: ${notas.length} (de notas-version.json, agregadas después de la última publicación)`);
  } else {
    console.log('Esta versión sale sin notas: agrega las de los cambios visibles en notas-version.json.');
  }
}

// Rutas de los archivos
const envPath = path.join(__dirname, 'src', 'environments', 'environment.ts');
const envProdPath = path.join(__dirname, 'src', 'environments', 'environment.prod.ts');

// Actualizar ambos archivos
const devVersion = updateVersion(envPath);
const prodVersion = updateVersion(envProdPath);

// Exponer la versión de producción como archivo estático para el aviso in-app.
writeVersionJson(prodVersion);

console.log('');
console.log('🚀 Actualización de versiones completada');
console.log(`📱 Versión de desarrollo: ${devVersion}`);
console.log(`🚀 Versión de producción: ${prodVersion}`);