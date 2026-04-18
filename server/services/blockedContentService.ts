import fs from 'fs/promises';
import path from 'path';
import { BlockedContent, CreateBlockDto } from '../types/activity.js';

const BLOCKED_FILE = path.join(process.cwd(), 'data', 'blockedContent.json');

async function ensureBlockedDir(): Promise<void> {
  const dir = path.dirname(BLOCKED_FILE);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

async function readBlocked(): Promise<BlockedContent[]> {
  try {
    await ensureBlockedDir();
    const data = await fs.readFile(BLOCKED_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeBlocked(blocked: BlockedContent[]): Promise<void> {
  await ensureBlockedDir();
  await fs.writeFile(BLOCKED_FILE, JSON.stringify(blocked, null, 2));
}

export const blockedContentService = {
  async create(dto: CreateBlockDto, createdBy: string): Promise<BlockedContent> {
    const blocked = await readBlocked();
    
    if (blocked.some(b => b.value === dto.value && b.type === dto.type && b.isActive)) {
      throw new Error('Bu içerik zaten engellenmiş');
    }
    
    const newBlock: BlockedContent = {
      id: Date.now().toString(),
      type: dto.type,
      value: dto.value,
      reason: dto.reason,
      createdAt: new Date().toISOString(),
      createdBy,
      isActive: true,
    };
    
    blocked.push(newBlock);
    await writeBlocked(blocked);
    
    return newBlock;
  },

  async getAll(): Promise<BlockedContent[]> {
    const blocked = await readBlocked();
    return blocked.filter(b => b.isActive).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  async delete(id: string): Promise<boolean> {
    const blocked = await readBlocked();
    const index = blocked.findIndex(b => b.id === id);
    
    if (index === -1) return false;
    
    blocked[index].isActive = false;
    await writeBlocked(blocked);
    
    return true;
  },

  async checkContent(content: {
    imageUrl?: string;
    linkUrl?: string;
    title?: string;
  }): Promise<{ blocked: boolean; reason?: string }> {
    const blocked = await readBlocked().then(b => b.filter(b => b.isActive));
    
    for (const block of blocked) {
      if (block.type === 'domain' && content.linkUrl) {
        try {
          const url = new URL(content.linkUrl);
          if (url.hostname.includes(block.value)) {
            return { blocked: true, reason: block.reason };
          }
        } catch {}
      }
      
      if (block.type === 'keyword' && content.title) {
        if (content.title.toLowerCase().includes(block.value.toLowerCase())) {
          return { blocked: true, reason: block.reason };
        }
      }
    }
    
    return { blocked: false };
  },

  async getStats(): Promise<{
    totalBlocked: number;
    blockedDomains: number;
    blockedKeywords: number;
  }> {
    const blocked = await readBlocked().then(b => b.filter(b => b.isActive));
    
    return {
      totalBlocked: blocked.length,
      blockedDomains: blocked.filter(b => b.type === 'domain').length,
      blockedKeywords: blocked.filter(b => b.type === 'keyword').length,
    };
  },
};