import { Component, ElementRef, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { Analyser } from '../analyser';
import * as THREE from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { fs as backdropFS, vs as backdropVS } from '../backdrop-shader';
import { vs as sphereVS } from '../sphere-shader';

// Interfaces para las herramientas de Katuq
export interface KatuqToolEvent {
  toolName: string;
  stepName?: string;
  data?: any;
  success?: boolean;
  message?: string;
}

export interface ToolVisualConfig {
  color: THREE.Color;
  animation: string;
  particleCount: number;
  scale: number;
  rotationSpeed: number;
  glowIntensity: number;
}

@Component({
  selector: 'app-visual3d',
  templateUrl: './visual3d.component.html',
  styleUrls: ['./visual3d.component.scss']
})
export class Visual3dComponent implements OnInit, OnChanges {
  @Input() inputNode!: AudioNode;
  @Input() outputNode!: AudioNode;
  @Input() katuqToolEvent?: KatuqToolEvent;

  @ViewChild('canvas', { static: true }) private canvasRef!: ElementRef<HTMLCanvasElement>;

  private inputAnalyser!: Analyser;
  private outputAnalyser!: Analyser;
  private camera!: THREE.PerspectiveCamera;
  private backdrop!: THREE.Mesh;
  private composer!: EffectComposer;
  private sphere!: THREE.Mesh;
  private prevTime = 0;
  private rotation = new THREE.Vector3(0, 0, 0);
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  
  // Nuevas propiedades para reacción a herramientas
  private currentToolConfig?: ToolVisualConfig;
  private toolParticles: THREE.Object3D[] = [];
  private toolAnimationTime = 0;
  private isToolActive = false;

  // Configuraciones visuales para cada herramienta de Katuq
  private toolVisualConfigs: { [key: string]: ToolVisualConfig } = {
    // Herramientas de Bodegas
    'listWarehouses': {
      color: new THREE.Color(0x4CAF50), // Verde
      animation: 'pulse',
      particleCount: 30,
      scale: 1.2,
      rotationSpeed: 0.5,
      glowIntensity: 0.3
    },
    'selectWarehouse': {
      color: new THREE.Color(0x2196F3), // Azul
      animation: 'bounce',
      particleCount: 50,
      scale: 1.5,
      rotationSpeed: 1.0,
      glowIntensity: 0.5
    },

    // Herramientas de Productos
    'searchProductsAdvanced': {
      color: new THREE.Color(0xFF9800), // Naranja
      animation: 'rotate',
      particleCount: 60,
      scale: 1.3,
      rotationSpeed: 1.5,
      glowIntensity: 0.4
    },
    'addToCart': {
      color: new THREE.Color(0x9C27B0), // Púrpura
      animation: 'wave',
      particleCount: 40,
      scale: 1.1,
      rotationSpeed: 0.8,
      glowIntensity: 0.6
    },
    'quickAddToCart': {
      color: new THREE.Color(0x607D8B), // Gris
      animation: 'slide',
      particleCount: 45,
      scale: 1.4,
      rotationSpeed: 1.2,
      glowIntensity: 0.7
    },
    'getCartContents': {
      color: new THREE.Color(0xE91E63), // Rosa
      animation: 'glow',
      particleCount: 35,
      scale: 1.0,
      rotationSpeed: 0.6,
      glowIntensity: 0.8
    },

    // Herramientas de Clientes
    'searchClient': {
      color: new THREE.Color(0x00BCD4), // Cyan
      animation: 'pulse',
      particleCount: 25,
      scale: 1.1,
      rotationSpeed: 0.7,
      glowIntensity: 0.4
    },
    'quickCreateClient': {
      color: new THREE.Color(0x8BC34A), // Verde claro
      animation: 'bounce',
      particleCount: 55,
      scale: 1.6,
      rotationSpeed: 1.3,
      glowIntensity: 0.9
    },

    // Herramientas de Facturación
    'configureBilling': {
      color: new THREE.Color(0xFF5722), // Naranja oscuro
      animation: 'glow',
      particleCount: 70,
      scale: 1.2,
      rotationSpeed: 0.9,
      glowIntensity: 0.6
    },
    'getBillingZones': {
      color: new THREE.Color(0x795548), // Marrón
      animation: 'pulse',
      particleCount: 30,
      scale: 1.0,
      rotationSpeed: 0.5,
      glowIntensity: 0.3
    },
    'selectBillingZone': {
      color: new THREE.Color(0x9E9E9E), // Gris medio
      animation: 'wave',
      particleCount: 40,
      scale: 1.3,
      rotationSpeed: 1.1,
      glowIntensity: 0.5
    },

    // Herramientas de Envío
    'configureShipping': {
      color: new THREE.Color(0x3F51B5), // Índigo
      animation: 'slide',
      particleCount: 65,
      scale: 1.4,
      rotationSpeed: 1.4,
      glowIntensity: 0.7
    },
    'getShippingOptions': {
      color: new THREE.Color(0x009688), // Verde azulado
      animation: 'rotate',
      particleCount: 35,
      scale: 1.1,
      rotationSpeed: 0.8,
      glowIntensity: 0.4
    },
    'selectShippingOption': {
      color: new THREE.Color(0x673AB7), // Púrpura oscuro
      animation: 'bounce',
      particleCount: 50,
      scale: 1.5,
      rotationSpeed: 1.2,
      glowIntensity: 0.8
    },

    // Herramientas de Procesamiento
    'getOrderSummary': {
      color: new THREE.Color(0xFFC107), // Amarillo
      animation: 'glow',
      particleCount: 80,
      scale: 1.3,
      rotationSpeed: 1.0,
      glowIntensity: 0.9
    },
    'validateOrderBeforePay': {
      color: new THREE.Color(0xFFEB3B), // Amarillo claro
      animation: 'pulse',
      particleCount: 45,
      scale: 1.2,
      rotationSpeed: 0.9,
      glowIntensity: 0.6
    },
    'processSale': {
      color: new THREE.Color(0xFFD700), // Dorado
      animation: 'celebrate',
      particleCount: 200,
      scale: 2.0,
      rotationSpeed: 3.0,
      glowIntensity: 1.0
    },

    // Herramientas de Estado
    'getDemoStatus': {
      color: new THREE.Color(0x4CAF50), // Verde
      animation: 'pulse',
      particleCount: 20,
      scale: 1.0,
      rotationSpeed: 0.5,
      glowIntensity: 0.3
    },

    // Herramientas Visuales Esféricas
    'createSphereVisual': {
      color: new THREE.Color(0x00BCD4), // Cyan
      animation: 'bounce',
      particleCount: 100,
      scale: 1.8,
      rotationSpeed: 2.0,
      glowIntensity: 0.8
    },
    'showSphereProgress': {
      color: new THREE.Color(0x2196F3), // Azul
      animation: 'rotate',
      particleCount: 75,
      scale: 1.5,
      rotationSpeed: 1.5,
      glowIntensity: 0.7
    },
    'createSphereCelebration': {
      color: new THREE.Color(0xFFD700), // Dorado
      animation: 'celebrate',
      particleCount: 300,
      scale: 2.5,
      rotationSpeed: 4.0,
      glowIntensity: 1.0
    },
    'showSphereNotification': {
      color: new THREE.Color(0xFF5722), // Naranja
      animation: 'pulse',
      particleCount: 30,
      scale: 1.1,
      rotationSpeed: 0.8,
      glowIntensity: 0.5
    }
  };

  constructor() { }

  ngOnInit(): void {
    // Wait for the canvas to be rendered and have dimensions
    setTimeout(() => {
      this.init();
    }, 100);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['inputNode'] && changes['inputNode'].currentValue) {
      this.inputAnalyser = new Analyser(this.inputNode);
    }
    if (changes['outputNode'] && changes['outputNode'].currentValue) {
      this.outputAnalyser = new Analyser(this.outputNode);
    }
    if (changes['katuqToolEvent'] && changes['katuqToolEvent'].currentValue) {
      console.log('🎨 [Visual3D] Evento de herramienta recibido:', changes['katuqToolEvent'].currentValue);
      this.handleKatuqToolEvent(changes['katuqToolEvent'].currentValue);
    }
  }

  private init() {
    const canvas = this.canvasRef.nativeElement;
    
    // Usar toda la pantalla
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Set canvas size to full screen
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.zIndex = '1000';

    this.scene = new THREE.Scene();
    // Fondo sobrio y profesional
    this.scene.background = new THREE.Color(0x1a1a1a);

    const backdrop = new THREE.Mesh(
      new THREE.IcosahedronGeometry(10, 5),
      new THREE.RawShaderMaterial({
        uniforms: {
          resolution: { value: new THREE.Vector2(width, height) },
          rand: { value: 0 },
        },
        vertexShader: backdropVS,
        fragmentShader: backdropFS,
        glslVersion: THREE.GLSL3,
      }),
    );
    backdrop.material.side = THREE.BackSide;
    this.scene.add(backdrop);
    this.backdrop = backdrop;

    const camera = new THREE.PerspectiveCamera(
      75,
      width / height,
      0.1,
      1000,
    );
    camera.position.set(2, -2, 5);
    this.camera = camera;

    // Detectar si es móvil para ajustar calidad
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvasRef.nativeElement,
      antialias: !isMobile, // Desactivar antialiasing en móvil para mejor performance
      powerPreference: isMobile ? 'low-power' : 'high-performance', // Modo bajo consumo en móvil
    });
    this.renderer.setSize(width, height);
    // Limitar pixel ratio en móvil para mejor performance (máximo 1.5 en móvil, 2 en desktop)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));

    const geometry = new THREE.IcosahedronGeometry(1.0, 8); // Tamaño moderado y detalle sutil

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();

    // Material simple y minimalista
    const sphereMaterial = new THREE.MeshStandardMaterial({
      color: 0x6c7b7f,              // Gris azulado suave
      metalness: 0.7,               // Ligeramente metálico
      roughness: 0.3,               // Semi-mate elegante
      transparent: true,
      opacity: 0.8,                 // Translúcido sutil
    });

    // Try to load EXR texture, but don't break if it fails
    try {
      new EXRLoader().load(
        'assets/piz_compressed.exr', 
        (texture: THREE.Texture) => {
          texture.mapping = THREE.EquirectangularReflectionMapping;
          const exrCubeRenderTarget = pmremGenerator.fromEquirectangular(texture);
          sphereMaterial.envMap = exrCubeRenderTarget.texture;
          if (this.sphere) {
            this.sphere.visible = true;
          }
        },
        undefined,
        (error) => {
          console.warn('Could not load EXR texture, using default material:', error);
          if (this.sphere) {
            this.sphere.visible = true;
          }
        }
      );
    } catch (error) {
      console.warn('EXR loader not available, using default material');
      if (this.sphere) {
        this.sphere.visible = true;
      }
    }

    sphereMaterial.onBeforeCompile = (shader) => {
      shader.uniforms['time'] = { value: 0 };
      shader.uniforms['inputData'] = { value: new THREE.Vector4() };
      shader.uniforms['outputData'] = { value: new THREE.Vector4() };

      (sphereMaterial as any).userData.shader = shader;

      shader.vertexShader = sphereVS;
    };

    this.sphere = new THREE.Mesh(geometry, sphereMaterial);
    this.scene.add(this.sphere);
    this.sphere.visible = false;

    // Agregar iluminación sutil y profesional
    this.addSubtleLighting(this.scene);

    // Make sure sphere becomes visible after a timeout even if EXR fails
    setTimeout(() => {
      if (this.sphere && !this.sphere.visible) {
        this.sphere.visible = true;
      }
    }, 2000);

    const renderPass = new RenderPass(this.scene, this.camera);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.3,      // Intensidad muy baja
      0.2,      // Radio pequeño
      0.9,      // Umbral alto - casi sin bloom
    );

    const fxaaPass = new ShaderPass(FXAAShader);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderPass);
    // this.composer.addPass(fxaaPass);
    this.composer.addPass(bloomPass);

    const onWindowResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      
      this.renderer.setSize(width, height);
      
      // Update backdrop resolution
      if (this.backdrop && this.backdrop.material && 'uniforms' in this.backdrop.material) {
        (this.backdrop.material as any).uniforms.resolution.value.set(width, height);
      }
    };

    window.addEventListener('resize', onWindowResize);
    onWindowResize();

    this.animation();
  }

  private animation() {
    requestAnimationFrame(() => this.animation());

    if (!this.inputAnalyser || !this.outputAnalyser) {
      return;
    }

    this.inputAnalyser.update();
    this.outputAnalyser.update();

    const t = performance.now();
    const dt = (t - this.prevTime) / (1000 / 60);
    this.prevTime = t;
    const backdropMaterial = this.backdrop.material as THREE.RawShaderMaterial;
    const sphereMaterial = this.sphere.material as THREE.MeshStandardMaterial;

    backdropMaterial.uniforms['rand'].value = Math.random() * 10000;

    if ((sphereMaterial as any).userData.shader) {
      // Aplicar configuración de herramienta si está activa
      if (this.isToolActive && this.currentToolConfig) {
        this.applyToolAnimation(this.currentToolConfig, dt);
      } else {
        // Animación normal basada en audio
        this.sphere.scale.setScalar(
          1 + (0.2 * this.outputAnalyser.data[1]) / 255,
        );

        const f = 0.001;
        this.rotation.x += (dt * f * 0.5 * this.outputAnalyser.data[1]) / 255;
        this.rotation.z += (dt * f * 0.5 * this.inputAnalyser.data[1]) / 255;
        this.rotation.y += (dt * f * 0.25 * this.inputAnalyser.data[2]) / 255;
        this.rotation.y += (dt * f * 0.25 * this.outputAnalyser.data[2]) / 255;

        const euler = new THREE.Euler(
          this.rotation.x,
          this.rotation.y,
          this.rotation.z,
        );
        const quaternion = new THREE.Quaternion().setFromEuler(euler);
        const vector = new THREE.Vector3(0, 0, 5);
        vector.applyQuaternion(quaternion);
        this.camera.position.copy(vector);
        this.camera.lookAt(this.sphere.position);
      }

      (sphereMaterial as any).userData.shader.uniforms['time'].value +=
        (dt * 0.1 * this.outputAnalyser.data[0]) / 255;
      (sphereMaterial as any).userData.shader.uniforms['inputData'].value.set(
        (1 * this.inputAnalyser.data[0]) / 255,
        (0.1 * this.inputAnalyser.data[1]) / 255,
        (10 * this.inputAnalyser.data[2]) / 255,
        0,
      );
      (sphereMaterial as any).userData.shader.uniforms['outputData'].value.set(
        (2 * this.outputAnalyser.data[0]) / 255,
        (0.1 * this.outputAnalyser.data[1]) / 255,
        (10 * this.outputAnalyser.data[2]) / 255,
        0,
      );
    }

    // Animación sutil de la esfera
    if (this.sphere) {
      // Rotación suave y elegante
      this.sphere.rotation.y += dt * 0.005;
      this.sphere.rotation.x += dt * 0.002;
      
      // Sutil pulsación basada en audio
      if (this.outputAnalyser) {
        const audioLevel = this.outputAnalyser.data[0] / 255;
        const scale = 1 + (audioLevel * 0.02); // Muy muy sutil
        this.sphere.scale.setScalar(scale);
        
        // Ajustar opacidad sutilmente con el audio
        const material = this.sphere.material as THREE.MeshStandardMaterial;
        material.opacity = 0.8 + (audioLevel * 0.1);
      }
    }

    this.composer.render();
  }

  private applyToolAnimation(config: ToolVisualConfig, deltaTime: number) {
    const time = performance.now() * 0.001;

    // Aplicar color de la herramienta
    const material = this.sphere.material as THREE.MeshStandardMaterial;
    material.color.copy(config.color);

    // Aplicar escala de la herramienta
    this.sphere.scale.setScalar(config.scale);

    // Aplicar animación específica según el tipo
    switch (config.animation) {
      case 'pulse':
        const pulseScale = config.scale + Math.sin(time * 2) * 0.1;
        this.sphere.scale.setScalar(pulseScale);
        break;

      case 'bounce':
        const bounceY = Math.sin(time * 3) * 0.2;
        this.sphere.position.y = bounceY;
        break;

      case 'rotate':
        this.sphere.rotation.y += deltaTime * config.rotationSpeed;
        this.sphere.rotation.x += deltaTime * config.rotationSpeed * 0.5;
        break;

      case 'wave':
        const waveX = Math.sin(time * 2.5) * 0.3;
        this.sphere.position.x = waveX;
        break;

      case 'slide':
        const slideZ = Math.sin(time * 2) * 0.5;
        this.sphere.position.z = 5 + slideZ;
        break;

      case 'glow':
        material.emissiveIntensity = config.glowIntensity + Math.sin(time * 2) * 0.2;
        break;

      case 'celebrate':
        // Animación de celebración especial
        this.sphere.rotation.y += deltaTime * config.rotationSpeed;
        this.sphere.rotation.x += deltaTime * config.rotationSpeed * 0.7;
        this.sphere.rotation.z += deltaTime * config.rotationSpeed * 0.3;
        
        const celebrateScale = config.scale + Math.sin(time * 4) * 0.3;
        this.sphere.scale.setScalar(celebrateScale);
        
        // Cambio de colores dinámico
        const hue = (time * 0.5) % 1;
        const celebrationColor = new THREE.Color().setHSL(hue, 1, 0.6);
        material.color.lerp(celebrationColor, 0.1);
        break;
    }

    // Animar partículas de la herramienta
    this.animateToolParticles(config);

    // Aplicar efectos de brillo según la intensidad
    if (config.glowIntensity > 0) {
      material.emissive.setHex(config.color.getHex());
      material.emissiveIntensity = config.glowIntensity;
    }
  }

  private createToolParticles(config: ToolVisualConfig) {
    // Limpiar partículas existentes
    this.toolParticles.forEach(particle => {
      this.sphere.remove(particle);
    });
    this.toolParticles = [];

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(config.particleCount * 3);
    const colors = new Float32Array(config.particleCount * 3);
    const scales = new Float32Array(config.particleCount);

    for (let i = 0; i < config.particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 2 + 1; // Radio entre 1 y 3
      const height = (Math.random() - 0.5) * 2; // Altura entre -1 y 1

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = Math.sin(angle) * radius;

      colors[i * 3] = config.color.r;
      colors[i * 3 + 1] = config.color.g;
      colors[i * 3 + 2] = config.color.b;

      scales[i] = Math.random() * 0.2 + 0.1; // Escala entre 0.1 y 0.3
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));

    const material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geometry, material);
    points.position.set(0, 0, 0);
    this.toolParticles.push(points);
    this.sphere.add(points);
  }

  private animateToolParticles(config: ToolVisualConfig) {
    if (!this.isToolActive || this.toolParticles.length === 0) {
      return;
    }

    const time = performance.now() * 0.001;

    this.toolParticles.forEach(particle => {
      // Animar rotación de los objetos
      particle.rotation.y += 0.01;
      particle.rotation.x += 0.005;
      
      // Animar posición con movimiento suave
      const originalY = particle.position.y;
      particle.position.y = originalY + Math.sin(time * 2) * 0.1;
      
      // Animar escala con pulsación sutil
      const scale = 1 + Math.sin(time * 3) * 0.05;
      particle.scale.setScalar(scale);
    });
  }

  // Método para limpiar efectos de herramienta
  public clearToolEffects() {
    this.isToolActive = false;
    this.currentToolConfig = undefined;
    this.toolParticles.forEach(particle => {
      this.sphere.remove(particle);
    });
    this.toolParticles = [];

    // Restaurar configuración normal
    const material = this.sphere.material as THREE.MeshStandardMaterial;
    material.color.setHex(0x6c7b7f);
    material.emissiveIntensity = 0;
    this.sphere.scale.setScalar(1);
  }

  private addSubtleLighting(scene: THREE.Scene): void {
    // Luz ambiente suave
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
    
    // Una sola luz direccional suave
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(2, 5, 3);
    scene.add(mainLight);
  }

  private handleKatuqToolEvent(event: KatuqToolEvent) {
    console.log('🎨 [Visual3D] Procesando evento de herramienta:', event);
    const toolName = event.toolName;
    const toolConfig = this.toolVisualConfigs[toolName];

    if (toolConfig) {
      console.log('🎨 [Visual3D] Configuración encontrada para:', toolName, toolConfig);
      this.currentToolConfig = toolConfig;
      this.isToolActive = true;
      this.toolAnimationTime = 0;
      this.toolParticles = [];

      // AGREGAR Energy Wave para cada herramienta
      this.createEnergyWaveEffect(toolConfig.color.getHex());

      // Crear visuales específicas según la herramienta
      this.createToolSpecificVisuals(toolConfig, toolName);

      // Limpiar después de un tiempo
      setTimeout(() => {
        console.log('🎨 [Visual3D] Limpiando efectos de herramienta:', toolName);
        this.clearToolEffects();
      }, 5000); // 5 segundos
    } else {
      console.warn(`🎨 [Visual3D] No se encontró configuración visual para la herramienta: ${toolName}`);
      this.currentToolConfig = undefined;
      this.isToolActive = false;
      this.toolParticles = [];
    }
  }

  // Métodos para crear visuales específicas por herramienta
  private createWarehouseVisuals(config: ToolVisualConfig) {
    // Crear un complejo de bodegas más realista
    const warehouseGroup = new THREE.Group();
    
    // Bodega principal (edificio grande)
    const mainWarehouseGeometry = new THREE.BoxGeometry(2, 1.5, 1.5);
    const mainWarehouseMaterial = new THREE.MeshStandardMaterial({
      color: config.color,
      transparent: true,
      opacity: 0.9,
      metalness: 0.3,
      roughness: 0.7
    });
    const mainWarehouse = new THREE.Mesh(mainWarehouseGeometry, mainWarehouseMaterial);
    mainWarehouse.position.set(0, 0.75, 0);
    warehouseGroup.add(mainWarehouse);

    // Techo de la bodega
    const roofGeometry = new THREE.ConeGeometry(1.2, 0.5, 4);
    const roofMaterial = new THREE.MeshStandardMaterial({
      color: config.color,
      transparent: true,
      opacity: 0.8
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(0, 1.75, 0);
    roof.rotation.y = Math.PI / 4;
    warehouseGroup.add(roof);

    // Puerta de la bodega
    const doorGeometry = new THREE.BoxGeometry(0.4, 0.8, 0.1);
    const doorMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513, // Marrón
      transparent: true,
      opacity: 0.9
    });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, 0.4, 0.76);
    warehouseGroup.add(door);

    // Ventanas
    for (let i = 0; i < 3; i++) {
      const windowGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.05);
      const windowMaterial = new THREE.MeshStandardMaterial({
        color: 0x87CEEB, // Azul cielo
        transparent: true,
        opacity: 0.7,
        emissive: 0x87CEEB,
        emissiveIntensity: 0.2
      });
      const window = new THREE.Mesh(windowGeometry, windowMaterial);
      window.position.set(-0.5 + i * 0.5, 1.2, 0.76);
      warehouseGroup.add(window);
    }

    // Bodegas pequeñas alrededor
    for (let i = 0; i < 4; i++) {
      const smallWarehouseGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
      const smallWarehouseMaterial = new THREE.MeshStandardMaterial({
        color: config.color,
        transparent: true,
        opacity: 0.8
      });
      const smallWarehouse = new THREE.Mesh(smallWarehouseGeometry, smallWarehouseMaterial);
      
      const angle = (i / 4) * Math.PI * 2;
      const radius = 3;
      smallWarehouse.position.set(
        Math.cos(angle) * radius,
        0.4,
        Math.sin(angle) * radius
      );
      warehouseGroup.add(smallWarehouse);
    }

    // Camiones de carga
    for (let i = 0; i < 2; i++) {
      // Cuerpo del camión
      const truckBodyGeometry = new THREE.BoxGeometry(1, 0.4, 0.6);
      const truckBodyMaterial = new THREE.MeshStandardMaterial({
        color: 0xFF6B35, // Naranja
        transparent: true,
        opacity: 0.9
      });
      const truckBody = new THREE.Mesh(truckBodyGeometry, truckBodyMaterial);
      
      // Cabina del camión
      const cabinGeometry = new THREE.BoxGeometry(0.4, 0.5, 0.6);
      const cabinMaterial = new THREE.MeshStandardMaterial({
        color: 0xFF6B35,
        transparent: true,
        opacity: 0.9
      });
      const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
      
      const truck = new THREE.Group();
      cabin.position.x = 0.3;
      truck.add(truckBody);
      truck.add(cabin);
      
      const angle = (i / 2) * Math.PI;
      const radius = 4;
      truck.position.set(
        Math.cos(angle) * radius,
        0.2,
        Math.sin(angle) * radius
      );
      truck.rotation.y = angle;
      warehouseGroup.add(truck);
    }

    // Contenedores de carga
    for (let i = 0; i < 6; i++) {
      const containerGeometry = new THREE.BoxGeometry(0.6, 0.4, 0.8);
      const containerMaterial = new THREE.MeshStandardMaterial({
        color: 0x2E8B57, // Verde mar
        transparent: true,
        opacity: 0.8
      });
      const container = new THREE.Mesh(containerGeometry, containerMaterial);
      
      const angle = (i / 6) * Math.PI * 2;
      const radius = 2.5;
      container.position.set(
        Math.cos(angle) * radius,
        0.2,
        Math.sin(angle) * radius
      );
      warehouseGroup.add(container);
    }

    // Grúa de carga
    const craneGeometry = new THREE.CylinderGeometry(0.1, 0.1, 2);
    const craneMaterial = new THREE.MeshStandardMaterial({
      color: 0x696969, // Gris
      transparent: true,
      opacity: 0.8
    });
    const crane = new THREE.Mesh(craneGeometry, craneMaterial);
    crane.position.set(0, 1, -2);
    warehouseGroup.add(crane);

    // Brazo de la grúa
    const armGeometry = new THREE.BoxGeometry(3, 0.1, 0.1);
    const armMaterial = new THREE.MeshStandardMaterial({
      color: 0x696969,
      transparent: true,
      opacity: 0.8
    });
    const arm = new THREE.Mesh(armGeometry, armMaterial);
    arm.position.set(0, 1.5, -2);
    warehouseGroup.add(arm);

    // Cable de la grúa
    const cableGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1);
    const cableMaterial = new THREE.MeshStandardMaterial({
      color: 0x000000, // Negro
      transparent: true,
      opacity: 0.9
    });
    const cable = new THREE.Mesh(cableGeometry, cableMaterial);
    cable.position.set(0, 0.5, -2);
    warehouseGroup.add(cable);

    // Posicionar el grupo completo
    warehouseGroup.position.set(0, 0, 0);
    this.sphere.add(warehouseGroup);
    this.toolParticles.push(warehouseGroup);
  }

  private createProductVisuals(config: ToolVisualConfig) {
    // Crear un catálogo de productos más realista
    const productGroup = new THREE.Group();
    
    // Estanterías de productos
    for (let i = 0; i < 3; i++) {
      const shelfGeometry = new THREE.BoxGeometry(2, 0.1, 0.8);
      const shelfMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513, // Marrón
        transparent: true,
        opacity: 0.8
      });
      const shelf = new THREE.Mesh(shelfGeometry, shelfMaterial);
      shelf.position.set(0, i * 0.5, 0);
      productGroup.add(shelf);
    }

    // Productos en las estanterías
    const products = [
      { name: 'Laptop', color: 0x4169E1, size: [0.3, 0.2, 0.25] },
      { name: 'Phone', color: 0x32CD32, size: [0.15, 0.25, 0.05] },
      { name: 'Headphones', color: 0xFF1493, size: [0.2, 0.15, 0.1] },
      { name: 'Camera', color: 0x000000, size: [0.2, 0.15, 0.15] },
      { name: 'Tablet', color: 0x1E90FF, size: [0.25, 0.3, 0.05] },
      { name: 'Watch', color: 0xFFD700, size: [0.1, 0.1, 0.05] },
      { name: 'Speaker', color: 0xFF4500, size: [0.2, 0.2, 0.2] },
      { name: 'Mouse', color: 0x808080, size: [0.15, 0.1, 0.05] }
    ];

    let productIndex = 0;
    for (let shelf = 0; shelf < 3; shelf++) {
      for (let pos = 0; pos < 4; pos++) {
        if (productIndex < products.length) {
          const product = products[productIndex];
          const productGeometry = new THREE.BoxGeometry(...product.size);
          const productMaterial = new THREE.MeshStandardMaterial({
            color: product.color,
            transparent: true,
            opacity: 0.9,
            metalness: 0.3,
            roughness: 0.4
          });
          const productMesh = new THREE.Mesh(productGeometry, productMaterial);
          
          productMesh.position.set(
            -0.75 + pos * 0.5,
            shelf * 0.5 + product.size[1] / 2 + 0.05,
            0
          );
          productGroup.add(productMesh);
          productIndex++;
        }
      }
    }

    // Carrito de compras
    const cartGroup = new THREE.Group();
    
    // Cuerpo del carrito
    const cartBodyGeometry = new THREE.BoxGeometry(0.8, 0.6, 0.4);
    const cartBodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x4169E1, // Azul
      transparent: true,
      opacity: 0.9
    });
    const cartBody = new THREE.Mesh(cartBodyGeometry, cartBodyMaterial);
    cartBody.position.set(0, 0.3, 0);
    cartGroup.add(cartBody);

    // Ruedas del carrito
    for (let i = 0; i < 4; i++) {
      const wheelGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.05, 8);
      const wheelMaterial = new THREE.MeshStandardMaterial({
        color: 0x000000, // Negro
        transparent: true,
        opacity: 0.9
      });
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      
      const x = (i % 2 === 0) ? -0.3 : 0.3;
      const z = (i < 2) ? -0.15 : 0.15;
      wheel.position.set(x, 0.1, z);
      cartGroup.add(wheel);
    }

    // Mango del carrito
    const handleGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.8);
    const handleMaterial = new THREE.MeshStandardMaterial({
      color: 0x4169E1,
      transparent: true,
      opacity: 0.9
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(0, 0.7, -0.2);
    cartGroup.add(handle);

    // Productos en el carrito
    for (let i = 0; i < 3; i++) {
      const cartProductGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
      const cartProductMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(Math.random(), 0.7, 0.6),
        transparent: true,
        opacity: 0.9
      });
      const cartProduct = new THREE.Mesh(cartProductGeometry, cartProductMaterial);
      cartProduct.position.set(
        -0.2 + i * 0.2,
        0.4,
        0
      );
      cartGroup.add(cartProduct);
    }

    cartGroup.position.set(3, 0, 0);
    productGroup.add(cartGroup);

    // Etiquetas de precio flotantes
    for (let i = 0; i < 4; i++) {
      const priceTagGeometry = new THREE.PlaneGeometry(0.3, 0.15);
      const priceTagMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFD700, // Dorado
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      });
      const priceTag = new THREE.Mesh(priceTagGeometry, priceTagMaterial);
      priceTag.position.set(
        -0.75 + i * 0.5,
        1.5,
        0.4
      );
      priceTag.rotation.x = -Math.PI / 6;
      productGroup.add(priceTag);
    }

    // Posicionar el grupo completo
    productGroup.position.set(0, 0, 0);
    this.sphere.add(productGroup);
    this.toolParticles.push(productGroup);
  }

  private createClientVisuals(config: ToolVisualConfig) {
    // Crear una oficina de atención al cliente
    const clientGroup = new THREE.Group();
    
    // Escritorio de atención
    const deskGeometry = new THREE.BoxGeometry(2, 0.1, 1);
    const deskMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513, // Marrón
      transparent: true,
      opacity: 0.9
    });
    const desk = new THREE.Mesh(deskGeometry, deskMaterial);
    desk.position.set(0, 0.4, 0);
    clientGroup.add(desk);

    // Clientes en fila
    for (let i = 0; i < 3; i++) {
      const clientPerson = new THREE.Group();
      
      // Cabeza del cliente
      const headGeometry = new THREE.SphereGeometry(0.15, 8, 6);
      const headMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.1 + i * 0.1, 0.3, 0.7), // Diferentes tonos de piel
        transparent: true,
        opacity: 0.9
      });
      const head = new THREE.Mesh(headGeometry, headMaterial);
      head.position.y = 0.8;
      clientPerson.add(head);

      // Cuerpo del cliente
      const bodyGeometry = new THREE.CylinderGeometry(0.12, 0.15, 0.6);
      const bodyMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(Math.random(), 0.5, 0.6), // Ropa de colores
        transparent: true,
        opacity: 0.9
      });
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.position.y = 0.3;
      clientPerson.add(body);

      // Brazos del cliente
      for (let arm = 0; arm < 2; arm++) {
        const armGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.4);
        const armMaterial = new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(0.1 + i * 0.1, 0.3, 0.7),
          transparent: true,
          opacity: 0.9
        });
        const armMesh = new THREE.Mesh(armGeometry, armMaterial);
        armMesh.position.set(arm === 0 ? -0.15 : 0.15, 0.4, 0);
        armMesh.rotation.z = arm === 0 ? -Math.PI / 4 : Math.PI / 4;
        clientPerson.add(armMesh);
      }

      // Posicionar cliente en fila
      clientPerson.position.set(-1.5 + i * 1.5, 0, -1);
      clientGroup.add(clientPerson);
    }

    // Recepcionista
    const receptionist = new THREE.Group();
    
    // Cabeza de la recepcionista
    const receptionistHeadGeometry = new THREE.SphereGeometry(0.15, 8, 6);
    const receptionistHeadMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.1, 0.3, 0.7),
      transparent: true,
      opacity: 0.9
    });
    const receptionistHead = new THREE.Mesh(receptionistHeadGeometry, receptionistHeadMaterial);
    receptionistHead.position.set(0, 0.8, 0.5);
    receptionist.add(receptionistHead);

    // Cuerpo de la recepcionista
    const receptionistBodyGeometry = new THREE.CylinderGeometry(0.12, 0.15, 0.6);
    const receptionistBodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x4169E1, // Uniforme azul
      transparent: true,
      opacity: 0.9
    });
    const receptionistBody = new THREE.Mesh(receptionistBodyGeometry, receptionistBodyMaterial);
    receptionistBody.position.set(0, 0.3, 0.5);
    receptionist.add(receptionistBody);

    // Computadora en el escritorio
    const computerGeometry = new THREE.BoxGeometry(0.4, 0.3, 0.3);
    const computerMaterial = new THREE.MeshStandardMaterial({
      color: 0x000000, // Negro
      transparent: true,
      opacity: 0.9
    });
    const computer = new THREE.Mesh(computerGeometry, computerMaterial);
    computer.position.set(0, 0.55, 0.2);
    clientGroup.add(computer);

    // Monitor
    const monitorGeometry = new THREE.BoxGeometry(0.5, 0.4, 0.05);
    const monitorMaterial = new THREE.MeshStandardMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.9
    });
    const monitor = new THREE.Mesh(monitorGeometry, monitorMaterial);
    monitor.position.set(0, 0.8, 0.2);
    clientGroup.add(monitor);

    // Pantalla del monitor
    const screenGeometry = new THREE.PlaneGeometry(0.45, 0.35);
    const screenMaterial = new THREE.MeshStandardMaterial({
      color: 0x00FF00, // Verde (pantalla encendida)
      transparent: true,
      opacity: 0.8,
      emissive: 0x00FF00,
      emissiveIntensity: 0.3,
      side: THREE.DoubleSide
    });
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.set(0, 0.8, 0.225);
    clientGroup.add(screen);

    // Teléfono
    const phoneGeometry = new THREE.BoxGeometry(0.15, 0.05, 0.1);
    const phoneMaterial = new THREE.MeshStandardMaterial({
      color: 0x808080, // Gris
      transparent: true,
      opacity: 0.9
    });
    const phone = new THREE.Mesh(phoneGeometry, phoneMaterial);
    phone.position.set(-0.5, 0.45, 0.2);
    clientGroup.add(phone);

    // Documentos en el escritorio
    for (let i = 0; i < 3; i++) {
      const documentGeometry = new THREE.PlaneGeometry(0.2, 0.3);
      const documentMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF, // Blanco
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      });
      const document = new THREE.Mesh(documentGeometry, documentMaterial);
      document.position.set(0.5 + i * 0.1, 0.45, 0.2);
      document.rotation.y = Math.PI / 6;
      clientGroup.add(document);
    }

    // Silla de la recepcionista
    const chairGeometry = new THREE.BoxGeometry(0.4, 0.1, 0.4);
    const chairMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513, // Marrón
      transparent: true,
      opacity: 0.9
    });
    const chair = new THREE.Mesh(chairGeometry, chairMaterial);
    chair.position.set(0, 0.05, 0.5);
    clientGroup.add(chair);

    // Respaldo de la silla
    const backrestGeometry = new THREE.BoxGeometry(0.4, 0.6, 0.05);
    const backrestMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      transparent: true,
      opacity: 0.9
    });
    const backrest = new THREE.Mesh(backrestGeometry, backrestMaterial);
    backrest.position.set(0, 0.35, 0.25);
    clientGroup.add(backrest);

    // Posicionar el grupo completo
    clientGroup.position.set(0, 0, 0);
    this.sphere.add(clientGroup);
    this.toolParticles.push(clientGroup);
  }

  private createBillingVisuals(config: ToolVisualConfig) {
    // Crear una oficina de facturación
    const billingGroup = new THREE.Group();
    
    // Escritorio de facturación
    const deskGeometry = new THREE.BoxGeometry(2.5, 0.1, 1.2);
    const deskMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513, // Marrón
      transparent: true,
      opacity: 0.9
    });
    const desk = new THREE.Mesh(deskGeometry, deskMaterial);
    desk.position.set(0, 0.4, 0);
    billingGroup.add(desk);

    // Facturas y documentos
    for (let i = 0; i < 5; i++) {
      const documentGeometry = new THREE.PlaneGeometry(0.3, 0.4);
      const documentMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF, // Blanco
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
      });
      const document = new THREE.Mesh(documentGeometry, documentMaterial);
      document.position.set(-1 + i * 0.4, 0.45, 0.2);
      document.rotation.y = Math.PI / 8;
      billingGroup.add(document);
    }

    // Calculadora
    const calculatorGeometry = new THREE.BoxGeometry(0.2, 0.05, 0.15);
    const calculatorMaterial = new THREE.MeshStandardMaterial({
      color: 0x000000, // Negro
      transparent: true,
      opacity: 0.9
    });
    const calculator = new THREE.Mesh(calculatorGeometry, calculatorMaterial);
    calculator.position.set(0.8, 0.45, 0.2);
    billingGroup.add(calculator);

    // Pantalla de la calculadora
    const calcScreenGeometry = new THREE.PlaneGeometry(0.18, 0.03);
    const calcScreenMaterial = new THREE.MeshStandardMaterial({
      color: 0x00FF00, // Verde
      transparent: true,
      opacity: 0.8,
      emissive: 0x00FF00,
      emissiveIntensity: 0.5,
      side: THREE.DoubleSide
    });
    const calcScreen = new THREE.Mesh(calcScreenGeometry, calcScreenMaterial);
    calcScreen.position.set(0.8, 0.475, 0.275);
    billingGroup.add(calcScreen);

    // Botones de la calculadora
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const buttonGeometry = new THREE.BoxGeometry(0.02, 0.01, 0.02);
        const buttonMaterial = new THREE.MeshStandardMaterial({
          color: 0x808080, // Gris
          transparent: true,
          opacity: 0.9
        });
        const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
        button.position.set(
          0.7 + col * 0.04,
          0.46,
          0.15 + row * 0.04
        );
        billingGroup.add(button);
      }
    }

    // Impresora
    const printerGeometry = new THREE.BoxGeometry(0.3, 0.2, 0.4);
    const printerMaterial = new THREE.MeshStandardMaterial({
      color: 0x808080, // Gris
      transparent: true,
      opacity: 0.9
    });
    const printer = new THREE.Mesh(printerGeometry, printerMaterial);
    printer.position.set(-0.8, 0.5, 0.2);
    billingGroup.add(printer);

    // Papel saliendo de la impresora
    const paperGeometry = new THREE.PlaneGeometry(0.25, 0.35);
    const paperMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF, // Blanco
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    const paper = new THREE.Mesh(paperGeometry, paperMaterial);
    paper.position.set(-0.8, 0.6, 0.4);
    billingGroup.add(paper);

    // Sellos de facturación
    for (let i = 0; i < 3; i++) {
      const stampGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.02);
      const stampMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(i * 0.3, 0.7, 0.6), // Diferentes colores
        transparent: true,
        opacity: 0.9
      });
      const stamp = new THREE.Mesh(stampGeometry, stampMaterial);
      stamp.position.set(0.5 + i * 0.2, 0.46, 0.2);
      billingGroup.add(stamp);
    }

    // Carpeta de facturas
    const folderGeometry = new THREE.BoxGeometry(0.4, 0.05, 0.6);
    const folderMaterial = new THREE.MeshStandardMaterial({
      color: 0x4169E1, // Azul
      transparent: true,
      opacity: 0.9
    });
    const folder = new THREE.Mesh(folderGeometry, folderMaterial);
    folder.position.set(0.2, 0.425, 0.2);
    billingGroup.add(folder);

    // Etiqueta de la carpeta
    const labelGeometry = new THREE.PlaneGeometry(0.3, 0.2);
    const labelMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF, // Blanco
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    const label = new THREE.Mesh(labelGeometry, labelMaterial);
    label.position.set(0.2, 0.475, 0.5);
    billingGroup.add(label);

    // Computadora para facturación
    const computerGeometry = new THREE.BoxGeometry(0.4, 0.3, 0.3);
    const computerMaterial = new THREE.MeshStandardMaterial({
      color: 0x000000, // Negro
      transparent: true,
      opacity: 0.9
    });
    const computer = new THREE.Mesh(computerGeometry, computerMaterial);
    computer.position.set(-0.2, 0.55, 0.2);
    billingGroup.add(computer);

    // Monitor para facturación
    const monitorGeometry = new THREE.BoxGeometry(0.6, 0.5, 0.05);
    const monitorMaterial = new THREE.MeshStandardMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.9
    });
    const monitor = new THREE.Mesh(monitorGeometry, monitorMaterial);
    monitor.position.set(-0.2, 0.9, 0.2);
    billingGroup.add(monitor);

    // Pantalla del monitor con factura
    const screenGeometry = new THREE.PlaneGeometry(0.55, 0.45);
    const screenMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF, // Blanco (pantalla con factura)
      transparent: true,
      opacity: 0.8,
      emissive: 0xFFFFFF,
      emissiveIntensity: 0.2,
      side: THREE.DoubleSide
    });
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.set(-0.2, 0.9, 0.225);
    billingGroup.add(screen);

    // Líneas de la factura en la pantalla
    for (let i = 0; i < 5; i++) {
      const lineGeometry = new THREE.PlaneGeometry(0.5, 0.02);
      const lineMaterial = new THREE.MeshStandardMaterial({
        color: 0x000000, // Negro
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
      });
      const line = new THREE.Mesh(lineGeometry, lineMaterial);
      line.position.set(-0.2, 0.8 + i * 0.08, 0.23);
      billingGroup.add(line);
    }

    // Silla del facturador
    const chairGeometry = new THREE.BoxGeometry(0.5, 0.1, 0.5);
    const chairMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513, // Marrón
      transparent: true,
      opacity: 0.9
    });
    const chair = new THREE.Mesh(chairGeometry, chairMaterial);
    chair.position.set(0, 0.05, 0.8);
    billingGroup.add(chair);

    // Respaldo de la silla
    const backrestGeometry = new THREE.BoxGeometry(0.5, 0.8, 0.05);
    const backrestMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      transparent: true,
      opacity: 0.9
    });
    const backrest = new THREE.Mesh(backrestGeometry, backrestMaterial);
    backrest.position.set(0, 0.45, 0.55);
    billingGroup.add(backrest);

    // Posicionar el grupo completo
    billingGroup.position.set(0, 0, 0);
    this.sphere.add(billingGroup);
    this.toolParticles.push(billingGroup);
  }

  private createShippingVisuals(config: ToolVisualConfig) {
    // Crear un centro de distribución de envíos
    const shippingGroup = new THREE.Group();
    
    // Plataforma de carga
    const platformGeometry = new THREE.BoxGeometry(3, 0.2, 2);
    const platformMaterial = new THREE.MeshStandardMaterial({
      color: 0x696969, // Gris
      transparent: true,
      opacity: 0.9
    });
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.set(0, 0.1, 0);
    shippingGroup.add(platform);

    // Camiones de reparto
    for (let i = 0; i < 3; i++) {
      const truckGroup = new THREE.Group();
      
      // Cuerpo del camión
      const truckBodyGeometry = new THREE.BoxGeometry(1.2, 0.5, 0.8);
      const truckBodyMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(i * 0.3, 0.7, 0.6), // Diferentes colores
        transparent: true,
        opacity: 0.9
      });
      const truckBody = new THREE.Mesh(truckBodyGeometry, truckBodyMaterial);
      truckBody.position.set(0, 0.25, 0);
      truckGroup.add(truckBody);

      // Cabina del camión
      const cabinGeometry = new THREE.BoxGeometry(0.4, 0.6, 0.8);
      const cabinMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(i * 0.3, 0.7, 0.6),
        transparent: true,
        opacity: 0.9
      });
      const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
      cabin.position.set(0.4, 0.3, 0);
      truckGroup.add(cabin);

      // Ruedas del camión
      for (let wheel = 0; wheel < 4; wheel++) {
        const wheelGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 8);
        const wheelMaterial = new THREE.MeshStandardMaterial({
          color: 0x000000, // Negro
          transparent: true,
          opacity: 0.9
        });
        const wheelMesh = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheelMesh.rotation.z = Math.PI / 2;
        
        const x = (wheel % 2 === 0) ? -0.4 : 0.4;
        const z = (wheel < 2) ? -0.3 : 0.3;
        wheelMesh.position.set(x, 0.15, z);
        truckGroup.add(wheelMesh);
      }

      // Logo del camión
      const logoGeometry = new THREE.PlaneGeometry(0.3, 0.2);
      const logoMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF, // Blanco
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      });
      const logo = new THREE.Mesh(logoGeometry, logoMaterial);
      logo.position.set(0, 0.25, 0.41);
      truckGroup.add(logo);

      // Posicionar camión
      truckGroup.position.set(-1.5 + i * 1.5, 0, 0.5);
      shippingGroup.add(truckGroup);
    }

    // Contenedores de envío
    for (let i = 0; i < 6; i++) {
      const containerGeometry = new THREE.BoxGeometry(0.8, 0.6, 1);
      const containerMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(Math.random(), 0.5, 0.6), // Colores aleatorios
        transparent: true,
        opacity: 0.9
      });
      const container = new THREE.Mesh(containerGeometry, containerMaterial);
      
      const angle = (i / 6) * Math.PI * 2;
      const radius = 2.5;
      container.position.set(
        Math.cos(angle) * radius,
        0.4,
        Math.sin(angle) * radius
      );
      shippingGroup.add(container);
    }

    // Grúa de carga
    const craneGeometry = new THREE.CylinderGeometry(0.1, 0.1, 3);
    const craneMaterial = new THREE.MeshStandardMaterial({
      color: 0x4169E1, // Azul
      transparent: true,
      opacity: 0.9
    });
    const crane = new THREE.Mesh(craneGeometry, craneMaterial);
    crane.position.set(0, 1.5, -2);
    shippingGroup.add(crane);

    // Brazo de la grúa
    const armGeometry = new THREE.BoxGeometry(4, 0.1, 0.1);
    const armMaterial = new THREE.MeshStandardMaterial({
      color: 0x4169E1,
      transparent: true,
      opacity: 0.9
    });
    const arm = new THREE.Mesh(armGeometry, armMaterial);
    arm.position.set(0, 2.5, -2);
    shippingGroup.add(arm);

    // Cable de la grúa
    const cableGeometry = new THREE.CylinderGeometry(0.02, 0.02, 2);
    const cableMaterial = new THREE.MeshStandardMaterial({
      color: 0x000000, // Negro
      transparent: true,
      opacity: 0.9
    });
    const cable = new THREE.Mesh(cableGeometry, cableMaterial);
    cable.position.set(0, 1, -2);
    shippingGroup.add(cable);

    // Gancho de la grúa
    const hookGeometry = new THREE.ConeGeometry(0.05, 0.2, 8);
    const hookMaterial = new THREE.MeshStandardMaterial({
      color: 0x808080, // Gris
      transparent: true,
      opacity: 0.9
    });
    const hook = new THREE.Mesh(hookGeometry, hookMaterial);
    hook.position.set(0, 0.1, -2);
    hook.rotation.x = Math.PI;
    shippingGroup.add(hook);

    // Cinta transportadora
    const conveyorGeometry = new THREE.BoxGeometry(2, 0.1, 0.5);
    const conveyorMaterial = new THREE.MeshStandardMaterial({
      color: 0x808080, // Gris
      transparent: true,
      opacity: 0.9
    });
    const conveyor = new THREE.Mesh(conveyorGeometry, conveyorMaterial);
    conveyor.position.set(0, 0.2, -1);
    shippingGroup.add(conveyor);

    // Rodillos de la cinta
    for (let i = 0; i < 8; i++) {
      const rollerGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8);
      const rollerMaterial = new THREE.MeshStandardMaterial({
        color: 0x696969, // Gris oscuro
        transparent: true,
        opacity: 0.9
      });
      const roller = new THREE.Mesh(rollerGeometry, rollerMaterial);
      roller.rotation.z = Math.PI / 2;
      roller.position.set(-0.875 + i * 0.25, 0.15, -1);
      shippingGroup.add(roller);
    }

    // Paquetes en la cinta
    for (let i = 0; i < 4; i++) {
      const packageGeometry = new THREE.BoxGeometry(0.3, 0.2, 0.3);
      const packageMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(Math.random(), 0.7, 0.6), // Colores aleatorios
        transparent: true,
        opacity: 0.9
      });
      const packageMesh = new THREE.Mesh(packageGeometry, packageMaterial);
      packageMesh.position.set(-0.6 + i * 0.4, 0.25, -1);
      shippingGroup.add(packageMesh);
    }

    // Etiquetas de envío
    for (let i = 0; i < 4; i++) {
      const labelGeometry = new THREE.PlaneGeometry(0.2, 0.1);
      const labelMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFD700, // Dorado
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      });
      const label = new THREE.Mesh(labelGeometry, labelMaterial);
      label.position.set(-0.6 + i * 0.4, 0.35, -0.85);
      label.rotation.x = -Math.PI / 6;
      shippingGroup.add(label);
    }

    // Posicionar el grupo completo
    shippingGroup.position.set(0, 0, 0);
    this.sphere.add(shippingGroup);
    this.toolParticles.push(shippingGroup);
  }

  private createPaymentVisuals(config: ToolVisualConfig) {
    // Crear símbolos de pago (tarjetas, dinero)
    for (let i = 0; i < 6; i++) {
      const cardGeometry = new THREE.PlaneGeometry(0.3, 0.2);
      const cardMaterial = new THREE.MeshStandardMaterial({
        color: config.color,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      });
      const card = new THREE.Mesh(cardGeometry, cardMaterial);
      
      // Posicionar tarjetas en forma de círculo
      const angle = (i / 6) * Math.PI * 2;
      const radius = 1.8;
      card.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * 0.1,
        Math.sin(angle) * radius * 0.3
      );
      card.rotation.y = angle;
      
      this.sphere.add(card);
      this.toolParticles.push(card as any);
    }
  }

  private createMoneyRainEffect() {
    const moneyGroup = new THREE.Group();

    // Crear 100 billetes colombianos
    for (let i = 0; i < 100; i++) {
      const billGeometry = new THREE.PlaneGeometry(0.3, 0.15);
      const billMaterial = new THREE.MeshBasicMaterial({
        color: 0x00FF00, // Verde billete colombiano
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
      });

      const bill = new THREE.Mesh(billGeometry, billMaterial);

      // Posición aleatoria arriba
      bill.position.set(
        (Math.random() - 0.5) * 4,
        Math.random() * 3 + 2,
        (Math.random() - 0.5) * 4
      );

      // Rotación aleatoria
      bill.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      // Velocidad de caída
      (bill as any).velocity = {
        y: -0.02 - Math.random() * 0.03,
        rotation: (Math.random() - 0.5) * 0.1
      };

      moneyGroup.add(bill);
    }

    this.sphere.add(moneyGroup);
    this.toolParticles.push(moneyGroup);

    // Animar caída
    const animateMoneyRain = () => {
      moneyGroup.children.forEach((bill: any) => {
        bill.position.y += bill.velocity.y;
        bill.rotation.y += bill.velocity.rotation;
        bill.rotation.x += bill.velocity.rotation * 0.5;

        // Resetear cuando llegue abajo
        if (bill.position.y < -2) {
          bill.position.y = Math.random() * 2 + 2;
        }
      });
    };

    // Ejecutar animación por 5 segundos
    const interval = setInterval(animateMoneyRain, 16);
    setTimeout(() => clearInterval(interval), 5000);
  }

  private createEnergyWaveEffect(color: number) {
    const waveGeometry = new THREE.RingGeometry(0.5, 0.6, 32);
    const waveMaterial = new THREE.MeshBasicMaterial({
      color: color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });

    const wave = new THREE.Mesh(waveGeometry, waveMaterial);
    wave.position.set(0, 0, 0);

    this.sphere.add(wave);
    this.toolParticles.push(wave);

    // Animar expansión
    let scale = 1;
    const expandWave = () => {
      scale += 0.1;
      wave.scale.setScalar(scale);
      waveMaterial.opacity = Math.max(0, 0.8 - (scale / 10));

      if (scale < 10) {
        requestAnimationFrame(expandWave);
      } else {
        this.sphere.remove(wave);
      }
    };

    expandWave();
  }

  private createCelebrationVisuals(config: ToolVisualConfig) {
    // Crear una celebración espectacular con Money Rain
    const celebrationGroup = new THREE.Group();

    // AGREGAR Money Rain
    this.createMoneyRainEffect();
    
    // Confeti dorado
    for (let i = 0; i < 50; i++) {
      const confettiGeometry = new THREE.PlaneGeometry(0.05, 0.05);
      const confettiMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(Math.random(), 1, 0.6), // Colores brillantes
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      });
      const confetti = new THREE.Mesh(confettiGeometry, confettiMaterial);
      
      // Posicionar confeti en forma de explosión
      const angle = Math.random() * Math.PI * 2;
      const radius = 1 + Math.random() * 3;
      const height = Math.random() * 4;
      
      confetti.position.set(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      );
      confetti.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      celebrationGroup.add(confetti);
    }

    // Estrellas brillantes
    for (let i = 0; i < 20; i++) {
      const starGeometry = new THREE.OctahedronGeometry(0.1);
      const starMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFD700, // Dorado
        transparent: true,
        opacity: 0.9,
        emissive: 0xFFD700,
        emissiveIntensity: 0.5
      });
      const star = new THREE.Mesh(starGeometry, starMaterial);
      
      const angle = (i / 20) * Math.PI * 2;
      const radius = 2 + Math.random() * 2;
      star.position.set(
        Math.cos(angle) * radius,
        1 + Math.random() * 2,
        Math.sin(angle) * radius
      );
      celebrationGroup.add(star);
    }

    // Globos de celebración
    for (let i = 0; i < 8; i++) {
      const balloonGeometry = new THREE.SphereGeometry(0.3, 8, 6);
      const balloonMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(Math.random(), 0.8, 0.7), // Colores vibrantes
        transparent: true,
        opacity: 0.8
      });
      const balloon = new THREE.Mesh(balloonGeometry, balloonMaterial);
      
      const angle = (i / 8) * Math.PI * 2;
      const radius = 1.5;
      balloon.position.set(
        Math.cos(angle) * radius,
        2 + Math.random() * 2,
        Math.sin(angle) * radius
      );
      celebrationGroup.add(balloon);

      // Hilo del globo
      const stringGeometry = new THREE.CylinderGeometry(0.01, 0.01, 1);
      const stringMaterial = new THREE.MeshStandardMaterial({
        color: 0x000000, // Negro
        transparent: true,
        opacity: 0.8
      });
      const string = new THREE.Mesh(stringGeometry, stringMaterial);
      string.position.set(
        Math.cos(angle) * radius,
        1.5 + Math.random() * 2,
        Math.sin(angle) * radius
      );
      celebrationGroup.add(string);
    }

    // Fuegos artificiales
    for (let i = 0; i < 5; i++) {
      const fireworkGroup = new THREE.Group();
      
      // Explosión central
      const explosionGeometry = new THREE.SphereGeometry(0.2, 8, 6);
      const explosionMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(Math.random(), 1, 0.6),
        transparent: true,
        opacity: 0.9,
        emissive: new THREE.Color().setHSL(Math.random(), 1, 0.6),
        emissiveIntensity: 0.8
      });
      const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
      fireworkGroup.add(explosion);

      // Partículas de la explosión
      for (let j = 0; j < 12; j++) {
        const particleGeometry = new THREE.SphereGeometry(0.02, 4, 4);
        const particleMaterial = new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(Math.random(), 1, 0.6),
          transparent: true,
          opacity: 0.8,
          emissive: new THREE.Color().setHSL(Math.random(), 1, 0.6),
          emissiveIntensity: 0.5
        });
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        
        const angle = (j / 12) * Math.PI * 2;
        const radius = 0.5;
        particle.position.set(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius * 0.5,
          Math.sin(angle) * radius
        );
        fireworkGroup.add(particle);
      }

      // Posicionar fuego artificial
      const angle = (i / 5) * Math.PI * 2;
      const radius = 3;
      fireworkGroup.position.set(
        Math.cos(angle) * radius,
        2 + Math.random() * 2,
        Math.sin(angle) * radius
      );
      celebrationGroup.add(fireworkGroup);
    }

    // Trofeo de celebración
    const trophyGroup = new THREE.Group();
    
    // Base del trofeo
    const baseGeometry = new THREE.CylinderGeometry(0.2, 0.3, 0.1, 8);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFD700, // Dorado
      transparent: true,
      opacity: 0.9,
      metalness: 0.8,
      roughness: 0.2
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.05;
    trophyGroup.add(base);

    // Cuerpo del trofeo
    const bodyGeometry = new THREE.CylinderGeometry(0.1, 0.15, 0.8, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFD700,
      transparent: true,
      opacity: 0.9,
      metalness: 0.8,
      roughness: 0.2
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.45;
    trophyGroup.add(body);

    // Copa del trofeo
    const cupGeometry = new THREE.SphereGeometry(0.15, 8, 6);
    const cupMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFD700,
      transparent: true,
      opacity: 0.9,
      metalness: 0.8,
      roughness: 0.2
    });
    const cup = new THREE.Mesh(cupGeometry, cupMaterial);
    cup.position.y = 0.9;
    trophyGroup.add(cup);

    // Asas del trofeo
    for (let i = 0; i < 2; i++) {
      const handleGeometry = new THREE.TorusGeometry(0.08, 0.02, 4, 8);
      const handleMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFD700,
        transparent: true,
        opacity: 0.9,
        metalness: 0.8,
        roughness: 0.2
      });
      const handle = new THREE.Mesh(handleGeometry, handleMaterial);
      handle.position.set(i === 0 ? -0.15 : 0.15, 0.8, 0);
      handle.rotation.y = Math.PI / 2;
      trophyGroup.add(handle);
    }

    trophyGroup.position.set(0, 0, 0);
    celebrationGroup.add(trophyGroup);

    // Banderas de celebración
    for (let i = 0; i < 6; i++) {
      const flagGeometry = new THREE.PlaneGeometry(0.3, 0.2);
      const flagMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(Math.random(), 0.8, 0.7),
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      });
      const flag = new THREE.Mesh(flagGeometry, flagMaterial);
      
      const angle = (i / 6) * Math.PI * 2;
      const radius = 2.5;
      flag.position.set(
        Math.cos(angle) * radius,
        1.5,
        Math.sin(angle) * radius
      );
      flag.rotation.y = angle;
      celebrationGroup.add(flag);
    }

    // Posicionar el grupo completo
    celebrationGroup.position.set(0, 0, 0);
    this.sphere.add(celebrationGroup);
    this.toolParticles.push(celebrationGroup);
  }

  private createToolSpecificVisuals(config: ToolVisualConfig, toolName: string) {
    // Limpiar visuales existentes
    this.toolParticles.forEach(particle => {
      this.sphere.remove(particle);
    });
    this.toolParticles = [];

    // Crear visuales específicas según la herramienta
    if (toolName.includes('Warehouse') || toolName.includes('Bodega')) {
      this.createWarehouseVisuals(config);
    } else if (toolName.includes('Product') || toolName.includes('Cart') || toolName.includes('Add')) {
      this.createProductVisuals(config);
    } else if (toolName.includes('Client') || toolName.includes('Customer')) {
      this.createClientVisuals(config);
    } else if (toolName.includes('Billing') || toolName.includes('Factura')) {
      this.createBillingVisuals(config);
    } else if (toolName.includes('Shipping') || toolName.includes('Envio')) {
      this.createShippingVisuals(config);
    } else if (toolName.includes('Payment') || toolName.includes('Pay') || toolName.includes('Sale')) {
      this.createPaymentVisuals(config);
    } else if (toolName.includes('Celebration') || toolName.includes('Celebrate')) {
      this.createCelebrationVisuals(config);
    } else {
      // Visual por defecto con partículas
      this.createToolParticles(config);
    }
  }
}
