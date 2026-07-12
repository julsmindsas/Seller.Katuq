# Spec 021 — Enrutamiento multi-tenant por subdominio (Nivel A) · MARCO

> Estado: **approved (MARCO)** — partido en sub-specs hijas 021.1–021.8. Ver `sub-specs.md`.
> Autor(es): Daniel + Claude
> Última actualización: 2026-07-10
>
> **Este es un spec MARCO.** El "qué/por qué" y los criterios EARS globales viven aquí; la
> implementación se reparte en 8 sub-specs hijas (`sub-specs.md`), cada una con su propio
> `spec.md → plan.md → tasks.md` y un dueño único. La arquitectura técnica compartida está en
> `plan.md`. Split registrado en CONTRACT.md **D-088** (Artículo XIII).

## 1. Contexto / Por qué
Hoy todas las empresas entran por un único origen (`sellercenter.katuq.com`) y la empresa activa se deriva del usuario logueado. Queremos que cada comercio tenga su propia URL (`almara.katuq.com`, `demokai.katuq.com`) para dar imagen de plataforma propia y aislar el acceso por comercio. Katuq **ya es multi-tenant por dato** (todo se segmenta por `company`); esta spec agrega el subdominio como **forma de seleccionar el tenant**, sin re-arquitecturar los datos.

**Decisión de diseño ancla (D-087):** el slug del subdominio **NO reemplaza** al identificador de tenant actual (`company` = `nomComercial`). Convive con él: el subdominio es una **capa de resolución** `subdominio → company`; aguas abajo sigue viajando el header `company` exactamente como hoy. Esto evita tocar los ~10 `.where('nomComercial', ...)`, los paths de Firestore que concatenan el nombre, y cualquier backfill de identidad.

## 2. Objetivo de negocio
Un comercio accede a Katuq por `su-slug.katuq.com`, ve su login y su marca (logo + nombre), y opera exactamente igual que hoy. Alta de un subdominio nuevo = **cero pasos de infraestructura manual** (gracias al wildcard). Validado end-to-end con **Demo KAI** en `demokai.katuq.com` antes de habilitar a más comercios.

## 3. User stories
- Como **comercio** quiero entrar por `mimarca.katuq.com` para sentir la plataforma como propia.
- Como **usuario de un comercio** quiero entrar por el login central (`sellercenter.katuq.com`), escribir mis credenciales y ser llevado a mi subdominio, para no tener que recordar mi URL.
- Como **usuario que ya conoce su URL** quiero loguearme directo en `mimarca.katuq.com`.
- Como **superadmin Katuq** quiero asignar/editar el slug de cada comercio y evitar colisiones y palabras reservadas.
- Como **operador de plataforma** quiero que dar de alta un comercio nuevo no requiera provisionar DNS/certificado a mano.

## 4. Criterios de aceptación (notación EARS)

- **THE** system **SHALL** resolver, en el arranque del frontend, el `company` activo a partir del subdominio del host mediante un endpoint público pre-login (`subdominio → { company, nomComercial, logo }`).
- **WHEN** el frontend carga en `<slug>.katuq.com` y `<slug>` mapea a una empresa activa, **THE** system **SHALL** fijar ese `company` como fuente del header en todas las llamadas al backend, sin depender del login.
- **IF** el subdominio no mapea a ninguna empresa activa (o es reservado), **THEN** **THE** system **SHALL** mostrar una página de "comercio no encontrado" y no permitir login.
- **WHEN** un usuario se loguea en el **login central** (`sellercenter.katuq.com`), **THE** system **SHALL** resolver su `company`, obtener el slug de esa empresa y redirigirlo a `<slug>.katuq.com` estableciendo su sesión allí mediante un **token de handoff de un solo uso** (TTL corto).
- **WHILE** un usuario está autenticado en `<slug>.katuq.com`, **THE** system **SHALL** rechazar la sesión (y redirigir al subdominio correcto) si el `company` del token no coincide con el `company` del subdominio.
- **THE** backend **SHALL** aceptar CORS para cualquier origen que cumpla el patrón `https://<slug>.katuq.com` (además de los orígenes actuales).
- **WHEN** el backend genere una URL absoluta hacia el frontend (retorno de pasarela de pago, callback de suscripción, enlaces de correo), **THE** system **SHALL** derivar el subdominio del comercio **desde el dato de la empresa** (no del host del request) y apuntar al subdominio correcto.
- **WHERE** una empresa aún no tiene slug asignado, **THE** system **SHALL** seguir sirviéndola por el origen legacy (`sellercenter.katuq.com`) sin degradación.
- **WHEN** superadmin asigne o edite un slug, **THE** system **SHALL** validar formato (`^[a-z0-9]([a-z0-9-]{0,48}[a-z0-9])?$`), unicidad global y que no esté en la lista de reservados.
- **THE** system **SHALL** tratar los webhooks entrantes (Shopify/Osmosis/Woo/pagos) sin cambios — ya resuelven empresa por dato/path y no dependen del subdominio.

## 5. Requisitos no funcionales

### 5.1 Performance
- Resolución `subdominio → company` (endpoint público) p95 ≤ 150 ms; cacheable (la relación cambia rara vez).
- El redirect de login central añade ≤ 1 salto adicional perceptible.

