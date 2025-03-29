// import { Select2Data } from "ng-select2-component";
import { Order, OrderDetails } from "../../app/shared/models/pos/order";
import { Tabs } from "../../app/shared/models/pos/common";

// export const paymentStatus: Select2Data = [
//   {
//     value: 'Completed',
//     label: 'Completed'
//   },
//   {
//     value: 'Pending',
//     label: 'Pending'
//   },
//   {
//     value: 'Failed',
//     label: 'Failed'
//   }
// ]

// export const paymentMethod: Select2Data = [
//   {
//     value: 'Paypal',
//     label: 'Paypal'
//   },
//   {
//     value: 'COD',
//     label: 'COD'
//   },
//   {
//     value: 'Bank transfer',
//     label: 'Bank transfer'
//   },
//   {
//     value: 'Credit card',
//     label: 'Credit card'
//   }
// ]

export const orders: Order[] = [
  {
    id: 1,
    order_number: 1244,
    order_date: "12 Mar 2024 04:05:AM",
    customer_name: "Daxton Norris",
    total_amount: 478.14,
    payment_status: "Pending",
    payment_method: "Paypal",
  },
  {
    id: 2,
    order_number: 1245,
    order_date: "02 Feb 2024 03:21:PM",
    customer_name: "Zakai Ramos",
    total_amount: 120.45,
    payment_status: "Failed",
    payment_method: "COD",
  },
  {
    id: 3,
    order_number: 1246,
    order_date: "10 Jun 2024 02:10:AM",
    customer_name: "Sophia Kirby",
    total_amount: 897.00,
    payment_status: "Completed",
    payment_method: "Bank Transfer",
  },
  {
    id: 4,
    order_number: 1247,
    order_date: "01 Jan 2024 07:30:PM",
    customer_name: "Curtis Robertson",
    total_amount: 304.12,
    payment_status: "Failed",
    payment_method: "Bank Transfer",
  },
  {
    id: 5,
    order_number: 1248,
    order_date: "28 Feb 2024 11:50:PM",
    customer_name: "Rylan Norton",
    total_amount: 200.40,
    payment_status: "Completed",
    payment_method: "Credit Card",
  },
  {
    id: 6,
    order_number: 1249,
    order_date: "03 Dec 2024 05:15:PM",
    customer_name: "Emir David",
    total_amount: 140.50,
    payment_status: "Completed",
    payment_method: "COD",
  },
  {
    id: 7,
    order_number: 1250,
    order_date: "09 Mar 2024 03:05:AM",
    customer_name: "Kai Jacobs",
    total_amount: 450.70,
    payment_status: "Completed",
    payment_method: "Credit Card",
  },
  {
    id: 8,
    order_number: 1251,
    order_date: "13 Apr 2024 04:28:AM",
    customer_name: "Aron Hester",
    total_amount: 400.05,
    payment_status: "Pending",
    payment_method: "Paypal",
  },
  {
    id: 9,
    order_number: 1252,
    order_date: "18 May 2024 06:00:PM",
    customer_name: "Jaime Ellis",
    total_amount: 250.00,
    payment_status: "Pending",
    payment_method: "Credit Card",
  },
  {
    id: 10,
    order_number: 1253,
    order_date: "20 Aug 2024 07:10:PM",
    customer_name: "Hector Torres",
    total_amount: 145.30,
    payment_status: "Completed",
    payment_method: "COD",
  },
  {
    id: 11,
    order_number: 1254,
    order_date: "16 Sep 2024 12:10:PM",
    customer_name: "Salge Lucero",
    total_amount: 170.00,
    payment_status: "Completed",
    payment_method: "Credit Card",
  },
  {
    id: 12,
    order_number: 1255,
    order_date: "17 Oct 2024 10:40:PM",
    customer_name: "Remi Nelson",
    total_amount: 300.50,
    payment_status: "Failed",
    payment_method: "Bank Transfer",
  },
  {
    id: 13,
    order_number: 1256,
    order_date: "22 Nov 2024 09:05:PM",
    customer_name: "Ayla Tucker",
    total_amount: 900.14,
    payment_status: "Pending",
    payment_method: "Paypal",
  },
  {
    id: 14,
    order_number: 1257,
    order_date: "26 Jan 2024 08:15:AM",
    customer_name: "Aniya Davila",
    total_amount: 870.00,
    payment_status: "Completed",
    payment_method: "Credit Card",
  },
  {
    id: 15,
    order_number: 1302,
    order_date: "01 Jan 2024 10:25:AM",
    customer_name: "Camden Klein",
    total_amount: 50.14,
    payment_status: "Pending",
    payment_method: "COD",
  },
  {
    id: 16,
    order_number: 1306,
    order_date: "12 Mar 2024 01:35:AM",
    customer_name: "Ezra Gentry",
    total_amount: 74.00,
    payment_status: "Failed",
    payment_method: "Credit Card",
  },
  {
    id: 17,
    order_number: 1310,
    order_date: "20 Apr 2024 07:00:AM",
    customer_name: "Jax Pierce",
    total_amount: 74.70,
    payment_status: "Completed",
    payment_method: "COD",
  },
  {
    id: 18,
    order_number: 1314,
    order_date: "22 Dec 2024 09:45:AM",
    customer_name: "Yara Walsh",
    total_amount: 45.34,
    payment_status: "Pending",
    payment_method: "Paypal",
  },
  {
    id: 19,
    order_number: 1380,
    order_date: "31 May 2024 10:40:PM",
    customer_name: "Fox Roth",
    total_amount: 48.40,
    payment_status: "Completed",
    payment_method: "Bank Transfer",
  },
  {
    id: 20,
    order_number: 1399,
    order_date: "17 Apr 2024 08:50:PM",
    customer_name: "Selah Bush",
    total_amount: 78.48,
    payment_status: "Failed",
    payment_method: "Credit Card",
  },
];

