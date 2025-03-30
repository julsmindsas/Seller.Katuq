import { ProductCategory } from "../../../src/app/shared/models/pos/pos";
import { OrderDetailsProduct } from "../../../src/app/shared/models/pos/order";

export const productCategory: ProductCategory[] = [
    {
        id: 1,
        category_name: 'Phone',
        category_image: 'assets/images/shop-categories/phone.png'
    },
    {
        id: 2,
        category_name: 'Camera',
        category_image: 'assets/images/shop-categories/camera.png'
    },
    {
        id: 3,
        category_name: 'Laptop',
        category_image: 'assets/images/shop-categories/laptop.png'
    },
    {
        id: 4,
        category_name: 'Mouse',
        category_image: 'assets/images/shop-categories/mouse.png'
    },
    {
        id: 5,
        category_name: 'TV',
        category_image: 'assets/images/shop-categories/tv.png'
    },
    {
        id: 6,
        category_name: 'Drone',
        category_image: 'assets/images/shop-categories/drone.png'
    },
    {
        id: 7,
        category_name: 'Watch',
        category_image: 'assets/images/shop-categories/watch.png'
    },
    {
        id: 8,
        category_name: 'Headphone',
        category_image: 'assets/images/shop-categories/headphone.png'
    },
    {
        id: 9,
        category_name: 'Speaker',
        category_image: 'assets/images/shop-categories/speaker.png'
    },
    {
        id: 10,
        category_name: 'Games',
        category_image: 'assets/images/shop-categories/controller.png'
    }
]

export const products: OrderDetailsProduct[] = [
    {
      id: 1,
      product_name: 'Bluetooth Calling Smartwatch',
      product_image: 'assets/images/dashboard-8/product-categories/watch-2.png',
      brand: 'Generic',
      category: 'watch',
      price: 109.00,
      quantity: 1,
      total_quantity: 10,
      sub_total: 109.00,
    },
    {
      id: 2,
      product_name: 'Microsoft Surface Laptop',
      product_image: 'assets/images/dashboard-8/product-categories/laptop.png',
      brand: 'Microsoft',
      category: 'laptop',
      price: 187.00,
      quantity: 1,
      total_quantity: 8,
      sub_total: 187.00,
    },
    {
      id: 3,
      product_name: 'Gaming Over Ear Headphone',
      product_image: 'assets/images/dashboard-8/product-categories/headphone.png',
      brand: 'Gaming',
      price: 76.00,
      category: 'headphone',
      quantity: 1,
      total_quantity: 20,
      sub_total: 76.00,
    },
    {
      id: 4,
      product_name: 'Apple iPhone 14 Plus',
      product_image: 'assets/images/dashboard-8/product-categories/phone.png',
      brand: 'Apple',
      category: 'phone',
      price: 132.00,
      quantity: 1,
      total_quantity: 14,
      sub_total: 132.00,
    },
    {
      id: 5,
      product_name: 'Apple Smart HD TV',
      product_image: 'assets/images/dashboard-8/product-categories/dvd.png',
      brand: 'Apple',
      category: 'tv',
      price: 789.00,
      quantity: 1,
      total_quantity: 78,
      sub_total: 789.00,
    },
    {
      id: 6,
      product_name: 'Apple iPhone 14 Plus',
      product_image: 'assets/images/dashboard-8/product-categories/mac-laptop.png',
      brand: 'Apple',
      category: 'phone',
      price: 809.00,
      quantity: 1,
      total_quantity: 99,
      sub_total: 809.00,
    },
    {
      id: 7,
      product_name: 'Speakers Wireless',
      product_image: 'assets/images/dashboard-8/product-categories/speaker.png',
      brand: 'Generic',
      category: 'speaker',
      price: 541.00,
      quantity: 1,
      total_quantity: 100,
      sub_total: 541.00,
    },
    {
      id: 8,
      product_name: 'M185 Compact Wireless Mouse',
      product_image: 'assets/images/dashboard-8/product-categories/mouse.png',
      brand: 'Logitech',
      category: 'mouse',
      price: 200.00,
      quantity: 1,
      total_quantity: 3,
      sub_total: 200.00,
    },
    {
      id: 9,
      product_name: 'Wireless Headphone',
      product_image: 'assets/images/dashboard-8/product-categories/wireless-headphone.png',
      brand: 'Generic',
      category: 'headphone',
      price: 333.00,
      quantity: 1,
      total_quantity: 21,
      sub_total: 333.00,
    },
    {
      id: 10,
      product_name: 'RGB Gaming Keyboard',
      product_image: 'assets/images/dashboard-8/product-categories/keyboard.png',
      brand: 'RGB',
      category: 'keyboard',
      price: 198.00,
      quantity: 1,
      total_quantity: 54,
      sub_total: 198.00,
    },
    {
      id: 11,
      product_name: 'MacBook Air 13.3-inch',
      product_image: 'assets/images/dashboard-8/product-categories/ipad.png',
      brand: 'Apple',
      category: 'laptop',
      price: 409.00,
      quantity: 1,
      total_quantity: 78,
      sub_total: 409.00,
    },
    {
      id: 12,
      product_name: 'SYMA X5SW Remote control',
      product_image: 'assets/images/dashboard-8/product-categories/drone.png',
      brand: 'SYMA',
      category: 'drone',
      price: 341.00,
      quantity: 1,
      total_quantity: 12,
      sub_total: 341.00,
    }
];
  
export const posOrder: OrderDetailsProduct[] = [
  {
    id: 4,
    product_name: 'Apple iPhone 14 Plus',
    product_image: 'assets/images/dashboard-8/product-categories/phone.png',
    brand: 'Apple',
    category: 'phone',
    price: 132.00,
    quantity: 9,
    total_quantity: 14,
    sub_total: 132.00,
  },
  {
    id: 1,
    product_name: 'Bluetooth Calling Smartwatch',
    product_image: 'assets/images/dashboard-8/product-categories/watch-2.png',
    brand: 'Generic',
    category: 'watch',
    price: 109.00,
    quantity: 9,
    total_quantity: 10,
    sub_total: 109.00,
  },
]

export const checkoutMethod = [
  {
    id: 1,
    title: 'Cash',
    image: 'assets/images/dashboard-8/payment-option/cash.svg'
  },
  {
    id: 2,
    title: 'Card',
    image: 'assets/images/dashboard-8/payment-option/card.svg'
  },
  {
    id: 3,
    title: 'E-Wallet',
    image: 'assets/images/dashboard-8/payment-option/wallet.svg'
  }
]