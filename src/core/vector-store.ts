import { Locker, debounce } from '../shared/util';
import {
  MemoryVectorData,
  MemoryVectorDataSerialize,
  MemoryVectorParser,
  MemoryVectorStorageProvider,
  MemoryVectorStoreOptions,
  MemoryVectorStore,
  MemoryDocument,
} from '../interface';

export function doc<T>(content: string, metadata?: T): MemoryDocument<T> {
  return {
    content,
    metadata,
  };
}

const serializeItem = <T>(entry: [string, { metadata?: T; vector: number[] }]): MemoryVectorDataSerialize => [
  entry[0],
  entry[1].vector,
  entry[1].metadata,
];

interface StoreCache<T> {
  dirty: boolean;
  store: Map<string, { metadata?: T; vector: number[] }>;
}

const globalCache = new Map<string, StoreCache<any>>();

/**
 * A lightweight in-memory vector store with persistence capabilities.
 * Stores text data and their vector representations for similarity searching.
 * Supports various storage backends through the MemoryVectorStorageProvider interface.
 * @class VectorStore
 */
export class VectorStore<T = any> implements MemoryVectorStore<T> {
  private cache!: StoreCache<T>;

  private saveLock = new Locker();

  constructor(
    private vectorParser: MemoryVectorParser,
    private storageProvider: MemoryVectorStorageProvider,
    private options: MemoryVectorStoreOptions
  ) {
    this.options.storagePath = this.options.storagePath ?? `default`;
    this.saveLock.unLock();
    this.initializeStore();
  }

  private initializeStore(): void {
    if (globalCache.has(this.options.storagePath)) {
      this.cache = globalCache.get(this.options.storagePath)!;
    } else {
      this.cache = { dirty: false, store: new Map() };
      this.load();
      globalCache.set(this.options.storagePath, this.cache);
    }
  }

  private truncateLog(text: string, maxLength: number = 50): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  async add(document: string): Promise<MemoryVectorData<T>>;
  async add(document: MemoryDocument<T>): Promise<MemoryVectorData<T>>;
  async add(document: unknown): Promise<MemoryVectorData<T>> {
    const d: MemoryDocument<T> =
      typeof document === 'string'
        ? doc(document)
        : doc((document as MemoryDocument).content, (document as MemoryDocument).metadata);

    if (this.options.debug) {
      console.log(`[LiteMemoryVectorStore] Adding document: ${this.truncateLog(d.content)}`);
    }

    const vector = await this.vectorParser(d.content);

    if (!Array.isArray(vector)) throw new Error('Vector parser must return an array');

    this.cache.store.set(d.content, {
      metadata: d.metadata,
      vector,
    });
    this.cache.dirty = true;
    if (this.options.autoSave) {
      this.save();
    }
    return {
      document: d,
      vector,
    };
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async similaritySearch(
    query: string,
    k?: number,
    filter?: ((doc: MemoryDocument<T>) => boolean) | undefined
  ): Promise<(MemoryDocument<T> & { score: number })[]> {
    await this.saveLock.wait();
    const queryVector = this.cache.store.get(query)?.vector ?? (await this.vectorParser(query));

    let candidates = Array.from(this.cache.store.entries(), ([content, value]) => {
      const document: MemoryDocument<T> = {
        content,
        metadata: value.metadata,
      };
      return document;
    });
    if (filter) {
      candidates = candidates.filter(filter);
    }

    const scoredResults = candidates.map((item) => ({
      item,
      score: this.cosineSimilarity(queryVector, this.cache.store.get(item.content)!.vector),
    }));

    scoredResults.sort((a, b) => b.score - a.score);

    return scoredResults.slice(0, k).map((result) => ({
      content: result.item.content,
      metadata: result.item.metadata,
      score: result.score,
    }));
  }

  async remove(content: string): Promise<void> {
    const initialLength = this.cache.store.size;
    this.cache.store.delete(content);

    if (this.cache.store.size !== initialLength) {
      this.cache.dirty = true;

      if (this.options.autoSave) {
        this.save();
      }
    }
  }

  clear(): void {
    if (this.cache.store.size > 0) {
      this.cache.store.clear();
      this.cache.dirty = true;

      if (this.options.autoSave) {
        this.save();
      }
    }
  }

  getAll(): MemoryDocument<T>[] {
    return Array.from(this.cache.store.entries(), ([content, value]) => ({
      content,
      metadata: value.metadata,
    }));
  }

  /**
   * Get the number of items in the store
   * @returns {number} Total number of vector data items
   */
  count(): number {
    return this.cache.store.size;
  }

  /**
   * Save the current state of the vector store to disk
   */
  async save(): Promise<void> {
    if (!this.cache.dirty || !this.options.storagePath) return Promise.resolve();
    this.saveLock.lock();

    debounce(
      this.options.storagePath,
      async () => {
        try {
          const maxSizeBytes = (this.options.maxFileSizeMB || 500) * 1024 * 1024;

          const serializedData = Array.from(this.cache.store.entries(), serializeItem);
          let jsonData = JSON.stringify(serializedData);
          let dataSize = Buffer.byteLength(jsonData, 'utf8');

          if (dataSize > maxSizeBytes && serializedData.length > 0) {
            if (this.options.debug) {
              console.log(
                `[LiteMemoryVectorStore] Data size (${this.formatSize(dataSize)}) exceeds limit (${this.formatSize(maxSizeBytes)})`
              );
            }

            while (dataSize > maxSizeBytes && serializedData.length > 0) {
              serializedData.shift();
              jsonData = JSON.stringify(serializedData);
              dataSize = Buffer.byteLength(jsonData, 'utf8');
            }

            if (this.options.debug) {
              console.log(
                `[LiteMemoryVectorStore] Trimmed to ${serializedData.length} items (${this.formatSize(dataSize)})`
              );
            }
            this.cache.store.clear();
            for (const item of serializedData) {
              this.cache.store.set(item[0], {
                metadata: item[2],
                vector: item[1],
              });
            }
          }

          this.storageProvider.save(this.options.storagePath!, serializedData);
          this.cache.dirty = false;

          if (this.options.debug) {
            console.log(
              `[LiteMemoryVectorStore] Save completed. ${serializedData.length} items saved (${this.formatSize(dataSize)})`
            );
          }
        } catch (error) {
          console.error('Error saving vector store:', error);
        } finally {
          this.saveLock.unLock();
        }
      },
      100
    );
    return this.saveLock.wait();
  }
  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  /**
   * Load vector data from disk
   * @private
   */
  private load(): void {
    if (!this.options.storagePath) return;

    try {
      if (this.storageProvider.exists(this.options.storagePath)) {
        const data = this.storageProvider.load(this.options.storagePath!);
        for (const vectorData of data) {
          this.cache.store.set(vectorData[0], {
            vector: vectorData[1],
            metadata: vectorData[2],
          });
        }
        if (this.options.debug) console.log(`[LiteMemoryVectorStore] Loaded ${this.cache.store.size} items.`);
      } else if (this.options.debug) {
        console.log(`[LiteMemoryVectorStore] No data file found at: ${this.options.storagePath}`);
      }
    } catch (error) {
      console.error('Error loading vector store:', error);
      this.cache.store.clear();
    }
  }
}
