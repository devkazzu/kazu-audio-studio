import type {
  AudioFrame,
  StudioConfig,
  VisualizerSettings,
  StudioLayer,
} from "./types";
export function idleFrame(): AudioFrame {
  return {
    frequency: new Uint8Array(1024),
    waveform: new Uint8Array(2048).fill(128),
    bands: new Float32Array(64).fill(0.08),
    bass: 0,
    mid: 0,
    treble: 0,
    energy: 0,
    transient: false,
    time: 0,
  };
}
export function demoFrame(time: number): AudioFrame {
  const frame = idleFrame();
  for (let i = 0; i < 64; i++)
    frame.bands[i] = 0.2 + Math.abs(Math.sin(i * 0.19 + time * 1.3)) * 0.6;
  for (let i = 0; i < 1024; i++)
    frame.frequency[i] = frame.bands[Math.floor(i / 16)] * 255;
  for (let i = 0; i < 2048; i++)
    frame.waveform[i] = 128 + Math.sin(i * 0.045 + time * 3) * 35;
  frame.bass = 0.65 + Math.sin(time * 4) * 0.2;
  frame.mid = 0.5;
  frame.treble = 0.35;
  frame.energy = 0.3;
  frame.time = time;
  frame.transient = Math.sin(time * 4) > 0.95;
  return frame;
}
export interface VisualRenderer {
  readonly kind: string;
  readonly canvas: HTMLCanvasElement;
  resize(width: number, height: number, pixelRatio?: number): void;
  render(
    frame: AudioFrame,
    settings: VisualizerSettings,
    delta: number,
    preview?: boolean,
  ): void;
  dispose(): void;
}
export class CanvasRenderer implements VisualRenderer {
  readonly kind = "2d";
  canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 1280;
  private height = 720;
  private time = 0;
  private stars: { x: number; y: number; z: number; size: number }[] = [];
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx)
      throw new Error("Canvas rendering is not supported in this browser.");
    this.ctx = ctx;
    for (let i = 0; i < 1200; i++)
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        z: Math.random(),
        size: Math.random() * 2 + 0.5,
      });
  }
  resize(width: number, height: number, pixelRatio = 1) {
    this.width = Math.max(1, Math.round(width * pixelRatio));
    this.height = Math.max(1, Math.round(height * pixelRatio));
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }
  private rgba(hex: string, alpha: number) {
    return `${hex}${Math.round(Math.max(0, Math.min(1, alpha)) * 255)
      .toString(16)
      .padStart(2, "0")}`;
  }
  render(
    frame: AudioFrame,
    settings: VisualizerSettings,
    delta: number,
    preview = false,
  ) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    this.time += delta * settings.speed;
    const t = this.time;
    const energy = Math.min(1, frame.energy * 3 + frame.bass * 0.4);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = settings.background;
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const base = Math.min(w, h);
    const color = settings.color;
    const secondary = settings.secondaryColor;
    const accent = frame.transient ? secondary : color;
    if (
      ["particles", "galaxy", "landscape", "sphere", "tunnel"].includes(
        settings.mode,
      ) ||
      preview
    ) {
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, base * 0.7);
      glow.addColorStop(0, this.rgba(color, 0.12 + energy * 0.1));
      glow.addColorStop(1, settings.background);
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
    }
    if (settings.glow > 0) {
      ctx.shadowBlur = base * 0.025 * settings.glow;
      ctx.shadowColor = accent;
    }
    const bars = (circular: boolean, radial = false) => {
      const count = settings.quality === "low" ? 48 : 96;
      for (let i = 0; i < count; i++) {
        const value = Math.max(
          0.025,
          frame.bands[Math.floor((i / count) * 63)] *
            settings.sensitivity *
            settings.intensity,
        );
        const angle =
          (i / count) * Math.PI * 2 - Math.PI / 2 + t * settings.rotation * 0.2;
        const radius = base * 0.24;
        const length = base * 0.2 * value;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        const gradient = ctx.createLinearGradient(
          radius,
          0,
          radius + length,
          0,
        );
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, secondary);
        ctx.fillStyle = gradient;
        if (circular) ctx.fillRect(radius, -base * 0.008, length, base * 0.016);
        else {
          ctx.beginPath();
          ctx.moveTo(radius, 0);
          ctx.lineTo(
            radius + length,
            Math.sin(i * 0.15 + t * 2) * base * 0.05 * value,
          );
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 2 * settings.intensity;
          ctx.stroke();
        }
        ctx.restore();
      }
    };
    const waveform = (oscilloscope = false) => {
      for (let layer = 0; layer < (oscilloscope ? 2 : 4); layer++) {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 3) {
          const index = Math.floor((x / w) * 2047);
          const value = (frame.waveform[index] - 128) / 128;
          const y =
            cy +
            value * h * 0.35 * settings.intensity * settings.sensitivity +
            Math.sin((x / w) * 12 + t + layer) * h * 0.025 * layer;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = this.rgba(
          layer % 2 ? secondary : color,
          1 - layer * 0.18,
        );
        ctx.lineWidth = (oscilloscope ? 2.5 : 2) * settings.intensity;
        ctx.stroke();
      }
    };
    const particles = (galaxy: boolean) => {
      const count = Math.min(
        settings.particleCount,
        settings.quality === "low"
          ? 700
          : settings.quality === "medium"
            ? 2200
            : 6000,
      );
      for (let i = 0; i < count; i++) {
        const star = this.stars[i % this.stars.length];
        let x: number;
        let y: number;
        if (galaxy) {
          const radius = (i / count) * base * 0.45;
          const angle = i * 0.12 + (radius / base) * 7 + t * settings.rotation;
          x = cx + Math.cos(angle) * radius;
          y = cy + Math.sin(angle) * radius * 0.52;
        } else {
          x = ((star.x + t * 0.012 * settings.rotation) % 1) * w;
          y = (star.y + Math.sin(t + i) * 0.015) * h;
        }
        ctx.fillStyle = this.rgba(
          i % 4 ? color : secondary,
          (0.2 + star.z * 0.7) * settings.intensity,
        );
        const size = ((star.size * base) / 720) * (galaxy ? 1 + energy : 1);
        ctx.fillRect(x, y, size, size);
        if (i % 90 === 0) {
          ctx.beginPath();
          ctx.arc(x, y, size * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };
    switch (settings.mode) {
      case "spectrum":
      case "equalizer": {
        const count = settings.quality === "low" ? 32 : 64;
        const gap = w / count;
        for (let i = 0; i < count; i++) {
          const value = Math.max(
            0.025,
            frame.bands[Math.floor((i / count) * 63)] *
              settings.intensity *
              settings.sensitivity,
          );
          const barHeight = value * h * 0.55;
          const gradient = ctx.createLinearGradient(
            0,
            h * 0.8 - barHeight,
            0,
            h * 0.8,
          );
          gradient.addColorStop(0, secondary);
          gradient.addColorStop(1, color);
          ctx.fillStyle = gradient;
          if (settings.mode === "equalizer") {
            ctx.save();
            ctx.translate(cx, h * 0.8);
            ctx.scale(1, 0.45);
            ctx.fillRect(
              (i - count / 2) * gap * 0.7,
              -barHeight,
              gap * 0.5,
              barHeight * 2,
            );
            ctx.restore();
          } else
            ctx.fillRect(
              i * gap + gap * 0.2,
              h * 0.8 - barHeight,
              gap * 0.6,
              barHeight,
            );
        }
        break;
      }
      case "circular":
      case "radial-wave":
        bars(true, settings.mode === "radial-wave");
        break;
      case "waveform":
        waveform();
        break;
      case "oscilloscope":
        ctx.strokeStyle = this.rgba(color, 0.12);
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += w / 12) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        for (let y = 0; y < h; y += h / 8) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
        waveform(true);
        break;
      case "particles":
        particles(false);
        break;
      case "galaxy":
        particles(true);
        break;
      case "sphere":
      case "geometry": {
        const rings = settings.quality === "low" ? 18 : 32;
        for (let j = 0; j < rings; j++) {
          const latitude = (j / rings) * Math.PI;
          const radius = base * 0.27 * (1 + energy * 0.15);
          ctx.beginPath();
          for (let i = 0; i <= 100; i++) {
            const angle = (i / 100) * Math.PI * 2;
            const r =
              radius *
              (1 +
                Math.sin(angle * 6 + latitude * 4 + t * 2) *
                  frame.bass *
                  settings.intensity *
                  0.3);
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            const projected =
              Math.sin(latitude) * 0.8 +
              Math.cos(latitude + t * settings.rotation * 0.1) * 0.2;
            if (i === 0) ctx.moveTo(cx + x, cy + y * projected);
            else ctx.lineTo(cx + x, cy + y * projected);
          }
          ctx.strokeStyle = this.rgba(j % 4 ? color : secondary, 0.45);
          ctx.lineWidth = base / 850;
          ctx.stroke();
        }
        break;
      }
      case "tunnel": {
        for (let i = 0; i < 22; i++) {
          const progress = (i / 22 + t * 0.08 * settings.speed) % 1;
          const size = base * 0.025 + Math.pow(progress, 2) * base * 0.75;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(t * settings.rotation * 0.1 + i * 0.035);
          ctx.strokeStyle = this.rgba(i % 2 ? secondary : color, progress);
          ctx.lineWidth = ((1 + energy * 3) * base) / 720;
          ctx.strokeRect(-size / 2, -size / 2, size, size);
          ctx.restore();
        }
        break;
      }
      case "rings": {
        for (let i = 0; i < 8; i++) {
          const radius =
            base *
            (0.12 + i * 0.04) *
            (1 + frame.bands[i * 5] * settings.intensity * 0.7);
          ctx.beginPath();
          ctx.ellipse(
            cx,
            cy,
            radius,
            radius * 0.7,
            t * settings.rotation * 0.2 + i * 0.2,
            0,
            Math.PI * 2,
          );
          ctx.strokeStyle = this.rgba(
            i % 2 ? secondary : color,
            0.9 - i * 0.07,
          );
          ctx.lineWidth = (base / 350) * settings.intensity;
          ctx.stroke();
        }
        break;
      }
      case "liquid":
      case "plasma": {
        for (let j = 0; j < 12; j++) {
          ctx.beginPath();
          for (let x = 0; x <= w; x += 4) {
            const y =
              cy +
              Math.sin((x / w) * 10 + t + j * 0.22) *
                base *
                0.12 *
                settings.intensity +
              Math.sin((x / w) * 22 - t * 1.4 + j * 0.3) *
                frame.mid *
                base *
                0.08 +
              (j - 6) * base * 0.018;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = this.rgba(j % 2 ? secondary : color, 0.25 + j / 30);
          ctx.lineWidth = (base / 200) * (settings.mode === "plasma" ? 1.8 : 1);
          ctx.stroke();
        }
        break;
      }
      case "landscape": {
        const horizon = h * 0.6;
        const glow = ctx.createRadialGradient(
          cx,
          horizon,
          0,
          cx,
          horizon,
          base * 0.25,
        );
        glow.addColorStop(0, secondary);
        glow.addColorStop(0.6, color);
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, horizon, base * 0.2, 0, Math.PI * 2);
        ctx.fill();
        for (let j = 0; j < 18; j++) {
          const y = horizon + Math.pow(j / 18, 2) * (h - horizon);
          ctx.strokeStyle = this.rgba(color, 0.5);
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
        for (let i = -12; i <= 12; i++) {
          ctx.beginPath();
          ctx.moveTo(cx + i * base * 0.02, horizon);
          ctx.lineTo(cx + i * base * 0.14, h);
          ctx.stroke();
        }
        particles(false);
        break;
      }
    }
    ctx.shadowBlur = 0;
  }
  dispose() {
    this.stars = [];
  }
}
export class LayerRenderer implements VisualRenderer {
  get kind() {
    return this.renderer.kind;
  }
  readonly canvas: HTMLCanvasElement;
  private renderer: VisualRenderer;
  get implementationKind() {
    return this.renderer.kind;
  }
  private buffer: HTMLCanvasElement;
  private images = new Map<string, HTMLImageElement | HTMLVideoElement>();
  constructor(canvas: HTMLCanvasElement, renderer?: VisualRenderer) {
    this.canvas = canvas;
    this.buffer = document.createElement("canvas");
    this.renderer = renderer ?? new CanvasRenderer(this.buffer);
  }
  resize(width: number, height: number, pixelRatio = 1) {
    this.renderer.resize(width, height, pixelRatio);
    if (
      this.buffer.width !== this.renderer.canvas.width ||
      this.buffer.height !== this.renderer.canvas.height
    ) {
      this.buffer.width = this.renderer.canvas.width;
      this.buffer.height = this.renderer.canvas.height;
    }
  }
  private image(src: string) {
    if (!src) return null;
    const existing = this.images.get(src);
    if (existing) return existing;
    let image: HTMLImageElement | HTMLVideoElement;
    if (src.startsWith("data:video/")) {
      image = document.createElement("video");
      image.muted = true;
      image.loop = true;
      image.playsInline = true;
      (image as HTMLVideoElement).addEventListener(
        "loadeddata",
        () => {
          void (image as HTMLVideoElement).play().catch(() => {});
        },
        { once: true },
      );
    } else if (src.startsWith("data:image/")) image = new Image();
    else return null;
    if (image instanceof HTMLVideoElement && layerSrcIsVideo(src)) {
      image.src = src;
    } else if (image instanceof HTMLImageElement) {
      image.src = src;
    } else return null;
    this.images.set(src, image);
    return image;
  }
  render(frame: AudioFrame, settings: VisualizerSettings, delta: number) {
    this.renderer.render(frame, settings, delta);
  }
  renderConfig(config: StudioConfig, frame: AudioFrame, delta: number) {
    const ctx = this.canvas.getContext("2d")!;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const sx = w / 1920;
    const sy = h / 1080;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = config.settings.background;
    ctx.fillRect(0, 0, w, h);
    for (const layer of config.layers.filter((l) => l.visible)) {
      ctx.save();
      ctx.globalAlpha = layer.opacity;
      ctx.globalCompositeOperation =
        layer.blend === "normal" ? "source-over" : layer.blend;
      this.drawLayer(layer, config, frame, delta, sx, sy);
      ctx.restore();
    }
  }
  private drawLayer(
    layer: StudioLayer,
    config: StudioConfig,
    frame: AudioFrame,
    delta: number,
    sx: number,
    sy: number,
  ) {
    const ctx = this.canvas.getContext("2d")!;
    if (layer.type !== "background") {
      ctx.translate(layer.x * sx, layer.y * sy);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.translate((-layer.width * sx) / 2, (-layer.height * sy) / 2);
    }
    if (
      layer.type === "background" ||
      layer.type === "image" ||
      layer.type === "video"
    ) {
      const src =
        layer.type === "background" ? "" : "src" in layer ? layer.src : "";
      const image = this.image(src);
      const iw =
        image instanceof HTMLVideoElement
          ? image.videoWidth
          : image?.naturalWidth;
      const ih =
        image instanceof HTMLVideoElement
          ? image.videoHeight
          : image?.naturalHeight;
      if (image && iw && ih) {
        if (layer.type === "image" && layer.crop) {
          const scale = Math.max(
            (layer.width * sx) / iw,
            (layer.height * sy) / ih,
          );
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, layer.width * sx, layer.height * sy);
          ctx.clip();
          ctx.drawImage(
            image,
            (layer.width * sx - iw * scale) / 2,
            (layer.height * sy - ih * scale) / 2,
            iw * scale,
            ih * scale,
          );
          ctx.restore();
        } else {
          const fit =
            layer.type === "image" && layer.fit === "cover"
              ? Math.max
              : Math.min;
          const scale = fit((layer.width * sx) / iw, (layer.height * sy) / ih);
          ctx.drawImage(
            image,
            (layer.width * sx - iw * scale) / 2,
            (layer.height * sy - ih * scale) / 2,
            iw * scale,
            ih * scale,
          );
          if (layer.type === "image" && layer.watermark) {
            ctx.font = `600 ${14 * sx}px Inter, sans-serif`;
            ctx.textAlign = "right";
            ctx.globalAlpha = layer.opacity * 0.65;
            ctx.fillText(
              "KAZU AI",
              layer.width * sx - 18 * sx,
              layer.height * sy - 18 * sx,
            );
          }
        }
      } else if (layer.type === "background") {
        ctx.fillStyle = layer.color;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      }
    } else if (layer.type === "text") {
      const fontSize = layer.fontSize * sx;
      ctx.fillStyle = layer.color;
      ctx.textAlign = layer.align;
      ctx.textBaseline = "middle";
      ctx.font = `${layer.fontWeight} ${fontSize}px ${layer.font}`;
      ctx.shadowColor = layer.color;
      ctx.shadowBlur = layer.glow * 30 * sx;
      ctx.shadowOffsetY = layer.shadow * 5 * sx;
      const text =
        layer.text || [layer.artist, layer.song].filter(Boolean).join(" – ");
      const lines = text.split("\n");
      lines.forEach((line, i) => {
        const y = (i - (lines.length - 1) / 2) * fontSize * layer.lineHeight;
        if ("letterSpacing" in ctx)
          (
            ctx as CanvasRenderingContext2D & { letterSpacing: string }
          ).letterSpacing = `${layer.letterSpacing * sx}px`;
        ctx.fillText(line, (layer.width * sx) / 2, (layer.height * sy) / 2 + y);
      });
      if (layer.subtitle) {
        ctx.font = `400 ${fontSize * 0.3}px ${layer.font}`;
        ctx.fillText(
          layer.subtitle,
          (layer.width * sx) / 2,
          (layer.height * sy) / 2 + fontSize * 1.2,
        );
      }
    } else if (layer.type === "glow") {
      const gradient = ctx.createRadialGradient(
        (layer.width * sx) / 2,
        (layer.height * sy) / 2,
        0,
        (layer.width * sx) / 2,
        (layer.height * sy) / 2,
        Math.max(layer.width * sx, layer.height * sy) / 2,
      );
      gradient.addColorStop(0, `${layer.color}66`);
      gradient.addColorStop(1, `${layer.color}00`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, layer.width * sx, layer.height * sy);
    } else {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, layer.width * sx, layer.height * sy);
      ctx.clip();
      this.renderer.render(
        frame,
        {
          ...config.settings,
          ...layer.settings,
          color: layer.color,
          secondaryColor:
            layer.settings?.secondaryColor || config.settings.secondaryColor,
        },
        delta,
      );
      ctx.drawImage(this.renderer.canvas, 0, 0);
      ctx.restore();
    }
  }
  dispose() {
    this.renderer.dispose();
    this.images.forEach((image) => {
      if (image instanceof HTMLVideoElement) {
        image.pause();
        image.removeAttribute("src");
        image.load();
      }
    });
    this.images.clear();
  }
}

function layerSrcIsVideo(src: string) {
  return src.startsWith("data:video/");
}
