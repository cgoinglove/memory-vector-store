# 🧩 Memory Vector Store

English | [한국어](./docs/kr.md)

A lightweight memory-based vector store with persistent storage support for both Node.js and browser environments. Efficiently store, retrieve, and search vector embeddings with minimal dependencies.

## Features

- 🪶 **Lightweight**: Minimal dependencies and small footprint
- 🔄 **Cross-platform**: Works in both Node.js and browser environments
- 💾 **Persistent storage**: Automatic saving to localStorage (browser) or file system (Node.js)
- 🔍 **Similarity search**: Built-in cosine similarity for vector searching
- 🧩 **Framework agnostic**: Works with any embedding model or framework
- ⚡ **Performance optimized**: Caching and debounced saving for better performance

## Installation

```bash
npm install memory-vector-store
# or
yarn add memory-vector-store
# or
pnpm add memory-vector-store
```

## Basic Usage

```javascript
import { memoryVectorStore } from 'memory-vector-store';

// Define your vector parser function
const vectorParser = (text) => {
  // Example: convert text to vector
  return [1, 2, 3]; // return a vector representation
};

// Create a vector store
const store = memoryVectorStore(vectorParser);
```

## Using with OpenAI

```javascript
import OpenAI from 'openai';
// For Node.js
import { memoryVectorStore,MemoryVectorParser } from 'memory-vector-store';
// For Browser: import { browserMemoryVectorStore } from 'memory-vector-store/browser';

const openai = new OpenAI({
  apiKey: 'YOUR_OPENAI_API_KEY',
});

const vectorParser:MemoryVectorParser = async (data) => {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: data,
  });

  return response.data[0].embedding;
};

const vectorStore = memoryVectorStore(vectorParser, { autoSave: false });

const dataList = [
  'Adidas Soccer Cleats',
  'Nike Sports Jacket',
  'Adidas Training Shorts',
  'Nike Basketball Sneakers',
  'Adidas Running Shoes',
  'Nike Casual T-Shirt',
  'Adidas Casual Hoodie',
  'Nike Sports Bag',
  'Adidas Leggings',
];

for (const data of dataList) {
  await vectorStore.add(data);
}

const result = await vectorStore.similaritySearch('foot', 2);

console.log(result.map((v) => v.data));
// [ 'Adidas Running Shoes', 'Nike Basketball Sneakers' ]
```

## Using with Vercel AI SDK and Ollama

```javascript
import { embed } from 'ai';
import { ollama } from 'ollama-ai-provider';
// For Node.js
import { memoryVectorStore, MemoryVectorParser } from 'memory-vector-store';
// For Browser: import { memoryVectorStore } from 'memory-vector-store/browser';

const vectorParser:MemoryVectorParser = async (data) => {
  const result = await embed({
    model: ollama.embedding('nomic-embed-text'),
    value: data,
  });
  return result.embedding;
};

const vectorStore = memoryVectorStore(vectorParser, { autoSave: false });

const dataList = [
  'Adidas Soccer Cleats',
  'Nike Sports Jacket',
  'Adidas Training Shorts',
  'Nike Basketball Sneakers',
  'Adidas Running Shoes',
  'Nike Casual T-Shirt',
  'Adidas Casual Hoodie',
  'Nike Sports Bag',
  'Adidas Leggings',
];

for (const data of dataList) {
  await vectorStore.add(data);
}

const result = await vectorStore.similaritySearch('foot', 2);

console.log(result.map((v) => v.data));
// [ 'Adidas Running Shoes', 'Nike Basketball Sneakers' ]
```

## API

### `memoryVectorStore(vectorParser, options?)`

Creates a new vector store instance for Node.js environment.

### `browserMemoryVectorStore(vectorParser, options?)` (from 'memory-vector-store/browser')

Creates a new vector store instance for browser environment.

**Parameters:**

- `vectorParser`: Function that converts text to a vector representation
- `options`: (Optional) Configuration options

**Options:**

- `autoSave`: (Default: `true`) Automatically save changes to storage
- `debug`: (Default: `false`) Enable debug logging
- `maxFileSizeMB`: Maximum storage size in MB (Browser: 0.1-3MB, Node: 1-1000MB)
- `storagePath`: Storage path/key (Default browser: 'memory-vector-store', Node: '{cwd}/node_modules/**mvsl**/data.json')

### Store Methods

- `add(data: string)`: Add data to the vector store
- `similaritySearch(query: string, k?: number, filter?: MemoryVectorData => boolean)`: Search for similar items
- `remove(data: string)`: Remove a specific item
- `clear()`: Remove all items
- `getAll()`: Get all stored items
- `count()`: Get the number of stored items
- `save()`: Manually save the store

## Limitations and Recommendations

- **Size Constraints**:
  - Browser version is limited to 3MB due to localStorage constraints
  - Node.js version defaults to 500MB maximum, which may not be suitable for very large datasets
- **No Distributed Support**: Does not support distributed or multi-user scenarios
- **Basic Vector Search**: Uses simple cosine similarity - may not offer specialized optimizations of dedicated vector databases

## Storage

The library automatically uses the appropriate storage mechanism:

- **Browser**: Uses `localStorage` with a default limit of 3MB
- **Node.js**: Uses file system storage with a default limit of 500MB
