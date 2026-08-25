/**
 * Comprueba que la vista previa del editor y la página publicada digan lo mismo.
 *
 * La página que ve el cliente NO la dibuja Angular: la arma el backend como
 * HTML plano en `functions/utils/siteHtml.js`. El componente `sitio-render` es
 * la vista previa del editor. Son dos implementaciones a propósito —una tiene
 * que abrir rápido en un celular con mala señal, la otra vive dentro del panel—
 * pero tienen que moverse juntas.
 *
 * Si se desfasan no falla nada: el comerciante ve una página en el editor y
 * publica otra. Ese es exactamente el tipo de error que nadie reporta porque
 * nadie sabe que está pasando.
 *
 * Uso:
 *   npm run verificar:espejo-sitio
 *   npm run verificar:espejo-sitio -- /ruta/al/katuq_admin_back_firebase
 *
 * Si no encuentra el repo del backend no falla: avisa y sale en 0, porque no
 * todo el mundo lo tiene clonado al lado.
 */

const fs = require("fs");
const path = require("path");

const RUTA_BACK =
  process.argv[2] || path.resolve(__dirname, "../../katuq_admin_back_firebase");
const SITE_HTML = path.join(RUTA_BACK, "functions/utils/siteHtml.js");
const RENDER_TS = path.resolve(
  __dirname,
  "../src/app/components/sitio-render/sitio-render.component.ts"
);

if (!fs.existsSync(SITE_HTML)) {
  console.log(
    `\n⚠  No encontré el backend en ${RUTA_BACK}\n` +
      `   Pásame la ruta: npm run verificar:espejo-sitio -- /ruta/al/repo\n` +
      `   (no es un error: se omite la comprobación)\n`
  );
  process.exit(0);
}

const back = require(SITE_HTML);
const fuente = fs.readFileSync(RENDER_TS, "utf8");

/** Quita las comillas exteriores de un literal de cadena de JS. */
function sinComillas(valor) {
  const v = valor.trim().replace(/,$/, "").trim();
  const comilla = v[0];
  if (comilla !== '"' && comilla !== "'") return v;
  return v.slice(1, -1).replace(new RegExp(`\\\\${comilla}`, "g"), comilla);
}

/** Normaliza una lista de familias para compararlas sin ruido de espacios. */
function normalizar(familia) {
  return String(familia).replace(/\s+/g, " ").trim();
}

/**
 * Extrae `const NOMBRE = { ... };` del componente, ya partido en líneas.
 *
 * Se parte con `\r?\n` y NO con `"\n"` a secas: el componente está guardado con
 * fin de línea de Windows, y al partir solo por `\n` cada línea queda con un
 * `\r` al final. Las expresiones que terminan en `(.+)$` no casan entonces
 * nada, porque en JavaScript el punto no acepta terminadores de línea y `\r` es
 * uno. Eso hacía que el verificador leyera los NOMBRES de los estilos pero
 * ningún VALOR, y reportara los 66 campos como desfasados cuando en realidad
 * coincidían todos. Un guardián que grita en falso enseña a ignorarlo.
 */
function bloque(nombre) {
  const m = fuente.match(new RegExp(`const ${nombre}[^=]*=\\s*\\{([\\s\\S]*?)\\r?\\n\\};`));
  if (!m) throw new Error(`No encontré ${nombre} en sitio-render.component.ts`);
  return m[1].split(/\r?\n/);
}

/**
 * Si un bloque se encuentra pero no se le lee ni una entrada, el roto es este
 * script y no la vista previa. Sin esta guarda, ese fallo se disfraza de
 * "todo está desfasado".
 */
function exigirQueLeyeraAlgo(nombre, leido) {
  const cuantos = Object.keys(leido).length;
  if (cuantos === 0) {
    console.error(
      `\n✖ El verificador no pudo leer ni una entrada de ${nombre} en sitio-render.component.ts.\n` +
        `  Eso es un fallo DE ESTE SCRIPT (cambió el formato del componente), no un desfase.\n`
    );
    process.exit(2);
  }
}

let fallas = 0;
const mal = (msg) => {
  fallas += 1;
  console.log(` FALLA  ${msg}`);
};
const bien = (msg) => console.log(`  ok    ${msg}`);

