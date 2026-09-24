## ADDED Requirements

### Requirement: El registro pide "Cédula o NIT" y acepta cédulas cortas
El formulario público de registro SHALL nombrar el campo "Cédula o NIT", SHALL decir que quien no tiene NIT puede poner su cédula y SHALL aceptar documentos numéricos de 6 a 11 dígitos.

#### Scenario: Cédula de 7 dígitos
- **WHEN** la persona escribe una cédula de 7 dígitos y continúa
- **THEN** el formulario avanza sin error

#### Scenario: Documento con menos de 6 dígitos o con letras
- **WHEN** la persona escribe menos de 6 dígitos o un valor con letras
- **THEN** el formulario no avanza y dice que el documento debe tener entre 6 y 11 números

### Requirement: Aviso amable ante un documento que parece inventado
Cuando el documento parece inventado, el formulario SHALL mostrar un aviso junto al campo que invite a revisarlo y SHALL permitir continuar sin cambiarlo. Un documento parece inventado cuando todos sus dígitos son iguales o cuando contiene una serie ascendente o descendente de 7 o más dígitos seguidos.

#### Scenario: Serie ascendente
- **WHEN** la persona escribe 123456778
- **THEN** ve el aviso "¿Seguro que es tu número?" y puede continuar igual

#### Scenario: Número normal
- **WHEN** la persona escribe 43123456
- **THEN** no ve ningún aviso

### Requirement: Registro con documento por confirmar
Cuando el documento parece inventado y no es un NIT con dígito de verificación válido, el sistema SHALL crear la cuenta igual y SHALL marcar la empresa como "documento por confirmar", con el motivo. El sistema SHALL NOT subir por esta razón el riesgo con el que el control contra registros falsos decide revisión o rechazo.

#### Scenario: Documento inventado
- **WHEN** se completa un registro con el documento 123456778
- **THEN** la cuenta se crea igual, la empresa queda marcada como "documento por confirmar" con motivo "serie", y la decisión del control contra registros falsos es la misma que sin la marca

#### Scenario: NIT válido con una serie adentro
- **WHEN** se completa un registro con un NIT cuyo dígito de verificación es válido, aunque contenga una serie
- **THEN** la empresa no queda marcada

### Requirement: El equipo ve la marca
El aviso interno de registro nuevo SHALL mostrar cuando el documento está por confirmar, para que ese registro se pueda separar de los confirmados en los reportes.

#### Scenario: Aviso con documento por confirmar
- **WHEN** llega el aviso interno de un registro con documento por confirmar
- **THEN** el aviso lo muestra junto al estado de la cuenta
