import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { BaseService } from "../../../shared/services/base.service";

/** Estados de un lead de landing (los mismos que acepta el servidor). */
export const ESTADOS_LEAD = ["nuevo", "contactado", "en-seguimiento", "ganado", "perdido"] as const;
export type EstadoLead = typeof ESTADOS_LEAD[number];

export interface LeadLanding {
  id: string;
  nombre: string;
  telefono: string;
  correo: string;
  mensaje: string;
  estado: EstadoLead;
  asignadoA: string | null;
  asignadoNombre: string;
  asignadoEn: string | null;
  landingId: string;
  landingSlug: string;
  campana: { utm_source?: string; utm_medium?: string; utm_campaign?: string } | null;
  consentimiento: { aceptado: boolean; fecha: string | null; version: string } | null;
  fecha: string;
}

export interface ListaLeadsLanding {
  leads: LeadLanding[];
  conteo: Record<string, number>;
  recortado: boolean;
  estados: EstadoLead[];
}

export interface PersonaDelEquipo {
  email: string;
  nombre: string;
}

/**
 * Bandeja «Leads de landing» (D-633, KLAN-E1, fase 1; bandera `landingsV2`). La empresa sale del
 * token: nunca se manda. Los leads viven en `prospects`; aquí no hay colección ni ruta nuevas
 * más allá de `/v1/sites/leads-landing`.
 */
@Injectable({ providedIn: "root" })
export class LeadsLandingService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  listar(filtros: { estado?: string; asignado?: string } = {}): Observable<{ success: boolean; data: ListaLeadsLanding }> {
    const partes: string[] = [];
    if (filtros.estado) partes.push(`estado=${encodeURIComponent(filtros.estado)}`);
    if (filtros.asignado) partes.push(`asignado=${encodeURIComponent(filtros.asignado)}`);
    return this.get<{ success: boolean; data: ListaLeadsLanding }>(
      `/v1/sites/leads-landing${partes.length ? `?${partes.join("&")}` : ""}`
    );
  }

  equipo(): Observable<{ success: boolean; data: { equipo: PersonaDelEquipo[] } }> {
    return this.get<{ success: boolean; data: { equipo: PersonaDelEquipo[] } }>("/v1/sites/leads-landing/equipo");
  }

  cambiarEstado(id: string, estado: EstadoLead): Observable<{ success: boolean; message?: string }> {
    return this.put<{ success: boolean; message?: string }>(`/v1/sites/leads-landing/${encodeURIComponent(id)}/estado`, { estado });
  }

  /** `email` vacío deja el lead sin asignar. */
  asignar(id: string, email: string): Observable<{ success: boolean; message?: string }> {
    return this.put<{ success: boolean; message?: string }>(`/v1/sites/leads-landing/${encodeURIComponent(id)}/asignar`, { email });
  }
}
