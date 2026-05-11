# Reporte de Restauración y Migración de Base de Datos MySQL en AWS RDS

## Resumen Ejecutivo

**Fecha:** 26 de Enero de 2026
**Base de datos:** imsdb
**Motor:** MySQL 8.0.43
**Región:** us-east-1 (Norte de Virginia)

---

## 1. Trabajo Realizado

### 1.1 Restauración de Base de Datos desde S3

Se restauró exitosamente la base de datos `imsdb` desde un backup almacenado en S3.

| Parámetro | Valor |
|-----------|-------|
| **Bucket S3** | `s3://julsmind-s3/ims/imsdb/` |
| **Archivos SQL** | 44 archivos .sql |
| **Tamaño total BD** | 590.97 MB |
| **Endpoint RDS** | `database-1.ce1iww22suyi.us-east-1.rds.amazonaws.com` |
| **Puerto** | 3306 |
| **Usuario** | admin |
| **Base de datos** | imsdb |

### 1.2 Optimización de Costos

Se redujo significativamente el costo mensual cambiando el tipo de instancia:

| Aspecto | Antes | Después | Ahorro |
|---------|-------|---------|--------|
| **Tipo de instancia** | db.m5.large | db.t3.micro | - |
| **vCPUs** | 2 | 2 | - |
| **RAM** | 8 GiB | 1 GiB | - |
| **Costo mensual** | ~$123 USD | ~$12 USD | **~$111 USD (90%)** |
| **Performance Insights** | Habilitado | Deshabilitado | - |

### 1.3 Cadena de Conexión Final

```javascript
// Node.js - mysql2
const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'database-1.ce1iww22suyi.us-east-1.rds.amazonaws.com',
  port: 3306,
  user: 'admin',
  password: 'A123456+',
  database: 'imsdb'
});

// URL Format
const connectionUrl = 'mysql://admin:A123456+@database-1.ce1iww22suyi.us-east-1.rds.amazonaws.com:3306/imsdb';
```

---

## 2. Tutorial: Migrar RDS MySQL a Otra Cuenta de AWS

Existen varios métodos para migrar una base de datos RDS a otra cuenta de AWS. A continuación se presentan los más recomendados.

### Método 1: Snapshot + Compartir (Recomendado)

Este es el método más simple y seguro para migrar entre cuentas.

#### Paso 1: Crear un Snapshot en la Cuenta Origen

```bash
# En AWS CLI de la cuenta origen
aws rds create-db-snapshot \
    --db-instance-identifier database-1 \
    --db-snapshot-identifier imsdb-migration-snapshot \
    --region us-east-1
```

**En la Consola AWS:**
1. Ir a **RDS > Bases de datos > database-1**
2. Click en **Acciones > Tomar instantánea**
3. Nombre: `imsdb-migration-snapshot`
4. Click en **Tomar instantánea**
5. Esperar a que el estado sea "Disponible"

#### Paso 2: Compartir el Snapshot con la Cuenta Destino

```bash
# Obtener el ID de la cuenta destino (12 dígitos)
# Ejemplo: 123456789012

aws rds modify-db-snapshot-attribute \
    --db-snapshot-identifier imsdb-migration-snapshot \
    --attribute-name restore \
    --values-to-add 123456789012 \
    --region us-east-1
```

**En la Consola AWS:**
1. Ir a **RDS > Instantáneas**
2. Seleccionar `imsdb-migration-snapshot`
3. Click en **Acciones > Compartir instantánea**
4. Seleccionar **Privado**
5. Ingresar el **ID de cuenta AWS destino** (12 dígitos)
6. Click en **Guardar**

#### Paso 3: Copiar el Snapshot en la Cuenta Destino

**En la cuenta destino:**

```bash
# Iniciar sesión en la cuenta destino
aws rds copy-db-snapshot \
    --source-db-snapshot-identifier arn:aws:rds:us-east-1:CUENTA_ORIGEN:snapshot:imsdb-migration-snapshot \
    --target-db-snapshot-identifier imsdb-copied-snapshot \
    --region us-east-1
```

