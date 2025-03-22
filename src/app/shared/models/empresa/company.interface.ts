import { ICountry } from "../contries.interface"
// import { ReferalI } from "./referal.interface"

export interface ICompany{
  id: string
  idCompany?: string,
  nit: string
  nombre: string
  contacto: string
  phone: string
  address: string
  city: string
  country: ICountry
  email: string
  password: string
  tipo: string
  activo: boolean
  bodegas?: any
  descuento: string
  seguro?: boolean
  latitud: string
  longitud: string
  // datosReferido: ReferalI
  productosConocidos: string
  sedePrincipal: boolean
}
