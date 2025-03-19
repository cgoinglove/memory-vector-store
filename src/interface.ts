/**
 * A function type that converts text to a vector representation.
 * Can return either a Promise for asynchronous processing or a direct array for synchronous processing.
 *
 * @typedef {Function} MemoryVectorParser
 * @param {string} text - The text to convert to a vector.
 * @returns {Promise<number[]>|number[]} The vector representation of the text.
 */
export type MemoryVectorParser = (text: string) => Promise<number[]> | number[];

/**
 * Represents a vector data item with original text and its vector representation.
 * @interface MemoryVectorData
 * @property {string} data - The original text data.
 * @property {number[]} vector - The vector representation of the data.
 */
export interface MemoryVectorData {
  data: string;
  vector: number[];
}

/**
 * Serialized format of vector data for efficient storage.
 * A tuple where the first element is the original text data
 * and the second element is the vector representation.
 * @typedef {[string, number[]]} MemoryVectorDataSerialize
 */
export type MemoryVectorDataSerialize = [string, number[]];

/**
 * Configuration options for the memory vector store.
 * @interface MemoryVectorStoreOptions
 * @property {boolean} autoSave - Whether to automatically save changes to storage.
 * @property {boolean} debug - Whether to log debug information.
 * @property {number} maxFileSizeMB - Maximum storage size in megabytes.
 * @property {string} storagePath - Path or key for storing vector data.
 */
export interface MemoryVectorStoreOptions {
  autoSave: boolean;
  debug: boolean;
  maxFileSizeMB: number;
  storagePath: string;
}

/**
 * Interface for storage providers that handle persistence of vector data.
 * Implementations can target different storage backends (filesystem, localStorage, etc).
 * @interface MemoryVectorStorageProvider
 */
export interface MemoryVectorStorageProvider {
  /**
   * Saves serialized vector data to the storage.
   * @param {string} key - The key or path where data should be stored.
   * @param {MemoryVectorDataSerialize[]} vectors - The serialized vector data to save.
   * @returns {void}
   */
  save(key: string, vectors: MemoryVectorDataSerialize[]): void;

  /**
   * Loads serialized vector data from storage.
   * @param {string} key - The key or path from where to load data.
   * @returns {MemoryVectorDataSerialize[]} The loaded serialized vector data.
   */
  load(key: string): MemoryVectorDataSerialize[];

  /**
   * Checks if data exists at the specified key/path.
   * @param {string} key - The key or path to check.
   * @returns {boolean} True if data exists, false otherwise.
   */
  exists(key: string): boolean;
}

/**
 * Interface defining the core functionality of a memory vector store.
 * Provides methods for adding, retrieving, searching, and managing vector data.
 *
 * @interface MemoryVectorStore
 */
export interface MemoryVectorStore {
  /**
   * Adds a new piece of data to the vector store.
   * If the data already exists, returns the cached value.
   *
   * @param {string} data - The text data to add.
   * @returns {Promise<MemoryVectorData>} The added vector data.
   */
  add(data: string): Promise<MemoryVectorData>;

  /**
   * Searches for similar items in the vector store.
   *
   * @param {string} query - The search query.
   * @param {number} [k=4] - Number of results to return.
   * @param {Function} [filter] - Optional filter function to apply to results.
   * @returns {Promise<MemoryVectorData[]>} Sorted array of most similar vector data.
   */
  similaritySearch(query: string, k?: number, filter?: (doc: MemoryVectorData) => boolean): Promise<MemoryVectorData[]>;

  /**
   * Removes a specific piece of data from the store.
   *
   * @param {string} data - The text data to remove.
   * @returns {Promise<void>}
   */
  remove(data: string): Promise<void>;

  /**
   * Clears all data from the vector store.
   *
   * @returns {void}
   */
  clear(): void;

  /**
   * Retrieves all stored vector data.
   *
   * @returns {MemoryVectorData[]} Array of all stored vector data.
   */
  getAll(): MemoryVectorData[];

  /**
   * Gets the number of items in the store.
   *
   * @returns {number} Total number of vector data items.
   */
  count(): number;

  /**
   * Saves the current state of the vector store to the configured storage.
   * The behavior depends on the implementation and storage provider.
   *
   * @returns {Promise<void>}
   */
  save(): Promise<void>;
}
