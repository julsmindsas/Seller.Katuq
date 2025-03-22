// customer.interface.ts
export interface Customer {
  person_type?: string;
  id_type?: string;
  identification: string;
  branch_office?: number;
  name?: string[] | string;
  address?: Address;
  phones?: Phone[];
  contacts?: Contact[];
}

// address.interface.ts
export interface Address {
  address: string;
  city: City;
  postal_code: string;
}

// city.interface.ts
export interface City {
  country_code: string;
  country_name: string;
  state_code: string;
  state_name: string;
  city_code: string;
  city_name: string;
}

// phone.interface.ts
export interface Phone {
  indicative: string;
  number: string;
  extension: string;
}

// contact.interface.ts
export interface Contact {
  first_name: string;
  last_name: string;
  email: string;
  phone: Phone;
}

// item.interface.ts
export interface Item {
  code: string;
  description: string;
  quantity: number;
  price: number;
  discount?: number;
  taxes?: Tax[];
  transport?: Transport;
}

// tax.interface.ts
export interface Tax {
  id: number;
}

// transport.interface.ts
export interface Transport {
  file_number: number;
  shipment_number: string;
  transported_quantity: number;
  measurement_unit: string;
  freight_value: number;
  purchase_order: string;
  service_type: string;
}

// payment.interface.ts
export interface Payment {
  id: number;
  value: number;
  due_date?: string;
}

// globalDiscount.interface.ts
export interface GlobalDiscount {
  id: number;
  percentage: number;
  value: number;
}

// document.interface.ts
export interface Document {
  id: number;
}

// currency.interface.ts
export interface Currency {
  code: string;
  exchange_rate: number;
}

// stamp.interface.ts
export interface Stamp {
  send: boolean;
}

// mail.interface.ts
export interface Mail {
  send: boolean;
}

// order.interface.ts
export interface Order {
  document: Document;
  date: string;
  customer: Customer;
  cost_center?: number;
  currency?: Currency;
  seller: number;
  stamp?: Stamp;
  mail?: Mail;
  observations: string;
  items: Item[];
  payments: Payment[];
  globaldiscounts?: GlobalDiscount[];
  additional_fields?: any;
}