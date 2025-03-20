import OpenAI from 'openai';
import { MemoryVectorParser, memoryVectorStore } from '../src/core/node';

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
