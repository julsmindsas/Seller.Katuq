import {
  ColaAtencion,
  ColaBasica,
  FranjaCola,
  HorarioCola,
} from "../../../shared/services/messaging/messaging.models";

/** Límites de la fase D (D-727): los mismos del servidor. */
export const MAX_COLAS = 20;
export const MAX_NOMBRE_COLA = 60;
export const MAX_MENSAJE_FUERA = 500;

const DIAS = ["0", "1", "2", "3", "4", "5", "6"];

/** Horario sin franjas: los siete días cerrados. */
export function horarioVacio(): HorarioCola {
  const dias: Record<string, FranjaCola | null> = {};
  for (const n of DIAS) dias[n] = null;
  return { activo: false, dias };
}

/** Completa lo que falte de una cola (por ejemplo, la que recibe quien no coordina) con valores por defecto. */
export function normalizarCola(c: Partial<ColaAtencion> & Partial<ColaBasica>): ColaAtencion {
  const base = horarioVacio();
  const dias = { ...base.dias, ...(c.horario?.dias || {}) };
  return {
    id: c.id,
    nombre: c.nombre || "",
    activa: c.activa !== false,
    lineas: Array.isArray(c.lineas) ? [...c.lineas] : [],
    asesores: Array.isArray(c.asesores) ? [...c.asesores] : [],
    reparto: c.reparto === "turnos" ? "turnos" : "manual",
    horario: { activo: !!c.horario?.activo, dias },
    mensajeFuera: c.mensajeFuera || "",
    enHorario: c.enHorario,
  };
}

/** La lista que se manda al guardar: sin `enHorario`, que es de solo lectura. */
export function paraGuardar(c: ColaAtencion): ColaAtencion {
  const { enHorario, ...resto } = c;
  void enHorario;
  return resto as ColaAtencion;
}
