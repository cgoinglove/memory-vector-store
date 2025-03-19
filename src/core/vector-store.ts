import { Locker, debounce } from '../shared/util';
import {
  MemoryVectorData,
  MemoryVectorDataSerialize,
  MemoryVectorParser,
  MemoryVectorStorageProvider,
  MemoryVectorStoreOptions,
  MemoryVectorStore,
} from '../interface';

/**
 * A lightweight in-memory vector store with persistence capabilities.
 * Stores text data and their vector representations for similarity searching.
 * Supports various storage backends through the MemoryVectorStorageProvider interface.
 * @class VectorStore
 */
export class VectorStore implements MemoryVectorStore {
  private cache: Map<string, MemoryVectorData> = new Map();

  private dirty: boolean = false;

  private saveLock = new Locker();

  /**
   * Creates a new instance of MemoryVectorStore.
   * @constructor
   * @param {Function} vectorParser - A function that converts text to a vector representation.
   * @param {MemoryVectorStorageProvider} storageProvider - The storage provider for persistence.
   * @param {MemoryVectorStoreOptions} options - Configuration options for the vector store.
   */
  constructor(
    private vectorParser: MemoryVectorParser,
    private storageProvider: MemoryVectorStorageProvider,
    private options: MemoryVectorStoreOptions
  ) {
    this.saveLock.unLock();
    this.load();
  }

  private truncateLog(text: string, maxLength: number = 50): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  /**
   * Adds a new piece of data to the vector store.
   * If the data already exists, returns the cached value.
   * @param {string} data - The text data to add.
   * @returns {Promise<MemoryVectorData>} The added vector data.
   */
  async add(data: string): Promise<MemoryVectorData> {
    if (this.cache.has(data)) {
      if (this.options.debug) console.log(`[LiteMemoryVectorStore] Cache hit for: "${this.truncateLog(data)}"`);
      return this.cache.get(data)!;
    }

    if (this.options.debug) console.log(`[LiteMemoryVectorStore] Adding new item: "${this.truncateLog(data)}"`);
    const vector = await this.vectorParser(data);
    const vectorData = { data, vector };

    this.cache.set(data, vectorData);
    this.dirty = true;

    if (this.options.autoSave) {
      this.save();
    }
    return vectorData;
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
  /**
   * Searches for similar items in the vector store.
   * @param {string} query - The search query.
   * @param {number} [k=4] - Number of results to return.
   * @param {Function} [filter] - Optional filter function to apply to results.
   * @returns {Promise<MemoryVectorData[]>} Sorted array of most similar vector data.
   */
  async similaritySearch(
    query: string,
    k: number = 4,
    filter?: (doc: MemoryVectorData) => boolean
  ): Promise<MemoryVectorData[]> {
    await this.saveLock.wait();
    const queryVector = this.cache.get(query)?.vector ?? (await this.vectorParser(query));

    let candidates = Array.from(this.cache.values());
    if (filter) {
      candidates = candidates.filter(filter);
    }

    // Calculate similarities and sort
    const scoredResults = candidates.map((item) => ({
      item,
      score: this.cosineSimilarity(queryVector, item.vector),
    }));

    scoredResults.sort((a, b) => b.score - a.score);

    // Return top k results
    return scoredResults.slice(0, k).map((result) => result.item);
  }

  /**
   * Remove a specific piece of data from the store
   * @param {string} data - The text data to remove
   */
  async remove(data: string): Promise<void> {
    const initialLength = this.cache.size;
    this.cache.delete(data);

    if (this.cache.size !== initialLength) {
      this.dirty = true;

      if (this.options.autoSave) {
        this.save();
      }
    }
  }

  /**
   * Clear all data from the vector store
   */
  clear(): void {
    if (this.cache.size > 0) {
      this.cache.clear();
      this.dirty = true;

      if (this.options.autoSave) {
        this.save();
      }
    }
  }

  /**
   * Retrieve all stored vector data
   * @returns {VectorData[]} Array of all stored vector data
   */
  getAll(): MemoryVectorData[] {
    return Array.from(this.cache.values());
  }

  /**
   * Get the number of items in the store
   * @returns {number} Total number of vector data items
   */
  count(): number {
    return this.cache.size;
  }

  /**
   * Save the current state of the vector store to disk
   */
  async save(): Promise<void> {
    if (!this.dirty || !this.options.storagePath) return Promise.resolve();
    this.saveLock.lock();

    debounce(
      this.options.storagePath,
      async () => {
        try {
          const allData = this.getAll();
          const maxSizeBytes = (this.options.maxFileSizeMB || 500) * 1024 * 1024;

          const serializedData = allData.map(this.serializeItem);
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
            this.cache.clear();
            for (const item of serializedData.map(this.deserializeItem)) {
              this.cache.set(item.data, item);
            }
          }

          this.storageProvider.save(this.options.storagePath!, serializedData);
          this.dirty = false;

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
        const vectorDatas = data.map(this.deserializeItem);
        for (const vectorData of vectorDatas) {
          this.cache.set(vectorData.data, vectorData);
        }
        if (this.options.debug) console.log(`[LiteMemoryVectorStore] Loaded ${this.cache.size} items.`);
      } else if (this.options.debug) {
        console.log(`[LiteMemoryVectorStore] No data file found at: ${this.options.storagePath}`);
      }
    } catch (error) {
      console.error('Error loading vector store:', error);
      this.cache = new Map();
    }
  }

  private serializeItem(data: MemoryVectorData): MemoryVectorDataSerialize {
    return [data.data, data.vector];
  }

  private deserializeItem(data: MemoryVectorDataSerialize): MemoryVectorData {
    return { data: data[0], vector: data[1] };
  }
}
