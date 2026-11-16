import {
  type AudioFrame,
  type TrackInfo,
  type VisualizerSettings,
  EMPTY_TRACK,
} from "./types";
export class AudioEngine {
  audio: HTMLAudioElement;
  context: AudioContext | null = null;
  analyser: AnalyserNode | null = null;
  gain: GainNode | null = null;
  destination: MediaStreamAudioDestinationNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private micStream: MediaStream | null = null;
  private objectUrl: string | null = null;
  private frequency = new Uint8Array(1024);
  private waveform = new Uint8Array(2048);
  private bands = new Float32Array(64);
  waveformPeaks = new Float32Array(0);
  private previousSpectrum = new Float32Array(64);
  private lastTransient = 0;
  private listeners: (() => void)[] = [];
  settings: VisualizerSettings;
  private deviceLost?: () => void;
  setDeviceListener(listener: (() => void) | undefined) {
    this.deviceLost = listener;
  }
  constructor(settings: VisualizerSettings) {
    this.settings = settings;
    this.audio = new Audio();
    this.audio.preload = "metadata";
    this.audio.volume = 0.8;
    for (const event of [
      "play",
      "pause",
      "ended",
      "timeupdate",
      "loadedmetadata",
      "durationchange",
      "volumechange",
      "error",
    ] as const) {
      const listener = () => this.listeners.forEach((fn) => fn());
      this.audio.addEventListener(event, listener);
      this.listeners.push(() =>
        this.audio.removeEventListener(event, listener),
      );
    }
  }
  subscribe(fn: () => void) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((listener) => listener !== fn);
    };
  }
  async initialize(resume = true) {
    if (!this.context) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextClass)
        throw new Error(
          "Web Audio is not supported by this browser. Try a recent Chrome, Firefox, or Safari.",
        );
      this.context = new AudioContextClass();
      this.analyser = this.context.createAnalyser();
      this.gain = this.context.createGain();
      this.destination = this.context.createMediaStreamDestination();
      this.source = this.context.createMediaElementSource(this.audio);
      this.source.connect(this.analyser);
      this.analyser.connect(this.gain);
      this.gain.connect(this.context.destination);
      this.gain.connect(this.destination);
      this.configure(this.settings);
    }
    if (resume && this.context.state === "suspended")
      await this.context.resume();
    if (resume && this.context.state !== "running")
      throw new Error(
        "Audio is paused by your browser. Tap play again to enable audio.",
      );
    return this.context;
  }
  configure(settings: VisualizerSettings) {
    this.settings = settings;
    if (this.analyser) {
      this.analyser.fftSize = settings.fftSize;
      this.analyser.smoothingTimeConstant = settings.smoothing;
      this.frequency = new Uint8Array(this.analyser.frequencyBinCount);
      this.waveform = new Uint8Array(this.analyser.fftSize);
    }
  }
  async load(file: File) {
    if (file.size > 250 * 1024 * 1024)
      throw new Error(
        "Choose an audio file smaller than 250 MB for reliable mobile playback.",
      );
    if (file.size === 0)
      throw new Error("This file is empty. Choose a valid audio file.");
    if (
      !file.type.startsWith("audio/") &&
      !/\.(mp3|wav|ogg|m4a|aac|flac|opus|webm)$/i.test(file.name)
    )
      throw new Error(
        "Choose an audio file such as MP3, WAV, OGG, M4A, or FLAC.",
      );
    this.stopMicrophone();
    this.audio.pause();
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = URL.createObjectURL(file);
    this.audio.src = this.objectUrl;
    this.audio.load();
    this.audioName = file.name;
    this.waveformPeaks = new Float32Array(0);
    this.listeners.forEach((fn) => fn());
    if (file.size <= 48 * 1024 * 1024) {
      try {
        await this.initialize(false);
        const buffer = await this.context!.decodeAudioData(
          await file.arrayBuffer(),
        );
        const data = buffer.getChannelData(0);
        const size = Math.min(600, data.length);
        this.waveformPeaks = new Float32Array(size);
        for (let i = 0; i < size; i++) {
          const start = Math.floor((i / size) * data.length);
          const end = Math.floor(((i + 1) / size) * data.length);
          let peak = 0;
          const stride = Math.max(1, Math.floor((end - start) / 200));
          for (let j = start; j < end; j += stride)
            peak = Math.max(peak, Math.abs(data[j]));
          this.waveformPeaks[i] = peak;
        }
        this.listeners.forEach((fn) => fn());
      } catch (error) {
        console.warn(
          "Audio waveform extraction unavailable; using live analyser.",
          error,
        );
      }
    }
  }
  audioName = "";
  async play() {
    await this.initialize();
    await this.audio.play();
  }
  pause() {
    this.audio.pause();
  }
  async seek(time: number) {
    if (Number.isFinite(this.audio.duration))
      this.audio.currentTime = Math.max(0, Math.min(time, this.audio.duration));
  }
  setLoop(loop: boolean) {
    this.audio.loop = loop;
    this.listeners.forEach((fn) => fn());
  }
  restart() {
    this.audio.currentTime = 0;
    this.listeners.forEach((fn) => fn());
  }
  setVolume(volume: number) {
    this.audio.volume = Math.max(0, Math.min(1, volume));
  }
  get info(): TrackInfo {
    return {
      ...EMPTY_TRACK,
      name: this.audioName,
      duration: Number.isFinite(this.audio.duration) ? this.audio.duration : 0,
      currentTime: this.audio.currentTime,
      playing: !this.audio.paused,
      volume: this.audio.volume,
      loop: this.audio.loop,
      microphone: !!this.micStream,
    };
  }
  async microphone() {
    if (this.micStream) {
      this.stopMicrophone();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia)
      throw new Error(
        "Microphone input requires HTTPS and a supported browser.",
      );
    this.audio.pause();
    await this.initialize();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        video: false,
      });
      this.micStream = stream;
      this.micSource = this.context!.createMediaStreamSource(stream);
      this.micSource.connect(this.analyser!);
      if (this.gain) this.gain.gain.value = 0;
      stream.getAudioTracks().forEach((track) =>
        track.addEventListener("ended", () => {
          this.stopMicrophone();
          this.deviceLost?.();
        }),
      );
      this.listeners.forEach((fn) => fn());
    } catch (error) {
      if (error instanceof DOMException) {
        if (error.name === "NotAllowedError")
          throw new Error(
            "Microphone permission was denied. Allow microphone access in your browser settings, or import an audio file.",
          );
        if (error.name === "NotFoundError")
          throw new Error(
            "No microphone was found. Connect a microphone or import audio.",
          );
      }
      throw error;
    }
  }
  stopMicrophone() {
    this.micStream?.getTracks().forEach((track) => track.stop());
    this.micStream = null;
    this.micSource?.disconnect();
    this.micSource = null;
    if (this.gain) this.gain.gain.value = 1;
    this.listeners.forEach((fn) => fn());
  }
  async resetMicrophone() {
    this.stopMicrophone();
    await this.microphone();
  }
  analyze(): AudioFrame | null {
    if (!this.analyser || (!this.info.playing && !this.micStream)) return null;
    this.analyser.getByteFrequencyData(this.frequency);
    this.analyser.getByteTimeDomainData(this.waveform);
    const sampleRate = this.context!.sampleRate;
    const hz = (index: number) => (index * sampleRate) / this.analyser!.fftSize;
    const average = (low: number, high: number) => {
      const start = Math.max(
        1,
        Math.floor((low * this.analyser!.fftSize) / sampleRate),
      );
      const end = Math.min(
        this.frequency.length,
        Math.ceil((high * this.analyser!.fftSize) / sampleRate),
      );
      let sum = 0;
      for (let i = start; i < end; i++) sum += this.frequency[i];
      return sum / Math.max(1, end - start) / 255;
    };
    const bass = average(...this.settings.bassRange);
    const mid = average(...this.settings.midRange);
    const treble = average(...this.settings.trebleRange);
    let flux = 0;
    for (let i = 0; i < 64; i++) {
      const value =
        this.frequency[
          Math.floor(Math.pow(i / 64, 2) * (this.frequency.length - 1))
        ] / 255;
      const coefficient =
        value > this.bands[i] ? this.settings.attack : this.settings.release;
      this.bands[i] = Math.min(
        1,
        this.bands[i] +
          coefficient * (value * this.settings.frequencyGain - this.bands[i]),
      );
      flux += Math.max(0, value - this.previousSpectrum[i]);
      this.previousSpectrum[i] = value;
    }
    const now = performance.now();
    const transient =
      now - this.lastTransient > 220 && flux / 64 > 0.055 && bass > 0.12;
    if (transient) this.lastTransient = now;
    let energy = 0;
    for (let i = 0; i < this.waveform.length; i++) {
      const value = (this.waveform[i] - 128) / 128;
      energy += value * value;
    }
    void hz;
    return {
      frequency: this.frequency,
      waveform: this.waveform,
      bands: this.bands,
      bass,
      mid,
      treble,
      energy: Math.sqrt(energy / this.waveform.length),
      transient,
      time: this.audio.currentTime,
    };
  }
  get recordingStream() {
    return this.destination?.stream ?? null;
  }
  dispose() {
    this.audio.pause();
    this.stopMicrophone();
    this.audio.removeAttribute("src");
    this.audio.load();
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.source?.disconnect();
    this.analyser?.disconnect();
    this.gain?.disconnect();
    this.destination?.stream.getTracks().forEach((track) => track.stop());
    if (this.context && this.context.state !== "closed")
      void this.context.close();
    this.listeners = [];
  }
}
