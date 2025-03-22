import { Injectable } from '@angular/core';
import { EmailTemplateI } from '../../shared/models/email-template.interface';
import { environment } from '../../../environments/environment';
// import { WalletVisbleState } from '../models/settings-app.interface';
import { ICountry } from '../models/contries.interface';
// import { IUser } from '../models/user.interface';
// import { ICompany } from '../models/companies/company.interface';

@Injectable({
  providedIn: 'root'
})
export class ManageLocalStorageService {

  constructor() { }

  checkEmailTemplateChanges(): boolean {
    if (localStorage.getItem('template')) {
      return true
    } else {
      return false
    }
  }

  storeLocalInfoTemplate(form: EmailTemplateI) {
    localStorage.setItem('template', JSON.stringify(form));
  }

  getLocalInfoTemplate() {
    const infoTemplate: EmailTemplateI = JSON.parse(localStorage.getItem('template')!)
    return infoTemplate
  }

  /**
   * Get el usuario actual
   * @returns
   */
  // getUserActive() {
  //   const user: any = JSON.parse(localStorage.getItem(environment.user)!)
  //   return user
  // }

  /**
   * Get la empresa actual
   * @returns
   */
  // getCompanyActive(idCompany: string): ICompany{
  //   const user: IUser = JSON.parse(localStorage.getItem(environment.user)!)
  //   const comp: ICompany[] = user.filiales

  //   return comp.find(item => item.nit === idCompany)

  // }

  // setLocalSaveUser(userSet: any): void {
  //   const user = JSON.stringify(userSet)
  //   localStorage.setItem(environment.user, user);
  // }

  removeInfoTemplate(): void {
    localStorage.removeItem('template')
  }

  /**
   * Get configuración vista wallet
   * @returns
   */
  // getLocalSettingsWallet(): WalletVisbleState {
  //   return JSON.parse(localStorage.getItem('hiddenWallet')!)
  // }

  /**
   * Set configuración vista walltet
   * @param walletState
   */
  // setLocalSettingsWallet(walletState: WalletVisbleState) {
  //   localStorage.setItem('hiddenWallet', JSON.stringify(walletState));
  // }

  /**
   * Devuelve el país actual
   * @returns
   */
  // getCurrentCountryActive(): ICountry {
  //   const { country } = JSON.parse(localStorage.getItem(environment.user)!)
  //   return country
  // }

  // setCurrentCountryActive(country: ICountry): void {
  //   const user = this.getUserActive()
  //   const userAdd = { ...user, country: country }
  //   localStorage.setItem(environment.user, JSON.stringify(userAdd))
  // }

  /**
   * Asigna el nuevo país
   * @param country
   */
  // setCurrentActiveCountry(country: ICountry, nit?: string, tipo?: string): void {
  //   const user = this.getUserActive()
  //   const userAdd = { ...user, country: country, nit: nit, tipo: tipo }
  //   localStorage.setItem(environment.user, JSON.stringify(userAdd))
  // }
}
