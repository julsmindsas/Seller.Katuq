# Tema de diseño Katuq — canon "Todos los pedidos"

## Purpose

Definir el tema visual y los patrones de UI canónicos de Katuq Seller. La referencia es la pantalla **"Todos los pedidos"** (`/pedidos`, rediseño "pd" en `src/app/components/ventas/list/`), declarada por el negocio como la más cercana al manual de marca. Toda pantalla nueva y todo rediseño deben usar estos tokens y patrones; los módulos existentes se alinean progresivamente.

## Requirements

### Requirement: Paleta canónica
Toda UI nueva MUST usar la paleta del tema "pd" (fuente: `list.component.scss:5408-5416`):

| Token | Valor | Uso |
|---|---|---|
| `$pd-accent` | `#5F3FE0` | Morado de marca: títulos clave, valores, botón primario, estados activos |
| `$pd-accent-2` | `#7C5CFF` | Morado claro: avatares, tintes, acentos secundarios |
| `$pd-ink` | `#211F3A` | Texto principal |
| `$pd-muted` | `#8f8bab` | Texto secundario |
| `$pd-muted-2` | `#9995b3` | Texto terciario |
| `$pd-line` | `#ececf4` | Bordes de paneles |
| `$pd-line-soft` | `#f1f0f7` | Divisores |
| `$pd-chip-bg` | `#f5f4fa` | Fondo de chips e inputs |
| `$pd-chip-border` | `#e9e7f3` | Borde de chips e inputs |

Superficies con tinte lila: `#faf9fe` (tarjetas internas), `#faf9ff` (hover de fila), `#f3f1fb` (azulejos/empty states).

#### Scenario: Color primario
- WHEN se necesite el color primario/de marca en una pantalla nueva
- THEN se usa `#5F3FE0` (NUNCA el azul Material legacy `#2196f3`)

### Requirement: Colores semánticos en par valor/fondo-suave
Los estados MUST expresarse como par (color fuerte para texto/ícono + fondo suave), nunca como sólido Material:

| Semántico | Fuerte | Fondo suave |
|---|---|---|
| Éxito | `#1E874B` | `#E6F7EE` |
| Alerta | `#D9820A` | `#FFF1DF` |
| Error/Urgente | `#D64545` | `#FDECEC` |
| Info | `#1E6FD9` | `#E7F1FF` |
| Congelado | `#3B82C4` | `#EAF4FF` |
| Primario | `#5F3FE0` | `#efe9ff` |
| Empacado | `#8E27B0` | `#f3e9fb` |
| Secundario/pizarra | `#5A6B78` | `#eef0f3` |

El mapeo estado-de-pedido → semántico existente (Pendiente→alerta, Aprobado→éxito, Rechazado→error, etc., `list.component.html:331-346`) se conserva, re-tonado a esta tabla.

#### Scenario: Badge de estado nuevo
- WHEN se muestre un estado (pedido, pago, sync, etc.)
- THEN se usa pill con fondo suave + texto fuerte del par semántico, UPPERCASE, radius 20px

### Requirement: Tipografía
La UI nueva MUST seguir esta escala tipográfica:
- Labels de campo/sección: UPPERCASE, 9.5–11px, peso 700–800, letter-spacing 0.3–0.8px, color muted.
- Jerarquía: título de pantalla 20px/800; título de panel 16px/800; nombre destacado 17px/800; valor principal (totales) 22px/800 en acento; body 12.5px; metadatos 10–11px.
- Números de documento/pedido: monospace (`'JetBrains Mono', ui-monospace, monospace`), color info `#1E6FD9`.
- Valores monetarios: peso 800.

#### Scenario: Etiqueta de campo
- WHEN se rotule un campo o sección de datos
- THEN el label va UPPERCASE pequeño (≤11px) en color muted y el valor debajo/al lado en ink con peso 600+

### Requirement: Geometría y elevación
La UI nueva MUST usar esta geometría y elevación:
- Border-radius: paneles 16px · tarjetas internas 9–14px · filas 11px · botones/inputs 10–11px · chips/pills 20px · avatares 50%.
- Sombras difusas de baja opacidad con tinte violeta — nunca sombras duras grises:
  - Panel: `0 1px 3px rgba(30,20,80,.04)`
  - Hover elevado: `0 6px 14px -8px rgba(50,40,110,.35)`
  - Botón primario: `0 8px 18px -8px rgba(95,63,224,.7)`
- Bordes 1px solid en lilas claros (`#ececf4`/`#eeecf7`). Transiciones 0.12–0.2s ease.
- PROHIBIDO: gradientes en cards/stats/headers (los del legacy son deuda). Estilo plano tintado.

#### Scenario: Card de métrica/stat
- WHEN se muestre una métrica o stat
- THEN se usa chip plano tintado: fondo suave (`#faf9fe` o `#efe9ff`), borde `#eeecf7`, radius 10px, label UPPERCASE arriba, valor 15–19px/800 en acento, hover `translateY(-1px)` — sin gradientes ni border-left

