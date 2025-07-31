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

@Component({
  selector: 'app-visual3d',
  templateUrl: './visual3d.component.html',
  styleUrls: ['./visual3d.component.scss']
})
export class Visual3dComponent implements OnInit, OnChanges {
  @Input() inputNode!: AudioNode;
  @Input() outputNode!: AudioNode;

  @ViewChild('canvas', { static: true }) private canvasRef!: ElementRef<HTMLCanvasElement>;

  private inputAnalyser!: Analyser;
  private outputAnalyser!: Analyser;
  private camera!: THREE.PerspectiveCamera;
  private backdrop!: THREE.Mesh;
  private composer!: EffectComposer;
  private sphere!: THREE.Mesh;
  private prevTime = 0;
  private rotation = new THREE.Vector3(0, 0, 0);

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
  }

  private init() {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(rect.width || 400, 200);
    const height = Math.max(rect.height || 300, 150);

    // Set canvas size explicitly
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const scene = new THREE.Scene();
    // Fondo sobrio y profesional
    scene.background = new THREE.Color(0x1a1a1a);

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
    scene.add(backdrop);
    this.backdrop = backdrop;

    const camera = new THREE.PerspectiveCamera(
      75,
      width / height,
      0.1,
      1000,
    );
    camera.position.set(2, -2, 5);
    this.camera = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: this.canvasRef.nativeElement,
      antialias: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const geometry = new THREE.IcosahedronGeometry(1.0, 8); // Tamaño moderado y detalle sutil

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
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
    scene.add(this.sphere);
    this.sphere.visible = false;

    // Agregar iluminación sutil y profesional
    this.addSubtleLighting(scene);

    // Make sure sphere becomes visible after a timeout even if EXR fails
    setTimeout(() => {
      if (this.sphere && !this.sphere.visible) {
        this.sphere.visible = true;
      }
    }, 2000);

    const renderPass = new RenderPass(scene, camera);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.3,      // Intensidad muy baja
      0.2,      // Radio pequeño
      0.9,      // Umbral alto - casi sin bloom
    );

    const fxaaPass = new ShaderPass(FXAAShader);

    this.composer = new EffectComposer(renderer);
    this.composer.addPass(renderPass);
    // this.composer.addPass(fxaaPass);
    this.composer.addPass(bloomPass);

    const onWindowResize = () => {
      const newRect = canvas.getBoundingClientRect();
      const newWidth = newRect.width || width;
      const newHeight = newRect.height || height;
      
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      const dPR = renderer.getPixelRatio();
      (backdrop.material as THREE.RawShaderMaterial).uniforms['resolution'].value.set(newWidth * dPR, newHeight * dPR);
      renderer.setSize(newWidth, newHeight);
      this.composer.setSize(newWidth, newHeight);
      (fxaaPass.material.uniforms as any)['resolution'].value.set(
        1 / (newWidth * dPR),
        1 / (newHeight * dPR),
      );
    }

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

  private addSubtleLighting(scene: THREE.Scene): void {
    // Luz ambiente suave
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
    
    // Una sola luz direccional suave
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(2, 5, 3);
    scene.add(mainLight);
  }
}
