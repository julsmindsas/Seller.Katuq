#!/bin/bash

# Test Tool Catalog Integration
# Este script verifica que la integración del catálogo de herramientas funcione correctamente

echo "🧪 Testing Tool Catalog Integration"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Verificar que KAI esté corriendo
echo "📡 Test 1: Verificando KAI Service (puerto 3891)..."
if curl -s http://localhost:3891/agent-builder/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ KAI Service está corriendo${NC}"
else
    echo -e "${RED}❌ KAI Service NO está corriendo en puerto 3891${NC}"
    echo "   Iniciar con: cd /Users/danielga/Downloads/kai/functions && npm run serve"
fi
echo ""

# Test 2: Verificar que Katuq Backend esté corriendo
echo "📡 Test 2: Verificando Katuq Backend (puerto 3300)..."
if curl -s http://localhost:3300/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Katuq Backend está corriendo${NC}"
else
    echo -e "${RED}❌ Katuq Backend NO está corriendo en puerto 3300${NC}"
    echo "   Iniciar con: cd /Users/danielga/Downloads/Seller.Katuq/katuq_admin_back_firebase/functions && npm run start-express"
fi
echo ""

# Test 3: Verificar endpoint del catálogo en KAI
echo "🔍 Test 3: Verificando endpoint de KAI directamente..."
KAI_RESPONSE=$(curl -s http://localhost:3891/agent-builder/catalog/tools)
if echo "$KAI_RESPONSE" | grep -q "getTotalSales"; then
    echo -e "${GREEN}✅ KAI retorna catálogo de herramientas${NC}"
    TOOL_COUNT=$(echo "$KAI_RESPONSE" | grep -o "name" | wc -l)
    echo "   Total de herramientas: $TOOL_COUNT"
else
    echo -e "${RED}❌ KAI NO retorna catálogo correctamente${NC}"
    echo "   Respuesta: $KAI_RESPONSE"
fi
echo ""

# Test 4: Verificar endpoint proxy en Katuq Backend
echo "🔍 Test 4: Verificando endpoint proxy en Katuq Backend..."
KATUQ_RESPONSE=$(curl -s -H "company: test-company" http://localhost:3300/v1/agent-builder/catalog/tools)
if echo "$KATUQ_RESPONSE" | grep -q "getTotalSales"; then
    echo -e "${GREEN}✅ Katuq Backend proxea correctamente a KAI${NC}"

    # Verificar estructura de respuesta
    if echo "$KATUQ_RESPONSE" | grep -q '"success":true'; then
        echo -e "${GREEN}✅ Estructura de respuesta correcta (success: true)${NC}"
    fi

    if echo "$KATUQ_RESPONSE" | grep -q '"data":\['; then
        echo -e "${GREEN}✅ Estructura de respuesta correcta (data array)${NC}"
    fi

    # Contar herramientas por departamento
    SALES_COUNT=$(echo "$KATUQ_RESPONSE" | grep -o '"department":"sales"' | wc -l)
    INVENTORY_COUNT=$(echo "$KATUQ_RESPONSE" | grep -o '"department":"inventory"' | wc -l)
    LOGISTICS_COUNT=$(echo "$KATUQ_RESPONSE" | grep -o '"department":"logistics"' | wc -l)

    echo "   Sales tools: $SALES_COUNT"
    echo "   Inventory tools: $INVENTORY_COUNT"
    echo "   Logistics tools: $LOGISTICS_COUNT"
else
    echo -e "${RED}❌ Katuq Backend NO proxea correctamente${NC}"
    echo "   Respuesta: $KATUQ_RESPONSE"
fi
echo ""

# Test 5: Verificar que frontend Angular esté compilado
echo "🏗️  Test 5: Verificando build del frontend..."
if [ -d "dist/cuba" ]; then
    echo -e "${GREEN}✅ Frontend Angular compilado (dist/cuba existe)${NC}"

    # Verificar que los archivos modificados estén en el bundle
    if [ -f "dist/cuba/main.js" ]; then
        echo -e "${GREEN}✅ Bundle principal generado${NC}"
    fi
else
    echo -e "${RED}❌ Frontend NO está compilado${NC}"
    echo "   Compilar con: npm run build"
fi
echo ""

# Test 6: Verificar cambios en archivos TypeScript
echo "📝 Test 6: Verificando cambios en archivos fuente..."

if grep -q "transformToCatalog" "src/app/modules/agent-builder/shared/services/tool-catalog.service.ts"; then
    echo -e "${GREEN}✅ tool-catalog.service.ts incluye método transformToCatalog${NC}"
else
    echo -e "${RED}❌ tool-catalog.service.ts NO incluye transformToCatalog${NC}"
fi

if grep -q "parameters?: string\[\]" "src/app/modules/agent-builder/shared/models/tool.model.ts"; then
    echo -e "${GREEN}✅ tool.model.ts actualizado (parameters: string[])${NC}"
else
    echo -e "${RED}❌ tool.model.ts NO actualizado${NC}"
fi

if grep -q "Falling back to mock catalog" "src/app/modules/agent-builder/wizard/wizard.component.ts"; then
    echo -e "${GREEN}✅ wizard.component.ts incluye fallback a mock${NC}"
else
    echo -e "${RED}❌ wizard.component.ts NO incluye fallback${NC}"
fi
echo ""

# Resumen
echo "===================================="
echo "📊 Resumen de Tests"
echo "===================================="
echo ""
echo "Para probar la integración completa:"
echo "1. Asegúrate de que todos los servicios estén corriendo"
echo "2. Inicia el frontend: npm start"
echo "3. Navega a: http://localhost:4200/agent-builder/wizard"
echo "4. Abre DevTools Console y busca logs:"
echo "   - [WizardComponent] Loading tool catalog from backend..."
echo "   - [ToolCatalogService] Catalog transformed: {sales: 5, ...}"
echo "   - [WizardComponent] Tool catalog loaded successfully"
echo ""
echo "5. En el paso 3 del wizard, verifica que las herramientas sean:"
echo "   Sales: getTotalSales, getTopProducts, getCustomerInfo, getOrdersByStatus, getSalesStats"
echo "   Inventory: getProductStock, checkLowStock, getProductCatalog"
echo "   Logistics: getReadyOrders, getShippingStatus"
echo ""
echo -e "${YELLOW}⚠️  Si algún test falló, consulta INTEGRATION_VERIFICATION.md${NC}"
