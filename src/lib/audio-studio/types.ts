export const VISUALIZER_MODES = [
  "spectrum",
  "circular",
  "radial-wave",
  "waveform",
  "particles",
  "sphere",
  "tunnel",
  "liquid",
  "plasma",
  "rings",
  "galaxy",
  "equalizer",
  "oscilloscope",
  "geometry",
  "landscape",
] as const;
export type VisualizerMode = (typeof VISUALIZER_MODES)[number];
export type Quality = "low" | "medium" | "high";
export type AspectRatio = "16:9" | "9:16" | "1:1";
export type LayerType =
  | "background"
  | "spectrum"
  | "circular"
  | "waveform"
  | "text"
  | "image"
  | "particles"
  | "object"
  | "glow"
  | "video";
export interface VisualizerSettings {
  mode: VisualizerMode;
  color: string;
  secondaryColor: string;
  background: string;
  intensity: number;
  speed: number;
  sensitivity: number;
  glow: number;
  rotation: number;
  particleCount: number;
  fftSize: 512 | 1024 | 2048 | 4096;
  smoothing: number;
  attack: number;
  release: number;
  bassRange: [number, number];
  midRange: [number, number];
  trebleRange: [number, number];
  frequencyGain: number;
  quality: Quality;
  aspectRatio: AspectRatio;
  resolution: 480 | 720 | 1080;
}
export interface BaseLayer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  color: string;
  blend: "normal" | "screen" | "multiply" | "lighter" | "overlay";
}
export interface TextLayer extends BaseLayer {
  type: "text";
  text: string;
  subtitle: string;
  artist: string;
  song: string;
  font: string;
  fontSize: number;
  fontWeight: number;
  align: "left" | "center" | "right";
  letterSpacing: number;
  lineHeight: number;
  shadow: number;
  glow: number;
}
export interface ImageLayer extends BaseLayer {
  type: "image";
  src: string;
  fit: "contain" | "cover";
  crop: boolean;
  watermark: boolean;
}
export interface VisualLayer extends BaseLayer {
  type: Exclude<LayerType, "text" | "image">;
  settings?: Partial<VisualizerSettings>;
}
export type StudioLayer = TextLayer | ImageLayer | VisualLayer;
export interface StudioConfig {
  version: 1;
  settings: VisualizerSettings;
  layers: StudioLayer[];
}
export interface LocalProject {
  id: string;
  name: string;
  config: StudioConfig;
  thumbnail: string;
  audio: Blob | null;
  audioName: string;
  duration: number;
  createdAt: number;
  updatedAt: number;
}
export interface ProjectSummary {
  id: string;
  name: string;
  config: StudioConfig;
  thumbnail: string;
  audioName: string;
  duration: number;
  createdAt: number;
  updatedAt: number;
  hasAudio: boolean;
}
export interface Preset {
  id: string;
  name: string;
  description: string;
  category: string;
  config: StudioConfig;
  thumbnail: string;
  featured: boolean;
  custom?: boolean;
}
export interface ExportRecord {
  id: string;
  projectId: string | null;
  name: string;
  blob: Blob;
  thumbnail: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
  mimeType: string;
  createdAt: number;
  completed: boolean;
}
export interface ExportSummary extends Omit<ExportRecord, "blob"> {
  size: number;
  url?: string;
}
export interface AudioFrame {
  frequency: Uint8Array<ArrayBuffer>;
  waveform: Uint8Array<ArrayBuffer>;
  bands: Float32Array;
  bass: number;
  mid: number;
  treble: number;
  energy: number;
  transient: boolean;
  time: number;
}
export interface TrackInfo {
  name: string;
  duration: number;
  currentTime: number;
  playing: boolean;
  volume: number;
  loop: boolean;
  microphone: boolean;
}
export type AdminSection =
  | "dashboard"
  | "updates"
  | "announcements"
  | "themes"
  | "features"
  | "users"
  | "presets"
  | "feedback"
  | "audit-logs";
export interface ThemeConfig {
  background: string;
  surface: string;
  primary: string;
  secondary: string;
  text: string;
  border: string;
  radius: number;
  glow: number;
  font: string;
  animations: boolean;
}
export const DEFAULT_THEME: ThemeConfig = {
  background: "#0B0714",
  surface: "#15101F",
  primary: "#A56AFF",
  secondary: "#FF9BD2",
  text: "#F5F1FA",
  border: "#2A2237",
  radius: 12,
  glow: 0.45,
  font: "Inter, system-ui, sans-serif",
  animations: true,
};
export interface Principal {
  id: string;
  email: string;
  name: string;
  role: "user" | "moderator" | "admin" | "super_admin";
  status: "active" | "suspended";
  provider: "local" | "supabase";
}
export interface PublicContent {
  theme: ThemeConfig | null;
  releases: ContentRecord[];
  announcements: ContentRecord[];
  presets: Preset[];
  flags?: {
    key: string;
    enabled: boolean;
    name: string;
    description: string;
  }[];
  readIds?: string[];
  notificationIds?: string[];
}
export interface ContentRecord {
  id: string;
  title: string;
  createdAt: string;
  [key: string]: unknown;
}
export const EMPTY_TRACK: TrackInfo = {
  name: "",
  duration: 0,
  currentTime: 0,
  playing: false,
  volume: 0.8,
  loop: false,
  microphone: false,
};
export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
export function uid() {
  return crypto.randomUUID();
}
