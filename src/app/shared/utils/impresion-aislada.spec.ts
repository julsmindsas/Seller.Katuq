import { armarDocumento, conTope, esperarImagenes, TiempoAgotadoError } from './impresion-aislada';
import { escaparHtml } from './escapar-html';

// Ticket 1151: imprimir nunca puede quedarse girando, sin importar la página.
describe('impresion-aislada', () => {
  it('corta con TiempoAgotadoError una promesa que nunca termina', async () => {
    const inicio = Date.now();
    await expectAsync(conTope(new Promise(() => undefined), 50, 'prueba')).toBeRejectedWithError(TiempoAgotadoError);
    expect(Date.now() - inicio).toBeLessThan(1000);
  });

  it('deja pasar el resultado si llega antes del tope', async () => {
    await expectAsync(conTope(Promise.resolve('listo'), 1000, 'prueba')).toBeResolvedTo('listo');
  });

  it('escapa el título para que no rompa el documento', () => {
    expect(escaparHtml('<b>"A&B"</b>')).toBe('&lt;b&gt;&quot;A&amp;B&quot;&lt;/b&gt;');
    expect(armarDocumento('<p>x</p>', 'pedido-<1>')).toContain('<title>pedido-&lt;1&gt;</title>');
  });

  it('arma el documento con el contenido tal cual y hoja A4', () => {
    const doc = armarDocumento('<table><tr><td>BAS-000028</td></tr></table>', 'pedido-BAS-000028');
    expect(doc).toContain('<body><table><tr><td>BAS-000028</td></tr></table></body>');
    expect(doc).toContain('@page { size: A4');
  });

  it('no espera más del tope por una imagen que nunca responde', async () => {
    const doc = document.implementation.createHTMLDocument('x');
    const img = doc.createElement('img');
    img.loading = 'lazy';
    // Imagen que el navegador nunca termina de cargar en un documento sin ventana.
    Object.defineProperty(img, 'complete', { value: false });
    img.setAttribute('src', 'https://ejemplo.invalid/cuelga.png');
    doc.body.appendChild(img);

    const inicio = Date.now();
    await esperarImagenes(doc, 100);
    expect(Date.now() - inicio).toBeLessThan(1000);
    expect(img.loading).toBe('eager');
  });
});
