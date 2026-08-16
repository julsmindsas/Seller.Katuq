# Spec 025 — Contabilidad nativa de partida doble (MVP)

> Estado: **in-progress** · Inicio: 2026-08-14

## Objetivo

Cada comercio de Katuq puede iniciar un libro contable propio, aislado por
empresa, sin depender de SIIGO o World Office. La primera vertical contabiliza
facturas, notas crédito y notas débito DIAN aceptadas, y pagos aprobados en
Tesorería; permite comprobantes manuales y presenta un balance de prueba.

## Criterios de aceptación de esta fase

- El sistema crea por comercio una plantilla inicial editable de cuentas y no
  activa contabilización automática hasta que un usuario responsable la confirme.
- Todo comprobante tiene mínimo dos líneas y débitos iguales a créditos.
- Una factura DIAN aceptada debita clientes y acredita ingreso e IVA.
- Una nota crédito aceptada revierte clientes, ingreso e IVA; una nota débito
  aumenta esos valores.
- Un pago aprobado debita caja o bancos y acredita la cuenta por cobrar. Los
  excedentes se separan como anticipos recibidos de clientes.
- Un pago recibido antes de la factura se reconoce como anticipo y se aplica
  automáticamente contra la cuenta por cobrar cuando la factura DIAN sea aceptada.
- El mismo CUFE/CUDE nunca crea dos comprobantes.
- Un fallo del libro interno nunca cambia el estado fiscal de un documento ya
  aceptado por la DIAN; el fallo queda auditado.
- Solo Contador, Tesorero, Administrador o Super Administrador puede acceder a
  la API, siempre con autenticación y empresa activa.
- La interfaz explica el proceso en lenguaje cotidiano y separa borradores de
  comprobantes contabilizados.

## Entregado en el MVP

- Plan inicial de 14 cuentas por empresa y mapeo configurable de las seis
  cuentas principales de ventas y recaudos.
- Libro diario, comprobantes manuales, asiento automático DIAN y balance de
  prueba por período.
- Asiento automático en los caminos de pago directo, aprobación individual y
  aprobación manual de pendientes; sincronización de recaudos históricos.
- Compatibilidad con documentos DIAN históricos que guardaron el número visible
  del pedido en lugar de su ID interno.
- Activación guiada, sincronización de documentos DIAN anteriores con totales
  disponibles, auditoría e idempotencia.

## Fuera de esta primera fase

- Compras y cuentas por pagar, egresos, conciliación bancaria, costo de ventas
  e inventario.
- Retenciones detalladas y reglas tributarias por producto, tercero o régimen.
- Libro mayor por tercero, períodos/cierres, comprobantes de reversión y
  conciliación bancaria.
- Estado de resultados, estado de situación financiera, exportaciones y medios
  magnéticos. Estos bloques requieren fases y validación contable separadas.
