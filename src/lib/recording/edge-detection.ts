export interface DocumentCorners {
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
  bottomRight: { x: number; y: number };
}

/**
 * Detect a rectangular document in the given image data.
 *
 * Pipeline: grayscale -> Gaussian blur -> Sobel edges -> threshold ->
 * find contours -> find largest quadrilateral.
 *
 * Returns the four corners sorted (TL, TR, BL, BR) or `null` if no
 * document-like quadrilateral is found.
 */
export function detectDocumentEdges(imageData: ImageData): DocumentCorners | null {
  const { width, height } = imageData;

  // 1. Grayscale
  const gray = grayscale(imageData);

  // 2. Gaussian blur (3x3 kernel)
  const blurred = gaussianBlur(gray, width, height);

  // 3. Sobel edge detection
  const edges = sobelEdges(blurred, width, height);

  // 4. Threshold to binary
  const binary = threshold(edges, computeOtsuThreshold(edges));

  // 5-6. Find largest quadrilateral
  return findLargestQuad(binary, width, height);
}

/**
 * Apply a perspective transform to straighten a quadrilateral region.
 *
 * Uses inverse mapping with bilinear interpolation for quality output.
 */
export function perspectiveTransform(
  sourceCanvas: HTMLCanvasElement,
  corners: DocumentCorners,
  outputWidth: number,
  outputHeight: number,
): HTMLCanvasElement {
  const srcCtx = sourceCanvas.getContext("2d");
  if (!srcCtx) throw new Error("Cannot get 2D context from source canvas");

  const srcData = srcCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  const srcPixels = srcData.data;
  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;

  const outCanvas = document.createElement("canvas");
  outCanvas.width = outputWidth;
  outCanvas.height = outputHeight;
  const outCtx = outCanvas.getContext("2d")!;
  const outData = outCtx.createImageData(outputWidth, outputHeight);
  const outPixels = outData.data;

  // Source corners as array: TL, TR, BR, BL
  const src = [
    corners.topLeft,
    corners.topRight,
    corners.bottomRight,
    corners.bottomLeft,
  ];

  // Compute the 3x3 perspective transform matrix (destination -> source)
  const matrix = computePerspectiveMatrix(
    src,
    [
      { x: 0, y: 0 },
      { x: outputWidth, y: 0 },
      { x: outputWidth, y: outputHeight },
      { x: 0, y: outputHeight },
    ],
  );

  // Inverse mapping: for each output pixel, find the corresponding source pixel
  for (let dy = 0; dy < outputHeight; dy++) {
    for (let dx = 0; dx < outputWidth; dx++) {
      // Apply perspective transform
      const denom = matrix[6] * dx + matrix[7] * dy + matrix[8];
      const sx = (matrix[0] * dx + matrix[1] * dy + matrix[2]) / denom;
      const sy = (matrix[3] * dx + matrix[4] * dy + matrix[5]) / denom;

      // Bilinear interpolation
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const x1 = x0 + 1;
      const y1 = y0 + 1;
      const fx = sx - x0;
      const fy = sy - y0;

      if (x0 >= 0 && x1 < srcW && y0 >= 0 && y1 < srcH) {
        const outIdx = (dy * outputWidth + dx) * 4;
        const i00 = (y0 * srcW + x0) * 4;
        const i10 = (y0 * srcW + x1) * 4;
        const i01 = (y1 * srcW + x0) * 4;
        const i11 = (y1 * srcW + x1) * 4;

        for (let c = 0; c < 4; c++) {
          outPixels[outIdx + c] = Math.round(
            srcPixels[i00 + c] * (1 - fx) * (1 - fy) +
              srcPixels[i10 + c] * fx * (1 - fy) +
              srcPixels[i01 + c] * (1 - fx) * fy +
              srcPixels[i11 + c] * fx * fy,
          );
        }
      }
    }
  }

  outCtx.putImageData(outData, 0, 0);
  return outCanvas;
}

