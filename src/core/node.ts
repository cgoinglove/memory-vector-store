import { join } from 'path';
import { NodeStorageProvider } from '../storage/node-file-storage';
import { VectorStore } from './vector-store';
import { MemoryVectorParser, MemoryVectorStore, MemoryVectorStoreOptions } from '../interface';
/**
 * Creates and configures a MemoryVectorStore instance for Node.js environments.
 * This factory function sets up a vector store with appropriate Node.js defaults
 * and file system-based storage provider.
 *
 * @function MemoryVectorStore
 * @param {MemoryVectorParser} vectorParser - A function that converts text to a vector representation.
 *                                 Can return either a Promise<number[]> for async processing
 *                                 or number[] for synchronous processing.
 * @param {Partial<MemoryVectorStoreOptions>} [options] - Optional configuration options.
 *                                                      Partial override of default settings.
 * @returns {VectorStore} A configured vector store instance ready for use in Node.js environments.
 *
 * @example
 * // Create a vector store with default settings
 * const vectorStore = MemoryVectorStore(text => embeddingModel.embed(text));
 *
 * // Create a vector store with custom settings
 * const vectorStore = MemoryVectorStore(
 *   async text => await embeddingModel.embed(text),
 *   {
 *     storagePath: './data/my-vectors.json',
 *     debug: true,
 *     maxFileSizeMB: 1000
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
 * - maxFileSizeMB: 500 - Default file size limit of 500MB
 * - storagePath: '{cwd}/node_modules/__mvsl__/data.json' - Default file path for stored data
 *
 * Note: For Node.js environments, the storage is file-based and has significantly higher
 * capacity limits compared to browser environments. The maxFileSizeMB can be set to
 * higher values according to your disk space and memory constraints.
 */
export function memoryVectorStore<Metadata extends Record<string, any> = Record<string, any>>(
  vectorParser: MemoryVectorParser,
  options?: Partial<MemoryVectorStoreOptions>
): MemoryVectorStore<Metadata> {
  const defaultOptions: MemoryVectorStoreOptions = {
    autoSave: true,
    debug: false,
    maxFileSizeMB: 500,
    storagePath: join(process.cwd(), 'node_modules/__mvsl__/data.json'),
    ...options,
  };

  defaultOptions.maxFileSizeMB = Math.max(Math.min(defaultOptions.maxFileSizeMB, 1000), 1);
  return new VectorStore(vectorParser, new NodeStorageProvider(), defaultOptions);
}

export { doc } from './vector-store';

export * from '../interface';