// ── Fuentes ──────────────────────────────────────────────────────────────────
const familiasPrevia = {};
bloque("FAMILIAS").forEach((linea) => {
  const m = linea.match(/^\s{2}(\w+):\s*(.+)$/);
  if (m) familiasPrevia[m[1]] = sinComillas(m[2]);
});
exigirQueLeyeraAlgo("FAMILIAS", familiasPrevia);

const idsBack = Object.keys(back.FUENTES).sort();
const idsPrevia = Object.keys(familiasPrevia).sort();

if (idsBack.join() !== idsPrevia.join()) {
  const faltan = idsBack.filter((i) => !idsPrevia.includes(i));
  const sobran = idsPrevia.filter((i) => !idsBack.includes(i));
  mal(
    `las fuentes no coinciden — faltan en la previa: [${faltan}] · sobran en la previa: [${sobran}]`
  );
} else {
  bien(`las ${idsBack.length} fuentes son las mismas`);
}

const familiasDistintas = idsBack.filter(
  (id) =>
    familiasPrevia[id] !== undefined &&
    normalizar(back.FUENTES[id].familia) !== normalizar(familiasPrevia[id])
);
if (familiasDistintas.length) {
  familiasDistintas.forEach((id) => {
    mal(
      `la familia de "${id}" difiere\n` +
        `        publicada: ${normalizar(back.FUENTES[id].familia)}\n` +
        `        previa   : ${normalizar(familiasPrevia[id])}`
    );
  });
} else {
  bien("cada fuente resuelve a la misma familia en las dos");
}

// ── Estilos de página ────────────────────────────────────────────────────────
const estilosPrevia = {};
let estiloActual = null;
bloque("ESTILOS").forEach((linea) => {
  const cab = linea.match(/^\s{2}(\w+):\s*\{/);
  if (cab) {
    estiloActual = cab[1];
    estilosPrevia[estiloActual] = {};
    return;
  }
  const par = linea.match(/^\s{4}"(--[\w-]+)":\s*(.+)$/);
  if (par && estiloActual) estilosPrevia[estiloActual][par[1]] = sinComillas(par[2]);
});
exigirQueLeyeraAlgo("ESTILOS", estilosPrevia);
// Un estilo declarado pero sin una sola variable leída también es fallo del
// script: es lo que pasaba antes con TODOS.
for (const [id, vars] of Object.entries(estilosPrevia)) {
  exigirQueLeyeraAlgo(`ESTILOS.${id}`, vars);
}

// Nombre del campo en el backend → variable CSS que emite.
const EQUIVALENCIAS = {
  radio: "--sitio-radio",
  radioSm: "--sitio-radio-sm",
  sombra: "--sitio-sombra",
  borde: "--sitio-borde",
  aire: "--sitio-aire",
  aireAncho: "--sitio-aire-ancho",
  tituloPeso: "--sitio-titulo-peso",
  tituloTrack: "--sitio-titulo-track",
  tituloEscala: "--sitio-titulo-escala",
  tituloAltura: "--sitio-titulo-altura",
  etiquetaCaja: "--sitio-etiqueta-caja",
  etiquetaTrack: "--sitio-etiqueta-track",
  anchoTexto: "--sitio-ancho",
};

const estilosBack = Object.keys(back.ESTILOS).sort();
if (estilosBack.join() !== Object.keys(estilosPrevia).sort().join()) {
  mal(
    `los estilos de página no coinciden — publicada: [${estilosBack}] · previa: [${Object.keys(
      estilosPrevia
    ).sort()}]`
  );
} else {
  bien(`los ${estilosBack.length} estilos de página son los mismos`);
}

const valoresDistintos = [];
estilosBack.forEach((id) => {
  const b = back.ESTILOS[id];
  const p = estilosPrevia[id] || {};
  Object.entries(EQUIVALENCIAS).forEach(([campo, variable]) => {
    if (normalizar(b[campo]) !== normalizar(p[variable])) {
      valoresDistintos.push(`${id} · ${variable}: publicada="${b[campo]}" previa="${p[variable]}"`);
    }
  });
});

if (valoresDistintos.length) {
  valoresDistintos.forEach((d) => mal(d));
} else {
  bien("los valores de los estilos son idénticos en las dos");
}

console.log(
  "\n" +
    (fallas
      ? `${fallas} DESFASES — la previa le está mintiendo al comerciante.\n`
      : "Todo en verde: la vista previa y la página publicada dicen lo mismo.\n")
);
process.exit(fallas ? 1 : 0);