// ---- Internal helpers ----

function grayscale(imageData: ImageData): Uint8Array {
  const { data, width, height } = imageData;
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < gray.length; i++) {
    const idx = i * 4;
    // Luminance formula
    gray[i] = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
  }
  return gray;
}

function gaussianBlur(data: Uint8Array, width: number, height: number): Uint8Array {
  const out = new Uint8Array(data.length);

  // 3x3 Gaussian kernel (sigma ~0.85)
  //  1  2  1
  //  2  4  2
  //  1  2  1  (sum = 16)
  const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];
  const kernelSum = 16;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sum = 0;
      let ki = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          sum += data[(y + ky) * width + (x + kx)] * kernel[ki];
          ki++;
        }
      }
      out[y * width + x] = Math.round(sum / kernelSum);
    }
  }

  // Copy border pixels unchanged
  for (let x = 0; x < width; x++) {
    out[x] = data[x];
    out[(height - 1) * width + x] = data[(height - 1) * width + x];
  }
  for (let y = 0; y < height; y++) {
    out[y * width] = data[y * width];
    out[y * width + width - 1] = data[y * width + width - 1];
  }

  return out;
}

function sobelEdges(data: Uint8Array, width: number, height: number): Uint8Array {
  const out = new Uint8Array(data.length);

  // Sobel kernels
  // Gx: -1 0 1     Gy: -1 -2 -1
  //     -2 0 2          0  0  0
  //     -1 0 1          1  2  1

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;

      const tl = data[(y - 1) * width + (x - 1)];
      const tc = data[(y - 1) * width + x];
      const tr = data[(y - 1) * width + (x + 1)];
      const ml = data[y * width + (x - 1)];
      const mr = data[y * width + (x + 1)];
      const bl = data[(y + 1) * width + (x - 1)];
      const bc = data[(y + 1) * width + x];
      const br = data[(y + 1) * width + (x + 1)];

      const gx = -tl + tr - 2 * ml + 2 * mr - bl + br;
      const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;

      out[idx] = Math.min(255, Math.round(Math.sqrt(gx * gx + gy * gy)));
    }
  }

  return out;
}

function computeOtsuThreshold(data: Uint8Array): number {
  // Compute histogram
  const histogram = new Array<number>(256).fill(0);
  for (let i = 0; i < data.length; i++) {
    histogram[data[i]]++;
  }

  const total = data.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) {
    sum += i * histogram[i];
  }

  let sumB = 0;
  let wB = 0;
  let maxVariance = 0;
  let bestThreshold = 0;

  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;

    const wF = total - wB;
    if (wF === 0) break;

    sumB += t * histogram[t];

    const meanB = sumB / wB;
    const meanF = (sum - sumB) / wF;

    const variance = wB * wF * (meanB - meanF) * (meanB - meanF);

    if (variance > maxVariance) {
      maxVariance = variance;
      bestThreshold = t;
    }
  }

  return bestThreshold;
}

function threshold(data: Uint8Array, value: number): Uint8Array {
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    out[i] = data[i] >= value ? 255 : 0;
  }
  return out;
}

interface Point {
  x: number;
  y: number;
}

/**
 * Find the largest quadrilateral in the edge image.
 *
 * Strategy:
 *  1. Label connected components via flood fill
 *  2. For each component, extract boundary pixels
 *  3. Approximate the contour as a polygon (Ramer-Douglas-Peucker)
 *  4. If the polygon has 4 vertices, compute its area
 *  5. Return the largest 4-sided polygon's corners
 */
