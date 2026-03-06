import type { WaveformOptions, WaveformStyle } from "./types";

const DEFAULT_OPTIONS: WaveformOptions = {
  style: "bars",
  barWidth: 3,
  barGap: 1,
  color: "#4f46e5",
  backgroundColor: "transparent",
  mirror: false,
};

/**
 * Draw a real-time waveform from an AnalyserNode into a canvas.
 * Call this in a requestAnimationFrame loop.
 */
export function drawWaveform(
  analyser: AnalyserNode,
  canvas: HTMLCanvasElement,
  options?: Partial<WaveformOptions>,
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { width, height } = canvas;

  // Clear
  if (opts.backgroundColor === "transparent") {
    ctx.clearRect(0, 0, width, height);
  } else {
    ctx.fillStyle = opts.backgroundColor!;
    ctx.fillRect(0, 0, width, height);
  }

  switch (opts.style) {
    case "bars":
      drawBars(analyser, ctx, width, height, opts);
      break;
    case "wave":
      drawWaveLine(analyser, ctx, width, height, opts);
      break;
    case "mirrored":
      drawMirrored(analyser, ctx, width, height, opts);
      break;
    case "circular":
      drawCircular(analyser, ctx, width, height, opts);
      break;
  }
}

/**
 * Draw a horizontal level meter with peak indicator.
 */
export function drawLevelMeter(
  analyser: AnalyserNode,
  canvas: HTMLCanvasElement,
  options?: { color?: string; backgroundColor?: string },
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const color = options?.color ?? "#4f46e5";
  const bg = options?.backgroundColor ?? "#e5e7eb";
  const { width, height } = canvas;

  // Get time-domain data for RMS
  const bufferLength = analyser.fftSize;
  const dataArray = new Float32Array(bufferLength);
  analyser.getFloatTimeDomainData(dataArray);

  // Compute RMS
  let sum = 0;
  for (let i = 0; i < bufferLength; i++) {
    sum += dataArray[i] * dataArray[i];
  }
  const rms = Math.sqrt(sum / bufferLength);

  // Convert to 0-1 range (roughly map -60dB..0dB to 0..1)
  const db = 20 * Math.log10(Math.max(rms, 1e-10));
  const level = Math.max(0, Math.min(1, (db + 60) / 60));

  // Draw background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Draw level bar
  const barWidth = width * level;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, barWidth, height);

  // Peak indicator line
  ctx.fillStyle = "#ef4444";
  ctx.fillRect(Math.min(barWidth, width - 2), 0, 2, height);
}

/**
 * Draw a static waveform from a decoded AudioBuffer.
 */
export function generateWaveformFromAudio(
  audioBuffer: AudioBuffer,
  canvas: HTMLCanvasElement,
  options?: Partial<WaveformOptions>,
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { width, height } = canvas;
  const channelData = audioBuffer.getChannelData(0);
  const samples = channelData.length;
  const samplesPerPixel = Math.floor(samples / width);

  // Clear
  if (opts.backgroundColor === "transparent") {
    ctx.clearRect(0, 0, width, height);
  } else {
    ctx.fillStyle = opts.backgroundColor!;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.fillStyle = opts.color!;

  const centerY = height / 2;

  for (let x = 0; x < width; x++) {
    const start = x * samplesPerPixel;
    const end = Math.min(start + samplesPerPixel, samples);

    let min = 1;
    let max = -1;
    for (let i = start; i < end; i++) {
      const val = channelData[i];
      if (val < min) min = val;
      if (val > max) max = val;
    }

    const barTop = centerY - max * centerY;
    const barBottom = centerY - min * centerY;
    const barHeight = Math.max(1, barBottom - barTop);

    ctx.fillRect(x, barTop, 1, barHeight);
  }
}

// ---- Internal drawing functions ----

function drawBars(
  analyser: AnalyserNode,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  opts: WaveformOptions,
): void {
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);

  const barWidth = opts.barWidth ?? 3;
  const barGap = opts.barGap ?? 1;
  const step = barWidth + barGap;
  const barCount = Math.floor(width / step);
  const samplesPerBar = Math.floor(bufferLength / barCount);

  ctx.fillStyle = opts.color!;

  for (let i = 0; i < barCount; i++) {
    // Average the frequency bins for this bar
    let sum = 0;
    const offset = i * samplesPerBar;
    for (let j = 0; j < samplesPerBar; j++) {
      sum += dataArray[offset + j];
    }
    const avg = sum / samplesPerBar;
    const barHeight = (avg / 255) * height;

    ctx.fillRect(i * step, height - barHeight, barWidth, barHeight);
  }
}

function drawWaveLine(
  analyser: AnalyserNode,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  opts: WaveformOptions,
): void {
  const bufferLength = analyser.fftSize;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteTimeDomainData(dataArray);

  ctx.strokeStyle = opts.color!;
  ctx.lineWidth = 2;
  ctx.beginPath();

  const sliceWidth = width / bufferLength;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    const v = dataArray[i] / 128.0;
    const y = (v * height) / 2;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
    x += sliceWidth;
  }

  ctx.lineTo(width, height / 2);
  ctx.stroke();
}

function drawMirrored(
  analyser: AnalyserNode,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  opts: WaveformOptions,
): void {
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);

  const barWidth = opts.barWidth ?? 3;
  const barGap = opts.barGap ?? 1;
  const step = barWidth + barGap;
  const barCount = Math.floor(width / step);
  const samplesPerBar = Math.floor(bufferLength / barCount);
  const centerY = height / 2;

  ctx.fillStyle = opts.color!;

  for (let i = 0; i < barCount; i++) {
    let sum = 0;
    const offset = i * samplesPerBar;
    for (let j = 0; j < samplesPerBar; j++) {
      sum += dataArray[offset + j];
    }
    const avg = sum / samplesPerBar;
    const barHeight = (avg / 255) * centerY;

    // Top half (mirrored upward)
    ctx.fillRect(i * step, centerY - barHeight, barWidth, barHeight);
    // Bottom half (mirrored downward)
    ctx.fillRect(i * step, centerY, barWidth, barHeight);
  }
}

function drawCircular(
  analyser: AnalyserNode,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  opts: WaveformOptions,
): void {
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);

  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(centerX, centerY) * 0.4;
  const maxBarLength = Math.min(centerX, centerY) * 0.5;

  const barCount = 128;
  const samplesPerBar = Math.floor(bufferLength / barCount);
  const angleStep = (Math.PI * 2) / barCount;

  ctx.strokeStyle = opts.color!;
  ctx.lineWidth = opts.barWidth ?? 2;

  for (let i = 0; i < barCount; i++) {
    let sum = 0;
    const offset = i * samplesPerBar;
    for (let j = 0; j < samplesPerBar; j++) {
      sum += dataArray[offset + j];
    }
    const avg = sum / samplesPerBar;
    const barLength = (avg / 255) * maxBarLength;

    const angle = i * angleStep - Math.PI / 2;
    const x1 = centerX + Math.cos(angle) * radius;
    const y1 = centerY + Math.sin(angle) * radius;
    const x2 = centerX + Math.cos(angle) * (radius + barLength);
    const y2 = centerY + Math.sin(angle) * (radius + barLength);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
}

/** Convert dB to linear gain (0-1) */
function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

export { dbToLinear };
