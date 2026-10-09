import { EstadoEnVivo } from '../servicios/en-vivo.modelos';
import { diaDeColombia, msDe } from '../servicios/en-vivo-reglas';
import { armarCronograma, HORA_MS, inicioDelDia, PasoCrudo } from './cronograma';
import { PlanRepeticion } from './repeticion.tipos';

/**
 * Plan de "Repetir el día" de TODA Katuq (D-386, tarea 5.7 y spec `tablero-en-vivo-plataforma`). La
 * foto global no trae los pedidos de los comercios (solo cifras, por hora y por comercio, y los
 * últimos eventos), así que el plan junta dos cosas reales:
 *  - los EVENTOS de hoy que trae la foto (hasta los últimos 60), cada uno en su hora real: son los
 *    que animan las escenas, el muro y la lista;
 *  - las CIFRAS por hora de hoy, que llevan el reloj desde la primera hora con pedidos hasta ahora
 *    (`simulacion-katuq.ts` las acumula hora por hora).
 * Devuelve null si hoy todavía no hubo ni cifras ni eventos. Puro.
 */
export function armarPlanKatuq(estado: EstadoEnVivo, ahoraMs: number): PlanRepeticion | null {
  const g = estado.cifrasGlobal;
  if (!g) return null;
  const dia = g.dia || diaDeColombia(ahoraMs);

  // Los eventos vienen del más nuevo al más viejo; la repetición los cuenta del más viejo al más nuevo.
  const crudos: PasoCrudo[] = [];
  for (let i = estado.eventos.length - 1; i >= 0; i--) {
    const evento = estado.eventos[i];
    const ms = msDe(evento.hora);
    if (ms === null || diaDeColombia(ms) !== dia) continue;
    crudos.push({ realMs: ms, evento: { ...evento, id: `rep-${evento.id}` } });
  }

  const horasConPedidos = (g.porHora ?? []).filter((f) => f.pedidos > 0 || f.ventas > 0).map((f) => f.hora);
  const llegadasEventos = crudos.filter((c) => c.evento.tipo === 'pedido_nuevo').length;
  if (horasConPedidos.length === 0 && crudos.length === 0 && !(g.pedidos > 0)) return null;

  const desdeMs = horasConPedidos.length > 0 ? inicioDelDia(dia) + Math.min(...horasConPedidos) * HORA_MS : undefined;
  const plan = armarCronograma(crudos, {
    vista: 'katuq',
    ahoraMs,
    // Lo que cuenta la plataforma hoy; si el servidor no mandó cifras, al menos las llegadas que se ven.
    llegadas: g.pedidos > 0 ? g.pedidos : llegadasEventos,
    desdeMs: desdeMs ?? (crudos.length === 0 ? ahoraMs : undefined),
  });
  return plan;
}
