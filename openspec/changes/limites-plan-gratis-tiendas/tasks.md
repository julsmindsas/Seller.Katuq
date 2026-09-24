## 0. Decisiones

- [x] 0.1 Límites del plan gratis en su versión "más agresiva" y checkout a WhatsApp al llegar al tope (Daniel, 2026-09-24).
- [x] 0.2 Medir el impacto en producción (solo lectura): ninguna empresa gratis tiene tienda publicada.
- [ ] 0.3 Aprobar esta propuesta y responder las preguntas abiertas del diseño.
- [ ] 0.4 Registrar la decisión en `specs/CONTRACT.md`.

## 1. Límites en un solo lugar

- [ ] 1.1 `tienda` en `SUBSCRIPTION_LIMITS.freemium` y `paid`, y el módulo puro `utils/limitesPlan.js`, con pruebas unitarias.
- [ ] 1.2 Bandera `LIMITES_PLAN_GRATIS_TIENDA`, con dueño y fecha de retiro.

## 2. Configuración y lo visible de la tienda

- [ ] 2.1 Pruebas de contrato: la segunda tienda, el dominio, más de 3 páginas, 1 cupón, 1 promoción y 1 punto de retiro se rechazan en gratis y pasan en pago; lo guardado no se borra.
- [ ] 2.2 Validación al guardar y al publicar.
- [ ] 2.3 Render: sello "Hecho con Katuq"; tope de 50 productos en catálogo, categorías, ficha, `sitemap.xml` y `llms.txt`. El plan sale de la lectura de la empresa que ya hace el render.

## 3. Tope de pedidos de la tienda (módulo sensible: un cambio a la vez, diff y aprobación)

- [ ] 3.1 Prueba de contrato: 14 → se crea y queda en 15; con 15 → 403 `TOPE_PLAN` sin crear pedido ni enlace de pago; en pago no hay tope. Write-set: no toca productos, precios ni inventario.
- [ ] 3.2 **Mostrar el diff a Daniel** antes de aplicar la consulta del cupo antes de crear y la suma después.
- [ ] 3.3 Render con `topeAlcanzado` y el checkout de la tienda en modo "Pídelo por WhatsApp" con el carrito resumido.
- [ ] 3.4 Prueba de pedido de punta a punta con y sin tope, en una empresa de prueba gratis.

## 4. Marketing

- [ ] 4.1 Sin recordatorio de carrito ni reseñas en gratis; los correos al comprador con texto estándar.
- [ ] 4.2 Campañas: 200 al mes y 1 campaña al mes; remarketing automático solo "Volvió". Actualizar la propuesta de campañas (D-318).
- [ ] 4.3 `feed.xml` en 404, sin conversiones de Ads ni API de Meta, y métricas de 1 día en gratis.
- [ ] 4.4 Opttia: 3 páginas al mes en gratis.
- [ ] 4.5 Pruebas de contrato de 4.1 a 4.4.

## 5. Front

- [ ] 5.1 `PlanService` (plan de la empresa activa y sus límites).
- [ ] 5.2 Candados con "Mejorar plan" en el editor de sitios, las métricas y Marketing, más el aviso "Te quedan N pedidos este mes".
- [ ] 5.3 `npm run build` sin errores y revisión visual.

## 6. Cierre

- [ ] 6.1 Desplegar después de la feria con las campañas de correo. Verificar en una empresa gratis de prueba y registrar en CONTRACT.md y en la memoria.
- [ ] 6.2 Retirar la bandera según el plan.
