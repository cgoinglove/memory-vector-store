import { MemoryVectorDataSerialize, MemoryVectorStorageProvider } from '../interface';

export class BrowserStorageProvider implements MemoryVectorStorageProvider {
  save(key: string, vectors: MemoryVectorDataSerialize[]): void {
    localStorage.setItem(key, JSON.stringify(vectors));
  }

  load(key: string): MemoryVectorDataSerialize[] {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  exists(key: string): boolean {
    return localStorage.getItem(key) !== null;
  }
}
