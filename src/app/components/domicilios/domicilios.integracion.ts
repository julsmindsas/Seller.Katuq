import { esFamiliaAdministrador } from '../../shared/utils/roles';
import { ConfiguracionDomicilios, LlaveApi, PruebaAviso, PuntoDomicilio } from './domicilios.models';

/**
 * Pestaña Integración: validar la URL de avisos y el nombre de una llave, leer con tolerancia lo que
 * responde el servidor y el texto de la guía rápida. Lógica pura, sin Angular ni DOM.
 *
 * Ojo con los secretos: `extraerSecreto` es lo único que los toca, y solo para entregarlos a quien los va
 * a mostrar una vez. Nada de aquí los guarda ni los escribe en un registro.
 */

// ---------------------------------------------------------------------------
// Validaciones
// ---------------------------------------------------------------------------

export const MAX_URL_AVISOS = 2000;
export const MAX_NOMBRE_LLAVE = 60;

export interface ResultadoUrlAvisos {
  valida: boolean;
  error: string | null;
  /** La dirección ya sin espacios; vacía si se quiere quitar. */
  url: string;
}

const SUFIJOS_INTERNOS = ['.localhost', '.local', '.internal', '.lan', '.home.arpa'];

/** ¿El nombre apunta a la red local o a una máquina, y no a un sitio público? */
export function esHostNoPublico(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || SUFIJOS_INTERNOS.some(s => h.endsWith(s))) return true;
  if (h.startsWith('[')) return true; // una dirección IPv6 escrita a mano: se pide un dominio
  const ip = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (!ip) return false;
  const [a, b] = [Number(ip[1]), Number(ip[2])];
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

/**
 * La URL de avisos debe ser https y pública (el servidor lo vuelve a revisar). Vacía es válida: así se quita.
 */
export function validarUrlAvisos(texto: unknown): ResultadoUrlAvisos {
  const url = String(texto ?? '').trim();
  const mal = (error: string): ResultadoUrlAvisos => ({ valida: false, error, url });
  if (!url) return { valida: true, error: null, url: '' };
  if (url.length > MAX_URL_AVISOS) return mal(`La dirección es demasiado larga (máximo ${MAX_URL_AVISOS} caracteres).`);
  if (/^http:\/\//i.test(url)) return mal('La dirección debe empezar con https://, no con http://.');
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return mal('Escribe la dirección completa, por ejemplo https://tu-sitio.com/avisos.');
  }
  if (u.protocol !== 'https:') return mal('La dirección debe empezar con https://.');
  if (u.username || u.password) return mal('No pongas usuario ni contraseña dentro de la dirección.');
  if (esHostNoPublico(u.hostname)) return mal('La dirección debe ser pública en internet, no de tu red local.');
  return { valida: true, error: null, url };
}

export interface ResultadoNombreLlave {
  valido: boolean;
  error: string | null;
  nombre: string;
}

export function validarNombreLlave(texto: unknown): ResultadoNombreLlave {
  const nombre = String(texto ?? '').trim();
  if (!nombre) return { valido: false, nombre, error: 'Escribe un nombre para reconocer la llave, por ejemplo «Mi tienda web».' };
  if (nombre.length > MAX_NOMBRE_LLAVE) {
    return { valido: false, nombre, error: `El nombre puede tener máximo ${MAX_NOMBRE_LLAVE} caracteres.` };
  }
  return { valido: true, nombre, error: null };
}

// ---------------------------------------------------------------------------
// Lectura tolerante de lo que responde el servidor
// ---------------------------------------------------------------------------

function objeto(valor: unknown): Record<string, unknown> {
  return valor && typeof valor === 'object' && !Array.isArray(valor) ? (valor as Record<string, unknown>) : {};
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : '';
}

function numero(...candidatos: unknown[]): number | null {
  for (const c of candidatos) {
    if (typeof c === 'number' && isFinite(c)) return c;
  }
  return null;
}

function puntoDe(valor: unknown): Partial<PuntoDomicilio> {
  const v = objeto(valor);
  const salida: Partial<PuntoDomicilio> = {};
  (['nombre', 'telefono', 'direccion', 'ciudad', 'barrio', 'indicaciones'] as Array<keyof PuntoDomicilio>).forEach(k => {
    if (typeof v[k] === 'string') salida[k] = v[k] as string;
  });
  return salida;
}

/** `GET /configuracion`: acepta el objeto suelto o dentro de `configuracion`. */
export function normalizarConfiguracion(respuesta: unknown): ConfiguracionDomicilios {
  const base = objeto(respuesta);
  const c = base['configuracion'] && typeof base['configuracion'] === 'object' ? objeto(base['configuracion']) : base;
  return {
    habilitado: c['habilitado'] === true,
    webhookUrl: texto(c['webhookUrl']),
    webhookSecretoDefinido: c['webhookSecretoDefinido'] === true,
    recogidaPorDefecto: puntoDe(c['recogidaPorDefecto'])
  };
}

/** `GET /llaves`: solo se copian los campos conocidos, así que ningún secreto sobrevive aunque llegara. */
export function normalizarLlaves(respuesta: unknown): LlaveApi[] {
  const base = objeto(respuesta);
  const lista = Array.isArray(respuesta) ? respuesta : Array.isArray(base['llaves']) ? (base['llaves'] as unknown[]) : [];
  return lista
    .map(objeto)
    .filter(l => texto(l['id']))
    .map(l => ({
      id: texto(l['id']),
      prefijo: texto(l['prefijo']),
      nombre: texto(l['nombre']),
      creada: texto(l['creada']),
      ultimoUso: texto(l['ultimoUso']) || null
    }));
}

