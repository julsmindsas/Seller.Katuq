import { MAX_DESCRIPCION, MAX_NOMBRE } from "../tienda-en-un-paso/tienda-en-un-paso.logic";

/**
 * Enlace que entrega el chat de Opttia para crear la tienda con IA (D-385, chat-crea-tienda):
 *
 *   /sitios?tiendaEnUnPaso=1&nombre=<nombre del negocio>&descripcion=<qué vende>
 *
 * Solo trae el nombre y la descripción que la persona le dio al chat: nada de fotos, precios ni
 * empresa. Abrirlo NO crea nada: la pantalla se abre con esos datos puestos y la persona revisa,
 * agrega fotos con su precio si quiere y da el clic final.
 *
 * Lo que llega por la dirección lo puede escribir cualquiera, así que se trata como texto de un
 * formulario: se limpia y se recorta a los mismos topes de la pantalla.
 */

export interface PrecargaTienda {
  nombre: string;
  descripcion: string;
}

/** Una línea de texto plano: sin `<` ni `>`, sin caracteres de control y con espacios simples. */
function limpiar(valor: string | null | undefined, max: number): string {
  return String(valor == null ? "" : valor)
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
    .trim();
}

/**
 * @param leer cómo se lee un parámetro de la dirección (`queryParamMap.get`).
 * @returns los datos a precargar, o null si la dirección no es la del chat.
 */
export function leerEnlaceTienda(leer: (clave: string) => string | null | undefined): PrecargaTienda | null {
  if (!leer || leer("tiendaEnUnPaso") !== "1") return null;
  return {
    nombre: limpiar(leer("nombre"), MAX_NOMBRE),
    descripcion: limpiar(leer("descripcion"), MAX_DESCRIPCION),
  };
}
