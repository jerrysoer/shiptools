import type { Bookmark, RecordingResult, RecordingState } from "./types";
import { getBestAudioMimeType, getBestVideoMimeType } from "./browser-support";
import { nanoid } from "nanoid";

export class StreamRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private startTime = 0;
  private pauseStart = 0;
  private totalPausedMs = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private _bookmarks: Bookmark[] = [];
  private _state: RecordingState = "idle";
  private _duration = 0;
  private resolveStop: ((result: RecordingResult) => void) | null = null;
  private activeMimeType = "";

  // ---- Public callbacks ----
  onStateChange?: (state: RecordingState) => void;
  onDurationChange?: (ms: number) => void;
  onDataAvailable?: (blob: Blob) => void;

  // ---- Getters ----
  get state(): RecordingState {
    return this._state;
  }
  get duration(): number {
    return this._duration;
  }
  get bookmarks(): Bookmark[] {
    return [...this._bookmarks];
  }

  // ---- Start ----
  start(
    stream: MediaStream,
    options?: {
      mimeType?: string;
      timeslice?: number;
      type?: "audio" | "video";
    },
  ): void {
    if (this._state === "recording" || this._state === "paused") {
      throw new Error(`Cannot start: recorder is currently ${this._state}`);
    }

    // Determine mime type
    let mimeType = options?.mimeType;
    if (!mimeType) {
      const kind = options?.type ?? (stream.getVideoTracks().length > 0 ? "video" : "audio");
      mimeType = kind === "video" ? getBestVideoMimeType() : getBestAudioMimeType();
    }
    this.activeMimeType = mimeType;

    // Reset state
    this.chunks = [];
    this._bookmarks = [];
    this._duration = 0;
    this.totalPausedMs = 0;
    this.pauseStart = 0;

    // Create MediaRecorder
    this.mediaRecorder = new MediaRecorder(stream, { mimeType });

    this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
        this.onDataAvailable?.(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      this.stopTimer();

      const blob = new Blob(this.chunks, { type: this.activeMimeType });
      const result: RecordingResult = {
        blob,
        duration: this._duration,
        mimeType: this.activeMimeType,
        bookmarks: [...this._bookmarks],
      };

      this.setState("stopped");

      if (this.resolveStop) {
        this.resolveStop(result);
        this.resolveStop = null;
      }
    };

    this.mediaRecorder.onerror = () => {
      this.stopTimer();
      this.setState("idle");
    };

    // Start recording
    const timeslice = options?.timeslice ?? 1000; // request data every second
    this.mediaRecorder.start(timeslice);
    this.startTime = performance.now();
    this.startTimer();
    this.setState("recording");
  }

  // ---- Pause ----
  pause(): void {
    if (this._state !== "recording" || !this.mediaRecorder) return;

    this.mediaRecorder.pause();
    this.pauseStart = performance.now();
    this.stopTimer();
    this.setState("paused");
  }

  // ---- Resume ----
  resume(): void {
    if (this._state !== "paused" || !this.mediaRecorder) return;

    this.totalPausedMs += performance.now() - this.pauseStart;
    this.pauseStart = 0;
    this.mediaRecorder.resume();
    this.startTimer();
    this.setState("recording");
  }

  // ---- Stop ----
  stop(): Promise<RecordingResult> {
    return new Promise<RecordingResult>((resolve, reject) => {
      if (!this.mediaRecorder || (this._state !== "recording" && this._state !== "paused")) {
        reject(new Error(`Cannot stop: recorder is currently ${this._state}`));
        return;
      }

      this.resolveStop = resolve;

      // If paused, account for the final pause duration
      if (this._state === "paused" && this.pauseStart > 0) {
        this.totalPausedMs += performance.now() - this.pauseStart;
        this.pauseStart = 0;
      }

      this.setState("processing");
      this.mediaRecorder.stop();
    });
  }

  // ---- Bookmarks ----
  addBookmark(label?: string): void {
    if (this._state !== "recording" && this._state !== "paused") return;

    this._bookmarks.push({
      id: nanoid(),
      timestamp: this._duration,
      label,
    });
  }

  // ---- Internal ----
  private setState(state: RecordingState): void {
    this._state = state;
    this.onStateChange?.(state);
  }

  private startTimer(): void {
    this.stopTimer();
    this.timer = setInterval(() => {
      this._duration = Math.round(
        performance.now() - this.startTime - this.totalPausedMs,
      );
      this.onDurationChange?.(this._duration);
    }, 100);
  }

  private stopTimer(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
