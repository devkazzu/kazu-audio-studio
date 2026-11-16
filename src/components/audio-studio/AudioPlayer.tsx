"use client";
import { useEffect, useRef, useState } from "react";
import {
  Upload,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Repeat2,
  Mic,
  MicOff,
  Music2,
  AudioLines,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { AudioEngine } from "@/lib/audio-studio/audio-engine";
import { formatTime } from "@/lib/audio-studio/types";
import { Button } from "@/components/ui";
export function Waveform({
  engine,
  track,
}: {
  engine: AudioEngine;
  track: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animation = 0;
    let lastDraw = 0;
    const draw = (now: number) => {
      animation = requestAnimationFrame(draw);
      if (now - lastDraw < 50 || document.hidden) return;
      lastDraw = now;
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(devicePixelRatio || 1, 1.5);
      if (canvas.width !== Math.round(rect.width * ratio)) {
        canvas.width = Math.round(rect.width * ratio);
        canvas.height = Math.round(rect.height * ratio);
      }
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const data = engine.analyze()?.waveform;
      const count = 180;
      for (let i = 0; i < count; i++) {
        const value = data
          ? Math.abs(data[Math.floor((i / count) * data.length)] - 128) / 128
          : engine.waveformPeaks.length
            ? engine.waveformPeaks[
                Math.floor((i / count) * engine.waveformPeaks.length)
              ]
            : 0;
        const height = Math.max(2 * ratio, value * h * 0.85);
        const x = (i / count) * w;
        const played =
          track &&
          i / count < engine.audio.currentTime / (engine.audio.duration || 1);
        const gradient = ctx.createLinearGradient(
          0,
          0,
          (w * engine.audio.currentTime) / (engine.audio.duration || 1),
          0,
        );
        gradient.addColorStop(0, "#9B64D8");
        gradient.addColorStop(1, "#DDA5F1");
        ctx.fillStyle = played ? gradient : "#5A386B";
        ctx.fillRect(
          x,
          (h - height) / 2,
          Math.max(1, w / count - 1.5 * ratio),
          height,
        );
      }
    };
    animation = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animation);
  }, [engine, track]);
  return (
    <div className="audio-waveform-wrap">
      <canvas
        ref={ref}
        aria-label={
          track
            ? "Live audio waveform"
            : "Waveform preview appears after importing audio"
        }
      />
    </div>
  );
}
export function AudioTimeline({
  engine,
  onImport,
  onError,
}: {
  engine: AudioEngine;
  onImport: (file: File) => void;
  onError: (message: string) => void;
}) {
  const [track, setTrack] = useState(engine.info);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  useEffect(() => engine.subscribe(() => setTrack(engine.info)), [engine]);
  useEffect(() => {
    const media = navigator.mediaDevices;
    const handler = () =>
      onError("An audio device changed. Check your microphone connection.");
    media?.addEventListener("devicechange", handler);
    return () => media?.removeEventListener("devicechange", handler);
  }, [onError]);
  useEffect(() => {
    engine.setDeviceListener(() =>
      onError(
        "Your microphone disconnected. Reconnect it and tap the microphone button to try again.",
      ),
    );
    return () => {
      engine.setDeviceListener(undefined);
    };
  }, [engine, onError]);
  async function togglePlay() {
    try {
      if (track.playing) engine.pause();
      else await engine.play();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Audio playback failed.");
    }
  }
  async function mic() {
    try {
      await engine.microphone();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Microphone unavailable.");
    }
  }
  return (
    <section className="audio-player" aria-label="Audio player">
      <div className="audio-player-top">
        <span className="audio-player-cover">
          {track.microphone ? <Mic size={20} /> : <Music2 size={20} />}
        </span>
        <div className="audio-track-info">
          <strong>{track.name || "Your sound goes here"}</strong>
          <small>
            {track.name
              ? `${track.microphone ? "Live microphone input" : "Local audio · never uploaded"}${track.duration ? ` · ${formatTime(track.duration)}` : ""}`
              : "Import a track or connect your microphone"}
          </small>
        </div>
        <Button
          onClick={() => {
            if (track.microphone) {
              engine.stopMicrophone();
              return;
            }
            void mic();
          }}
        >
          {track.microphone ? <MicOff size={13} /> : <Mic size={13} />}
          {track.microphone ? "Stop mic" : "Microphone"}
        </Button>
      </div>
      {!track.name && !track.microphone && (
        <label
          className="audio-player-drop"
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const file = e.dataTransfer.files[0];
            if (file) onImport(file);
          }}
          style={drag ? { background: "#A56AFF18" } : undefined}
        >
          <Upload size={22} strokeWidth={1.5} />
          <span>
            <strong>Drop your audio here, or click to browse</strong>
            <small>MP3, WAV, OGG, M4A, FLAC · up to 250 MB</small>
          </span>
          <input
            type="file"
            accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac"
            aria-label="Choose an audio file"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setBusy(true);
                onImport(file);
                window.setTimeout(() => setBusy(false), 1000);
              }
            }}
          />
        </label>
      )}
      <Waveform engine={engine} track={track.name} />
      <div className="audio-transport">
        <button
          className="play-button"
          onClick={() => void togglePlay()}
          disabled={!track.name && !track.microphone}
          aria-label={track.playing ? "Pause audio" : "Play audio"}
        >
          {track.playing ? (
            <Pause size={14} fill="currentColor" />
          ) : (
            <Play size={14} fill="currentColor" />
          )}
        </button>
        <div className="audio-time">
          {formatTime(track.currentTime)}
          <span>
            {" "}
            / {track.microphone ? "LIVE" : formatTime(track.duration)}
          </span>
        </div>
        <input
          className="audio-seek"
          type="range"
          min={0}
          max={track.duration || 1}
          step={0.01}
          value={track.currentTime}
          disabled={!track.duration || track.microphone}
          onChange={(e) =>
            void engine
              .seek(Number(e.target.value))
              .catch((error) => onError(error.message))
          }
          aria-label="Seek audio"
        />
        <div className="audio-volume">
          <button
            className="icon-button"
            onClick={() => engine.setVolume(track.volume ? 0 : 0.8)}
            aria-label={track.volume ? "Mute audio" : "Unmute audio"}
          >
            {track.volume ? <Volume2 /> : <VolumeX />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={track.volume}
            onChange={(e) => engine.setVolume(Number(e.target.value))}
            aria-label="Volume"
          />
        </div>
        <button
          className={`icon-button ${track.loop ? "active" : ""}`}
          onClick={() => {
            engine.setLoop(!track.loop);
          }}
          aria-label="Loop audio"
          aria-pressed={track.loop}
        >
          <Repeat2 size={16} />
        </button>
        <button
          className="icon-button"
          onClick={() => {
            engine.restart();
          }}
          aria-label="Restart audio"
        >
          <RotateCcw size={14} />
        </button>
      </div>
      <div className="audio-player-footer">
        <span>
          <ShieldCheck size={10} />
          Processed on your device. Always.
        </span>
        <span>
          {track.microphone ? "MIC LIVE" : "WEB AUDIO ENGINE"}
          <i className="live-dot" />
        </span>
      </div>
    </section>
  );
}
export function AudioMeters({ engine }: { engine: AudioEngine }) {
  const [levels, setLevels] = useState({
    bass: 0,
    mid: 0,
    treble: 0,
    transient: false,
  });
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      const frame = engine.analyze();
      if (frame)
        setLevels({
          bass: frame.bass,
          mid: frame.mid,
          treble: frame.treble,
          transient: frame.transient,
        });
      else setLevels({ bass: 0, mid: 0, treble: 0, transient: false });
    }, 100);
    return () => clearInterval(timer);
  }, [engine]);
  return (
    <>
      <div className="inspector-section">
        <h3>Live audio analysis</h3>
        <div className="audio-meter-grid">
          {(["bass", "mid", "treble"] as const).map((key) => (
            <div key={key}>
              <span>
                {key === "mid"
                  ? "Midrange"
                  : key[0].toUpperCase() + key.slice(1)}
                <small>{Math.round(levels[key] * 100)}%</small>
              </span>
              <div className="meter-bar">
                <i style={{ width: `${levels[key] * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="transient-indicator">
          <i className={levels.transient ? "active" : ""} />
          {levels.transient ? "Transient detected" : "Listening for transients"}
        </div>
      </div>
      <div className="inspector-section">
        <h3>FFT & response</h3>
        <label className="field-group">
          <span>FFT size</span>
          <select
            className="field-input"
            value={engine.settings.fftSize}
            onChange={(e) =>
              engine.configure({
                ...engine.settings,
                fftSize: Number(e.target.value) as 512 | 1024 | 2048 | 4096,
              })
            }
          >
            {[512, 1024, 2048, 4096].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="slider-field">
          <span>
            Smoothing<small>{engine.settings.smoothing}</small>
          </span>
          <input
            type="range"
            min={0}
            max={0.95}
            step={0.01}
            defaultValue={engine.settings.smoothing}
            onChange={(e) =>
              engine.configure({
                ...engine.settings,
                smoothing: Number(e.target.value),
              })
            }
          />
        </label>
        <label className="slider-field">
          <span>
            Attack<small>{engine.settings.attack}</small>
          </span>
          <input
            type="range"
            min={0.01}
            max={1}
            step={0.01}
            defaultValue={engine.settings.attack}
            onChange={(e) =>
              engine.configure({
                ...engine.settings,
                attack: Number(e.target.value),
              })
            }
          />
        </label>
        <label className="slider-field">
          <span>
            Release<small>{engine.settings.release}</small>
          </span>
          <input
            type="range"
            min={0.01}
            max={1}
            step={0.01}
            defaultValue={engine.settings.release}
            onChange={(e) =>
              engine.configure({
                ...engine.settings,
                release: Number(e.target.value),
              })
            }
          />
        </label>
      </div>
      <p className="track-analysis-note">
        FFT-based frequency analysis with separate bass, midrange, and treble
        energy. Transient detection responds to spectral increases; it is not a
        BPM or beat-grid detector.
      </p>
    </>
  );
}
