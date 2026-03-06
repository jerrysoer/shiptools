import { nanoid } from "nanoid";

export interface MixerInput {
  id: string;
  stream: MediaStream;
  label: string;
  gainNode: GainNode;
  sourceNode: MediaStreamAudioSourceNode;
}

/**
 * AudioMixer merges multiple MediaStream audio sources into one output
 * stream. Each source has an independent gain control. An AnalyserNode
 * is available for waveform / level-meter rendering.
 */
export class AudioMixer {
  private ctx: AudioContext | null = null;
  private inputs: Map<string, MixerInput> = new Map();
  private destination: MediaStreamAudioDestinationNode | null = null;
  private analyser: AnalyserNode | null = null;

  constructor() {}

  // ---- Lazy AudioContext bootstrap ----
  private ensureContext(): void {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.destination = this.ctx.createMediaStreamDestination();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;
      this.analyser.connect(this.destination);
    }
  }

  // ---- Add a stream ----
  addStream(
    stream: MediaStream,
    options?: { gain?: number; label?: string; id?: string },
  ): string {
    this.ensureContext();

    const id = options?.id ?? nanoid();
    const label = options?.label ?? stream.id;
    const gainValue = options?.gain ?? 1;

    const sourceNode = this.ctx!.createMediaStreamSource(stream);
    const gainNode = this.ctx!.createGain();
    gainNode.gain.value = gainValue;

    // source -> gain -> analyser (which then feeds the destination)
    sourceNode.connect(gainNode);
    gainNode.connect(this.analyser!);

    this.inputs.set(id, { id, stream, label, gainNode, sourceNode });
    return id;
  }

  // ---- Remove a stream ----
  removeStream(id: string): void {
    const input = this.inputs.get(id);
    if (!input) return;

    try {
      input.gainNode.disconnect();
    } catch {
      // already disconnected
    }
    try {
      input.sourceNode.disconnect();
    } catch {
      // already disconnected
    }

    this.inputs.delete(id);
  }

  // ---- Per-stream gain ----
  setGain(id: string, value: number): void {
    const input = this.inputs.get(id);
    if (!input) return;
    input.gainNode.gain.value = Math.max(0, Math.min(value, 2));
  }

  // ---- Accessors ----
  getAnalyserNode(): AnalyserNode | null {
    return this.analyser;
  }

  getMixedStream(): MediaStream | null {
    return this.destination?.stream ?? null;
  }

  getInputs(): MixerInput[] {
    return Array.from(this.inputs.values());
  }

  // ---- Cleanup ----
  dispose(): void {
    Array.from(this.inputs.keys()).forEach((id) => {
      this.removeStream(id);
    });
    this.inputs.clear();

    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch {
        // already disconnected
      }
      this.analyser = null;
    }

    this.destination = null;

    if (this.ctx) {
      void this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