**En la Consola AWS (cuenta destino):**
1. Ir a **RDS > Instantáneas**
2. Cambiar a pestaña **Compartidas conmigo**
3. Seleccionar el snapshot compartido
4. Click en **Acciones > Copiar instantánea**
5. Nombre: `imsdb-copied-snapshot`
6. Click en **Copiar instantánea**

#### Paso 4: Restaurar la Base de Datos desde el Snapshot

```bash
aws rds restore-db-instance-from-db-snapshot \
    --db-instance-identifier database-1-new \
    --db-snapshot-identifier imsdb-copied-snapshot \
    --db-instance-class db.t3.micro \
    --region us-east-1
```

**En la Consola AWS:**
1. Seleccionar el snapshot copiado
2. Click en **Acciones > Restaurar instantánea**
3. Configurar:
   - **Identificador:** `database-1-new`
   - **Clase de instancia:** db.t3.micro
   - **Almacenamiento:** gp3, 200 GiB
   - **VPC:** Seleccionar la VPC destino
   - **Acceso público:** Sí (si es necesario)
4. Click en **Restaurar instancia de BD**

#### Paso 5: Configurar Seguridad

```bash
# Crear/modificar grupo de seguridad para permitir MySQL
aws ec2 authorize-security-group-ingress \
    --group-id sg-xxxxxxxxx \
    --protocol tcp \
    --port 3306 \
    --cidr 0.0.0.0/0
```

---

### Método 2: Exportar a S3 + Importar (Para bases de datos grandes)

#### Paso 1: Exportar Snapshot a S3 (Cuenta Origen)

```bash
# Crear bucket S3 para exportación
aws s3 mb s3://mi-bucket-migracion-rds --region us-east-1

# Crear rol IAM para exportación
aws iam create-role \
    --role-name rds-s3-export-role \
    --assume-role-policy-document file://trust-policy.json

# Exportar snapshot a S3
aws rds start-export-task \
    --export-task-identifier imsdb-export \
    --source-arn arn:aws:rds:us-east-1:CUENTA:snapshot:imsdb-migration-snapshot \
    --s3-bucket-name mi-bucket-migracion-rds \
    --iam-role-arn arn:aws:iam::CUENTA:role/rds-s3-export-role \
    --kms-key-id arn:aws:kms:us-east-1:CUENTA:key/KEY_ID
```

#### Paso 2: Compartir Bucket S3 con Cuenta Destino

Agregar política al bucket:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::CUENTA_DESTINO:root"
            },
            "Action": [
                "s3:GetObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::mi-bucket-migracion-rds",
                "arn:aws:s3:::mi-bucket-migracion-rds/*"
            ]
        }
    ]
}
```

#### Paso 3: Importar en Cuenta Destino

En la cuenta destino, copiar los datos y restaurar usando el método de mysqldump o AWS DMS.

---

### Método 3: mysqldump + Importación Manual

Este método es útil para bases de datos pequeñas/medianas (<10 GB).

#### Paso 1: Exportar con mysqldump

```bash
# Desde una instancia EC2 o CloudShell
mysqldump -h database-1.ce1iww22suyi.us-east-1.rds.amazonaws.com \
    -u admin -p \
    --single-transaction \
    --routines \
    --triggers \
    --databases imsdb > imsdb_backup.sql
```

#### Paso 2: Comprimir y Subir a S3

```bash
# Comprimir
gzip imsdb_backup.sql

# Subir a S3
aws s3 cp imsdb_backup.sql.gz s3://mi-bucket-migracion/
```

#### Paso 3: Crear Nueva Instancia RDS en Cuenta Destino

```bash
aws rds create-db-instance \
    --db-instance-identifier database-1-new \
    --db-instance-class db.t3.micro \
    --engine mysql \
    --engine-version 8.0.43 \
    --master-username admin \
    --master-user-password 'NuevaContraseña123+' \
    --allocated-storage 200 \
    --storage-type gp3 \
    --publicly-accessible \
    --region us-east-1
