# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Katuq Seller** is an Angular 14 e-commerce management platform for sellers, providing comprehensive tools for inventory management, order processing, customer relationship management, production tracking, and point-of-sale operations. The application follows a modular architecture with lazy-loaded feature modules.

## Development Commands

### Essential Commands
- `npm start` - Start development server
- `npm run build` - Build for development 
- `npm run build:prod` - Build for production
- `npm test` - Run unit tests
- `npm run lint` - Run linting
- `npm run e2e` - Run end-to-end tests

### Component Generation
- `npm run gc` - Generate component (shorthand for `ng generate component`)

### Release and Deployment
- `npm run update-version` - Update version number
- `npm run actualizar-compilar` - Update version and build
- `npm run release` - Update version, build production, and deploy to Firebase

## Architecture

### Module Structure
The application uses lazy-loaded feature modules organized by business domain:

- **Dashboard** (`/dashboard`) - Analytics and KPIs
- **Empresas** (`/empresas`) - Company configuration and variable modules
- **Inventarios** (`/inventario`) - Product catalog and inventory management
- **Ventas** (`/ventas`) - Sales, orders, and CRM
- **Producción** (`/produccion`) - Production tracking and workflow
- **Despachos** (`/despachos`) - Order fulfillment and shipping
- **POS** (`/pos`) - Point of sale operations

### Key Services Architecture
- **CartSingletonService** - Global shopping cart state management
- **KatuqintelligenceService** - AI-powered features
- **NotificationService** - Toast notifications and alerts
- **HttpInterceptor2** - HTTP request/response interceptor
- **LoaderInterceptor** - Global loading state management

### State Management Pattern
The application uses a service-based state management approach with RxJS for reactive data flows. Services maintain state and components subscribe to observables for data updates.

## Technology Stack

### Core Framework
- **Angular 14.1.x** with TypeScript 4.7.x
- **SCSS** for styling with Bootstrap 5.2.x foundation
- **Firebase 9.17.x** for backend services and hosting

### UI Components
- **PrimeNG 14.2.x** - Primary UI component library
- **ng-bootstrap 13.x** - Bootstrap integration
- **ngx-datatable 20.x** - Advanced data tables

### Key Dependencies
- **@ngx-translate** - Internationalization (i18n) with support for en, es, fr, pt
- **ApexCharts** - Data visualization and charts
- **ngx-toastr** - Toast notifications
- **crypto-js** - Encryption utilities
- **jspdf/html2pdf** - PDF generation

## Development Patterns

### Component Generation
When creating new components, follow the established module structure:
```
module-name/
├── module-name-routing.module.ts
├── module-name.module.ts
├── module-name.component.ts
├── module-name.component.html
├── module-name.component.scss
└── subcomponents/ (if needed)
```

### Routing Configuration
- Main routes defined in `app-routing.module.ts`
- Feature modules have their own routing modules
- Lazy loading implemented for all major features
- Route guards (`AuthGuard`, `AdminGuard`) protect secured areas

### Service Integration
- Use dependency injection for service access
- Follow reactive patterns with RxJS observables
- Implement proper error handling and loading states
- Leverage shared services in `src/app/shared/services/`

### Firebase Integration
- Firestore for data persistence
- Firebase Hosting for deployment
- Service worker enabled for PWA capabilities
- Configuration in `firebase.json` and environment files

## Code Conventions

### File Naming
- Components: `kebab-case.component.ts`
- Services: `kebab-case.service.ts` 
- Modules: `kebab-case.module.ts`
- Interfaces: `PascalCase` (e.g., `Producto`, `Pedido`)

### Module Organization
- Feature modules are self-contained with their own routing
- Shared components and services in `src/app/shared/`
- Business logic encapsulated in services
- Component templates use PrimeNG components for consistency

### Data Models
Key interfaces are defined in `src/app/shared/models/`:
- **Producto** - Product catalog structure
- **Pedido** - Order management with estados (process states)
- **Cliente** - Customer information
- **User** - User authentication and authorization

## Testing and Quality

### Test Configuration
- Karma/Jasmine for unit tests
- Protractor for e2e tests (legacy)
- TSLint for code quality (deprecated, consider migration to ESLint)
- Tests are skipped by default in schematics (skipTests: true)

### Build Configuration
- Development builds use `ng serve`
- Production builds optimize for performance
- Service worker enabled for offline capabilities
- Source maps disabled in production

## Deployment

### Firebase Hosting
- Production builds deployed to Firebase
- Rewrites configured for SPA routing
- Public directory: `dist/cuba`
- Automatic version updating before builds

