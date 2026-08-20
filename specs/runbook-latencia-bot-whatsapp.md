# Runbook — medir la latencia del bot de WhatsApp

Método acordado entre la sesión del bot y la de Opttia/KAI (2026-08-19, D-215)
como **estándar** para medir cualquier cambio que toque el camino del turno:
pooling de sesiones MCP, recorte de herramientas, cambio de modelo, merges.

## La trampa que este runbook evita

Ya pasó dos veces: se compara la latencia de HOY contra logs de hace días y se
culpa al cambio equivocado. **La línea base tiene que ser del MISMO código**,
medida en la misma máquina, con los mismos cuatro escenarios. Si no hay
línea base, se mide ANTES de tocar nada.

## Por qué cuatro escenarios y no un promedio

Un promedio esconde lo único que importa: cuánto cuesta la **base** (prompt +
esquemas de herramientas, que viajan siempre) y cuánto cuesta **cada consulta
al catálogo por MCP**. Separarlos es lo que reveló que el peso estaba en MCP
y no en el prompt.

| escenario | qué aísla |
|---|---|
| 1. frío (primera invocación tras reinicio) | arranque; se DESCARTA del análisis |
| 2. hilo nuevo + saludo (no obliga a buscar) | costo de la BASE |
| 3. hilo nuevo + pregunta que obliga a buscar | base + UNA consulta MCP |
| 4. hilo en curso (responde de memoria) | turno sin herramientas |

`escenario 3 − escenario 2` ≈ **costo de una consulta MCP**. Ese es el número
que el pooling debe bajar (objetivo pactado: de ~4 s a <1 s en turnos tibios).

## Cómo se corre (en la EC2 de producción)

```bash
cd /home/ubuntu/kai
TOKEN=$(grep -E '^WHATSAPP_BOT_TOKEN=' adk_agent/.env | cut -d= -f2)

turno () {  # $1 = hilo (64 chars EXACTOS), $2 = texto, $3 = etiqueta
  curl -s -m 90 -X POST http://127.0.0.1:8080/v1/whatsapp-bot/turno \
    -H 'Content-Type: application/json' -H "X-Bot-Token: $TOKEN" \
    -d "{\"company\":\"ALMARA FELICIDAD\",\"hilo\":\"$1\",\"texto\":\"$2\",\"mensajeId\":\"wamid.MED-$3\"}" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin).get("duracionMs"), "ms")'
}

H_SALUDO=$(printf 's%.0s' $(seq 1 63))1     # escenario 2
H_BUSCA=$(printf 'q%.0s' $(seq 1 63))1      # escenario 3

turno "$H_SALUDO" "buenas tardes"      s1   # 1: frío (descartar)
turno "$H_SALUDO" "buenas tardes"      s2   # 2: BASE  ← hilo distinto cada corrida
turno "$H_BUSCA"  "que peluches tienes?" s3 # 3: base + MCP
turno "$H_BUSCA"  "gracias"            s4   # 4: de memoria
```

**Ojo con el hilo:** son 64 caracteres exactos o el endpoint responde
`hilo_invalido` (422) y `duracionMs` vuelve vacío — si ves `None`, es eso, no
un problema del servidor. Y usá hilos NUEVOS en cada corrida: un hilo reusado
responde de memoria y mide otra cosa.

## Verificación mínima que acompaña toda medición

```bash
curl -s localhost:8080/v1/whatsapp-bot/salud     # configurado:true = el token sobrevivió
python3 adk_agent/tests/test_whatsapp_bot_channel.py   # suite del canal
```

## Referencia medida (base `42ab332`, 2026-08-19)

| escenario | ms |
|---|---|
| 1. frío | 11.642 |
| 2. base (saludo) | 4.203 |
| 3. base + consulta al catálogo | 7.658 – 8.173 |
| 4. de memoria | 3.373 – 3.563 |

Consulta MCP ≈ **4 s**. Antes del merge de `feat/claude-agent-sdk` la misma
tabla daba 26.483 / 13.571 / 19.360 — ese merge aceleró el canal ~3x.

## Limpieza

Las corridas dejan sesiones de ADK en Firestore con esos hilos de prueba
(`sssss…`, `qqqqq…`). No tocan datos de negocio y expiran solas; si molestan,
se borran de la subcolección de sesiones del canal.
