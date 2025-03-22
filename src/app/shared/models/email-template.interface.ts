export interface EmailTemplateI {
  id?:string
  name?:string
  email?:string
  periodo: string
  nombreDestinatario: string
  asunto: string
  mensaje: string
  promedioHoras?: number
  PorcentajeDevoluciones?: number
}
