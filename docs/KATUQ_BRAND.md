# Katuq Brand & Design Tokens

## Colores de Marca

| Rol | Color | Hex | Token SCSS |
|-----|-------|-----|------------|
| **Primary** | Morado | `#8b5cf6` | `$katuq-primary` |
| **Primary Light** | Morado claro | `#a78bfa` | `$katuq-primary-light` |
| **Primary Dark** | Morado oscuro | `#7c3aed` | `$katuq-primary-dark` |
| **Accent** | Cyan | `#00e5cc` | `$katuq-accent` |
| **Accent Dark** | Cyan oscuro | `#00b8a9` | `$katuq-accent-dark` |

## Colores Semaforo

| Estado | Hex | Token |
|--------|-----|-------|
| Success | `#10b981` | `$katuq-success` |
| Warning | `#f59e0b` | `$katuq-warning` |
| Danger | `#ef4444` | `$katuq-danger` |
| Info | `#8b5cf6` | `$katuq-primary` (alineado con marca) |

## Escala Purple (10 pasos)

```
$katuq-purple-50:  #f5f3ff   (fondos, backgrounds sutiles)
$katuq-purple-100: #ede9fe   (badges light, hover states)
$katuq-purple-200: #ddd6fe   (bordes, separadores)
$katuq-purple-300: #c4b5fd   (texto secundario sobre dark)
$katuq-purple-400: #a78bfa   (primary-light, botones hover)
$katuq-purple-500: #8b5cf6   (PRIMARY - color principal de marca)
$katuq-purple-600: #7c3aed   (hover de botones primary)
$katuq-purple-700: #6d28d9   (texto sobre fondos claros)
$katuq-purple-800: #5b21b6   (alto contraste)
$katuq-purple-900: #4c1d95   (dark mode backgrounds)
```

## Escala Cyan (10 pasos)

```
$katuq-cyan-50:  #ecfdf5
$katuq-cyan-100: #d1fae5
$katuq-cyan-200: #a7f3d0
$katuq-cyan-300: #6ee7b7
$katuq-cyan-400: #34d399
$katuq-cyan-500: #00e5cc   (ACCENT - color acento de marca)
$katuq-cyan-600: #00b8a9
$katuq-cyan-700: #009688
$katuq-cyan-800: #00796b
$katuq-cyan-900: #004d40
```

## Grises Neutros

```
$katuq-gray-50:  #fafafa
$katuq-gray-100: #f4f4f5
$katuq-gray-200: #e4e4e7
$katuq-gray-300: #d4d4d8
$katuq-gray-400: #a1a1aa
$katuq-gray-500: #71717a
$katuq-gray-600: #52525b
$katuq-gray-700: #3f3f46
$katuq-gray-800: #27272a
$katuq-gray-900: #18181b
```

## Como Usar

### Archivo fuente
```
src/assets/scss/utils/_katuq-tokens.scss
```

### Import en componentes
```scss
// Ajustar profundidad segun ubicacion del componente
@import '../../../../../assets/scss/utils/katuq-tokens';
```

### Disponibilidad global
Los tokens ya estan conectados a la cadena global:
```
styles.scss → app.scss → style.scss → _variables.scss → _katuq-tokens.scss
```

Las CSS custom properties en `:root` usan interpolacion de tokens:
```scss
--primary-color: #{$katuq-primary-light};
--primary-dark-color: #{$katuq-primary};
--error-color: #{$katuq-danger};
--success-color: #{$katuq-success};
```

### Variables globales mapeadas
```scss
$primary-color:  $katuq-primary-light  // #a78bfa
$tertiary-color: $katuq-accent-dark    // #00b8a9
$success-color:  $katuq-success        // #10b981
$info-color:     $katuq-primary        // #8b5cf6
$warning-color:  $katuq-warning        // #f59e0b
$danger-color:   $katuq-danger         // #ef4444
```

### Bootstrap overrides (style.scss)
```scss
$primary: $katuq-primary-light;
$success: $katuq-success;
$info:    $katuq-primary;
$warning: $katuq-warning;
$danger:  $katuq-danger;
```

### PrimeNG overrides (primeng-overrides.scss)
Botones, checkboxes, focus rings, paginator y datatable usan `$katuq-primary`.

## Badges por Estado

Estilo: fondo tintado + texto oscuro + borde sutil (sin box-shadow).

| Estado | Fondo | Texto | Borde |
|--------|-------|-------|-------|
| Sin Producir | `$katuq-gray-100` | `$katuq-gray-600` | `$katuq-gray-300` |
| En Produccion | `#faf5ff` | `$katuq-purple-700` | `$katuq-purple-200` |
| Producido | `$katuq-purple-50` | `$katuq-purple-700` | `$katuq-purple-200` |
| Empacado | `$katuq-cyan-50` | `$katuq-cyan-800` | `$katuq-cyan-200` |
| Para Despachar | `$katuq-warning-light` | `$katuq-warning-text` | `#fde68a` |
| Despachado | `$katuq-purple-100` | `$katuq-purple-800` | `$katuq-purple-300` |
| Entregado | `$katuq-success-light` | `$katuq-success-text` | `$katuq-success` |
| Rechazado | `$katuq-danger-light` | `$katuq-danger-text` | `$katuq-danger` |

## Reglas

1. **NUNCA** usar azul Material (`#2196F3`, `#0d6efd`) — ya no existe en la app
2. **NUNCA** hardcodear hex en SCSS — siempre usar tokens `$katuq-*`
3. **Primary = Morado**, no azul. Si ves azul, es un bug
4. **Accent = Cyan**, para elementos de acento y diferenciacion
5. **Info = Morado** (alineado con marca, no azul celeste)
6. Stat card gradients: usar tokens `$stat-*-gradient`
7. Focus rings: `$focus-ring` o `rgba($katuq-primary, 0.15)`
