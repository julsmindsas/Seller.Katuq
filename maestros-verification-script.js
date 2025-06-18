// 🧪 SCRIPT DE VERIFICACIÓN: Carga Automática de Maestros
// Copia y pega este código en la consola del navegador después de hacer login

// 1. Verificar estado de inicialización
window.checkMaestrosAutoLoad = function() {
  try {
    const authService = window.ng?.getInjector()?.get('AuthService');
    const initService = window.ng?.getInjector()?.get('InitializationService');
    const pedidosService = window.ng?.getInjector()?.get('PedidosUtilService');
    
    console.log('🔍 VERIFICANDO CARGA AUTOMÁTICA DE MAESTROS:');
    console.log('==========================================');
    
    // Usuario logueado
    const user = localStorage.getItem('user');
    const loginTime = localStorage.getItem('loginTime');
    console.log('👤 Usuario logueado:', !!user);
    console.log('⏰ Tiempo de login:', loginTime ? new Date(loginTime).toLocaleString() : 'No disponible');
    
    // Estado de inicialización
    if (initService) {
      console.log('🏗️ Inicialización completada:', initService.isInitializationCompleted());
      console.log('🔄 Inicialización en progreso:', initService.isInitializationInProgress());
    } else {
      console.log('❌ InitializationService no disponible');
    }
    
    // Estado de maestros
    if (pedidosService) {
      pedidosService.getMaestrosState().pipe(rxjs.operators.take(1)).subscribe(state => {
        console.log('📊 Estado de maestros:', {
          loading: state.loading,
          loaded: state.loaded,
          error: state.error,
          lastUpdate: state.lastUpdate ? new Date(state.lastUpdate).toLocaleString() : null
        });
        
        if (state.loaded && !state.error) {
          console.log('✅ Los maestros se cargaron automáticamente después del login');
        } else if (state.error) {
          console.log('❌ Error en la carga automática de maestros');
        } else if (state.loading) {
          console.log('🔄 Los maestros se están cargando automáticamente...');
        } else {
          console.log('⚠️ Los maestros no se han cargado automáticamente');
        }
      });
    } else {
      console.log('❌ PedidosUtilService no disponible');
    }
    
    return 'Verificación completada - revisa los logs arriba ☝️';
  } catch (error) {
    console.error('❌ Error en verificación:', error);
    return 'Error en verificación';
  }
};

// 2. Función para verificar datos cargados
window.checkMaestrosData = function() {
  try {
    const pedidosService = window.ng?.getInjector()?.get('PedidosUtilService');
    
    if (pedidosService) {
      pedidosService.getAllMaestro$().pipe(rxjs.operators.take(1)).subscribe(data => {
        console.log('📦 DATOS DE MAESTROS CARGADOS:');
        console.log('=============================');
        console.log('- Formas de entrega:', data.formaEntrega?.length || 0);
        console.log('- Tipos de entrega:', data.tipoEntrega?.length || 0);
        console.log('- Tiempos de entrega:', data.tiempoEntrega?.length || 0);
        console.log('- Géneros:', data.generos?.length || 0);
        console.log('- Ocasiones:', data.ocasiones?.length || 0);
        console.log('- Categorías:', data.categorias?.length || 0);
        console.log('- Adiciones:', data.adiciones?.length || 0);
        console.log('- Formas de pago:', data.formasPago?.length || 0);
        console.log('🏢 Empresa actual:', data.empresaActual?.nomComercial || 'No definida');
        
        const totalItems = (data.formaEntrega?.length || 0) + 
                          (data.tipoEntrega?.length || 0) + 
                          (data.generos?.length || 0) + 
                          (data.ocasiones?.length || 0) + 
                          (data.categorias?.length || 0) + 
                          (data.adiciones?.length || 0);
        
        console.log(`📊 Total de elementos cargados: ${totalItems}`);
        
        if (totalItems > 0) {
          console.log('✅ Los maestros tienen datos cargados correctamente');
        } else {
          console.log('⚠️ Los maestros están vacíos o no se han cargado');
        }
      });
    } else {
      console.log('❌ PedidosUtilService no disponible');
    }
    
    return 'Datos verificados - revisa los logs arriba ☝️';
  } catch (error) {
    console.error('❌ Error verificando datos:', error);
    return 'Error verificando datos';
  }
};

// 3. Función para forzar recarga manual
window.forceReloadMaestros = function() {
  try {
    const pedidosService = window.ng?.getInjector()?.get('PedidosUtilService');
    
    if (pedidosService) {
      console.log('🔄 Forzando recarga de maestros...');
      pedidosService.forceReloadMaestros().subscribe({
        next: () => {
          console.log('✅ Recarga completada');
          setTimeout(() => {
            window.checkMaestrosData();
          }, 1000);
        },
        error: (error) => {
          console.error('❌ Error en recarga:', error);
        }
      });
    } else {
      console.log('❌ PedidosUtilService no disponible');
    }
    
    return 'Recarga iniciada...';
  } catch (error) {
    console.error('❌ Error iniciando recarga:', error);
    return 'Error iniciando recarga';
  }
};

// 4. Función para probar todo el sistema
window.fullMaestrosTest = function() {
  console.log('🧪 INICIANDO PRUEBA COMPLETA DEL SISTEMA DE MAESTROS');
  console.log('==================================================');
  
  setTimeout(() => {
    console.log('\n1. Verificando carga automática...');
    window.checkMaestrosAutoLoad();
  }, 100);
  
  setTimeout(() => {
    console.log('\n2. Verificando datos cargados...');
    window.checkMaestrosData();
  }, 1000);
  
  setTimeout(() => {
    console.log('\n3. Verificando caché...');
    const empresaStr = sessionStorage.getItem("currentCompany");
    const empresa = empresaStr ? JSON.parse(empresaStr) : {};
    const cacheKey = `pedidos_maestros_${empresa?.nomComercial}`;
    console.log('🗄️ Clave de caché:', cacheKey);
    console.log('🗄️ Datos en sessionStorage:', !!empresaStr);
  }, 2000);
  
  return 'Prueba completa iniciada...';
};

// Instrucciones
console.log('🧪 FUNCIONES DE VERIFICACIÓN DE MAESTROS CARGADAS:');
console.log('=================================================');
console.log('');
console.log('📋 FUNCIONES DISPONIBLES:');
console.log('- checkMaestrosAutoLoad()  → ¿Se cargan automáticamente?');
console.log('- checkMaestrosData()      → ¿Qué datos están cargados?');
console.log('- forceReloadMaestros()    → Forzar recarga manual');
console.log('- fullMaestrosTest()       → Prueba completa del sistema');
console.log('');
console.log('💡 EMPEZAR CON: checkMaestrosAutoLoad()');
console.log('');
console.log('🔍 PASOS PARA VERIFICAR:');
console.log('1. Asegúrate de haber hecho login');
console.log('2. Ejecuta: checkMaestrosAutoLoad()');
console.log('3. Si los maestros no se cargaron, ejecuta: forceReloadMaestros()');
console.log('4. Verifica los datos con: checkMaestrosData()'); 