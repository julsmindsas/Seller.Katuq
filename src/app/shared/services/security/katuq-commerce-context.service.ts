import { Injectable } from '@angular/core';
import { SecurityService } from './security.service';

export interface KatuqCommerceContext {
  token: string;
  companyId: string;
  displayName: string;
  legalName?: string;
  companyNit?: string;
  userNit?: string;
  usageCode?: string;
  email?: string;
}

type StorageRecord = Record<string, unknown>;

/**
 * Resuelve el comercio activo y la identidad autenticada en un único lugar.
 *
 * `user.company` sigue siendo la clave multi-tenant autoritativa que espera el
 * backend. `SecurityService` aporta la identidad visible del comercio activo;
 * `currentCompany` se usa solo como respaldo de metadatos, nunca para adivinar
 * una clave de tenant.
 */
@Injectable({ providedIn: 'root' })
export class KatuqCommerceContextService {
  constructor(private readonly securityService: SecurityService) {}

  resolve(): KatuqCommerceContext | null {
    const user = this.readStorageRecord('user', localStorage);
    const token = this.asText(user?.token);
    const companyId = this.asText(user?.company);

    // Sin ambos valores no existe un contexto multi-tenant seguro. No se usan
    // ids de currentCompany como fallback porque pueden ser ids documentales.
    if (!token || !companyId) return null;

    const companyInformation = this.securityService.getCompanyInformationLogged();
    const storedCompany = this.readStorageRecord('currentCompany', localStorage)
      || this.readStorageRecord('currentCompany', sessionStorage);

    return {
      token,
      companyId,
      displayName: this.asText(companyInformation?.nombreComercio)
        || this.asText(storedCompany?.nomComercial)
        || companyId,
      legalName: this.asText(companyInformation?.razonSocial)
        || this.asText(storedCompany?.nombre),
      companyNit: this.asText(storedCompany?.nit),
      userNit: this.asText(user?.nit),
      usageCode: this.asText(user?.authorizationCode),
      email: this.asText(user?.email)
    };
  }

  private readStorageRecord(key: string, storage: Storage): StorageRecord | null {
    try {
      const raw = storage.getItem(key);
      if (!raw) return null;
      const value = JSON.parse(raw);
      return value && typeof value === 'object' && !Array.isArray(value)
        ? value as StorageRecord
        : null;
    } catch {
      return null;
    }
  }

  private asText(value: unknown): string | undefined {
    if (typeof value === 'string') {
      const normalized = value.trim();
      return normalized || undefined;
    }
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    return undefined;
  }
}
