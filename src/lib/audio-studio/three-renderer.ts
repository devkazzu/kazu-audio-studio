import * as THREE from "three";
import type { AudioFrame, VisualizerSettings } from "./types";
import type { VisualRenderer } from "./visualizer-manager";
export class ThreeRenderer implements VisualRenderer {
  readonly kind = "webgl";
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.1, 100);
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.Material | null = null;
  private object: THREE.Object3D | null = null;
  private basePositions: Float32Array | null = null;
  private mode = "";
  private quality = "";
  private time = 0;
  private width = 1280;
  private height = 720;
  private color = new THREE.Color();
  private direction = new THREE.Vector3();
  constructor(public canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: "low-power",
      preserveDrawingBuffer: true,
    });
    this.renderer.setClearColor("#0B0714");
    this.camera.position.z = 4.2;
    this.scene.add(new THREE.AmbientLight(0xc77dff, 2));
    const light = new THREE.PointLight(0xff9bd2, 18, 30);
    light.position.set(3, 2, 4);
    this.scene.add(light);
  }
  resize(width: number, height: number, pixelRatio = 1) {
    this.width = width;
    this.height = height;
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
  private clear() {
    if (this.object) {
      this.scene.remove(this.object);
      this.object.traverse((child) => {
        if (
          child instanceof THREE.Mesh ||
          child instanceof THREE.Line ||
          child instanceof THREE.Points
        ) {
          child.geometry.dispose();
          const materials = Array.isArray(child.material)
            ? child.material
            : [child.material];
          materials.forEach((material) => material.dispose());
        }
      });
    }
    this.geometry?.dispose();
    if (Array.isArray(this.material)) this.material.forEach((m) => m.dispose());
    else this.material?.dispose();
    this.geometry = null;
    this.material = null;
    this.object = null;
    this.basePositions = null;
  }
  private build(settings: VisualizerSettings) {
    this.clear();
    this.mode = settings.mode;
    const quality =
      settings.quality === "low"
        ? 0.5
        : settings.quality === "medium"
          ? 0.75
          : 1;
    this.color.set(settings.color);
    if (["galaxy", "particles"].includes(settings.mode)) {
      const count = Math.floor(settings.particleCount * quality);
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const radius = Math.pow(i / count, 0.7) * 2.4;
        const angle = i * 0.13 + radius * 2.5;
        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 1] =
          settings.mode === "galaxy"
            ? Math.sin(angle) * radius * 0.6
            : (Math.random() - 0.5) * 5;
        positions[i * 3 + 2] =
          settings.mode === "galaxy"
            ? (Math.random() - 0.5) * 0.3 * radius
            : (Math.random() - 0.5) * 5;
        const c = this.color
          .clone()
          .lerp(new THREE.Color(settings.secondaryColor), i / count);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }
      this.geometry = new THREE.BufferGeometry();
      this.geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3),
      );
      this.geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      this.material = new THREE.PointsMaterial({
        size: 0.016 * settings.intensity,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      this.object = new THREE.Points(this.geometry, this.material);
    } else if (settings.mode === "tunnel") {
      const group = new THREE.Group();
      const segments = settings.quality === "low" ? 16 : 36;
      for (let i = 0; i < 32; i++) {
        const radius = 0.18 + i * 0.075;
        const points = Array.from(
          { length: segments + 1 },
          (_, j) =>
            new THREE.Vector3(
              Math.cos((j / segments) * Math.PI * 2) * radius,
              Math.sin((j / segments) * Math.PI * 2) * radius,
              -i * 0.4,
            ),
        );
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
          color: i % 3 ? settings.color : settings.secondaryColor,
          transparent: true,
          opacity: 0.3 + i / 50,
        });
        const line = new THREE.Line(geometry, material);
        group.add(line);
      }
      this.object = group;
    } else {
      const segments = Math.floor(72 * quality);
      const rings = Math.floor(36 * quality);
      this.geometry =
        settings.mode === "equalizer"
          ? new THREE.BoxGeometry(0.08, 1, 0.08)
          : new THREE.SphereGeometry(1, segments, rings);
      if (settings.mode === "equalizer") {
        const group = new THREE.Group();
        const count = 64;
        for (let i = 0; i < count; i++) {
          const material = new THREE.MeshBasicMaterial({
            color: new THREE.Color(settings.color).lerp(
              new THREE.Color(settings.secondaryColor),
              i / count,
            ),
            wireframe: true,
          });
          const mesh = new THREE.Mesh(this.geometry, material);
          const angle = (i / count) * Math.PI * 2;
          mesh.position.set(Math.cos(angle) * 1.2, 0, Math.sin(angle) * 1.2);
          group.add(mesh);
        }
        this.object = group;
      } else {
        this.basePositions = new Float32Array(
          this.geometry.attributes.position.array,
        );
        this.material = new THREE.MeshBasicMaterial({
          color: settings.color,
          wireframe: true,
          transparent: true,
          opacity: 0.8,
        });
        this.object = new THREE.Mesh(this.geometry, this.material);
      }
    }
    if (this.object) this.scene.add(this.object);
  }
  render(frame: AudioFrame, settings: VisualizerSettings, delta: number) {
    const t = (this.time += delta * settings.speed);
    this.renderer.setClearColor(settings.background);
    if (
      this.mode !== settings.mode ||
      this.color.getHexString() !==
        new THREE.Color(settings.color).getHexString()
    )
      this.build(settings);
    if (this.object) {
      this.object.rotation.y = t * settings.rotation * 0.2;
      this.object.rotation.z = Math.sin(t * 0.15) * 0.1;
    }
    const energy = Math.min(1, frame.bass * settings.sensitivity);
    this.camera.position.z = 4.2 - energy * settings.intensity * 0.25;
    this.camera.lookAt(0, 0, 0);
    if (this.geometry && this.basePositions && settings.mode !== "equalizer") {
      const positions = this.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const x = this.basePositions[i * 3];
        const y = this.basePositions[i * 3 + 1];
        const z = this.basePositions[i * 3 + 2];
        const displacement =
          1 +
          Math.sin(x * 5 + t * 2) *
            Math.cos(y * 4 + t) *
            energy *
            settings.intensity *
            0.4;
        positions.setXYZ(
          i,
          x * displacement,
          y * displacement,
          z * displacement,
        );
      }
      positions.needsUpdate = true;
    }
    if (this.object instanceof THREE.Group) {
      if (settings.mode === "tunnel")
        this.object.rotation.z = t * settings.rotation * 0.15;
      else
        this.object.children.forEach((child, i) => {
          child.scale.y = 0.2 + frame.bands[i] * 3 * settings.intensity;
        });
    }
    this.renderer.render(this.scene, this.camera);
  }
  dispose() {
    this.clear();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.scene.clear();
  }
}
