## MODIFIED Requirements

### Requirement: Perfil visible y explicable
La hoja "Ajustar" de una propuesta de despachos SHALL mostrar en una línea lo que el perfil detectó, por ejemplo "Despachas con 4 mensajeros, en grupos de unos 6 pedidos, en 2 franjas". Así la persona entiende de dónde salen las sugerencias. El perfil MUST NOT incluir datos de clientes.

#### Scenario: Persona revisa el perfil
- **WHEN** la persona abre "Ajustar" en una tarjeta de despachos
- **THEN** ve la línea del perfil, con cifras que coinciden con la historia de su comercio
