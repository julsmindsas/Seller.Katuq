# Registro y Uso de Herramientas en el Agente de Voz

Este documento explica cómo añadir, registrar y exponer **herramientas** (functions) al asistente de voz K.A.I. mediante el patrón `ToolAdapter / ToolRegistry`.

## 1. Conceptos Clave

| Concepto | Descripción |
|----------|-------------|
| **ToolFunction** | Función TypeScript que implementa la lógica de la herramienta. Firma: `(args:any)=>any \| Promise<any>`. |
| **ToolMetadata** | Metadatos en formato JSON Schema con `name`, `description` y `parameters`. Se envían al LLM para que sepa cómo invocar la función. |
| **ToolRegistryService** | Servicio singleton que almacena el mapa `name → function` y la lista de metadatos. |
| **ToolAdapter** | Interfaz que abstrae registro/ejecución; `DefaultToolAdapterService` es la implementación por defecto. |
| **ToolRegistrar** | Pequeños servicios que agrupan un conjunto de herramientas y las registran en el `ToolAdapter`. |

![Diagrama](https://mermaid.ink/img/pako:eNpdj0kOgjAQhf-LniXTiX4qWayF3Y0JYyjQIfcohXWjRmpb9OKe3bTfm0P3zwfy3R7CfHq42tSijkR-J30lj2qtXk_adcwjJzJRi5bXKSaiwwAgXRiTUoASzU0t8IF4U2ritXqlKfrU8H0EXjzfnEKHeMKfCiM9I0EekF90h0jGCIj3-NPVMPoapfRY5hXyhs4YLh_hUJ9QKPbmnA4l5HtZJ_3VhWKd-BXpowqKg)

## 2. Flujo de Registro al Arranque
1. `SharedModule` declara el token multi-provider `TOOL_REGISTRARS` y agrega el **APP_INITIALIZER** `TOOL_REGISTRARS_INITIALIZER`.
2. Cada servicio que implemente `ToolRegistrar` (p.ej. `SalesToolsRegistrarService`) se registra en el token multi.
3. Al iniciar la app, el initializer inyecta la lista de registradores y el `TOOL_ADAPTER`; luego llama `registrar.register(adapter)`.
4. Cada registrador invoca `adapter.registerTool(meta, fn)` para todas sus herramientas.

## 3. Cómo Añadir un Nuevo Conjunto de Herramientas

1. **Crear el servicio registrador** (ejemplo `crm-tools-registrar.service.ts`):

```ts
@Injectable({ providedIn: 'root' })
export class CrmToolsRegistrarService implements ToolRegistrar {
  constructor(private customerService: CustomerService) {}

  register(adapter: ToolAdapter): void {
    adapter.registerTool(
      {
        name: 'findCustomerByEmail',
        description: 'Devuelve la información de un cliente a partir de su email',
        parameters: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' }
          },
          required: ['email']
        }
      },
      async ({ email }) => this.customerService.getByEmail(email)
    );
  }
}
```

2. **Añadir el provider multi** en su módulo (o en `SharedModule`):

```ts
providers: [
  { provide: TOOL_REGISTRARS, useExisting: CrmToolsRegistrarService, multi: true }
]
```

3. **¡Listo!** Al reiniciar la app, la herramienta quedará disponible para el modelo.

## 4. Buenas Prácticas
* **Nombres únicos**: Evitar colisiones; el `ToolRegistry` arrojará error si el nombre ya existe.
* **Outputs normalizados**: Devuelve siempre `{ success, data?, error? }`.
* **Validaciones**: Valida los argumentos dentro de la función por seguridad.
* **Funciones puras**: Evita efectos secundarios inesperados; si necesitas navegar o modificar estado, documéntalo bien.

## 5. Preguntas Frecuentes
**¿Cómo envío la lista de herramientas al LLM?**  
`FloatingButtonComponent` solicita `toolAdapter.getToolsMetadata()` y lo publica vía `session.update` al abrir el canal.

**¿Puedo registrar herramientas en tiempo de ejecución?**  
Sí. Las llamadas a `adapter.registerTool` funcionan después del arranque; el LLM debe recibir un nuevo `session.update` con la lista actualizada para “descubrir” las herramientas añadidas.

---

Actualizado: {{DATE}} 