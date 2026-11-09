import { HttpContextToken } from '@angular/common/http';

/**
 * Llamadas cuyos 403 son respuestas de negocio que la pantalla explica con su propio texto (por ejemplo el resumen
 * mensual de plataforma). El interceptor no muestra el aviso «Suscripción» para ellas. Un 401 de sesión inválida
 * sigue cerrando la sesión como siempre.
 */
export const SIN_AVISO_NEGOCIO = new HttpContextToken<boolean>(() => false);