export const orderDetailsTab: Tabs[] = [
  {
    id: 1,
    title: 'Order Received',
    value: 'received'
  },
  {
    id: 2,
    title: 'Processing',
    value: 'processing'
  },
  {
    id: 3,
    title: 'Order Packed',
    value: 'packed'
  },
  {
    id: 4,
    title: 'Shipped',
    value: 'shipped'
  },
  {
    id: 5,
    title: 'Delivered',
    value: 'delivered'
  }
]


export const checkoutTabs: Tabs[] = [
  {
    id: 1,
    title: 'Information',
    value: 'information'
  },
  {
    id: 2,
    title: 'Shipping',
    value: 'shipping'
  },
  {
    id: 3,
    title: 'Payment',
    value: 'payment'
  },
  {
    id: 4,
    title: 'Completed',
    value: 'completed'
  }
]

export const orderDetails: OrderDetails = {
  products: [
    {
      id: 1,
      product_name: 'Lightweight Headphones',
      product_image: 'assets/images/dashboard-8/shop-categories/headphone.png',
      brand: 'Boat Rockerz',
      color: 'Gray',
      discount_price: 85.00,
      price: 100.00,
      quantity: 1,
      total_quantity: 15,
      sub_total: 85.00
    },
    {
      id: 2,
      product_name: 'Smart Watch',
      product_image: 'assets/images/dashboard-2/order/sub-product/24.png',
      brand: 'Fastrack',
      color: 'Brown',
      discount_price: 140.00,
      price: 200.00,
      quantity: 1,
      total_quantity: 10,
      sub_total: 140.00
    },
    {
      id: 3,
      product_name: 'Leather Handbag',
      product_image: 'assets/images/dashboard-2/order/sub-product/16.png',
      brand: 'Fendi',
      color: 'Pink',
      discount_price: 250.00,
      price: 300.00,
      quantity: 1,
      total_quantity: 30,
      sub_total: 250.00
    },
    {
      id: 4,
      product_name: 'Men\'s Shoes',
      product_image: 'assets/images/dashboard-2/order/sub-product/14.png',
      brand: 'Sneaker',
      color: 'Yellow',
      discount_price: 150.00,
      price: 180.00,
      quantity: 2,
      total_quantity: 5,
      sub_total: 300.00
    }
  ],
  customer_details: {
    name: 'Lucy Fisher',
    email: 'lucy.fisher@example.com',
    billing_address: '12B, Pine Valley Road, Seattle, Washington, United States 98101',
    shipping_address: '12B, Pine Valley Road, Seattle, Washington, United States 98101',
    delivery_slot: 'Standard Delivery|Approx 5 to 7 Days',
    payment_method: 'COD'
  },
  billing_details: {
    sub_total: 775.00,
    shipping: 'Free',
    coupon_discount: 30.00,
    tax: 18.00,
    total: 763.00
  }
}