```

#### Paso 4: Importar Datos

```bash
# Descargar backup
aws s3 cp s3://mi-bucket-migracion/imsdb_backup.sql.gz .

# Descomprimir
gunzip imsdb_backup.sql.gz

# Importar
mysql -h NUEVO_ENDPOINT_RDS -u admin -p < imsdb_backup.sql
```

---

### Método 4: AWS Database Migration Service (DMS)

Para migraciones en vivo con mínimo downtime.

#### Paso 1: Crear Instancia de Replicación

```bash
aws dms create-replication-instance \
    --replication-instance-identifier mi-instancia-dms \
    --replication-instance-class dms.t3.medium \
    --allocated-storage 50 \
    --region us-east-1
```

#### Paso 2: Crear Endpoints

**Endpoint Origen:**
```bash
aws dms create-endpoint \
    --endpoint-identifier origen-mysql \
    --endpoint-type source \
    --engine-name mysql \
    --server-name database-1.ce1iww22suyi.us-east-1.rds.amazonaws.com \
    --port 3306 \
    --username admin \
    --password 'A123456+'
```

**Endpoint Destino:**
```bash
aws dms create-endpoint \
    --endpoint-identifier destino-mysql \
    --endpoint-type target \
    --engine-name mysql \
    --server-name NUEVO_ENDPOINT_RDS \
    --port 3306 \
    --username admin \
    --password 'NuevaContraseña'
```

#### Paso 3: Crear y Ejecutar Tarea de Migración

```bash
aws dms create-replication-task \
    --replication-task-identifier migracion-imsdb \
    --source-endpoint-arn arn:aws:dms:...:endpoint:origen-mysql \
    --target-endpoint-arn arn:aws:dms:...:endpoint:destino-mysql \
    --replication-instance-arn arn:aws:dms:...:rep:mi-instancia-dms \
    --migration-type full-load-and-cdc \
    --table-mappings file://table-mappings.json
```

---

## 3. Comparación de Métodos

| Método | Tiempo | Complejidad | Downtime | Costo | Recomendado para |
|--------|--------|-------------|----------|-------|------------------|
| **Snapshot + Compartir** | 30 min - 2 hrs | Baja | Bajo | Gratis | Bases pequeñas/medianas |
| **Exportar a S3** | 1 - 4 hrs | Media | Medio | ~$0.05/GB | Bases grandes |
| **mysqldump** | 1 - 3 hrs | Baja | Alto | Gratis | Bases < 10 GB |
| **AWS DMS** | Variable | Alta | Mínimo | ~$0.20/hr | Producción, cero downtime |

---

## 4. Checklist Post-Migración

- [ ] Verificar conexión a la nueva instancia RDS
- [ ] Validar integridad de datos (count de tablas)
- [ ] Actualizar cadenas de conexión en aplicaciones
- [ ] Configurar grupos de seguridad
- [ ] Configurar backups automáticos
- [ ] Probar aplicación con nueva base de datos
- [ ] Eliminar recursos de la cuenta origen (opcional)
- [ ] Documentar nuevo endpoint y credenciales

---

## 5. Información de la Base de Datos Actual

### Tablas Restauradas

```
imsdb (590.97 MB total)
├── company
├── deal
├── status
├── tariff
├── ticket
├── type_device
├── type_free_time
├── type_period_duration
├── type_rule
├── type_tariff
├── type_ticket
├── type_vehicle
├── user
├── user_permissions
├── user_role
├── user_role_permissions
├── zone
├── zone_tariff
└── ... (44 tablas total)
```

### Costos Actuales (Optimizados)

| Recurso | Especificación | Costo Mensual |
|---------|----------------|---------------|
| RDS db.t3.micro | 2 vCPU, 1 GB RAM | ~$12 |
| Almacenamiento gp3 | 200 GB | ~$16 |
| **Total estimado** | | **~$28/mes** |

---

## 6. Contacto y Soporte

Para asistencia adicional con la migración:
- Documentación AWS RDS: https://docs.aws.amazon.com/rds/
- AWS DMS: https://docs.aws.amazon.com/dms/

---

*Documento generado automáticamente - Enero 2026*
