"use client";
import { useEffect, useRef } from "react";
import { CanvasRenderer, LayerRenderer, demoFrame, idleFrame, type VisualRenderer } from "@/lib/audio-studio/visualizer-manager";
import { webGLAvailable } from "@/lib/audio-studio/device-capabilities";
import type { AudioEngine } from "@/lib/audio-studio/audio-engine";
import type { StudioConfig } from "@/lib/audio-studio/types";
export async function createConfiguredRenderer(canvas: HTMLCanvasElement, config: StudioConfig, allow3D = true): Promise<VisualRenderer> {
  if (!canvas.getContext("2d", { alpha: false })) throw new Error("Canvas is not available in this browser.");
  if (allow3D && ["sphere", "galaxy", "tunnel", "particles", "rings", "geometry", "equalizer"].includes(config.settings.mode) && webGLAvailable()) {
    try {
      const { ThreeRenderer } = await import("@/lib/audio-studio/three-renderer");
      return new LayerRenderer(canvas, new ThreeRenderer(document.createElement("canvas")));
    } catch (error) { console.warn("WebGL unavailable; using Canvas 2D.", error); }
  }
  return new LayerRenderer(canvas, new CanvasRenderer(document.createElement("canvas")));
}
export function VisualizerCanvas({ config, engine, demo = false, className = "", allow3D = true, onFallback }: { config: StudioConfig; engine?: AudioEngine | null; demo?: boolean; className?: string; allow3D?: boolean; onFallback?: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const latest = useRef({ config, allow3D });
  const fallback = useRef(onFallback);
  useEffect(() => { latest.current = { config, allow3D }; fallback.current = onFallback; engine?.configure(config.settings); }, [config, allow3D, engine, onFallback]);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    let renderer: VisualRenderer | null = null;
    let animation = 0; let disposed = false; let last = performance.now(); let elapsed = 0;
    let draw: (now: number) => void = () => {};
    let visible = !document.hidden; let inView = true;
    let cleanup = () => {};
    const resize = () => { const rect = canvas.getBoundingClientRect(); if (rect.width && rect.height && renderer) renderer.resize(rect.width, rect.height, Math.min(devicePixelRatio || 1, latest.current.config.settings.quality === "low" ? 1 : 1.5)); };
    const start = async () => {
      if (disposed) return;
      renderer = new LayerRenderer(canvas, new CanvasRenderer(document.createElement("canvas"))); resize();
      try {
        const configured = await createConfiguredRenderer(canvas, latest.current.config, latest.current.allow3D);
        if (disposed) { configured.dispose(); return; }
        renderer.dispose(); renderer = configured; resize();
      } catch { if (!disposed) fallback.current?.(); }
      if (disposed || !renderer) return;
      draw = now => {
        if (disposed || !visible || !inView) { animation = 0; return; }
        const delta = Math.min(0.1, (now - last) / 1000); last = now; if (demo) elapsed += delta;
        try { renderer!.render(demo ? demoFrame(elapsed) : engine?.analyze() || idleFrame(), latest.current.config.settings, delta); }
        catch {
          if (renderer instanceof LayerRenderer && renderer.implementationKind === "webgl") { renderer.dispose(); renderer = new LayerRenderer(canvas, new CanvasRenderer(document.createElement("canvas"))); resize(); fallback.current?.(); }
        }
        animation = requestAnimationFrame(draw);
      };
    };
    const restart = () => { if (!animation && visible && inView && !disposed && renderer) { last = performance.now(); animation = requestAnimationFrame(draw); } };
    const visibility = () => { visible = !document.hidden; cancelAnimationFrame(animation); animation = 0; restart(); };
    const observer = new IntersectionObserver(entries => { inView = entries[0]?.isIntersecting ?? true; cancelAnimationFrame(animation); animation = 0; restart(); });
    const resizeObserver = new ResizeObserver(resize);
    observer.observe(canvas); resizeObserver.observe(canvas); document.addEventListener("visibilitychange", visibility);
    cleanup = () => { observer.disconnect(); resizeObserver.disconnect(); document.removeEventListener("visibilitychange", visibility); };
    void start();
    return () => { disposed = true; cancelAnimationFrame(animation); cleanup(); renderer?.dispose(); };
  }, [config.settings.mode, config.settings.quality, allow3D, demo, engine]);
  return <canvas ref={ref} className={`visualizer-canvas ${className}`} width={1280} height={720} aria-label={demo ? "Animated preset preview" : "Audio-reactive visualizer preview"} />;
}
