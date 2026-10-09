export interface CompanyInformation {
    nombreComercio: string;
    razonSocial: string;
    imgUrlLogo?: string;
    /**
     * Banderas de función por comercio (ausente o distinto de `true` = apagada).
     * Vienen en la empresa completa de `currentCompany`; el mapeo de
     * `SecurityService.getCompanyInformationLogged()` no las copia. Para leerlas
     * usa `CompanyFeaturesService`.
     */
    featureFlags?: Record<string, boolean>;
}