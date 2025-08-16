import { Component, ElementRef, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { Analyser } from '../analyser';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export interface SphereVisualConfig {
  stepName: string;
  animationType: 'pulse' | 'bounce' | 'rotate' | 'wave' | 'slide' | 'glow' | 'celebrate';
  sphereColor: string;
  particleCount: number;
  audioReactive?: boolean;
  celebrationMode?: boolean;
}

@Component({
  selector: 'app-sphere-visual',
  templateUrl: './sphere-visual.component.html',
  styleUrls: ['./sphere-visual.component.scss']
})
export class SphereVisualComponent implements OnInit, OnChanges {
  @Input() inputNode!: AudioNode;
  @Input() outputNode!: AudioNode;
  @Input() sphereConfig!: SphereVisualConfig;

  @ViewChild('canvas', { static: true }) private canvasRef!: ElementRef<HTMLCanvasElement>;

  private inputAnalyser!: Analyser;
  private outputAnalyser!: Analyser;
  private camera!: THREE.PerspectiveCamera;
  private scene!: THREE.Scene;
  private renderer!: THREE.WebGLRenderer;
  private composer!: EffectComposer;
  private sphere!: THREE.Mesh;
  private particles: THREE.Points[] = [];
  private prevTime = 0;
  private rotation = new THREE.Vector3(0, 0, 0);
  private animationId: number = 0;

  // Configuración de animaciones
  private animationConfigs = {
    pulse: { speed: 0.02, amplitude: 0.1 },
    bounce: { speed: 0.03, amplitude: 0.15 },
    rotate: { speed: 0.01, amplitude: 0.05 },
    wave: { speed: 0.025, amplitude: 0.08 },
    slide: { speed: 0.015, amplitude: 0.12 },
    glow: { speed: 0.018, amplitude: 0.06 },
    celebrate: { speed: 0.04, amplitude: 0.2 }
  };

  constructor() { }

  ngOnInit(): void {
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
    if (changes['sphereConfig'] && changes['sphereConfig'].currentValue) {
      this.updateSphereVisual();
    }
  }

  private init() {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(rect.width || 400, 200);
    const height = Math.max(rect.height || 300, 150);

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0a);

    // Configurar cámara
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 5);

    // Configurar renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvasRef.nativeElement,
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Crear esfera principal
    this.createMainSphere();

    // Crear partículas
    this.createParticles();

    // Configurar iluminación
    this.setupLighting();

    // Configurar post-processing
    this.setupPostProcessing(width, height);

    // Configurar resize
    this.setupResizeHandler(width, height);

    this.animate();
  }

  private createMainSphere() {
    const geometry = new THREE.IcosahedronGeometry(1.0, 3);
    const material = new THREE.MeshStandardMaterial({
      color: this.sphereConfig?.sphereColor || 0x4CAF50,
      metalness: 0.3,
      roughness: 0.7,
      transparent: true,
      opacity: 0.9
    });

    this.sphere = new THREE.Mesh(geometry, material);
    this.scene.add(this.sphere);
  }

  private createParticles() {
    const particleCount = this.sphereConfig?.particleCount || 50;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 10;
      positions[i3 + 1] = (Math.random() - 0.5) * 10;
      positions[i3 + 2] = (Math.random() - 0.5) * 10;

      const color = new THREE.Color(this.sphereConfig?.sphereColor || 0x4CAF50);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.8
    });

    const particles = new THREE.Points(geometry, material);
    this.particles.push(particles);
    this.scene.add(particles);
  }

  private setupLighting() {
    // Luz ambiente
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(ambientLight);

    // Luz direccional principal
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(2, 5, 3);
    this.scene.add(mainLight);

    // Luz puntual para efectos
    const pointLight = new THREE.PointLight(0xffffff, 0.5, 10);
    pointLight.position.set(-2, 2, 2);
    this.scene.add(pointLight);
  }

  private setupPostProcessing(width: number, height: number) {
    const renderPass = new RenderPass(this.scene, this.camera);
    
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.5,
      0.4,
      0.85
    );

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderPass);
    this.composer.addPass(bloomPass);
  }

  private setupResizeHandler(width: number, height: number) {
    const onWindowResize = () => {
      const canvas = this.canvasRef.nativeElement;
      const rect = canvas.getBoundingClientRect();
      const newWidth = rect.width || width;
      const newHeight = rect.height || height;

      this.camera.aspect = newWidth / newHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(newWidth, newHeight);
      this.composer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', onWindowResize);
  }

  private updateSphereVisual() {
    if (!this.sphere || !this.sphereConfig) return;

    const material = this.sphere.material as THREE.MeshStandardMaterial;
    material.color.setHex(parseInt(this.sphereConfig.sphereColor.replace('#', '0x')));

    // Actualizar partículas
    this.updateParticles();
  }

  private updateParticles() {
    // Limpiar partículas existentes
    this.particles.forEach(particle => {
      this.scene.remove(particle);
    });
    this.particles = [];

    // Crear nuevas partículas
    this.createParticles();
  }

  private animate() {
    this.animationId = requestAnimationFrame(() => this.animate());

    const time = performance.now();
    const deltaTime = (time - this.prevTime) / 1000;
    this.prevTime = time;

    if (this.sphere && this.sphereConfig) {
      this.applyAnimation(this.sphere, this.sphereConfig.animationType, deltaTime);
    }

    // Animar partículas
    this.animateParticles(deltaTime);

    // Reactividad al audio
    if (this.sphereConfig?.audioReactive && this.outputAnalyser) {
      this.applyAudioReactivity();
    }

    // Modo celebración
    if (this.sphereConfig?.celebrationMode) {
      this.applyCelebrationEffects(deltaTime);
    }

    this.composer.render();
  }

  private applyAnimation(sphere: THREE.Mesh, animationType: string, deltaTime: number) {
    const config = this.animationConfigs[animationType as keyof typeof this.animationConfigs];
    if (!config) return;

    const time = performance.now() * 0.001; // Convertir a segundos

    switch (animationType) {
      case 'pulse':
        const pulseScale = 1 + Math.sin(time * config.speed) * config.amplitude;
        sphere.scale.setScalar(pulseScale);
        break;

      case 'bounce':
        const bounceY = Math.sin(time * config.speed) * config.amplitude;
        sphere.position.y = bounceY;
        break;

      case 'rotate':
        sphere.rotation.y += deltaTime * config.speed * 2;
        sphere.rotation.x += deltaTime * config.speed;
        break;

      case 'wave':
        const waveX = Math.sin(time * config.speed) * config.amplitude;
        sphere.position.x = waveX;
        break;

      case 'slide':
        const slideZ = Math.sin(time * config.speed) * config.amplitude;
        sphere.position.z = 5 + slideZ;
        break;

      case 'glow':
        const material = sphere.material as THREE.MeshStandardMaterial;
        material.emissiveIntensity = 0.5 + Math.sin(time * config.speed) * 0.3;
        break;

      case 'celebrate':
        sphere.rotation.y += deltaTime * config.speed * 3;
        sphere.rotation.x += deltaTime * config.speed * 2;
        sphere.rotation.z += deltaTime * config.speed;
        const celebrateScale = 1 + Math.sin(time * config.speed * 2) * config.amplitude;
        sphere.scale.setScalar(celebrateScale);
        break;
    }
  }

  private animateParticles(deltaTime: number) {
    this.particles.forEach(particle => {
      particle.rotation.y += deltaTime * 0.1;
      particle.rotation.x += deltaTime * 0.05;
    });
  }

  private applyAudioReactivity() {
    if (!this.outputAnalyser || !this.sphere) return;

    this.outputAnalyser.update();
    const audioLevel = this.outputAnalyser.data[0] / 255;
    
    // Escalar esfera con audio
    const scale = 1 + (audioLevel * 0.3);
    this.sphere.scale.setScalar(scale);

    // Cambiar color con audio
    const material = this.sphere.material as THREE.MeshStandardMaterial;
    const baseColor = new THREE.Color(this.sphereConfig.sphereColor);
    const audioColor = new THREE.Color().setHSL(audioLevel, 0.8, 0.5);
    material.color.lerp(audioColor, audioLevel * 0.5);
  }

  private applyCelebrationEffects(deltaTime: number) {
    if (!this.sphere) return;

    // Efectos de celebración
    const time = performance.now() * 0.001; // Convertir a segundos
    
    // Rotación rápida
    this.sphere.rotation.y += deltaTime * 5;
    this.sphere.rotation.x += deltaTime * 3;

    // Escalado pulsante
    const celebrationScale = 1 + Math.sin(time * 0.01) * 0.2;
    this.sphere.scale.setScalar(celebrationScale);

    // Cambio de colores
    const material = this.sphere.material as THREE.MeshStandardMaterial;
    const hue = (time * 0.001) % 1;
    const celebrationColor = new THREE.Color().setHSL(hue, 1, 0.6);
    material.color.copy(celebrationColor);
  }

  ngOnDestroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
} 