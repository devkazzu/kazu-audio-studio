import { AudioEngine } from "./audio-engine";
import {
  LayerRenderer,
  idleFrame,
  type VisualRenderer,
} from "./visualizer-manager";
import { exportDimensions, supportedMime } from "./device-capabilities";
import type { StudioConfig, ExportRecord } from "./types";
export class ExportEngine {
  private renderer: LayerRenderer | null = null;
  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private animation = 0;
  private chunks: Blob[] = [];
  private cancelled = false;
  private elapsed = 0;
  private accumulated = 0;
  private segmentStart = 0;
  private lastFrame = 0;
  private visibilityHandler: (() => void) | null = null;
  private abortHandler: (() => void) | null = null;
  onProgress?: (progress: number, elapsed: number) => void;
  onError?: (message: string) => void;
  get state() {
    return this.recorder?.state ?? "inactive";
  }
  get recording() {
    return this.recorder?.state === "recording";
  }
  async start(
    canvas: HTMLCanvasElement,
    engine: AudioEngine,
    config: StudioConfig,
    createRenderer: (
      canvas: HTMLCanvasElement,
    ) => VisualRenderer | Promise<VisualRenderer>,
    projectId: string,
    signal?: AbortSignal,
  ): Promise<ExportRecord> {
    const mime = supportedMime();
    if (!mime || !canvas.captureStream)
      throw new Error(
        "Video recording is not supported by this browser. Try desktop Chrome or a recent browser.",
      );
    if (!engine.info.name || engine.info.duration <= 0)
      throw new Error("Import an audio track before exporting a music video.");
    if (engine.info.microphone)
      throw new Error("Stop microphone mode before exporting a track.");
    if (signal?.aborted) throw new Error("Export cancelled.");
    const { width, height } = exportDimensions(
      config.settings.aspectRatio,
      config.settings.resolution,
    );
    try {
      await engine.initialize();
      if (signal?.aborted) throw new Error("Export cancelled.");
      this.renderer = new LayerRenderer(canvas, await createRenderer(canvas));
      this.renderer.resize(width, height, 1);
      this.renderer.renderConfig(config, idleFrame(), 0);
      this.stream = canvas.captureStream(30);
      const audio = engine.recordingStream;
      if (!audio)
        throw new Error("The audio stream is not ready. Please try again.");
      audio
        .getAudioTracks()
        .forEach((track) => this.stream!.addTrack(track.clone()));
      this.recorder = new MediaRecorder(this.stream, {
        mimeType: mime,
        videoBitsPerSecond:
          config.settings.resolution === 1080
            ? 8000000
            : config.settings.resolution === 720
              ? 4000000
              : 2000000,
        audioBitsPerSecond: 192000,
      });
    } catch (error) {
      this.cleanup();
      throw error;
    }
    return new Promise<ExportRecord>((resolve, reject) => {
      const recorder = this.recorder!;
      this.chunks = [];
      this.cancelled = false;
      this.elapsed = 0;
      this.accumulated = 0;
      recorder.ondataavailable = (event) => {
        if (event.data.size) this.chunks.push(event.data);
      };
      recorder.onerror = () => {
        this.cleanup();
        reject(
          new Error(
            "The browser could not record this video. Try 720p or a lower resolution.",
          ),
        );
      };
      recorder.onstop = () => {
        if (recorder.state === "recording")
          this.elapsed =
            this.accumulated + (performance.now() - this.segmentStart) / 1000;
        engine.pause();
        const cancelled = this.cancelled;
        const duration = this.elapsed;
        const mimeType = recorder.mimeType;
        let thumbnail = "";
        try {
          thumbnail = canvas.toDataURL("image/jpeg", 0.7);
        } catch {}
        this.cleanup();
        if (cancelled) {
          reject(new Error("Export cancelled."));
          return;
        }
        const blob = new Blob(this.chunks, { type: mimeType });
        this.chunks = [];
        if (!blob.size) {
          reject(new Error("No video frames were recorded. Please try again."));
          return;
        }
        resolve({
          id: crypto.randomUUID(),
          projectId,
          name: engine.audioName.replace(/\.[^.]+$/, ""),
          blob,
          thumbnail,
          duration,
          width,
          height,
          fps: 30,
          mimeType,
          createdAt: Date.now(),
          completed: true,
        });
      };
      const draw = (now: number) => {
        if (recorder.state === "inactive") return;
        const delta = Math.min(0.1, (now - this.lastFrame) / 1000);
        this.lastFrame = now;
        if (recorder.state === "recording")
          this.elapsed = this.accumulated + (now - this.segmentStart) / 1000;
        this.renderer!.renderConfig(
          config,
          engine.analyze() || idleFrame(),
          delta,
        );
        this.onProgress?.(
          Math.min(1, engine.audio.currentTime / engine.audio.duration),
          this.elapsed,
        );
        this.animation = requestAnimationFrame(draw);
      };
      this.abortHandler = () => this.cancel();
      signal?.addEventListener("abort", this.abortHandler, { once: true });
      this.visibilityHandler = () => {
        if (document.hidden && recorder.state !== "inactive") {
          if (recorder.state === "recording") {
            this.elapsed =
              this.accumulated + (performance.now() - this.segmentStart) / 1000;
            this.accumulated = this.elapsed;
            recorder.pause();
            engine.pause();
          }
          this.onError?.(
            "Recording paused while the tab was hidden. Return and resume to avoid missing frames.",
          );
        }
      };
      document.addEventListener("visibilitychange", this.visibilityHandler);
      const start = async () => {
        try {
          engine.audio.currentTime = 0;
          await engine.play();
          if (recorder.state !== "inactive" || this.cancelled) return;
          this.lastFrame = performance.now();
          this.segmentStart = this.lastFrame;
          recorder.start(1000);
          this.animation = requestAnimationFrame(draw);
        } catch (error) {
          this.cleanup();
          reject(error);
        }
      };
      void start();
    });
  }
  pause(engine: AudioEngine) {
    if (this.recorder?.state === "recording") {
      this.elapsed =
        this.accumulated + (performance.now() - this.segmentStart) / 1000;
      this.accumulated = this.elapsed;
      this.recorder.pause();
      engine.pause();
    }
  }
  resume(engine: AudioEngine) {
    if (this.recorder?.state === "paused") {
      void engine
        .play()
        .then(() => {
          if (this.recorder?.state === "paused") {
            this.segmentStart = performance.now();
            this.recorder.resume();
          }
        })
        .catch((error) => this.onError?.(error.message));
    }
  }
  stop() {
    if (this.recorder && this.recorder.state !== "inactive")
      this.recorder.stop();
  }
  cancel() {
    this.cancelled = true;
    this.stop();
  }
  private cleanup() {
    cancelAnimationFrame(this.animation);
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.renderer?.dispose();
    this.renderer = null;
    if (this.visibilityHandler)
      document.removeEventListener("visibilitychange", this.visibilityHandler);
    if (this.abortHandler)
      document.removeEventListener("abort", this.abortHandler);
    this.visibilityHandler = null;
    this.abortHandler = null;
    this.recorder = null;
  }
}