### Environment Configuration
- Development: `src/environments/environment.ts`
- Production: `src/environments/environment.prod.ts`
- Firebase configuration required for backend integration

## Ventas Module (Sales System)

The Ventas module (`/ventas`) is a comprehensive sales management system providing multi-channel sales capabilities, customer relationship management, and order processing.

### Core Routes
- `/crear-ventas` - Order creation wizard
- `/clientes` - Customer management 
- `/pedidos` - Order listing and management
- `/clienteslista` - Customer list view
- `/carga-ventas` - Bulk sales upload
- `/ventas-pos` - Point of Sale interface
- `/venta-asistida` - Assisted sales process

### Key Components Architecture

#### Order Management
- **crear-ventas/** - Multi-step order creation wizard
- **list/** - Advanced order listing with filtering and export
- **carrito/** - Shopping cart with reactive state management
- **checkout/** - Comprehensive checkout process
- **confirm/** - Order confirmation and summary

#### Point of Sale (POS2)
Complete POS system with 14 specialized components:
- **pos2/pos.component** - Main POS interface
- **product-category/** - Category navigation
- **customer-section/** - Customer selection and management
- **cart-summary/** - Real-time cart overview
- **payment-selector/** - Multiple payment method selection
- **cash-payment/, card-payment/, ewallet-payment/** - Payment processors
- **cash-closing/** - End-of-day reconciliation

#### Customer Management
- **clientes/** - Full CRUD customer operations
- **crear-cliente-modal/** - Quick customer creation
- **lista/** - Advanced customer listing with search

#### Assisted Sales
- **venta-asistida/** - Complete guided sales process with:
  - Customer information management
  - Product grid selection
  - Cart preview and modification
  - Payment processing
  - Billing and delivery configuration
  - Order confirmation

### Core Data Models

#### Pedido (Order) Interface
```typescript
interface Pedido {
  _id?: string;
  nroPedido?: string;
  referencia: string;
  cliente?: Cliente;
  carrito?: Carrito[];
  estadoProceso: EstadoProceso;
  estadoPago: EstadoPago;
  formaDePago?: string;
  totalPedidoSinDescuento?: number;
  totalDescuento?: number;
  totalEnvio?: number;
  subtotal?: number;
  facturacion?: Facturacion;
  envio?: Envio;
  asesorAsignado?: UserLite;
  fechaCreacion?: string;
}
```

#### Order States
- **EstadoPago**: Pendiente, PreAprobado, Aprobado, Rechazado, Cancelado
- **EstadoProceso**: SinProducir, Producido, Empacado, Despachado, Entregado, Rechazado

#### Cliente (Customer) Interface
```typescript
interface Cliente {
  documento?: string;
  nombres_completos?: string;
  correo_electronico_comprador?: string;
  numero_celular_comprador?: string;
  datosFacturacionElectronica?: Facturacion;
  datosEntrega?: Entrega;
}
```

### Key Services

#### VentasService
Primary sales service handling:
- Order CRUD operations (`createOrder`, `editOrder`, `getOrders`)
- Product management and filtering
- Order validation and status updates
- Analytics (top products, sales by date)
- Pre-order localStorage management

#### CartSingletonService
Reactive cart state management:
- BehaviorSubject-based cart state
- localStorage persistence
- Cart operations (add, remove, clear)
- Real-time total calculations

#### PosCheckoutService
POS-specific operations:
- Customer management workflow
- Payment flow orchestration
- Wompi payment gateway integration
- Modal management for payment types
- Warehouse selection

#### PedidosUtilService
Order utilities and calculations:
- Master data caching (30-minute cache)
- Price calculations (subtotal, taxes, discounts, shipping)
- Product configuration management
- Cart operations and validations

### Features

#### Multi-Channel Sales
- Traditional wizard-based order creation
- Point-of-Sale interface for retail
- Assisted sales for guided selling
- Bulk upload for batch processing

#### Payment Integration
- Multiple payment methods (cash, card, e-wallet)
- Wompi payment gateway integration
- Manual payment recording
- End-of-day cash closing procedures

#### Colombian Market Specifics
- Address structure following Colombian standards
- Electronic invoicing integration
- Local payment methods support
- Tax calculation for Colombian regulations

#### Advanced Filtering & Search
- Multi-criteria order filtering
- Real-time search capabilities
- Export functionality (Excel, PDF)
- Custom date range selections

### Integration Points
- **Inventory System** - Real-time product availability
- **Production Module** - Order lifecycle tracking
- **Despachos Module** - Shipping and fulfillment
- **Analytics Dashboard** - Sales reporting and KPIs
- **Payment Gateways** - Electronic payment processing