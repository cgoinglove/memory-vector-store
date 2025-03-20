/**
 * Represents a document to be stored in the vector store.
 * Contains the main content as a string and optional metadata of generic type T.
 *
 * @template T The type of metadata associated with the document, defaults to any
 * @typedef {Object} MemoryDocument
 * @property {string} content - The textual content of the document
 * @property {T} [metadata] - Optional metadata associated with the document
 */
export type MemoryDocument<T = any> = {
  content: string;
  metadata?: T;
};

/**
 * A function type that converts text content to a vector representation.
 * Can return either a Promise for asynchronous processing or a direct array for synchronous processing.
 *
 * @typedef {Function} MemoryVectorParser
 * @param {string} content - The text content to convert to a vector
 * @returns {Promise<number[]>|number[]} The vector representation of the content
 */
export type MemoryVectorParser = (content: string) => Promise<number[]> | number[];

/**
 * Represents a vector data item with the original document and its vector representation.
 *
 * @template T The type of metadata associated with the document
 * @interface MemoryVectorData
 * @property {MemoryDocument<T>} document - The original document with content and metadata
 * @property {number[]} vector - The vector representation of the document content
 */
export interface MemoryVectorData<T = any> {
  document: MemoryDocument<T>;
  vector: number[];
}

/**
 * Serialized format of vector data for efficient storage.
 * A tuple where the first element is the original document (with content and metadata)
 * and the second element is the vector representation.
 *
 * @typedef {[MemoryDocument, number[]]} MemoryVectorDataSerialize
 */
export type MemoryVectorDataSerialize = [content: string, vector: number[], metadata?: any];

/**
 * Configuration options for the memory vector store.
 *
 * @interface MemoryVectorStoreOptions
 * @property {boolean} autoSave - Whether to automatically save changes to storage
 * @property {boolean} debug - Whether to log debug information
 * @property {number} maxFileSizeMB - Maximum storage size in megabytes
 * @property {string} storagePath - Path or key for storing vector data
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
 *
 * @interface MemoryVectorStorageProvider
 */
export interface MemoryVectorStorageProvider {
  /**
   * Saves serialized vector data to the storage.
   *
   * @param {string} key - The key or path where data should be stored
   * @param {MemoryVectorDataSerialize[]} data - The serialized vector data to save
   * @returns {void}
   */
  save(key: string, data: MemoryVectorDataSerialize[]): void;

  /**
   * Loads serialized vector data from storage.
   *
   * @param {string} key - The key or path from where to load data
   * @returns {MemoryVectorDataSerialize[]} The loaded serialized vector data
   */
  load(key: string): MemoryVectorDataSerialize[];

  /**
   * Checks if data exists at the specified key/path.
   *
   * @param {string} key - The key or path to check
   * @returns {boolean} True if data exists, false otherwise
   */
  exists(key: string): boolean;
}

/**
 * Interface defining the core functionality of a memory vector store.
 * Provides methods for adding, retrieving, searching, and managing vector data.
 * Supports generic type T for document metadata.
 *
 * @template T The type of metadata associated with documents in the store
 * @interface MemoryVectorStore
 */
export interface MemoryVectorStore<T = any> {
  /**
   * Adds a new document to the vector store.
   * Accepts either a string (which will be treated as document content)
   * or a MemoryDocument object with content and optional metadata.
   * If the document already exists, typically returns the cached value.
   *
   * @param {string|MemoryDocument<T>} document - The document to add, either as a string or as a MemoryDocument object
   * @returns {Promise<MemoryVectorData<T>>} The added vector data with the document and its vector representation
   */
  add(document: string): Promise<MemoryVectorData<T>>;
  add(document: MemoryDocument<T>): Promise<MemoryVectorData<T>>;

  /**
   * Searches for similar documents in the vector store.
   * Returns documents that are similar to the query along with their similarity scores.
   *
   * @param {string} query - The search query
   * @param {number} [k] - Number of results to return, defaults to implementation-specific value
   * @param {Function} [filter] - Optional filter function to apply to document results
   * @returns {Promise<Array<MemoryDocument<T> & { score: number }>>} Array of documents with similarity scores, sorted by similarity
   */
  similaritySearch(
    query: string,
    k?: number,
    filter?: (doc: MemoryDocument<T>) => boolean
  ): Promise<Array<MemoryDocument<T> & { score: number }>>;

  /**
   * Removes a document from the store based on its content.
   *
   * @param {string} content - The content of the document to remove
   * @returns {Promise<void>}
   */
  remove(content: string): Promise<void>;

  /**
   * Clears all data from the vector store.
   *
   * @returns {void}
   */
  clear(): void;

  /**
   * Retrieves all stored documents.
   *
   * @returns {MemoryDocument<T>[]} Array of all stored documents
   */
  getAll(): MemoryDocument<T>[];

  /**
   * Gets the number of documents in the store.
   *
   * @returns {number} Total number of documents
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
