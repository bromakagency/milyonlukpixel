import fs from 'fs/promises';
import path from 'path';
import { Pixel, CreatePixelDto, UpdatePixelDto, Stats } from '../types.js';

const DATA_FILE = path.join(process.cwd(), 'data', 'pixels.json');

async function ensureDataDir(): Promise<void> {
  const dir = path.dirname(DATA_FILE);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

async function readPixels(): Promise<Pixel[]> {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writePixels(pixels: Pixel[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(DATA_FILE, JSON.stringify(pixels, null, 2));
}

export const pixelService = {
  async getAll(): Promise<Pixel[]> {
    return readPixels();
  },

  async getById(id: string): Promise<Pixel | null> {
    const pixels = await readPixels();
    return pixels.find(p => p.id === id) || null;
  },

  async create(dto: CreatePixelDto): Promise<Pixel> {
    const pixels = await readPixels();
    
    const isOccupied = pixels.some(p => 
      dto.x < p.x + p.w &&
      dto.x + dto.w > p.x &&
      dto.y < p.y + p.h &&
      dto.y + dto.h > p.y
    );

    if (isOccupied) {
      throw new Error('Bu alan zaten dolu');
    }

    const newPixel: Pixel = {
      ...dto,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };

    pixels.push(newPixel);
    await writePixels(pixels);
    
    return newPixel;
  },

  async update(id: string, dto: UpdatePixelDto): Promise<Pixel | null> {
    const pixels = await readPixels();
    const index = pixels.findIndex(p => p.id === id);
    
    if (index === -1) return null;

    const updated = { ...pixels[index], ...dto };
    pixels[index] = updated;
    await writePixels(pixels);
    
    return updated;
  },

  async delete(id: string): Promise<boolean> {
    const pixels = await readPixels();
    const filtered = pixels.filter(p => p.id !== id);
    
    if (filtered.length === pixels.length) return false;
    
    await writePixels(filtered);
    return true;
  },

  async getStats(): Promise<Stats> {
    const pixels = await readPixels();
    const totalPixels = 1000000;
    const soldPixels = pixels.reduce((acc, p) => acc + (p.w * 10 * p.h * 10), 0);
    const availablePixels = totalPixels - soldPixels;
    const totalRevenue = pixels.reduce((acc, p) => acc + (p.w * p.h * 100), 0);

    return {
      totalPixels,
      soldPixels,
      availablePixels,
      totalRevenue,
    };
  },
};
