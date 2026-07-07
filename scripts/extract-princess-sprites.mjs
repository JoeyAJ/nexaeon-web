import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(projectRoot, 'public/pet/princess/spritesheet.webp');
const framesDir = path.join(projectRoot, 'public/pet/princess/frames');
const manifestPath = path.join(projectRoot, 'public/pet/princess/princess-frames.json');

const ALPHA_THRESHOLD = 8;
const MIN_FRAME_PIXELS = 1000;
const FRAME_PADDING = 12;
const FALLBACK_COLUMNS = 8;
const FALLBACK_ROWS = 9;

function isOpaque(data, width, x, y) {
  return data[(y * width + x) * 4 + 3] > ALPHA_THRESHOLD;
}

function hasOpaquePixels(data, width, x, y, w, h) {
  let count = 0;

  for (let row = y; row < y + h; row += 1) {
    for (let column = x; column < x + w; column += 1) {
      if (isOpaque(data, width, column, row)) count += 1;
    }
  }

  return count;
}

function getCellBounds(data, imageWidth, cell) {
  let minX = cell.x + cell.w;
  let minY = cell.y + cell.h;
  let maxX = cell.x - 1;
  let maxY = cell.y - 1;
  let opaquePixels = 0;

  for (let y = cell.y; y < cell.y + cell.h; y += 1) {
    for (let x = cell.x; x < cell.x + cell.w; x += 1) {
      if (!isOpaque(data, imageWidth, x, y)) continue;

      opaquePixels += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (opaquePixels < MIN_FRAME_PIXELS) return null;

  return {
    minX,
    minY,
    maxX,
    maxY,
    opaquePixels,
  };
}

function buildGridCells(width, height) {
  const cellWidth = Math.floor(width / FALLBACK_COLUMNS);
  const cellHeight = Math.floor(height / FALLBACK_ROWS);
  const cells = [];

  for (let row = 0; row < FALLBACK_ROWS; row += 1) {
    for (let column = 0; column < FALLBACK_COLUMNS; column += 1) {
      const x = column * cellWidth;
      const y = row * cellHeight;
      cells.push({
        x,
        y,
        w: column === FALLBACK_COLUMNS - 1 ? width - x : cellWidth,
        h: row === FALLBACK_ROWS - 1 ? height - y : cellHeight,
      });
    }
  }

  return cells;
}

async function main() {
  const image = sharp(sourcePath, { animated: false }).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const sheet = sharp(sourcePath, { animated: false }).ensureAlpha();
  const cells = buildGridCells(info.width, info.height);
  const frames = [];

  await rm(framesDir, { force: true, recursive: true });
  await mkdir(framesDir, { recursive: true });

  for (const cell of cells) {
    const opaquePixels = hasOpaquePixels(data, info.width, cell.x, cell.y, cell.w, cell.h);
    if (opaquePixels < MIN_FRAME_PIXELS) continue;

    const bounds = getCellBounds(data, info.width, cell);
    if (!bounds) continue;

    const left = Math.max(0, bounds.minX - FRAME_PADDING);
    const top = Math.max(0, bounds.minY - FRAME_PADDING);
    const right = Math.min(info.width - 1, bounds.maxX + FRAME_PADDING);
    const bottom = Math.min(info.height - 1, bounds.maxY + FRAME_PADDING);
    const width = right - left + 1;
    const height = bottom - top + 1;
    const id = `frame-${String(frames.length + 1).padStart(3, '0')}`;
    const fileName = `${id}.png`;
    const outputPath = path.join(framesDir, fileName);

    await sheet
      .clone()
      .extract({ left, top, width, height })
      .png()
      .toFile(outputPath);

    frames.push({
      id,
      src: `/pet/princess/frames/${fileName}`,
      width,
      height,
    });
  }

  await writeFile(
    manifestPath,
    `${JSON.stringify({ frames }, null, 2)}\n`,
  );

  console.log(`Extracted ${frames.length} princess frames to ${path.relative(projectRoot, framesDir)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
