import { Injectable } from '@angular/core';
import { UserLogged } from '../../models/User/UserLogged';
import { CompanyInformation } from '../../models/User/CompanyInformation';
import { Empresa } from '../../models/empresa/empresa';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SecurityService {
    constructor() { }

    // Get company information from session storage usin behaviorsubject
    public companyInformation$ : BehaviorSubject<CompanyInformation | null> = new BehaviorSubject<CompanyInformation | null>(null);

    // Set company information in localStorage (changed from sessionStorage for persistence)
    setCompanyInformationLogged(companyInformation: CompanyInformation) {
        localStorage.setItem('currentCompany', JSON.stringify(companyInformation));
        const updatedInfo = this.getCompanyInformationLogged();
        this.companyInformation$.next(updatedInfo);
    }

    getCompanyInformationLogged$(){
        this.companyInformation$.next(this.getCompanyInformationLogged());
        return this.companyInformation$.asObservable();
    }

    // Get company information from localStorage (changed from sessionStorage for persistence)
    getCompanyInformationLogged(): CompanyInformation | null {
        const currentCompany = localStorage.getItem('currentCompany');
        if (currentCompany) {
            try {
                const empresa: Empresa = JSON.parse(currentCompany);
                return {
                    nombreComercio: empresa.nomComercial,
                    imgUrlLogo: empresa.logo,
                    razonSocial: empresa.nombre
                };
            } catch (error) {
                console.error('Error parsing company information:', error);
                // Intentar obtener del localStorage como respaldo
                return this.getCompanyInformationFromLocalStorage();
            }
        }
        // Si no hay en localStorage, intentar obtener del localStorage como respaldo
        return this.getCompanyInformationFromLocalStorage();
    }

    private getCompanyInformationFromLocalStorage(): CompanyInformation | null {
        try {
            const user = localStorage.getItem('user');
            if (user) {
                const userData = JSON.parse(user);
                if (userData.company) {
                    // Recrear la información de la empresa desde los datos del usuario
                    return {
                        nombreComercio: userData.company,
                        imgUrlLogo: undefined, // Se usará el logo por defecto
                        razonSocial: userData.company
                    };
                }
            }
        } catch (error) {
            console.error('Error getting company info from localStorage:', error);
        }
        return null;
    }

    // Método para proteger la información de la empresa durante limpiezas
    preserveCompanyInformation() {
        const companyInfo = this.getCompanyInformationLogged();
        if (companyInfo) {
            // Almacenar temporalmente en localStorage como respaldo
            localStorage.setItem('tempCompanyInfo', JSON.stringify(companyInfo));
        }
    }

    // Método para restaurar la información de la empresa después de limpiezas
    restoreCompanyInformation() {
        const tempCompanyInfo = localStorage.getItem('tempCompanyInfo');
        if (tempCompanyInfo) {
            try {
                const companyInfo = JSON.parse(tempCompanyInfo);
                this.setCompanyInformationLogged(companyInfo);
                localStorage.removeItem('tempCompanyInfo');
            } catch (error) {
                console.error('Error restoring company information:', error);
            }
        }
    }
}