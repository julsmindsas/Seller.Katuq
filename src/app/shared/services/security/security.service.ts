import { Injectable } from '@angular/core';
import { UserLogged } from '../../models/User/UserLogged';
import { CompanyInformation } from '../../models/User/CompanyInformation';
import { Empresa } from '../../models/empresa/empresa';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SecurityService {
    constructor() { }

    // Get company information from session storage usin behaviorsubject
    public companyInformation$ : BehaviorSubject<CompanyInformation> = new BehaviorSubject<CompanyInformation>(null);

    // Set company information in session storage
    setCompanyInformationLogged(companyInformation: CompanyInformation) {
        sessionStorage.setItem('currentCompany', JSON.stringify(companyInformation));
        companyInformation = this.getCompanyInformationLogged();
        this.companyInformation$.next(companyInformation);
    }

    getCompanyInformationLogged$(){
        this.companyInformation$.next(this.getCompanyInformationLogged());
        return this.companyInformation$.asObservable();
    }


    // Get company information from session storage
    getCompanyInformationLogged(): CompanyInformation {
        const currentCompany = sessionStorage.getItem('currentCompany');
        if (currentCompany) {
            const empresa: Empresa = JSON.parse(currentCompany);
            return {
                nombreComercio: empresa.nomComercial,
                imgUrlLogo: empresa.logo,
                razonSocial: empresa.nombre
            };

        }
    }


    // getCompanyInformationLogged(): CompanyInformation {
    //     const currentCompany = sessionStorage.getItem('currentCompany');
    //     if (currentCompany) {
    //         const empresa: Empresa = JSON.parse(currentCompany);
    //         return {
    //             nombreComercio: empresa.nomComercial,
    //             imgUrlLogo: empresa.logo,
    //             razonSocial: empresa.nombre
    //         };

    //     }


    // }

}