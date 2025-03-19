import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { MemoryVectorDataSerialize, MemoryVectorStorageProvider } from '../interface';

export class NodeStorageProvider implements MemoryVectorStorageProvider {
  save(key: string, vectors: MemoryVectorDataSerialize[]): void {
    const dir = dirname(key);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(key, JSON.stringify(vectors), 'utf8');
  }

  load(key: string): MemoryVectorDataSerialize[] {
    if (!existsSync(key)) return [];
    const data = readFileSync(key, 'utf8');
    return JSON.parse(data || '[]');
  }

  exists(key: string): boolean {
    return existsSync(key);
  }
}
