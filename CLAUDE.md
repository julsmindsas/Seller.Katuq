# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Katuq Seller** is an Angular 14 e-commerce management platform for Colombian sellers. It provides inventory management, order processing, CRM, production tracking, and point-of-sale operations. The app is tailored for the Colombian market (addresses, electronic invoicing via SIIGO, tax regulations, Wompi payment gateway).

## Development Commands

```bash
npm start                    # Dev server on localhost:4200 (4GB heap)
npm run start:8gb            # Dev server with 8GB heap for large builds
npm run build                # Development build
npm run build:prod           # Production build (8GB heap, optimized)
npm test                     # Unit tests (Karma/Jasmine)
npm run lint                 # TSLint
npm run gc                   # Generate component (ng generate component)
npm run release              # Version bump + prod build + Firebase deploy
npm run actualizar-compilar  # Version bump + dev build
```

Build output goes to `dist/cuba`. Version is auto-bumped via `update-version.js` on every build (`prebuild` hook).

## Architecture

### Lazy-Loaded Feature Modules

All feature modules are lazy-loaded via `loadChildren` in `src/app/shared/routes/routes.ts`. Main routing is in `app-routing.module.ts` with three layouts:
- **ContentComponent** - Standard layout with sidebar/header/footer (most routes)
- **BlankComponent** - Full-screen layout (video-agent, etc.)
- **FullComponent** - Alternative full layout

Key modules in `src/app/components/`:

| Route | Module | Domain |
|-------|--------|--------|
| `/dashboards` | dashboard | Analytics and KPIs |
| `/empresas` | empresas | Company configuration |
| `/inventario` | inventarios | Product catalog and stock |
| `/ventas` | ventas | Sales, orders, CRM (largest module) |
| `/produccion` | produccion | Production tracking (requires Premium) |
| `/despachos` | despachos | Shipping and fulfillment |
| `/pos` | pos | Point of sale |
| `/onboarding` | onboarding | Setup wizard (admin-only) |

### Guard System (4 layers)

- **AdminGuard** (`src/app/shared/guard/admin.guard.ts`) - Checks user exists in localStorage
- **AuthGuard** (`src/app/shared/guards/auth.guard.ts`) - Firebase authentication check
- **SubscriptionGuard** (`src/app/shared/guards/subscription.guard.ts`) - Premium plan enforcement
- **OnboardingGuard** (`src/app/shared/guards/onboarding.guard.ts`) - Admin-only onboarding access

### HTTP Interceptors

Two interceptors registered in `app.module.ts`:
1. **HttpInterceptor2** (`src/app/shared/services/interceptor/http.interceptor.ts`) - Adds auth headers (Bearer token, company, user, email) to Katuq backend URLs (`back.katuq.com`, `localhost:3300`). Handles 401/403 with auto-logout. Throttles connection errors (30s). Identifies public routes that skip auth.
2. **LoaderInterceptor** (`src/app/shared/services/interceptor/loader.interceptor.ts`) - Shows loading bar on HTTP requests (skips KatuqIntelligence calls).

### State Management

Service-based with RxJS (no NgRx). Key pattern:
- Services use `BehaviorSubject` for reactive state
- `localStorage` for persistence (cart, user session)
- Components subscribe to observables

### Critical Services

| Service | Purpose |
|---------|---------|
| **CartSingletonService** | Global cart state (BehaviorSubject + localStorage) |
| **VentasService** | Order CRUD, product management, analytics |
| **PosCheckoutService** | POS workflow, Wompi payments, customer management |
| **PedidosUtilService** | Price calculations, master data caching (30-min TTL) |
| **KatuqintelligenceService** | AI features (Gemini API) |
| **SecurityService / AuthService** | Firebase authentication |
| **CacheService** | Generic data caching |
| **BaseService** | Base HTTP service for API calls |

### Shared Module

`src/app/shared/shared.module.ts` exports 50+ services, layout components (Header, Sidebar, Footer), directives (OnlyNumbers, RoleBasedVisibility, ImageFallback, SafeImage), and re-exports FormsModule, ReactiveFormsModule, NgbModule, TranslateModule, and PrimeNG modules.

## Code Conventions

- **Files**: `kebab-case.component.ts`, `kebab-case.service.ts`, `kebab-case.module.ts`
- **Classes/Interfaces**: `PascalCase` (e.g., `Producto`, `Pedido`, `Cliente`)
- **Variables/Methods**: `camelCase`
- **CSS**: BEM methodology for class names
- **Styles**: SCSS with Bootstrap 5.x foundation. Global styles in `src/styles.scss`, component-specific SCSS per component
- **UI Components**: Use PrimeNG components as the primary library. ng-bootstrap and ngx-datatable for specific use cases
- **i18n**: `@ngx-translate` with 4 languages (en, es, fr, pt). Translation files in `src/assets/i18n/`
- **Business logic** goes in services, keep components thin

## Key Data Models

Models in `src/app/shared/models/`:

**Order States** (critical for business logic):
- **EstadoPago**: `Pendiente`, `PreAprobado`, `Aprobado`, `Rechazado`, `Cancelado`
- **EstadoProceso**: `SinProducir`, `Producido`, `Empacado`, `Despachado`, `Entregado`, `Rechazado`

**Customer-facing states** that trigger notifications: `ProducidoTotalmente`, `Despachado`, `Entregado`, `Rechazado`, `Aprobado` (payment).
**Internal states** (no customer notification): `SinProducir`, `EnProduccion`, `ProducidoParcialmente`, `ParaDespachar`, `Empacado`.

## Ventas Module (Largest Module)

The Ventas module has multiple sales channels:
- **crear-ventas/** - Multi-step order creation wizard
- **venta-asistida/** - Guided sales process (customer > products > cart > payment > billing > confirm)
- **pos2/** - Full POS system (14 sub-components: product-category, customer-section, cart-summary, payment-selector, cash/card/ewallet-payment, cash-closing)
- **list/** - Order listing with filtering and export (Excel, PDF)
- **clientes/** and **lista/** - Customer management and listing
- **carga-ventas/** - Bulk sales upload

## Fulfillment Integration (Aliaddo)

Architecture: Frontend (Angular) > Backend (Node.js) > Aliaddo Provider.

**Critical**: Katuq uses Firestore IDs internally. When calling Aliaddo APIs, map to Aliaddo UUIDs via `integrations.fulfillment.id`. Match warehouses by `fulfillmentId` (UUID) or `idBodega` (code).

Inventory movement types: `INGRESO_COMPRA`, `SALIDA_VENTA`, `AJUSTE_POSITIVO`, `AJUSTE_NEGATIVO`, `INGRESO_FULFILLMENT`.

Price logic: Use `priceSell` if available, fallback to `priceBuy` if zero.

## Backend (Firebase Functions)

Located in `katuq_admin_back_firebase/functions/`. Express server on port 3300.

**Notification system**: Smart state detection in `services/notifications/notificationHooks.js` prevents notification spam by comparing current vs. new order state. Only customer-facing states trigger emails. Processing flows through `notificationHooks.detectOrderChanges()`, not direct SQS-to-Firestore.

## Deployment

Firebase Hosting. Build output: `dist/cuba`. SPA rewrites configured in `firebase.json`.
- **Environments**: `src/environments/environment.ts` (dev), `src/environments/environment.prod.ts` (prod)
- **PWA**: Service worker enabled in production builds

## Performance Notes

- Use `trackBy` in `*ngFor` directives
- Minimize observable subscriptions (unsubscribe in `OnDestroy`)
- All major features are lazy-loaded to reduce initial bundle
- Tests are skipped by default in schematics (`skipTests: true` in `angular.json`)