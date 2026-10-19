import { EntregaLiquidada, SolicitudMensajero } from './mensajeros-independientes.models';
import {
  accionesDisponibles,
  accionPideMotivo,
  agruparPorComercio,
  BOM_UTF8,
  celdaCsv,
  COMERCIO_SIN_NOMBRE,
  comerciosPorComision,
  construirCsv,
  construirFilaEntrega,
  construirLiquidacion,
  ENCABEZADOS_CSV,
  entero,
  esFechaIso,
  fechaHoraCsv,
  fechaIso,
  formatearEntero,
  formatearFechaIso,
  formatearPesos,
  formatearPorcentaje,
  mensajeVacioLiquidacion,
  nombreArchivoCsv,
  rangoDelMes,
  SEPARADOR_CSV,
  sumarEntregas,
  TEXTOS_ERROR_LIQUIDACION,
  textoRango,
  TOTALES_VACIOS,
  validarRango,
  construirDocumentos,
  construirFila,
  CODIGO_TRANSICION_NO_PERMITIDA,
  esSuperAdminOperadora,
  esUrlDeDocumento,
  etiquetaDocumento,
  etiquetaEstado,
  etiquetaPestana,
  etiquetaVehiculo,
  fechaReferencia,
  filasPorFechaReciente,
  interpretarError,
  mensajeExito,
  mensajeVacio,
  muestraMotivoDeRevision,
  MOTIVO_MAX,
  MOTIVO_MIN,
  nombreCompleto,
  normalizarFecha,
  placaVisible,
  segundosRestantes,
  textoVencimiento,
  tonoEstado,
  urlsDeImagenes,
  validarMotivo,
  ESTADOS_SOLICITUD,
} from './mensajeros-independientes.utils';

const URL_JPG = 'https://almacen.example.com/firmado/cedula-frente.jpg?firma=abc';
const URL_PDF = 'https://almacen.example.com/firmado/soat.pdf?firma=def';

