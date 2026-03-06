export type DrawingTool =
  | "pen"
  | "highlighter"
  | "arrow"
  | "rectangle"
  | "circle"
  | "text"
  | "eraser";

interface DrawAction {
  type: DrawingTool;
  points: Array<{ x: number; y: number }>;
  color: string;
  lineWidth: number;
  text?: string;
}

/**
 * Canvas drawing engine for screen annotation overlay.
 *
 * Supports freehand pen, highlighter, arrow, rectangle, circle, text, and eraser.
 * Maintains undo/redo stacks with configurable max history depth.
 */
export class DrawingEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private undoStack: ImageData[] = [];
  private redoStack: ImageData[] = [];
  private maxHistory = 50;
  private currentAction: DrawAction | null = null;
  private isDrawing = false;
  private snapshotBeforeStroke: ImageData | null = null;

  tool: DrawingTool = "pen";
  color = "#FF3B30";
  lineWidth = 3;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Cannot get 2D context from canvas");
    this.ctx = ctx;

    // Ensure crisp rendering
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
  }

  /** Save current canvas state to undo stack. */
  private saveState(): void {
    const imageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );
    this.undoStack.push(imageData);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    // Any new stroke invalidates the redo stack
    this.redoStack = [];
  }

  /** Restore canvas from an ImageData snapshot. */
  private restoreState(imageData: ImageData): void {
    this.ctx.putImageData(imageData, 0, 0);
  }

  // ---- Pointer event handlers ----

  onPointerDown(e: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * this.canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * this.canvas.height;

    this.isDrawing = true;

    // Save state before the stroke begins
    this.saveState();
    this.snapshotBeforeStroke = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );

    this.currentAction = {
      type: this.tool,
      points: [{ x, y }],
      color: this.color,
      lineWidth: this.lineWidth,
    };

    // For pen/highlighter/eraser, start the path immediately
    if (
      this.tool === "pen" ||
      this.tool === "highlighter" ||
      this.tool === "eraser"
    ) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
    }
  }

  onPointerMove(e: PointerEvent): void {
    if (!this.isDrawing || !this.currentAction) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * this.canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * this.canvas.height;

    this.currentAction.points.push({ x, y });

    switch (this.currentAction.type) {
      case "pen":
        this.drawPenSegment({ x, y });
        break;
      case "highlighter":
        this.drawHighlighterSegment({ x, y });
        break;
      case "eraser":
        this.erase([{ x, y }]);
        break;
      case "arrow":
      case "rectangle":
      case "circle":
        // For shape tools, redraw from snapshot on each move
        this.redrawShapePreview();
        break;
      default:
        break;
    }
  }

  onPointerUp(_e: PointerEvent): void {
    if (!this.isDrawing || !this.currentAction) return;

    this.isDrawing = false;

    const action = this.currentAction;
    const points = action.points;

    if (action.type === "text") {
      // Text placement: prompt for text at the clicked position
      const text = prompt("Enter annotation text:");
      if (text) {
        this.drawText(points[0], text);
      } else {
        // No text entered, pop the undo state
        this.undoStack.pop();
      }
    }

    // Finalize shape tools
    if (points.length >= 2) {
      const start = points[0];
      const end = points[points.length - 1];

      switch (action.type) {
        case "arrow":
          // Final render is already done via preview, just clean up
          break;
        case "rectangle":
          break;
        case "circle":
          break;
        default:
          break;
      }
    }

    this.currentAction = null;
    this.snapshotBeforeStroke = null;
  }

  // ---- Undo / Redo ----

  undo(): boolean {
    if (this.undoStack.length === 0) return false;

    // Save current state to redo
    const current = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );
    this.redoStack.push(current);

    const prev = this.undoStack.pop()!;
    this.restoreState(prev);
    return true;
  }

  redo(): boolean {
    if (this.redoStack.length === 0) return false;

    // Save current state to undo
    const current = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );
    this.undoStack.push(current);

    const next = this.redoStack.pop()!;
    this.restoreState(next);
    return true;
  }

  clear(): void {
    this.saveState();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  // ---- Private rendering methods ----

  private drawPenSegment(point: { x: number; y: number }): void {
    this.ctx.strokeStyle = this.currentAction!.color;
    this.ctx.lineWidth = this.currentAction!.lineWidth;
    this.ctx.globalAlpha = 1;
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.lineTo(point.x, point.y);
    this.ctx.stroke();
  }

  private drawHighlighterSegment(point: { x: number; y: number }): void {
    this.ctx.strokeStyle = this.currentAction!.color;
    this.ctx.lineWidth = this.currentAction!.lineWidth * 4;
    this.ctx.globalAlpha = 0.3;
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.lineTo(point.x, point.y);
    this.ctx.stroke();
    this.ctx.globalAlpha = 1;
  }

  private redrawShapePreview(): void {
    if (!this.snapshotBeforeStroke || !this.currentAction) return;

    const points = this.currentAction.points;
    if (points.length < 2) return;

    const start = points[0];
    const end = points[points.length - 1];

    // Restore to pre-stroke state
    this.restoreState(this.snapshotBeforeStroke);

    // Draw the shape
    this.ctx.strokeStyle = this.currentAction.color;
    this.ctx.lineWidth = this.currentAction.lineWidth;
    this.ctx.globalAlpha = 1;
    this.ctx.globalCompositeOperation = "source-over";

    switch (this.currentAction.type) {
      case "arrow":
        this.drawArrow(start, end);
        break;
      case "rectangle":
        this.drawRectangle(start, end);
        break;
      case "circle":
        this.drawCircle(start, end);
        break;
      default:
        break;
    }
  }

  private drawArrow(
    start: { x: number; y: number },
    end: { x: number; y: number },
  ): void {
    const headLength = Math.max(15, this.lineWidth * 4);
    const angle = Math.atan2(end.y - start.y, end.x - start.x);

    // Line
    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    this.ctx.lineTo(end.x, end.y);
    this.ctx.stroke();

    // Arrowhead
    this.ctx.beginPath();
    this.ctx.moveTo(end.x, end.y);
    this.ctx.lineTo(
      end.x - headLength * Math.cos(angle - Math.PI / 6),
      end.y - headLength * Math.sin(angle - Math.PI / 6),
    );
    this.ctx.moveTo(end.x, end.y);
    this.ctx.lineTo(
      end.x - headLength * Math.cos(angle + Math.PI / 6),
      end.y - headLength * Math.sin(angle + Math.PI / 6),
    );
    this.ctx.stroke();
  }

  private drawRectangle(
    start: { x: number; y: number },
    end: { x: number; y: number },
  ): void {
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const w = Math.abs(end.x - start.x);
    const h = Math.abs(end.y - start.y);

    this.ctx.beginPath();
    this.ctx.strokeRect(x, y, w, h);
  }

  private drawCircle(
    start: { x: number; y: number },
    end: { x: number; y: number },
  ): void {
    const cx = (start.x + end.x) / 2;
    const cy = (start.y + end.y) / 2;
    const rx = Math.abs(end.x - start.x) / 2;
    const ry = Math.abs(end.y - start.y) / 2;

    this.ctx.beginPath();
    this.ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  private drawText(
    position: { x: number; y: number },
    text: string,
  ): void {
    this.ctx.font = `${Math.max(16, this.lineWidth * 5)}px sans-serif`;
    this.ctx.fillStyle = this.color;
    this.ctx.globalAlpha = 1;
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.fillText(text, position.x, position.y);
  }

  private erase(points: Array<{ x: number; y: number }>): void {
    const size = this.lineWidth * 4;
    this.ctx.globalCompositeOperation = "destination-out";
    for (const p of points) {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalCompositeOperation = "source-over";
  }
}
