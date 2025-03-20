# 🧩 Memory Vector Store

English | [한국어](./docs/kr.md)

A lightweight memory-based vector store with persistent storage support for both Node.js and browser environments. Efficiently store, retrieve, and search vector embeddings with minimal dependencies.

## Features

- 🪶 **Lightweight**: Minimal dependencies and small footprint
- 🔄 **Cross-platform**: Works in both Node.js and browser environments
- 💾 **Persistent storage**: Automatic saving to localStorage (browser) or file system (Node.js)
- 🔍 **Similarity search**: Built-in cosine similarity for vector searching
- 🧩 **Framework agnostic**: Works with any embedding model or framework
- ⚡ **Performance optimized**: Global caching, path-based sharing, and debounced saving

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
const vectorParser = (content) => {
  // Example: convert text to vector
  return [1, 2, 3]; // return a vector representation
};

// Create a vector store
const store = memoryVectorStore(vectorParser);
```

## Using with OpenAI

```javascript
import OpenAI from 'openai';
import { memoryVectorStore, MemoryVectorParser } from 'memory-vector-store';

const openai = new OpenAI({
  apiKey: 'YOUR_OPENAI_API_KEY',
});

const vectorParser: MemoryVectorParser = async (data: string) => {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: data,
  });

  return response.data[0].embedding;
};

const vectorStore = memoryVectorStore(vectorParser);

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

console.log(result);
// [ { content: 'Adidas Running Shoes', score: 0.99 }, { content: 'Nike Basketball Sneakers', score: 0.88 } ]
```

## Using with Vercel AI SDK and Ollama

```javascript
import { embed } from 'ai';
import { ollama } from 'ollama-ai-provider';
import { memoryVectorStore, MemoryVectorParser, doc } from 'memory-vector-store';

const vectorParser: MemoryVectorParser = async (data: string) => {
  const result = await embed({
    model: ollama.embedding('nomic-embed-text'),
    value: data,
  });
  return result.embedding;
};

const vectorStore = memoryVectorStore(vectorParser);

// Add items with metadata
await vectorStore.add(doc('Adidas Running Shoes', { brand: 'Adidas' }));
await vectorStore.add(doc('Nike Basketball Sneakers', { brand: 'Nike' }));
await vectorStore.add('Casual T-Shirt');

const result = await vectorStore.similaritySearch('foot', 2);

console.log(result);
// [ { content: 'Adidas Running Shoes', metadata: { brand: 'Adidas' }, score: 0.99 }, 
//   { content: 'Nike Basketball Sneakers', metadata: { brand: 'Nike' }, score: 0.88 } ]
```

## Adding Documents

Memory Vector Store supports different ways to add documents:

```javascript
// 1. Add plain text
await vectorStore.add('Adidas Running Shoes');

// 2. Add document with metadata
await vectorStore.add({
  content: 'Nike Basketball Sneakers',
  metadata: { brand: 'Nike', category: 'Basketball', price: 120 }
});

// 3. Using helper function
import { doc } from 'memory-vector-store';

await vectorStore.add(doc('Adidas Soccer Cleats', { 
  brand: 'Adidas', 
  category: 'Soccer',
  price: 95
}));
```

## Search Options

### Basic Search

```javascript
// Simple search, returns top results (default k=4)
const results = await vectorStore.similaritySearch('running shoes');
```

### Limiting Results

```javascript
// Limit to top 3 results
const results = await vectorStore.similaritySearch('running shoes', 3);
```

### Filtering Results

```javascript
// Filter by metadata properties
const results = await vectorStore.similaritySearch(
  'sports gear',
  10, // Get up to 10 results
  (doc) => doc.metadata?.brand === 'Nike' // Only Nike products
);

// Complex filtering
const results = await vectorStore.similaritySearch(
  'shoes',
  5,
  (doc) => doc.metadata?.price < 150 && doc.metadata?.category === 'Running'
);
```

## API

### `memoryVectorStore(vectorParser, options?)`

Creates a new vector store instance for Node.js environment.

### `browserMemoryVectorStore(vectorParser, options?)` (from 'memory-vector-store/browser')

Creates a new vector store instance for browser environment.

### `doc(content, metadata?)`

Helper function to create document objects with metadata.

**Parameters:**

- `vectorParser`: Function that converts text to a vector representation
- `options`: (Optional) Configuration options

**Options:**

- `autoSave`: (Default: `true`) Automatically save changes to storage
- `debug`: (Default: `false`) Enable debug logging
- `maxFileSizeMB`: Maximum storage size in MB (Browser: 0.1-3MB, Node: 1-1000MB)
- `storagePath`: Storage path/key (Default browser: 'memory-vector-store', Node: '{cwd}/node_modules/**mvsl**/data.json')

### Store Methods

- `add(content: string)`: Add text content to the vector store
- `add(document: MemoryDocument)`: Add document with metadata to the vector store
- `similaritySearch(query: string, k?: number, filter?: (doc: MemoryDocument) => boolean)`: Search for similar items
- `remove(content: string)`: Remove a specific item
- `clear()`: Remove all items
- `getAll()`: Get all stored documents
- `count()`: Get the number of stored items
- `save()`: Manually save the store

## Advanced Features

### Global Caching

The library automatically uses a global cache for better performance:

- Multiple vector store instances with the same storage path share the same data
- Changes made in one instance are reflected in all others
- Prevents multiple disk reads for the same data

```javascript
// Both stores share the same data
const store1 = memoryVectorStore(vectorParser, { storagePath: './data.json' });
const store2 = memoryVectorStore(vectorParser, { storagePath: './data.json' });

await store1.add('Hello world');
console.log(await store2.count()); // Output: 1
```

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