function findLargestQuad(
  edges: Uint8Array,
  width: number,
  height: number,
): DocumentCorners | null {
  // Label connected components
  const labels = new Int32Array(width * height);
  let nextLabel = 1;
  const componentPixels = new Map<number, Point[]>();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (edges[idx] === 255 && labels[idx] === 0) {
        // BFS flood fill
        const pixels: Point[] = [];
        const queue: Point[] = [{ x, y }];
        labels[idx] = nextLabel;

        while (queue.length > 0) {
          const p = queue.pop()!;
          pixels.push(p);

          // 8-connectivity neighbors
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = p.x + dx;
              const ny = p.y + dy;
              if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
              const ni = ny * width + nx;
              if (edges[ni] === 255 && labels[ni] === 0) {
                labels[ni] = nextLabel;
                queue.push({ x: nx, y: ny });
              }
            }
          }
        }

        // Only keep components with enough pixels to be meaningful
        if (pixels.length > 50) {
          componentPixels.set(nextLabel, pixels);
        }
        nextLabel++;
      }
    }
  }

  // Minimum area threshold: 5% of image area
  const minArea = width * height * 0.05;

  let bestCorners: DocumentCorners | null = null;
  let bestArea = 0;

  componentPixels.forEach((pixels) => {
    // Extract the convex hull of the component
    const hull = convexHull(pixels);
    if (hull.length < 4) return;

    // Simplify the hull to a polygon
    const simplified = rdpSimplify(hull, Math.max(width, height) * 0.02);

    // We want exactly 4 points — try to reduce further if > 4
    let quad: Point[] | null = null;

    if (simplified.length === 4) {
      quad = simplified;
    } else if (simplified.length > 4) {
      // Pick the 4 points with the largest angles (most "corner-like")
      quad = pickBestFourCorners(simplified);
    }

    if (!quad) return;

    const area = quadArea(quad);
    if (area > minArea && area > bestArea) {
      bestArea = area;
      bestCorners = sortCorners(quad);
    }
  });

  return bestCorners;
}

/**
 * Compute convex hull using Graham scan.
 */
function convexHull(points: Point[]): Point[] {
  if (points.length < 3) return [...points];

  // Find the bottom-most (then left-most) point
  let pivot = points[0];
  for (const p of points) {
    if (p.y > pivot.y || (p.y === pivot.y && p.x < pivot.x)) {
      pivot = p;
    }
  }

  // Sort by polar angle relative to pivot
  const sorted = points
    .filter((p) => p.x !== pivot.x || p.y !== pivot.y)
    .sort((a, b) => {
      const angleA = Math.atan2(pivot.y - a.y, a.x - pivot.x);
      const angleB = Math.atan2(pivot.y - b.y, b.x - pivot.x);
      if (Math.abs(angleA - angleB) < 1e-10) {
        // Same angle: sort by distance
        const dA = (a.x - pivot.x) ** 2 + (a.y - pivot.y) ** 2;
        const dB = (b.x - pivot.x) ** 2 + (b.y - pivot.y) ** 2;
        return dA - dB;
      }
      return angleA - angleB;
    });

  const stack: Point[] = [pivot];

  for (const p of sorted) {
    while (stack.length >= 2) {
      const a = stack[stack.length - 2];
      const b = stack[stack.length - 1];
      const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
      if (cross <= 0) {
        stack.pop();
      } else {
        break;
      }
    }
    stack.push(p);
  }

  return stack;
}

/**
 * Ramer-Douglas-Peucker polygon simplification.
 */
function rdpSimplify(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return [...points];

  // Find the point with the maximum distance from the line (first -> last)
  let maxDist = 0;
  let maxIdx = 0;
  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const d = pointToLineDist(points[i], first, last);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }

  if (maxDist > epsilon) {
    const left = rdpSimplify(points.slice(0, maxIdx + 1), epsilon);
    const right = rdpSimplify(points.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }

  return [first, last];
}

function pointToLineDist(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2);
  }

  const num = Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x);
  return num / Math.sqrt(lenSq);
}

/**
 * From a polygon with more than 4 vertices, pick the 4 that form the
 * largest-area quadrilateral. Uses a simplified heuristic: pick the
 * 4 points farthest from the centroid.
 */