/**
 * El secreto que llega al crear una llave o al cambiar el secreto de firma. Se busca en los nombres que
 * puede traer; devuelve `null` si no vino ninguno utilizable.
 */
export function extraerSecreto(respuesta: unknown): string | null {
  const r = objeto(respuesta);
  const candidatos = [r['secreto'], r['llaveCompleta'], r['apiKey'], r['llave'], objeto(r['llave'])['secreto'], r['webhookSecreto']];
  for (const c of candidatos) {
    if (typeof c === 'string' && c.trim().length >= 8) return c.trim();
  }
  return null;
}

/** `POST /configuracion/probar`: cómo respondió la URL del comercio, en una frase. */
export function interpretarPruebaAviso(respuesta: unknown): PruebaAviso {
  const r = objeto(respuesta);
  const interno = objeto(r['respuesta']);
  const estadoHttp = numero(r['estado'], r['status'], r['estadoHttp'], r['httpStatus'], r['codigoHttp'], interno['status'], interno['estado']);
  const milisegundos = numero(r['ms'], r['milisegundos'], r['duracionMs'], r['tiempoMs']);
  const exitosa =
    typeof r['exito'] === 'boolean' ? (r['exito'] as boolean)
    : typeof r['ok'] === 'boolean' ? (r['ok'] as boolean)
    : estadoHttp !== null ? estadoHttp >= 200 && estadoHttp < 300
    : r['success'] === true;
  const codigo = estadoHttp !== null ? ` (código ${estadoHttp})` : '';
  const tiempo = milisegundos !== null ? ` en ${milisegundos} ms` : '';
  const delServidor = texto(r['error']).trim() || texto(r['mensaje']).trim();
  const frase = exitosa
    ? `Tu dirección respondió bien${codigo}${tiempo}.`
    : delServidor ||
      `Tu dirección no respondió bien${codigo}. Revisa que esté en línea y que conteste con un código 2xx en menos de 10 segundos.`;
  return { exitosa, texto: frase, estadoHttp, milisegundos };
}

// ---------------------------------------------------------------------------
// Guía rápida
// ---------------------------------------------------------------------------

/** Dirección pública de la API, solo para mostrarla en la guía (las llamadas de la pantalla usan la de la sesión). */
export const URL_PUBLICA_API = 'https://back.katuq.com';

export const EVENTOS_AVISO: ReadonlyArray<{ evento: string; cuando: string }> = [
  { evento: 'domicilio.asignado', cuando: 'Un mensajero lo tomó.' },
  { evento: 'domicilio.liberado', cuando: 'El mensajero lo soltó; vuelve a «pendiente».' },
  { evento: 'domicilio.recogido', cuando: 'Pasa a «en_camino».' },
  { evento: 'domicilio.entregado', cuando: 'Pasa a «entregado».' },
  { evento: 'domicilio.no_entregado', cuando: 'Pasa a «no_entregado».' },
  { evento: 'domicilio.cancelado', cuando: 'Pasa a «cancelado».' }
];

export const ENCABEZADOS_AVISO: ReadonlyArray<{ nombre: string; para: string }> = [
  { nombre: 'X-Katuq-Evento', para: 'El evento, por ejemplo domicilio.entregado.' },
  { nombre: 'X-Katuq-Id', para: 'Único por evento: úsalo para ignorar los repetidos.' },
  { nombre: 'X-Katuq-Timestamp', para: 'Segundos desde 1970; rechaza avisos con más de 5 minutos de diferencia.' },
  { nombre: 'X-Katuq-Firma', para: 'sha256=<hex>, la firma del aviso.' }
];

export function ejemploCurl(baseUrl: string = URL_PUBLICA_API): string {
  const cuerpo = JSON.stringify({
    idExterno: 'MP-1001',
    recogida: { direccion: 'Carrera 7 # 40-10', ciudad: 'Bogotá' },
    entrega: { nombre: 'Ana Gómez', telefono: '3101234567', direccion: 'Calle 10 # 5-20', ciudad: 'Bogotá' },
    valorDomicilio: 7000
  });
  return [
    `curl -X POST ${baseUrl}/v1/domicilios \\`,
    '  -H "Authorization: Bearer $KATUQ_LLAVE" \\',
    '  -H "Content-Type: application/json" \\',
    `  -d '${cuerpo}'`
  ].join('\n');
}

export const EJEMPLO_VERIFICAR_FIRMA = [
  "const esperado = 'sha256=' + crypto",
  '  .createHmac(\'sha256\', secreto)',
  '  .update(`${timestamp}.${cuerpoCrudo}`)',
  "  .digest('hex');",
  'const ok = crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(firmaRecibida));'
].join('\n');

// ---------------------------------------------------------------------------
// Quién ve la pestaña
// ---------------------------------------------------------------------------

/**
 * La pestaña Integración (llaves, avisos) es del administrador del comercio. Esto solo decide qué se
 * muestra; el candado real es del servidor, que responde 403 a cualquier otro rol.
 */
export function puedeAdministrarIntegracion(usuario: { rol?: unknown } | null | undefined): boolean {
  return !!usuario && esFamiliaAdministrador(usuario.rol);
}
