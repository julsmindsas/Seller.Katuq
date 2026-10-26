import { textoPlanoADescripcionHtml } from './texto-plano-descripcion';

describe('textoPlanoADescripcionHtml (ticket 1410)', () => {
  it('3 líneas de lista y 2 párrafos quedan como 3 viñetas y 2 párrafos', () => {
    const texto = '- Taza\n- Chocolates\n- Tarjeta\nNO incluye valor del domicilio\nPersonalízalo con tu mensaje';
    expect(textoPlanoADescripcionHtml(texto)).toBe(
      '<ul><li>Taza</li><li>Chocolates</li><li>Tarjeta</li></ul>' +
      '<p>NO incluye valor del domicilio</p><p>Personalízalo con tu mensaje</p>');
  });

  it('acepta • y listas numeradas, y no deja párrafos vacíos', () => {
    expect(textoPlanoADescripcionHtml('Incluye:\r\n\r\n• Uno\r\n1. Paso\r\n2) Otro'))
      .toBe('<p>Incluye:</p><ul><li>Uno</li></ul><ol><li>Paso</li><li>Otro</li></ol>');
  });

  it('escapa el HTML del texto pegado', () => {
    expect(textoPlanoADescripcionHtml('a <b> & "c"\nx')).toBe('<p>a &lt;b&gt; &amp; &quot;c&quot;</p><p>x</p>');
  });
});
