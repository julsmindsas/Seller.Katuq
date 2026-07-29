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

  // Obtener el último buildNumber
  const buildNumber = getLatestBuildNumber(currentVersion);
  
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
function writeVersionJson(version) {
  const outPath = path.join(__dirname, 'src', 'assets', 'version.json');

  // Conservar las notas que ya estuvieran escritas para esta publicación.
  let notas = [];
  try {
    const previo = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    if (Array.isArray(previo.notas)) notas = previo.notas;
  } catch (e) {
    // No existe todavía o está corrupto: se crea desde cero.
  }

  const payload = {
    version,
    publicada: new Date().toISOString(),
    notas,
  };

  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n');
  console.log(`Versión publicada en assets/version.json: ${version}`);
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