import type { Quality } from "./types";
export function deviceQuality(): Quality {
  const memory =
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency || 4;
  const mobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
  return memory <= 2 || cores <= 2
    ? "low"
    : mobile || memory <= 4
      ? "medium"
      : "high";
}
export function webGLAvailable() {
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!context) return false;
    context.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}
export function supportedMime() {
  if (typeof MediaRecorder === "undefined") return null;
  return (
    [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
      "video/mp4",
    ].find((mime) => MediaRecorder.isTypeSupported(mime)) || null
  );
}
export function exportDimensions(
  aspect: "16:9" | "9:16" | "1:1",
  resolution: 480 | 720 | 1080,
) {
  return aspect === "16:9"
    ? { width: Math.round((resolution * 16) / 9), height: resolution }
    : aspect === "9:16"
      ? { width: resolution, height: Math.round((resolution * 16) / 9) }
      : { width: resolution, height: resolution };
}
export function canRecord() {
  return (
    typeof MediaRecorder !== "undefined" &&
    !!supportedMime() &&
    !!HTMLCanvasElement.prototype.captureStream
  );
}
export async function fullscreen(element: HTMLElement) {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (element.requestFullscreen) await element.requestFullscreen();
    else if (element.classList.contains("preview-fullscreen"))
      element.classList.remove("preview-fullscreen");
    else throw new Error("Fullscreen is not available in this browser.");
  } catch {
    element.classList.toggle("preview-fullscreen");
  }
}
