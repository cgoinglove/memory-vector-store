import { embed } from 'ai';
import { ollama } from 'ollama-ai-provider';
import { MemoryVectorParser, memoryVectorStore } from '../src/core/node';

const vectorParser: MemoryVectorParser = async (data: string) => {
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

console.log(result.map((v) => v.content));
// [ 'Adidas Running Shoes', 'Nike Basketball Sneakers' ]
