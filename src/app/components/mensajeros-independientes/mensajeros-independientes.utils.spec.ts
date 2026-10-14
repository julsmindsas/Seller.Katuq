import { SolicitudMensajero } from './mensajeros-independientes.models';
import {
  accionesDisponibles,
  accionPideMotivo,
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
});