function pickBestFourCorners(points: Point[]): Point[] {
  const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
  const cy = points.reduce((s, p) => s + p.y, 0) / points.length;

  // Score each point by distance from centroid
  const scored = points.map((p) => ({
    point: p,
    dist: Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2),
  }));

  scored.sort((a, b) => b.dist - a.dist);

  // Take the 4 most distant points
  return scored.slice(0, 4).map((s) => s.point);
}

function quadArea(points: Point[]): number {
  // Shoelace formula
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
}

/**
 * Sort 4 points into TL, TR, BL, BR order.
 *
 * Strategy: sort by y to separate top/bottom pairs, then by x within each pair.
 */
function sortCorners(points: Point[]): DocumentCorners {
  const sorted = [...points].sort((a, b) => a.y - b.y);

  // Top two and bottom two
  const topPair = sorted.slice(0, 2).sort((a, b) => a.x - b.x);
  const bottomPair = sorted.slice(2, 4).sort((a, b) => a.x - b.x);

  return {
    topLeft: { x: topPair[0].x, y: topPair[0].y },
    topRight: { x: topPair[1].x, y: topPair[1].y },
    bottomLeft: { x: bottomPair[0].x, y: bottomPair[0].y },
    bottomRight: { x: bottomPair[1].x, y: bottomPair[1].y },
  };
}

/**
 * Compute a 3x3 perspective transform matrix mapping source quad -> dest quad.
 *
 * Returns a 9-element array [a, b, c, d, e, f, g, h, 1] representing:
 *   x' = (ax + by + c) / (gx + hy + 1)
 *   y' = (dx + ey + f) / (gx + hy + 1)
 */
function computePerspectiveMatrix(
  src: Point[],
  dst: Point[],
): number[] {
  // Build 8x8 linear system to solve for the 8 unknowns (a,b,c,d,e,f,g,h)
  // using the 4 point correspondences.
  //
  // For each pair (x,y) -> (u,v):
  //   u(gx + hy + 1) = ax + by + c   =>  ax + by + c - ugx - uhy = u
  //   v(gx + hy + 1) = dx + ey + f   =>  dx + ey + f - vgx - vhy = v

  const A: number[][] = [];
  const B: number[] = [];

  for (let i = 0; i < 4; i++) {
    const sx = src[i].x;
    const sy = src[i].y;
    const dx = dst[i].x;
    const dy = dst[i].y;

    A.push([dx, dy, 1, 0, 0, 0, -sx * dx, -sx * dy]);
    B.push(sx);

    A.push([0, 0, 0, dx, dy, 1, -sy * dx, -sy * dy]);
    B.push(sy);
  }

  // Solve using Gaussian elimination
  const solution = gaussianElimination(A, B);

  return [...solution, 1];
}

/**
 * Solve Ax = b using Gaussian elimination with partial pivoting.
 */
function gaussianElimination(A: number[][], b: number[]): number[] {
  const n = b.length;
  // Augment
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    // Partial pivot
    let maxRow = col;
    let maxVal = Math.abs(M[col][col]);
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > maxVal) {
        maxVal = Math.abs(M[row][col]);
        maxRow = row;
      }
    }
    if (maxRow !== col) {
      [M[col], M[maxRow]] = [M[maxRow], M[col]];
    }

    // Eliminate below
    for (let row = col + 1; row < n; row++) {
      const factor = M[row][col] / M[col][col];
      for (let j = col; j <= n; j++) {
        M[row][j] -= factor * M[col][j];
      }
    }
  }

  // Back substitution
  const x = new Array<number>(n).fill(0);
  for (let row = n - 1; row >= 0; row--) {
    let sum = M[row][n];
    for (let j = row + 1; j < n; j++) {
      sum -= M[row][j] * x[j];
    }
    x[row] = sum / M[row][row];
  }

  return x;
}