describe('mensajeros-independientes.utils', () => {
  describe('estados', () => {
    it('da una etiqueta en español para cada estado conocido', () => {
      expect(etiquetaEstado('en_revision')).toBe('En revisión');
      expect(etiquetaEstado('pendiente_documentos')).toBe('Faltan documentos');
      expect(etiquetaEstado('rechazado')).toBe('Rechazada');
      expect(etiquetaEstado('aprobado')).toBe('Aprobada');
      expect(etiquetaEstado('suspendido')).toBe('Suspendida');
    });

    it('no se rompe con un estado nuevo o vacío', () => {
      expect(etiquetaEstado('en_pausa')).toBe('En pausa');
      expect(etiquetaEstado('')).toBe('Sin estado');
      expect(etiquetaEstado(undefined)).toBe('Sin estado');
    });

    it('cada estado tiene pestaña y tono, y los desconocidos son neutros', () => {
      expect(ESTADOS_SOLICITUD.length).toBe(5);
      ESTADOS_SOLICITUD.forEach((estado) => {
        expect(etiquetaPestana(estado).length).toBeGreaterThan(0);
        expect(tonoEstado(estado)).toBeDefined();
      });
      expect(etiquetaPestana('rechazado')).toBe('Rechazadas');
      expect(tonoEstado('aprobado')).toBe('ok');
      expect(tonoEstado('rechazado')).toBe('err');
      expect(tonoEstado('algo_raro')).toBe('neutro');
    });
  });

  describe('normalizarFecha', () => {
    const MS = Date.parse('2026-10-14T15:30:00.000Z');

    it('convierte el Timestamp de Firestore con guion bajo', () => {
      const fecha = normalizarFecha({ _seconds: MS / 1000, _nanoseconds: 0 });
      expect(fecha?.getTime()).toBe(MS);
    });

    it('convierte el Timestamp sin guion bajo y suma los nanosegundos como milisegundos', () => {
      const fecha = normalizarFecha({ seconds: MS / 1000, nanoseconds: 250_000_000 });
      expect(fecha?.getTime()).toBe(MS + 250);
    });

    it('acepta texto ISO', () => {
      expect(normalizarFecha('2026-10-14T15:30:00.000Z')?.getTime()).toBe(MS);
    });

    it('acepta milisegundos, segundos y números como texto', () => {
      expect(normalizarFecha(MS)?.getTime()).toBe(MS);
      expect(normalizarFecha(MS / 1000)?.getTime()).toBe(MS);
      expect(normalizarFecha(String(MS))?.getTime()).toBe(MS);
    });

    it('acepta un Date válido', () => {
      const fecha = new Date(MS);
      expect(normalizarFecha(fecha)).toBe(fecha);
    });

    it('devuelve null si no hay nada utilizable', () => {
      expect(normalizarFecha(null)).toBeNull();
      expect(normalizarFecha(undefined)).toBeNull();
      expect(normalizarFecha('')).toBeNull();
      expect(normalizarFecha('   ')).toBeNull();
      expect(normalizarFecha('no es fecha')).toBeNull();
      expect(normalizarFecha(new Date('x'))).toBeNull();
      expect(normalizarFecha({})).toBeNull();
      expect(normalizarFecha({ _seconds: 'abc' })).toBeNull();
      expect(normalizarFecha(NaN)).toBeNull();
    });
  });

  describe('fechaReferencia', () => {
    it('prefiere la fecha de envío', () => {
      const r = fechaReferencia({ enviadoAt: '2026-10-14T10:00:00Z', creadoAt: '2026-10-10T10:00:00Z' });
      expect(r?.etiqueta).toBe('Enviada');
      expect(r?.fecha.toISOString()).toBe('2026-10-14T10:00:00.000Z');
    });

    it('usa la de registro si no ha enviado', () => {
      const r = fechaReferencia({ creadoAt: { _seconds: 1791000000, _nanoseconds: 0 } });
      expect(r?.etiqueta).toBe('Registrada');
      expect(r?.fecha.getTime()).toBe(1791000000 * 1000);
    });

    it('devuelve null sin ninguna', () => {
      expect(fechaReferencia({})).toBeNull();
    });
  });

  describe('datos de la persona y del vehículo', () => {
    it('arma el nombre completo y limpia espacios', () => {
      expect(nombreCompleto({ nombres: ' Ana  María ', apellidos: 'Pérez ' })).toBe('Ana María Pérez');
      expect(nombreCompleto({})).toBe('Sin nombre');
    });

    it('etiqueta el vehículo', () => {
      expect(etiquetaVehiculo('moto')).toBe('Moto');
      expect(etiquetaVehiculo('MOTO')).toBe('Moto');
      expect(etiquetaVehiculo('a_pie')).toBe('A pie');
      expect(etiquetaVehiculo('A pie')).toBe('A pie');
      expect(etiquetaVehiculo('bicicleta')).toBe('Bicicleta');
      expect(etiquetaVehiculo('furgon_pequeno')).toBe('Furgon pequeno');
      expect(etiquetaVehiculo('')).toBe('Sin vehículo');
      expect(etiquetaVehiculo(undefined)).toBe('Sin vehículo');
    });

    it('deja la placa en mayúsculas y sin espacios', () => {
      expect(placaVisible(' abc 123 ')).toBe('ABC123');
      expect(placaVisible(undefined)).toBe('');
      expect(placaVisible(12)).toBe('');
    });
  });

  describe('validarMotivo', () => {
    it('rechaza vacío y solo espacios', () => {
      expect(validarMotivo('').valido).toBeFalse();
      expect(validarMotivo(null).valido).toBeFalse();
      expect(validarMotivo(undefined).valido).toBeFalse();
      const r = validarMotivo('      ');
      expect(r.valido).toBeFalse();
      expect(r.longitud).toBe(0);
      expect(r.error).toContain('Escribe el motivo');
    });

    it('rechaza menos de 5 caracteres, contando sin espacios en los extremos', () => {
      expect(validarMotivo('abcd').valido).toBeFalse();
      expect(validarMotivo('  abcd  ').valido).toBeFalse();
      expect(validarMotivo('abcd').error).toContain('muy corto');
    });

    it('acepta de 5 a 300 caracteres', () => {
      expect(MOTIVO_MIN).toBe(5);
      expect(MOTIVO_MAX).toBe(300);
      expect(validarMotivo('abcde').valido).toBeTrue();
      expect(validarMotivo('a'.repeat(300)).valido).toBeTrue();
    });

    it('rechaza más de 300 caracteres', () => {
      const r = validarMotivo('a'.repeat(301));
      expect(r.valido).toBeFalse();
      expect(r.longitud).toBe(301);
      expect(r.error).toContain('muy largo');
    });

    it('devuelve el texto recortado, que es el que se envía', () => {
      expect(validarMotivo('  La cédula no se lee  ').texto).toBe('La cédula no se lee');
    });

    it('un motivo largo con espacios en los extremos cuenta sin ellos', () => {
      expect(validarMotivo(` ${'a'.repeat(300)} `).valido).toBeTrue();
    });
  });

  describe('accionesDisponibles', () => {
    it('en revisión sin faltantes: aprobar habilitado y rechazar', () => {
      const a = accionesDisponibles('en_revision', []);
      expect(a.aprobar).toBeTrue();
      expect(a.aprobarHabilitado).toBeTrue();
      expect(a.aprobarBloqueadoPor).toBeNull();
      expect(a.rechazar).toBeTrue();
      expect(a.suspender).toBeFalse();
    });

    it('en revisión con faltantes: aprobar visible pero deshabilitado, y dice por qué', () => {
      const a = accionesDisponibles('en_revision', ['licencia', 'soat']);
      expect(a.aprobar).toBeTrue();
      expect(a.aprobarHabilitado).toBeFalse();
      expect(a.aprobarBloqueadoPor).toContain('faltan documentos');
      expect(a.aprobarBloqueadoPor).toContain('Licencia de conducción');
      expect(a.aprobarBloqueadoPor).toContain('SOAT');
      expect(a.rechazar).toBeTrue();
    });

    it('trata documentosFaltantes ausente como vacío', () => {
      expect(accionesDisponibles('en_revision', undefined).aprobarHabilitado).toBeTrue();
      expect(accionesDisponibles('en_revision', null).aprobarHabilitado).toBeTrue();
    });

    it('aprobada: solo suspender', () => {
      const a = accionesDisponibles('aprobado', []);
      expect(a.suspender).toBeTrue();
      expect(a.aprobar).toBeFalse();
      expect(a.rechazar).toBeFalse();
    });

    it('rechazada, suspendida, pendiente de documentos o desconocida: sin acciones', () => {
      ['rechazado', 'suspendido', 'pendiente_documentos', 'otro', undefined].forEach((estado) => {
        const a = accionesDisponibles(estado, []);
        expect(a.aprobar).toBeFalse();
        expect(a.aprobarHabilitado).toBeFalse();
        expect(a.rechazar).toBeFalse();
        expect(a.suspender).toBeFalse();
      });
    });

    it('rechazar y suspender piden motivo; aprobar no', () => {
      expect(accionPideMotivo('rechazar')).toBeTrue();
      expect(accionPideMotivo('suspender')).toBeTrue();
      expect(accionPideMotivo('aprobar')).toBeFalse();
    });

    it('el motivo de la revisión se muestra solo en rechazadas y suspendidas', () => {
      expect(muestraMotivoDeRevision('rechazado')).toBeTrue();
      expect(muestraMotivoDeRevision('suspendido')).toBeTrue();
      expect(muestraMotivoDeRevision('aprobado')).toBeFalse();
      expect(muestraMotivoDeRevision('en_revision')).toBeFalse();
    });
  });

  describe('documentos', () => {
    it('etiqueta los seis tipos', () => {
      expect(etiquetaDocumento('cedulaFrente')).toBe('Cédula (frente)');
      expect(etiquetaDocumento('cedulaReverso')).toBe('Cédula (reverso)');
      expect(etiquetaDocumento('selfie')).toBe('Foto del rostro (selfie)');
      expect(etiquetaDocumento('licencia')).toBe('Licencia de conducción');
      expect(etiquetaDocumento('soat')).toBe('SOAT');
      expect(etiquetaDocumento('fotoVehiculo')).toBe('Foto del vehículo');
      expect(etiquetaDocumento('tarjetaPropiedad')).toBe('TarjetaPropiedad');
    });

    it('solo acepta enlaces https (o http de la propia máquina)', () => {
      expect(esUrlDeDocumento(URL_JPG)).toBeTrue();
      expect(esUrlDeDocumento('http://localhost:9199/doc.jpg')).toBeTrue();
      expect(esUrlDeDocumento('http://127.0.0.1/doc.jpg')).toBeTrue();
      expect(esUrlDeDocumento('http://ejemplo.com/doc.jpg')).toBeFalse();
      expect(esUrlDeDocumento('javascript:alert(1)')).toBeFalse();
      expect(esUrlDeDocumento('data:image/png;base64,AAAA')).toBeFalse();
      expect(esUrlDeDocumento('')).toBeFalse();
      expect(esUrlDeDocumento(undefined)).toBeFalse();
    });

    it('a pie o en bicicleta: solo los tres primeros documentos', () => {
      const vista = construirDocumentos(
        {
          documentosFaltantes: [],
          documentos: {
            cedulaFrente: { subido: true },
            cedulaReverso: { subido: true },
            selfie: { subido: true },
          },
        },
        {
          cedulaFrente: { url: URL_JPG, contentType: 'image/jpeg' },
          cedulaReverso: { url: URL_JPG, contentType: 'image/jpeg' },
          selfie: { url: URL_JPG, contentType: 'image/jpeg' },
        },
      );
      expect(vista.map((d) => d.tipo)).toEqual(['cedulaFrente', 'cedulaReverso', 'selfie']);
      expect(vista.every((d) => d.modo === 'imagen')).toBeTrue();
    });

    it('SOAT en PDF se ofrece como archivo, no como imagen', () => {
      const vista = construirDocumentos(
        { documentos: { soat: { subido: true } }, documentosFaltantes: [] },
        { soat: { url: URL_PDF, contentType: 'application/pdf' } },
      );
      expect(vista.length).toBe(1);
      expect(vista[0].modo).toBe('archivo');
      expect(vista[0].formato).toBe('PDF');
      expect(vista[0].url).toBe(URL_PDF);
    });

    it('marca los faltantes y los subidos sin enlace', () => {
      const vista = construirDocumentos(
        {
          documentosFaltantes: ['licencia'],
          documentos: { cedulaFrente: { subido: true }, soat: { subido: true } },
        },
        { cedulaFrente: { url: URL_JPG, contentType: 'image/jpeg' } },
      );
      const porTipo = (t: string) => vista.find((d) => d.tipo === t);
      expect(porTipo('cedulaFrente')?.modo).toBe('imagen');
      expect(porTipo('licencia')?.modo).toBe('faltante');
      expect(porTipo('soat')?.modo).toBe('sin_enlace');
    });

    it('sigue el orden fijo de los tipos y no inventa los que no existen', () => {
      const vista = construirDocumentos(
        { documentosFaltantes: ['fotoVehiculo', 'cedulaFrente'], documentos: {} },
        {},
      );
      expect(vista.map((d) => d.tipo)).toEqual(['cedulaFrente', 'fotoVehiculo']);
    });

    it('descarta enlaces que no son https', () => {
      const vista = construirDocumentos(
        { documentos: { selfie: { subido: true } } },
        { selfie: { url: 'javascript:alert(1)', contentType: 'image/jpeg' } },
      );
      expect(vista[0].modo).toBe('sin_enlace');
      expect(vista[0].url).toBeNull();
    });

    it('incluye tipos nuevos que el backend agregue', () => {
      const vista = construirDocumentos(
        { documentos: {} },
        { tarjetaPropiedad: { url: URL_JPG, contentType: 'image/jpeg' } },
      );
      expect(vista.map((d) => d.tipo)).toEqual(['tarjetaPropiedad']);
    });

    it('normaliza la fecha de subida', () => {
      const vista = construirDocumentos(
        { documentos: { selfie: { subido: true, subidoAt: { _seconds: 1791000000, _nanoseconds: 0 } } } },
        { selfie: { url: URL_JPG, contentType: 'image/jpeg' } },
      );
      expect(vista[0].subidoAt?.getTime()).toBe(1791000000 * 1000);
    });

    it('tolera entradas vacías', () => {
      expect(construirDocumentos({}, null)).toEqual([]);
      expect(construirDocumentos({}, undefined)).toEqual([]);
    });

    it('urlsDeImagenes deja solo las fotos, en orden', () => {
      const vista = construirDocumentos(
        { documentos: { cedulaFrente: { subido: true }, soat: { subido: true }, selfie: { subido: true } } },
        {
          cedulaFrente: { url: URL_JPG, contentType: 'image/jpeg' },
          soat: { url: URL_PDF, contentType: 'application/pdf' },
          selfie: { url: URL_JPG + '2', contentType: 'image/jpeg' },
        },
      );
      expect(urlsDeImagenes(vista)).toEqual([URL_JPG, URL_JPG + '2']);
    });
  });

  describe('vencimiento de los enlaces', () => {
    it('cuenta hacia atrás desde la carga', () => {
      expect(segundosRestantes(600, 0, 0)).toBe(600);
      expect(segundosRestantes(600, 0, 60_000)).toBe(540);
      expect(segundosRestantes(600, 0, 599_500)).toBe(1);
    });

    it('nunca es negativo', () => {
      expect(segundosRestantes(600, 0, 700_000)).toBe(0);
    });

    it('usa 10 minutos si el servidor no dice el tiempo', () => {
      expect(segundosRestantes(undefined, 0, 0)).toBe(600);
      expect(segundosRestantes(0, 0, 0)).toBe(600);
      expect(segundosRestantes(NaN, 0, 0)).toBe(600);
    });

    it('redacta el aviso', () => {
      expect(textoVencimiento(600)).toContain('10 minutos');
      expect(textoVencimiento(61)).toContain('2 minutos');
      expect(textoVencimiento(30)).toContain('menos de un minuto');
      expect(textoVencimiento(0)).toContain('ya vencieron');
    });
  });

  describe('mensajes', () => {
    it('cada estado tiene su mensaje de lista vacía', () => {
      ESTADOS_SOLICITUD.forEach((estado) => {
        const m = mensajeVacio(estado);
        expect(m.titulo.length).toBeGreaterThan(0);
        expect(m.texto.length).toBeGreaterThan(0);
      });
      expect(mensajeVacio('en_revision').titulo).toBe('No hay solicitudes en revisión');
    });

    it('el aviso de éxito nombra a la persona y no promete nada más', () => {
      expect(mensajeExito('aprobar', 'Ana Pérez')).toBe('Aprobaste la solicitud de Ana Pérez.');
      expect(mensajeExito('rechazar', 'Ana Pérez')).toBe('Rechazaste la solicitud de Ana Pérez.');
      expect(mensajeExito('suspender', 'Ana Pérez')).toBe('Suspendiste a Ana Pérez.');
    });
  });

  describe('interpretarError', () => {
    it('muestra el error del backend tal cual', () => {
      const r = interpretarError({ status: 400, error: { success: false, error: 'El motivo debe tener entre 5 y 300 caracteres.' } });
      expect(r.texto).toBe('El motivo debe tener entre 5 y 300 caracteres.');
      expect(r.transicionObsoleta).toBeFalse();
      expect(r.status).toBe(400);
    });

    it('detecta 409 con TRANSICION_NO_PERMITIDA', () => {
      const r = interpretarError({
        status: 409,
        error: { success: false, error: 'La solicitud ya no está en revisión.', code: CODIGO_TRANSICION_NO_PERMITIDA },
      });
      expect(r.transicionObsoleta).toBeTrue();
      expect(r.texto).toBe('La solicitud ya no está en revisión.');
    });

    it('un 409 con otro código no es transición obsoleta', () => {
      expect(interpretarError({ status: 409, error: { error: 'Conflicto', code: 'OTRO' } }).transicionObsoleta).toBeFalse();
      expect(interpretarError({ status: 400, error: { error: 'x', code: CODIGO_TRANSICION_NO_PERMITIDA } }).transicionObsoleta).toBeFalse();
    });

    it('sin cuerpo útil usa un texto por tipo de falla', () => {
      expect(interpretarError({ status: 0 }).texto).toContain('conexión');
      expect(interpretarError({ status: 403, error: {} }).texto).toContain('permiso');
      expect(interpretarError({ status: 404 }).texto).toContain('No encontramos');
      expect(interpretarError({ status: 500 }).texto).toContain('servidor');
      expect(interpretarError({ status: 418 }).texto).toContain('No pudimos');
      expect(interpretarError(null).texto).toContain('No pudimos');
    });

    it('no muestra una página de error de un proxy', () => {
      const r = interpretarError({ status: 502, error: '<html><body>Bad gateway</body></html>' });
      expect(r.texto).toContain('servidor');
      expect(r.texto).not.toContain('<html>');
    });

    it('ignora un error vacío o que no es texto', () => {
      expect(interpretarError({ status: 400, error: { error: '   ' } }).texto).toContain('No pudimos');
      expect(interpretarError({ status: 400, error: { error: { anidado: true } } }).texto).toContain('No pudimos');
    });
  });

  describe('filas de la tabla', () => {
    const base: SolicitudMensajero = {
      id: 'abc',
      nombres: 'Ana',
      apellidos: 'Pérez',
      cedula: '123',
      celular: '3001112233',
      ciudad: 'Cali',
      tipoVehiculo: 'moto',
      placa: 'abc12d',
      estadoRegistro: 'en_revision',
      creadoAt: '2026-10-10T10:00:00Z',
      enviadoAt: { _seconds: Date.parse('2026-10-12T10:00:00Z') / 1000, _nanoseconds: 0 },
      documentosFaltantes: [],
    };

    it('arma la fila con todo lo que pinta la tabla', () => {
      const fila = construirFila(base);
      expect(fila.nombreCompleto).toBe('Ana Pérez');
      expect(fila.vehiculo).toBe('Moto');
      expect(fila.placa).toBe('ABC12D');
      expect(fila.estadoEtiqueta).toBe('En revisión');
      expect(fila.estadoTono).toBe('info');
      expect(fila.fechaEtiqueta).toBe('Enviada');
      expect(fila.fecha?.toISOString()).toBe('2026-10-12T10:00:00.000Z');
      expect(fila.faltantes).toBe(0);
    });

    it('ordena las más recientes primero y deja sin fecha al final', () => {
      const filas = filasPorFechaReciente([
        { ...base, id: 'vieja', enviadoAt: '2026-01-01T00:00:00Z' },
        { ...base, id: 'sin-fecha', enviadoAt: undefined, creadoAt: undefined },
        { ...base, id: 'nueva', enviadoAt: '2026-10-13T00:00:00Z' },
      ]);
      expect(filas.map((f) => f.id)).toEqual(['nueva', 'vieja', 'sin-fecha']);
      expect(filasPorFechaReciente(null)).toEqual([]);
    });
  });

  describe('esSuperAdminOperadora', () => {
    it('acepta Julsmind + Super Administrador sin importar mayúsculas ni espacios', () => {
      expect(esSuperAdminOperadora({ company: 'Julsmind', rol: 'Super Administrador' })).toBeTrue();
      expect(esSuperAdminOperadora({ company: ' JULSMIND ', rol: 'super administrador' })).toBeTrue();
      expect(esSuperAdminOperadora({ company: 'julsmind', rol: '  Super   Administrador ' })).toBeTrue();
    });

    it('rechaza otra empresa o cualquier otro rol', () => {
      expect(esSuperAdminOperadora({ company: 'OH MY STORE', rol: 'Super Administrador' })).toBeFalse();
      expect(esSuperAdminOperadora({ company: 'Julsmind', rol: 'Administrador' })).toBeFalse();
      expect(esSuperAdminOperadora({ company: 'Julsmind', rol: 'Vendedor' })).toBeFalse();
      expect(esSuperAdminOperadora({ company: 'Julsmind S.A.S', rol: 'Super Administrador' })).toBeFalse();
    });

    it('rechaza sesiones vacías o incompletas', () => {
      expect(esSuperAdminOperadora(null)).toBeFalse();
      expect(esSuperAdminOperadora(undefined)).toBeFalse();
      expect(esSuperAdminOperadora({})).toBeFalse();
      expect(esSuperAdminOperadora({ company: 'Julsmind' })).toBeFalse();
      expect(esSuperAdminOperadora({ rol: 'Super Administrador' })).toBeFalse();
    });
  });

  describe('liquidación: fechas y rangos', () => {
    it('fechaIso usa la hora local y rellena con ceros', () => {
      expect(fechaIso(new Date(2026, 9, 5))).toBe('2026-10-05');
      expect(fechaIso(new Date(2026, 0, 1))).toBe('2026-01-01');
      // 11:30 p. m. local: en UTC ya sería otro día, pero el rango debe seguir en el día de la persona.
      expect(fechaIso(new Date(2026, 9, 31, 23, 30))).toBe('2026-10-31');
    });

    it('esFechaIso solo acepta días reales con el formato YYYY-MM-DD', () => {
      expect(esFechaIso('2026-10-14')).toBeTrue();
      expect(esFechaIso('2028-02-29')).toBeTrue();
      expect(esFechaIso('2026-02-29')).toBeFalse();
      expect(esFechaIso('2026-02-31')).toBeFalse();
      expect(esFechaIso('2026-13-01')).toBeFalse();
      expect(esFechaIso('14/10/2026')).toBeFalse();
      expect(esFechaIso('2026-10-14T00:00:00Z')).toBeFalse();
      expect(esFechaIso('')).toBeFalse();
      expect(esFechaIso(null)).toBeFalse();
      expect(esFechaIso(20261014)).toBeFalse();
    });

    it('rangoDelMes va del primer al último día del mes', () => {
      expect(rangoDelMes(new Date(2026, 9, 19))).toEqual({ desde: '2026-10-01', hasta: '2026-10-31' });
      expect(rangoDelMes(new Date(2026, 8, 30))).toEqual({ desde: '2026-09-01', hasta: '2026-09-30' });
      expect(rangoDelMes(new Date(2026, 1, 10))).toEqual({ desde: '2026-02-01', hasta: '2026-02-28' });
      expect(rangoDelMes(new Date(2028, 1, 10))).toEqual({ desde: '2028-02-01', hasta: '2028-02-29' });
    });

    it('rangoDelMes con desfase -1 es el mes anterior, también al cruzar de año y desde el día 31', () => {
      expect(rangoDelMes(new Date(2026, 9, 19), -1)).toEqual({ desde: '2026-09-01', hasta: '2026-09-30' });
      expect(rangoDelMes(new Date(2026, 0, 15), -1)).toEqual({ desde: '2025-12-01', hasta: '2025-12-31' });
      expect(rangoDelMes(new Date(2026, 2, 31), -1)).toEqual({ desde: '2026-02-01', hasta: '2026-02-28' });
    });

    it('validarRango pide las dos fechas y que el inicio no pase del final', () => {
      expect(validarRango('2026-10-01', '2026-10-31')).toEqual({ valido: true, error: null });
      expect(validarRango('2026-10-15', '2026-10-15').valido).toBeTrue();
      expect(validarRango('', '2026-10-31').error).toBe('Elige la fecha de inicio.');
      expect(validarRango('2026-10-01', '').error).toBe('Elige la fecha final.');
      expect(validarRango(null, null).valido).toBeFalse();
      expect(validarRango('2026-10-31', '2026-10-01').error).toBe(
        'La fecha de inicio no puede ser posterior a la fecha final.',
      );
      expect(validarRango('2026-02-30', '2026-03-01').error).toBe('Revisa las fechas: alguna no es válida.');
    });

    it('formatearFechaIso y textoRango no corren el día por la zona horaria', () => {
      expect(formatearFechaIso('2026-10-01')).toBe('01/10/2026');
      expect(formatearFechaIso('2026-10-01T05:00:00.000Z')).toBe('01/10/2026');
      expect(formatearFechaIso('otra cosa')).toBe('otra cosa');
      expect(formatearFechaIso(undefined)).toBe('');
      expect(textoRango('2026-10-01', '2026-10-31')).toBe('Del 01/10/2026 al 31/10/2026');
    });
  });

  describe('liquidación: pesos, cantidades y sumas', () => {
    // El formato usa un espacio de no separación entre el signo y la cifra: se compara sin espacios.
    const sinEspacios = (texto: string) => texto.replace(/\s/g, '');

    it('formatearPesos da pesos colombianos sin decimales', () => {
      expect(sinEspacios(formatearPesos(1234567))).toBe('$1.234.567');
      expect(sinEspacios(formatearPesos(0))).toBe('$0');
      expect(sinEspacios(formatearPesos(7000))).toBe('$7.000');
      expect(sinEspacios(formatearPesos(1234.6))).toBe('$1.235');
      expect(sinEspacios(formatearPesos(-5000))).toBe('-$5.000');
    });

    it('formatearPesos y entero no se rompen con valores que no son número', () => {
      expect(sinEspacios(formatearPesos(null))).toBe('$0');
      expect(sinEspacios(formatearPesos(undefined))).toBe('$0');
      expect(sinEspacios(formatearPesos(NaN))).toBe('$0');
      expect(sinEspacios(formatearPesos('abc'))).toBe('$0');
      expect(entero('15000')).toBe(15000);
      expect(entero('')).toBe(0);
      expect(entero(Infinity)).toBe(0);
      expect(entero(12.5)).toBe(13);
    });

    it('formatearEntero separa los miles con punto', () => {
      expect(formatearEntero(1234)).toBe('1.234');
      expect(formatearEntero(12)).toBe('12');
      expect(formatearEntero(null)).toBe('0');
    });

    it('formatearPorcentaje usa coma decimal y devuelve vacío si no hay número', () => {
      expect(formatearPorcentaje(7)).toBe('7 %');
      expect(formatearPorcentaje(7.5)).toBe('7,5 %');
      expect(formatearPorcentaje(null)).toBe('');
      expect(formatearPorcentaje(undefined)).toBe('');
      expect(formatearPorcentaje('7')).toBe('');
    });

    const entregas = [
      { totalEnvio: 8000, pagoMensajero: 5000, comision: 560 },
      { totalEnvio: 10000, pagoMensajero: 6000, comision: 700 },
      { totalEnvio: 6500, pagoMensajero: 4000, comision: 455 },
    ];

    it('sumarEntregas suma cada monto y cuenta las entregas', () => {
      expect(sumarEntregas(entregas)).toEqual({ entregas: 3, totalEnvio: 24500, comision: 1715, pagoMensajeros: 15000 });
    });

    it('sumarEntregas con nada devuelve ceros, y los montos inválidos cuentan como 0', () => {
      expect(sumarEntregas([])).toEqual(TOTALES_VACIOS);
      expect(sumarEntregas(null)).toEqual(TOTALES_VACIOS);
      expect(sumarEntregas([{ totalEnvio: NaN, pagoMensajero: undefined as any, comision: '300' as any }])).toEqual({
        entregas: 1,
        totalEnvio: 0,
        comision: 300,
        pagoMensajeros: 0,
      });
    });

    const entregaBase: EntregaLiquidada = {
      pedidoId: 'p1',
      nroPedido: 1001,
      comercio: 'Tienda Uno',
      fecha: '2026-10-14T15:30:00.000Z',
      mensajeroId: 'm1',
      mensajero: 'Ana Pérez',
      totalEnvio: 8000,
      pagoMensajero: 5000,
      comision: 560,
    };

    it('agruparPorComercio junta y suma por nombre de comercio', () => {
      const grupos = agruparPorComercio([
        entregaBase,
        { ...entregaBase, pedidoId: 'p2', totalEnvio: 10000, pagoMensajero: 6000, comision: 700 },
        { ...entregaBase, pedidoId: 'p3', comercio: 'Tienda Dos', comision: 100 },
        { ...entregaBase, pedidoId: 'p4', comercio: '  ' },
      ]);
      expect(grupos.length).toBe(3);
      expect(grupos.find((g) => g.comercio === 'Tienda Uno')).toEqual({
        comercio: 'Tienda Uno',
        entregas: 2,
        totalEnvio: 18000,
        comision: 1260,
        pagoMensajeros: 11000,
      });
      expect(grupos.find((g) => g.comercio === COMERCIO_SIN_NOMBRE)?.entregas).toBe(1);
      expect(agruparPorComercio(null)).toEqual([]);
    });

    it('comerciosPorComision ordena de mayor a menor y desempata por nombre sin tocar el original', () => {
      const original = [
        { comercio: 'B', entregas: 1, totalEnvio: 0, comision: 100, pagoMensajeros: 0 },
        { comercio: 'C', entregas: 1, totalEnvio: 0, comision: 900, pagoMensajeros: 0 },
        { comercio: 'A', entregas: 1, totalEnvio: 0, comision: 100, pagoMensajeros: 0 },
      ];
      expect(comerciosPorComision(original).map((c) => c.comercio)).toEqual(['C', 'A', 'B']);
      expect(original.map((c) => c.comercio)).toEqual(['B', 'C', 'A']);
    });
  });

  describe('liquidación: lo que se pinta', () => {
    const cruda: EntregaLiquidada = {
      pedidoId: 'p1',
      nroPedido: 1001,
      comercio: 'Tienda Uno',
      fecha: { _seconds: Date.parse('2026-10-14T15:30:00.000Z') / 1000, _nanoseconds: 0 },
      mensajeroId: 'm1',
      mensajero: 'Ana Pérez',
      totalEnvio: 8000,
      pagoMensajero: 5000,
      comision: 560,
    };

    it('construirFilaEntrega normaliza fecha, número y montos', () => {
      const fila = construirFilaEntrega(cruda);
      expect(fila.numero).toBe('1001');
      expect(fila.comercio).toBe('Tienda Uno');
      expect(fila.mensajero).toBe('Ana Pérez');
      expect(fila.fecha?.getTime()).toBe(Date.parse('2026-10-14T15:30:00.000Z'));
      expect(fila.marca).toBe(Date.parse('2026-10-14T15:30:00.000Z'));
      expect([fila.totalEnvio, fila.pagoMensajero, fila.comision]).toEqual([8000, 5000, 560]);
    });

    it('construirFilaEntrega usa el id si no hay número y no se rompe con datos faltantes', () => {
      expect(construirFilaEntrega({ ...cruda, nroPedido: '' }).numero).toBe('p1');
      const vacia = construirFilaEntrega({} as EntregaLiquidada);
      expect(vacia.numero).toBe('');
      expect(vacia.comercio).toBe(COMERCIO_SIN_NOMBRE);
      expect(vacia.fecha).toBeNull();
      expect(vacia.marca).toBe(0);
      expect(vacia.totalEnvio).toBe(0);
    });

    const respuesta = {
      success: true,
      desde: '2026-10-01',
      hasta: '2026-10-31',
      comisionPorcentaje: 7,
      totales: { entregas: 5, totalEnvio: 40000, comision: 2800, pagoMensajeros: 25000 },
      porComercio: [
        { comercio: 'Tienda Dos', entregas: 1, totalEnvio: 6000, comision: 420, pagoMensajeros: 4000 },
        { comercio: 'Tienda Uno', entregas: 4, totalEnvio: 34000, comision: 2380, pagoMensajeros: 21000 },
      ],
      entregas: [
        { ...cruda, pedidoId: 'vieja', fecha: '2026-10-01T10:00:00Z' },
        { ...cruda, pedidoId: 'sin-fecha', fecha: null },
        { ...cruda, pedidoId: 'nueva', fecha: '2026-10-20T10:00:00Z' },
      ],
    };

    it('construirLiquidacion respeta los totales y el resumen del servidor, aunque la lista venga recortada', () => {
      const vista = construirLiquidacion(respuesta);
      expect(vista.desde).toBe('2026-10-01');
      expect(vista.hasta).toBe('2026-10-31');
      expect(vista.comisionPorcentaje).toBe(7);
      expect(vista.totales).toEqual(respuesta.totales);
      expect(vista.entregas.length).toBe(3);
      expect(vista.totales.entregas).not.toBe(vista.entregas.length);
    });

    it('construirLiquidacion ordena el resumen por comisión y las entregas por fecha reciente', () => {
      const vista = construirLiquidacion(respuesta);
      expect(vista.porComercio.map((c) => c.comercio)).toEqual(['Tienda Uno', 'Tienda Dos']);
      expect(vista.entregas.map((e) => e.pedidoId)).toEqual(['nueva', 'vieja', 'sin-fecha']);
    });

    it('construirLiquidacion calcula totales y resumen si el servidor no los manda', () => {
      const vista = construirLiquidacion({ entregas: [cruda, { ...cruda, pedidoId: 'p2', comercio: 'Tienda Dos' }] });
      expect(vista.totales).toEqual({ entregas: 2, totalEnvio: 16000, comision: 1120, pagoMensajeros: 10000 });
      expect(vista.porComercio.map((c) => c.comercio).sort()).toEqual(['Tienda Dos', 'Tienda Uno']);
      expect(vista.comisionPorcentaje).toBeNull();
    });

    it('construirLiquidacion completa con cálculo solo el total que falte', () => {
      const vista = construirLiquidacion({ entregas: [cruda], totales: { comision: 999 } as any });
      expect(vista.totales).toEqual({ entregas: 1, totalEnvio: 8000, comision: 999, pagoMensajeros: 5000 });
    });

    it('construirLiquidacion no se rompe con una respuesta vacía', () => {
      [null, undefined, {}].forEach((vacia) => {
        const vista = construirLiquidacion(vacia as any);
        expect(vista.entregas).toEqual([]);
        expect(vista.porComercio).toEqual([]);
        expect(vista.totales).toEqual(TOTALES_VACIOS);
        expect(vista.desde).toBe('');
      });
    });

    it('el mensaje de vacío y los textos de error son propios de la liquidación', () => {
      expect(mensajeVacioLiquidacion().titulo).toBe('No hay entregas en estas fechas');
      expect(interpretarError({ status: 403 }, TEXTOS_ERROR_LIQUIDACION).texto).toBe(
        'Solo el Super Administrador de la operadora puede ver la liquidación.',
      );
      expect(interpretarError({ status: 404 }, TEXTOS_ERROR_LIQUIDACION).texto).toContain('todavía no está disponible');
      // Sin textos propios se mantiene el de solicitudes, y el mensaje del backend siempre manda.
      expect(interpretarError({ status: 403 }).texto).toContain('solicitudes');
      expect(
        interpretarError({ status: 403, error: { success: false, error: 'Texto del servidor' } }, TEXTOS_ERROR_LIQUIDACION).texto,
      ).toBe('Texto del servidor');
    });
  });

  describe('liquidación: archivo CSV', () => {
    const fila = (cambios: Partial<ReturnType<typeof construirFilaEntrega>> = {}) => ({
      ...construirFilaEntrega({
        pedidoId: 'p1',
        nroPedido: 1001,
        comercio: 'Tienda Uno',
        fecha: new Date(2026, 9, 14, 15, 5).toISOString(),
        mensajeroId: 'm1',
        mensajero: 'Ana Pérez',
        totalEnvio: 8000,
        pagoMensajero: 5000,
        comision: 560,
      }),
      ...cambios,
    });

    it('celdaCsv deja el texto sencillo tal cual', () => {
      expect(celdaCsv('Tienda Uno')).toBe('Tienda Uno');
      expect(celdaCsv('Ana Pérez')).toBe('Ana Pérez');
      expect(celdaCsv(null)).toBe('');
      expect(celdaCsv(1001)).toBe('1001');
    });

    it('celdaCsv entrecomilla lo que trae el separador o comillas, y duplica las comillas', () => {
      expect(celdaCsv('Pan; Café')).toBe('"Pan; Café"');
      expect(celdaCsv('La "Esquina"')).toBe('"La ""Esquina"""');
      expect(celdaCsv('Pérez, Ana')).toBe('Pérez, Ana');
    });

    it('celdaCsv cambia los saltos de línea por espacio', () => {
      expect(celdaCsv('Línea uno\r\nLínea dos\nTres')).toBe('Línea uno Línea dos Tres');
    });

    it('celdaCsv impide que un texto se lea como fórmula en la hoja de cálculo', () => {
      expect(celdaCsv('=SUMA(A1:A9)')).toBe("'=SUMA(A1:A9)");
      expect(celdaCsv('+57 300 111 2233')).toBe("'+57 300 111 2233");
      expect(celdaCsv('-algo')).toBe("'-algo");
      expect(celdaCsv('@usuario')).toBe("'@usuario");
      expect(celdaCsv('Tienda =1')).toBe('Tienda =1');
    });

    it('fechaHoraCsv usa YYYY-MM-DD HH:mm en hora local', () => {
      expect(fechaHoraCsv(new Date(2026, 9, 14, 15, 5))).toBe('2026-10-14 15:05');
      expect(fechaHoraCsv(new Date(2026, 0, 2, 0, 0))).toBe('2026-01-02 00:00');
      expect(fechaHoraCsv(null)).toBe('');
    });

    it('construirCsv empieza con la marca UTF-8 y usa ; entre columnas', () => {
      const csv = construirCsv([fila()]);
      expect(csv.charCodeAt(0)).toBe(0xfeff);
      expect(csv.startsWith(BOM_UTF8)).toBeTrue();
      expect(SEPARADOR_CSV).toBe(';');
      const [encabezado] = csv.slice(1).split('\r\n');
      expect(encabezado).toBe(
        'Fecha;Pedido;Comercio;Mensajero;Valor del domicilio;Pago al mensajero;Comisión de Katuq',
      );
      expect(encabezado.split(';').length).toBe(ENCABEZADOS_CSV.length);
    });

    it('construirCsv escribe los pesos como número entero, sin símbolo ni separador de miles', () => {
      const lineas = construirCsv([fila({ totalEnvio: 1234567, pagoMensajero: 800000, comision: 86419 })])
        .slice(1)
        .split('\r\n');
      expect(lineas[1]).toBe('2026-10-14 15:05;1001;Tienda Uno;Ana Pérez;1234567;800000;86419');
      expect(lineas[1]).not.toContain('$');
      expect(lineas[1]).not.toContain('.');
    });

    it('construirCsv termina cada línea con \\r\\n y cuida los nombres con ; o comillas', () => {
      const csv = construirCsv([fila({ comercio: 'Pan; Café', mensajero: 'Luis "Lucho" Gómez' }), fila({ numero: '1002' })]);
      expect(csv.endsWith('\r\n')).toBeTrue();
      const lineas = csv.slice(1).split('\r\n');
      expect(lineas.length).toBe(4); // encabezado + 2 filas + línea final vacía
      expect(lineas[1]).toContain('"Pan; Café"');
      expect(lineas[1]).toContain('"Luis ""Lucho"" Gómez"');
      expect(lineas[2].startsWith('2026-10-14 15:05;1002;')).toBeTrue();
    });

    it('construirCsv sin entregas deja solo el encabezado', () => {
      expect(construirCsv([]).slice(1)).toBe(ENCABEZADOS_CSV.join(';') + '\r\n');
      expect(construirCsv(null)).toBe(construirCsv([]));
    });

    it('nombreArchivoCsv lleva el rango consultado y cae a un nombre fijo si no hay fechas válidas', () => {
      expect(nombreArchivoCsv('2026-10-01', '2026-10-31')).toBe('liquidacion-independientes_2026-10-01_2026-10-31.csv');
      expect(nombreArchivoCsv('', '')).toBe('liquidacion-independientes.csv');
      expect(nombreArchivoCsv('../../x', '2026-10-31')).toBe('liquidacion-independientes.csv');
    });
  });
});
