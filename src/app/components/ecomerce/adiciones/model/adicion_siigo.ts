
export interface Tax {
    id: number;
    milliliters: number;
    rate: number;
  }
  
  export interface PriceList {
    position: number;
    value: number;
  }
  
  export interface Price {
    currency_code: string;
    price_list: PriceList[];
  }
  
  export interface AdditionalFields {
    barcode: string;
    brand: string;
    tariff: string;
    model: string;
  }
  
  export interface AdicionSiigo {
    code: string;
    name: string;
    account_group: number;
    type: string;
    stock_control: boolean;
    active: boolean;
    tax_classification: string;
    tax_included: boolean;
    tax_consumption_value: number;
    taxes: Tax[];
    prices: Price[];
    unit: string;
    unit_label: string;
    reference: string;
    description: string;
    additional_fields: AdditionalFields;
  }
  