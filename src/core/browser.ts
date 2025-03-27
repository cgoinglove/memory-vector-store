import { MemoryVectorParser, MemoryVectorStore, MemoryVectorStoreOptions } from '../interface';
import { BrowserStorageProvider } from '../storage/browser-local-storage';
import { VectorStore } from './vector-store';

/**
 * Creates and configures a MemoryVectorStore instance for browser environments.
 * This factory function sets up a vector store with appropriate browser defaults
 * and storage provider.
 *
 * @function MemoryVectorStore
 * @param {MemoryVectorParser} vectorParser - A function that converts text to a vector representation.
 *                                 Can return either a Promise<number[]> for async processing
 *                                 or number[] for synchronous processing.
 * @param {Partial<MemoryVectorStoreOptions>} [options] - Optional configuration options.
 *                                                      Partial override of default settings.
 * @returns {VectorStore} A configured vector store instance ready for use in browser environments.
 *
 * @example
 * // Create a vector store with default settings
 * const vectorStore = MemoryVectorStore(text => embeddingModel.embed(text));
 *
 * // Create a vector store with custom settings
 * const vectorStore = MemoryVectorStore(
 *   async text => await embeddingModel.embed(text),
 *   {
 *     storagePath: 'my-custom-vectors',
 *     debug: true
 *   }
 * );
 *
 * // Add data to the store
 * await vectorStore.add('Sample text data');
 *
 * // Search for similar items
 * const results = await vectorStore.similaritySearch('query text', 3);
 *
 * @default
 * Default options:
 * - autoSave: true - Automatically saves changes to storage
 * - debug: false - Debug logging is disabled by default
 * - maxFileSizeMB: 3 - Limited to 3MB due to browser localStorage constraints
 * - storagePath: 'memory-vector-store' - Default storage key used in localStorage
 *
 * Note: maxFileSizeMB is clamped between 0.1MB and 3MB for browser environments
 * due to localStorage limitations.
 */
export function browserMemoryVectorStore<Metadata extends Record<string, any> = Record<string, any>>(
  vectorParser: MemoryVectorParser,
  options?: Partial<MemoryVectorStoreOptions>
): MemoryVectorStore<Metadata> {
  const defaultOptions: MemoryVectorStoreOptions = {
    autoSave: true,
    debug: false,
    maxFileSizeMB: 3,
    storagePath: 'memory-vector-store',
    ...options,
  };

  defaultOptions.maxFileSizeMB = Math.max(Math.min(defaultOptions.maxFileSizeMB, 3), 0.1);

  return new VectorStore(vectorParser, new BrowserStorageProvider(), defaultOptions);
}

export { doc } from './vector-store';
export * from '../interface';
