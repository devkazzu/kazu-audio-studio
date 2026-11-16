"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  Video,
  ShieldCheck,
  Square,
  Play,
  Pause,
  X,
  Check,
  AlertTriangle,
  LoaderCircle,
} from "lucide-react";
import { Modal, Button } from "@/components/ui";
import { useApp } from "@/components/providers";
import {
  type StudioConfig,
  type ExportRecord,
  formatTime,
} from "@/lib/audio-studio/types";
import { AudioEngine } from "@/lib/audio-studio/audio-engine";
import { ExportEngine } from "@/lib/audio-studio/export-engine";
import { createConfiguredRenderer } from "./visualizer-canvas";
import {
  exportDimensions,
  supportedMime,
  canRecord,
} from "@/lib/audio-studio/device-capabilities";
import { saveExport, downloadBlob } from "@/lib/audio-studio/project-storage";
export function ExportPanel({
  config,
  engine,
  projectId,
  allow3D,
  allowExport,
  onClose,
  onComplete,
}: {
  config: StudioConfig;
  engine: AudioEngine;
  projectId: string;
  allow3D: boolean;
  allowExport: boolean;
  onClose: () => void;
  onComplete: () => void;
}) {
  const { user, toast } = useApp();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const exporter = useRef<ExportEngine | null>(null);
  const abort = useRef<AbortController | null>(null);
  const [state, setState] = useState<
    "idle" | "recording" | "paused" | "saving" | "complete"
  >("idle");
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ExportRecord | null>(null);
  const [resolution, setResolution] = useState(config.settings.resolution);
  const [aspect, setAspect] = useState(config.settings.aspectRatio);
  const [saveWarning, setSaveWarning] = useState("");
  const settings = {
    ...config,
    settings: { ...config.settings, resolution, aspectRatio: aspect },
  };
  const dimensions = exportDimensions(aspect, resolution);
  const mime = supportedMime();
  const active = state === "recording" || state === "paused";
  const videoUrl = useMemo(
    () => (result ? URL.createObjectURL(result.blob) : ""),
    [result],
  );
  useEffect(
    () => () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    },
    [videoUrl],
  );
  useEffect(
    () => () => {
      abort.current?.abort();
      exporter.current?.cancel();
    },
    [],
  );
  async function start() {
    if (!canvasRef.current) return;
    if (!allowExport) {
      setError("Video export is disabled by your administrator.");
      return;
    }
    setError("");
    setState("recording");
    setProgress(0);
    setElapsed(0);
    const controller = new AbortController();
    abort.current = controller;
    const recording = new ExportEngine();
    exporter.current = recording;
    recording.onProgress = (value, time) => {
      setProgress(value);
      setElapsed(time);
    };
    recording.onError = (message) => {
      setError(message);
      setState("paused");
    };
    try {
      const record = await recording.start(
        canvasRef.current,
        engine,
        settings,
        (canvas) => createConfiguredRenderer(canvas, settings, allow3D),
        projectId,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setState("saving");
      try {
        await saveExport(record);
        setResult(record);
        setState("complete");
        onComplete();
        if (user)
          void fetch("/api/studio", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId,
              duration: record.duration,
              width: record.width,
              height: record.height,
            }),
          })
            .then(async (response) => {
              if (!response.ok) {
                const data = await response.json();
                setSaveWarning(
                  `Video saved locally. Activity sync failed: ${data.error}`,
                );
              }
            })
            .catch(() =>
              setSaveWarning(
                "Video saved locally. Activity could not be synced.",
              ),
            );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Local storage is full.");
        setState("idle");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recording failed.");
      setState("idle");
    }
  }
  function close() {
    if (active || state === "saving") {
      toast("Finish or cancel recording before closing export.", "info");
      return;
    }
    onClose();
  }
  return (
    <Modal
      title={
        state === "complete"
          ? "Your sound. Ready for the world."
          : "Create your music video"
      }
      subtitle={
        state === "complete"
          ? "Your video is saved locally and ready to download."
          : "Your visualizer and real audio, recorded together."
      }
      onClose={close}
    >
      {state === "complete" && result ? (
        <div className="export-complete">
          <span>
            <Check size={26} />
          </span>
          <h3>It’s a wrap.</h3>
          {videoUrl && (
            <video
              className="export-video-player"
              src={videoUrl}
              controls
              playsInline
            />
          )}
          <div className="export-modal-meta">
            <span>
              {result.width} × {result.height}
            </span>
            <span>{formatTime(result.duration)}</span>
            <span>{(result.blob.size / 1024 / 1024).toFixed(1)} MB</span>
          </div>
          <p>
            {result.mimeType.includes("mp4") ? "MP4" : "WebM"} · 30 fps ·
            Original audio included
          </p>
          <div className="dialog-actions">
            <Button
              onClick={() => {
                downloadBlob(
                  result.blob,
                  `${result.name}.${result.mimeType.includes("mp4") ? "mp4" : "webm"}`,
                );
                toast("Your video is downloading.");
              }}
            >
              <Download size={15} />
              Download video
            </Button>
            <Button variant="primary" onClick={onClose}>
              Back to studio
            </Button>
          </div>
        </div>
      ) : (
        <>
          <canvas
            ref={canvasRef}
            width={1280}
            height={720}
            style={{
              display: active ? "block" : "none",
              width: "100%",
              aspectRatio: dimensions.width / dimensions.height,
              objectFit: "contain",
              background: "#0B0714",
              borderRadius: 8,
              maxHeight: "40dvh",
            }}
          />
          {!active && (
            <>
              <div className="export-summary">
                <Video size={26} />
                <div>
                  <strong>
                    {engine.info.name || "No audio track imported"}
                  </strong>
                  <small>
                    {engine.info.duration
                      ? formatTime(engine.info.duration)
                      : "Import audio in the editor to start recording"}
                  </small>
                </div>
              </div>
              <div className="export-options" style={{ marginTop: 20 }}>
                <label className="field-group">
                  <span>Aspect ratio</span>
                  <select aria-label="Export aspect ratio"
                    className="field-input"
                    value={aspect}
                    onChange={(e) =>
                      setAspect(
                        e.target
                          .value as StudioConfig["settings"]["aspectRatio"],
                      )
                    }
                  >
                    <option value="16:9">16:9 · Landscape</option>
                    <option value="9:16">9:16 · Vertical</option>
                    <option value="1:1">1:1 · Square</option>
                  </select>
                </label>
                <label className="field-group">
                  <span>Resolution</span>
                  <select aria-label="Resolution"
                    className="field-input"
                    value={resolution}
                    onChange={(e) =>
                      setResolution(Number(e.target.value) as 480 | 720 | 1080)
                    }
                  >
                    <option value={480}>480p · Fastest</option>
                    <option value={720}>720p · Recommended</option>
                    <option value={1080}>1080p · High quality</option>
                  </select>
                </label>
              </div>
              <p className="track-analysis-note" style={{ margin: "16px 0" }}>
                {dimensions.width} × {dimensions.height} · 30 fps ·{" "}
                {mime?.includes("mp4")
                  ? "MP4"
                  : mime
                    ? "WebM"
                    : "Unsupported browser"}
              </p>
              <div className="export-warning">
                <ShieldCheck size={17} />
                <span>
                  Your audio stays on your device. Keep this tab visible while
                  recording.{" "}
                  {resolution === 1080 &&
                    "1080p uses more memory. Try 720p if recording fails on an older phone."}
                </span>
              </div>
            </>
          )}
          {active && (
            <div style={{ marginTop: 20 }}>
              <div className="export-state-label">
                <i />
                {state === "paused"
                  ? "Recording paused"
                  : "Recording your masterpiece…"}
                <span style={{ marginLeft: "auto" }}>
                  {Math.round(progress * 100)}%
                </span>
              </div>
              <div className="export-progress">
                <i style={{ width: `${progress * 100}%` }} />
              </div>
              <div className="export-progress-info">
                <span>
                  {formatTime(engine.info.currentTime)} /{" "}
                  {formatTime(engine.info.duration)}
                </span>
                <span>Recorded: {formatTime(elapsed)}</span>
              </div>
              <div className="export-warning">
                <AlertTriangle size={17} />
                <span>
                  Keep this tab open. Recording pauses when you switch away.
                  Resume when you return.
                </span>
              </div>
            </div>
          )}
          {state === "saving" && (
            <p className="track-analysis-note" style={{ marginTop: 20 }}>
              <LoaderCircle size={14} className="spin" /> Saving your video to
              this device…
            </p>
          )}
          {error && (
            <p className="form-error" style={{ marginTop: 17 }} role="alert">
              {error}
            </p>
          )}
          {saveWarning && (
            <p className="form-error" style={{ marginTop: 15 }}>
              {saveWarning}
            </p>
          )}
          {!canRecord() && (
            <p className="form-error">
              This browser does not support video recording. Try a recent Chrome
              or Android browser.
            </p>
          )}
          <div className="dialog-actions" style={{ flexWrap: "wrap" }}>
            {active ? (
              <>
                <Button onClick={() => exporter.current?.cancel()}>
                  <X size={15} />
                  Cancel recording
                </Button>
                {state === "paused" ? (
                  <Button
                    variant="primary"
                    onClick={() => {
                      exporter.current?.resume(engine);
                      setState("recording");
                    }}
                  >
                    <Play size={14} />
                    Resume
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={() => {
                        exporter.current?.pause(engine);
                        setState("paused");
                      }}
                    >
                      <Pause size={14} />
                      Pause
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => exporter.current?.stop()}
                    >
                      <Square size={12} />
                      Finish recording
                    </Button>
                  </>
                )}
              </>
            ) : (
              <>
                <Button onClick={onClose} disabled={state === "saving"}>
                  Back to editor
                </Button>
                <Button
                  variant="primary"
                  loading={state === "saving"}
                  disabled={
                    !engine.info.name ||
                    !engine.info.duration ||
                    !canRecord() ||
                    !allowExport
                  }
                  onClick={() => void start()}
                >
                  <Video size={15} />
                  Start recording
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
