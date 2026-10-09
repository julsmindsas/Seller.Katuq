import { armarHtmlTarjeta, tituloPropio } from './tarjeta-regalo';

/**
 * Ticket 1155 (ALMARA): el PDF de la tarjeta perdía los emojis, la ü y los signos ¿ ¡.
 * El texto ahora viaja como HTML escapado y se rasteriza, así que aquí se cuida que
 * llegue completo y que lo que escribe la gente no se interprete como HTML.
 */
describe('tarjeta-regalo', () => {
  describe('tituloPropio', () => {
    it('pone inicial en mayúscula incluso con tilde o ñ', () => {
      expect(tituloPropio('ángela ñandú')).toBe('Ángela Ñandú');
      expect(tituloPropio('JUAN pérez')).toBe('Juan Pérez');
    });

    it('pone la mayúscula aunque la palabra empiece con paréntesis o comillas', () => {
      expect(tituloPropio('(mamá)')).toBe('(Mamá)');
      expect(tituloPropio('"ángel"')).toBe('"Ángel"');
    });

    it('no toca las palabras que empiezan con número', () => {
      expect(tituloPropio('3ra avenida')).toBe('3ra Avenida');
    });

    it('no parte los emojis', () => {
      expect(tituloPropio('génny 💖')).toBe('Génny 💖');
    });

    it('devuelve vacío si no hay texto', () => {
      expect(tituloPropio('')).toBe('');
      expect(tituloPropio(undefined as any)).toBe('');
    });
  });

  describe('armarHtmlTarjeta', () => {
    it('conserva emojis, ü y los signos de apertura', () => {
      const html = armarHtmlTarjeta({ para: 'Génny 💖', mensaje: '¿Cómo estás? 🎂 Pingüino', de: 'Andrés 🧡' });
      ['💖', '🎂', '🧡', 'ü', '¿', 'Para:', 'De:'].forEach((texto) => expect(html).toContain(texto));
    });

    it('escapa el HTML que escribe la gente', () => {
      const html = armarHtmlTarjeta({ para: '<img src=x onerror=alert(1)>', mensaje: '<b>hola</b> & "chao"', de: 'x' });
      expect(html).not.toContain('<img');
      expect(html).not.toContain('<b>');
      expect(html).toContain('&lt;b&gt;hola&lt;/b&gt; &amp; &quot;chao&quot;');
    });

    it('no cuenta como renglones los saltos de línea al final del mensaje', () => {
      const html = armarHtmlTarjeta({ mensaje: 'Feliz día\n\n' });
      expect(html).toContain('>Feliz día</div>');
    });

    it('omite las secciones vacías', () => {
      const html = armarHtmlTarjeta({ para: '', mensaje: 'Solo el mensaje', de: '   ' });
      expect(html).toContain('Solo el mensaje');
      expect(html).not.toContain('Para:');
      expect(html).not.toContain('De:');
    });

    it('devuelve vacío si la tarjeta no trae texto', () => {
      expect(armarHtmlTarjeta({ para: '', mensaje: '  ', de: undefined })).toBe('');
      expect(armarHtmlTarjeta(undefined as any)).toBe('');
    });
  });
});