### Requirement: Patrones de componentes
Los componentes recurrentes MUST construirse con estos patrones:
- **Botón primario**: sólido `#5F3FE0`, texto blanco, radius 11px, sombra violeta, hover `#4a2fc0`. **Secundario/ghost**: blanco, borde `#e4e2ef`, texto `#5b5878`.
- **Toggle de vistas**: segmented control — contenedor `#f5f4fa` borde `#e9e7f3` radius 10px; opción activa = pastilla blanca con texto acento + sombra.
- **Inputs/filtros**: fondo `#f5f4fa`, borde `#e9e7f3`, radius 10px, alto 40px; contador de filtros activos como chip `#efe9ff`.
- **Filas de listado**: avatar circular con inicial (paleta rotativa de 8 colores, `list.component.ts:1677-1680`), hover `#faf9ff`, seleccionada `rgba(124,92,255,.09)` + borde `#d9cffb`.
- **Timeline/stepper**: dots 28px; completado verde `#1E874B`; actual naranja `#FF9800` con anillo `0 0 0 4px rgba(255,152,0,.18)`; línea `#eceaf4`.
- **Empty state**: ícono en azulejo 64px radius 16px fondo `#f3f1fb` color acento; título 15px/800; subtítulo 12.5px muted.
- **Azulejos de acción**: ícono tintado `rgba(color,.12)` según tipo de acción.

#### Scenario: Pantalla o módulo nuevo
- WHEN se cree una pantalla nueva o se rediseñe un módulo
- THEN se aplican estos patrones y tokens; cualquier desviación se justifica en la propuesta OpenSpec correspondiente

### Requirement: Convenciones SCSS
El SCSS nuevo MUST seguir estas convenciones:
- Nomenclatura BEM-ish: `bloque__elemento--modificador`, estados `&.is-active`.
- Prefijo de dominio por módulo (como `pd-`/`pedidos-*` en pedidos).
- Variables de tema al inicio del archivo (hasta que exista partial global compartido).
- PrimeNG se tematiza vía `:host ::ng-deep .p-*` dentro del scope del componente.

#### Scenario: SCSS nuevo
- WHEN se escriba SCSS de un componente nuevo
- THEN usa los tokens de esta spec (no hex sueltos fuera de la tabla) y nomenclatura BEM-ish con prefijo de módulo

## Relación con `_katuq-tokens.scss` (tokens oficiales previos)

Existe `src/assets/scss/utils/_katuq-tokens.scss` ("KATUQ DESIGN TOKENS v1.0"), con marca Purple `#8b5cf6`/`#a78bfa`/`#7c3aed` + Cyan `#00e5cc` y escalas 50-900. **Realidad de adopción: de 324 SCSS solo 20 lo importan** (despachos, cartera, tesorería, entrega, welcome); ~74 archivos hardcodean morados a mano; el propio `list.component.scss` no lo importa.

**Discrepancia abierta**: el acento del rediseño canónico es `#5F3FE0` (pd), mientras el token oficial es `#8b5cf6`. Esta spec canoniza el **tema pd** por decisión de negocio ("Todos los pedidos" = lo más cercano al manual de marca). La reconciliación del token file (re-apuntar `$katuq-purple-*` al tema pd, o confirmar `#8b5cf6` y re-tonar pd) DEBE resolverse en una propuesta OpenSpec dedicada antes de migrar módulos masivamente. Los gradientes `$stat-*-gradient` del token file (líneas 172-178) contradicen el estilo plano y quedan deprecados.

Otros artefactos globales relevantes: puente de CSS vars en `src/styles.scss:156-239` (`--primary-color: #a78bfa`, `--theme-deafult` — typo heredado del template Cuba Admin/Pixelstrap), tipografía global efectiva **Georama** (6 familias cargadas en `index.html:25-38`, solo se usan 2-3), tema PrimeNG activo `lara-light-blue`, dark mode aparte sin tokens (`dark-mode.scss`, 4031 líneas).

## Estado actual — deuda por módulo (ranking peor → mejor)

Compiten al menos 4 "primaries" en la app: morado-token (`#8b5cf6`/`#a78bfa`), índigo `#4361ee` (ventas), azul `#2563eb` (dashboard) y morados-Polaris `#5c6ac4`/`#667eea` (inventarios). Alinear = migrar hardcodes al tema de esta spec, no inventar tokens nuevos.

1. **Dashboard/home** — off-brand total: azul `#2563eb` (`dashboard-home.component.scss:46,103`), `#3b82f6` en legacy.
2. **crear-ventas** — sistema propio índigo `#4361ee` en `:root` (`crear-ventas.component.scss:2`, 4507 líneas); fallbacks `var(--primary-color, #8b5cf6)` que nunca aplican.
3. **Inventarios** — 4+ morados distintos entre sí (`#5c6ac4`, `#667eea`, `#5e72e4`, `#8b5cf6`); 13 gradientes, el módulo con más.
4. **Venta asistida / ecomerce-products** — índigo `#4361ee`/`#738efc` con un `#c4b5fd` colado.
5. **POS2** — morado correcto pero copiado local (`pos.component.scss:10-12`), gradiente azul suelto en cierre de caja.
6. **CRM** — morado correcto hardcodeado, flat: el más cercano visualmente.
7. **Clientes** — design system paralelo bien estructurado pero desalineado (`$clientes-primary: #a78bfa`, radius 6px, semánticos propios).

## Notas de deuda conocida
- El azul Material `#2196f3` y los `.modern-badge` sólidos (vista Tabla de pedidos) son legacy: se conservan funcionando pero no se replican en UI nueva.
- Font Awesome 4 y PrimeIcons conviven; para UI nueva preferir PrimeIcons (`pi pi-*`).
- Cero uso de `@use` (todo `@import`); radios 4-12px y sombras ad-hoc dispersos por componente.
- No existe manual de marca en el repo; los únicos artefactos de identidad son `_katuq-tokens.scss` y los logos en `src/assets/images/logo/Katuq/` (morado confirmado).