### 5.2 Seguridad
- El `company` del subdominio se valida **siempre** contra el `company` firmado en el JWT (endurece el estado actual, donde el header `company` no se valida contra el token).
- Token de handoff: un solo uso, TTL ≤ 60 s, ligado a IP/UA, invalidado tras canje.
- Endpoint público de resolución expone solo un subset seguro (company, nombre, logo) — nunca credenciales ni config sensible.
- Lista de subdominios reservados (`www`, `app`, `api`, `back`, `admin`, `superadmin`, `static`, `assets`, `mail`, `ftp`, …).

### 5.3 Observabilidad
- Log estructurado con `correlationId` en: resolución de subdominio fallida, mismatch tenant↔JWT, canje de token de handoff. Métrica de tasa de mismatch (señal de intento cross-tenant).

### 5.4 Accesibilidad (UI)
- Página "comercio no encontrado" y pantalla de login central navegables por teclado, con roles ARIA.

### 5.5 Resiliencia
- Si el endpoint de resolución falla, el frontend cae al comportamiento legacy (login por credenciales en origen central) en vez de romper.
- Renaming de slug: mantener el slug anterior como alias con redirect 301 durante una ventana, para no romper bookmarks ni callbacks de pago en vuelo.

## 6. Out of scope (explícito)
- **Theming/colores por comercio** (white-label visual). Queda el look actual "Almara"; solo logo + nombre son dinámicos (ya lo son hoy). — es el "Nivel B".
- **Dominios propios del comercio** (`tienda.almara.com`).
- **SSO entre subdominios** (cada origen mantiene su sesión).
- **Refactor del identificador de tenant** (`nomComercial` → docId limpio). El slug convive; no se toca la identidad.
- Limpieza de la lógica per-empresa hardcodeada (`company === "Julsmind"`, correos Almara) — se documenta como deuda, no se ataca aquí.

## 7. Dependencias
- Infra: reverse proxy wildcard (Cloudflare o nginx) con `*.katuq.com` + certificado TLS wildcard, delante del Firebase Hosting site actual (single site, SPA). — **decisión de infra confirmada.**
- Reusa el modelo de resolución por-dato existente (header `company`) y `[[002.7-flows-multitenant-via-companyConfig]]` como precedente de multi-tenancy.
- Toca callbacks de pago del 360 → requiere coordinación con specs de pago/suscripción (Wompi/ePayco).

## 8. [NEEDS CLARIFICATION] — RESUELTO 2026-07-09

- [x] **Origen del login central**: se **reutiliza `sellercenter.katuq.com`** como login central + legacy (no se crea `app.katuq.com`). — resuelto.
- [x] **Backfill de slugs**: **auto-generado** desde `nomComercial` para TODAS las empresas existentes, **editable por superadmin**. Colisiones se desambiguan con sufijo (`-2`, `-3`). — resuelto.
- [x] **Panel de superadmin Katuq**: sigue en el origen central (`sellercenter.katuq.com`), sin subdominio propio en este alcance. — default aceptado.
- [x] **Subdominios reservados**: se adopta la lista de §5.2. — default aceptado.
- [x] **`sellercenter.katuq.com` como fallback**: se mantiene operativo indefinidamente (sin fecha de corte en el MVP). — default aceptado.

## 9. Riesgos identificados
- **R-01 (alto):** `localStorage` es por-origen → el retorno de pasarela de pago DEBE volver al mismo subdominio; si no, el cliente queda deslogueado post-pago. Cruza con las ~23 URLs hardcodeadas a un solo dominio.
- **R-02 (medio):** renombrar el slug de un comercio rompe bookmarks y callbacks de pago en vuelo → mitigado con alias+301 temporal.
- **R-03 (medio):** el wildcard TLS + proxy es superficie de infra/ops nueva (renovación de cert, punto único) — requiere runbook.
- **R-04 (alto):** hoy el header `company` no se valida contra el JWT; si el subdominio no se enforce contra el token, un header spoofeado cruza tenants. La validación tenant↔JWT es obligatoria en esta spec.
- **R-05 (medio):** una URL hardcodeada que se nos escape seguirá apuntando al dominio viejo → inventario exhaustivo de los ~23 puntos + plantillas de correo antes de cerrar.

## 10. Métricas de éxito post-launch
- Demo KAI opera 100% por `demokai.katuq.com` sin incidencias durante 1 semana (login, venta, pago, notificaciones).
- 0 eventos de mismatch tenant↔JWT no explicados en 2 semanas.
- 0 clientes deslogueados tras retorno de pasarela de pago (medido sobre pagos con redirect).
- Alta de un comercio nuevo con subdominio en < 5 min sin tocar infra.

---

**Checklist de revisión humana antes de aprobar:**
- [ ] No hay nombres de librerías/frameworks en la spec.
- [ ] Cada criterio EARS es testeable de forma binaria.
- [ ] NFRs cubren performance, seguridad, observabilidad.
- [ ] Out of scope explícito.
- [ ] Bloque `[NEEDS CLARIFICATION]` resuelto.
