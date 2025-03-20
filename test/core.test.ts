// test/node-vector-store.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { memoryVectorStore } from '../src/core/node';
import fs from 'fs';
import path from 'path';
import { doc } from '../src/core/vector-store';

// 테스트용 임시 파일 경로
const TEST_FILE_PATH = path.join(process.cwd(), 'test-vector-store.json');

// 간단한 벡터 파서 함수
const mockVectorParser = (text: string): number[] => {
  // 간단한 벡터 생성 로직: 문자열 길이와 첫 글자의 코드 포인트를 사용
  return [text.length, text.charCodeAt(0), text.length * 0.5];
};

describe('memoryVectorStore (Node)', () => {
  // 각 테스트 이전에 실행
  beforeEach(() => {
    // 이전 테스트 파일 삭제
    if (fs.existsSync(TEST_FILE_PATH)) {
      fs.unlinkSync(TEST_FILE_PATH);
    }
  });

  // 각 테스트 이후에 실행
  afterEach(async () => {
    const store = memoryVectorStore(() => [], { storagePath: TEST_FILE_PATH });
    store.clear();
    await store.save();
    // 테스트 파일 정리
    if (fs.existsSync(TEST_FILE_PATH)) {
      fs.unlinkSync(TEST_FILE_PATH);
    }
  });

  it('should create a vector store instance', () => {
    const store = memoryVectorStore(mockVectorParser, {
      storagePath: TEST_FILE_PATH,
    });
    expect(store).toBeDefined();
    expect(typeof store.add).toBe('function');
    expect(typeof store.similaritySearch).toBe('function');
  });

  it('should add items to the store', async () => {
    const store = memoryVectorStore(mockVectorParser, {
      storagePath: TEST_FILE_PATH,
    });

    const result = await store.add('test data');
    expect(result).toEqual({
      document: doc('test data'),
      vector: [9, 116, 4.5], // 'test data'의 길이, 't'의 코드 포인트, 길이*0.5
    });

    expect(store.count()).toBe(1);
  });

  // 새로운 테스트: MemoryDocument 객체로 항목 추가
  it('should add items with MemoryDocument object', async () => {
    const store = memoryVectorStore(mockVectorParser, {
      storagePath: TEST_FILE_PATH,
    });
    console.log(store.getAll());

    const document = doc('test data with metadata', { category: 'test', priority: 1 });
    const result = await store.add(document);

    expect(result).toEqual({
      document: {
        content: 'test data with metadata',
        metadata: { category: 'test', priority: 1 },
      },
      vector: [23, 116, 11.5], // vector 계산 결과
    });

    expect(store.count()).toBe(1);

    // 저장된 문서의 메타데이터 확인
    const allItems = store.getAll();
    expect(allItems[0].metadata).toEqual({ category: 'test', priority: 1 });
  });

  // 새로운 테스트: score 값이 포함된 유사도 검색 결과 확인
  it('should return search results with score values', async () => {
    const store = memoryVectorStore(mockVectorParser, {
      storagePath: TEST_FILE_PATH,
    });

    await store.add('apple');
    await store.add('application');
    await store.add('orange');

    const results = await store.similaritySearch('app', 3);

    expect(results.length).toBe(3);

    // 각 결과에 score 속성이 포함되어 있는지 확인
    results.forEach((result) => {
      expect(result).toHaveProperty('score');
      expect(typeof result.score).toBe('number');
    });

    // score 값에 따른 정렬 확인 (내림차순)
    expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
    expect(results[1].score).toBeGreaterThanOrEqual(results[2].score);

    // 가장 유사한 항목 확인
    expect(results[0].content).toMatch(/app/);
  });

  // 새로운 테스트: 메타데이터를 이용한 필터링 테스트
  it('should filter search results using metadata', async () => {
    const store = memoryVectorStore(mockVectorParser, {
      storagePath: TEST_FILE_PATH,
    });

    await store.add(doc('apple', { category: 'fruit', color: 'red' }));
    await store.add(doc('banana', { category: 'fruit', color: 'yellow' }));
    await store.add(doc('carrot', { category: 'vegetable', color: 'orange' }));
    await store.add(doc('orange', { category: 'fruit', color: 'orange' }));

    // 'fruit' 카테고리만 필터링
    const fruitResults = await store.similaritySearch('food', 10, (doc) => doc.metadata?.category === 'fruit');

    expect(fruitResults.length).toBe(3);
    expect(fruitResults.every((item) => item.metadata?.category === 'fruit')).toBe(true);

    // 'orange' 색상만 필터링
    const orangeColorResults = await store.similaritySearch('food', 10, (doc) => doc.metadata?.color === 'orange');

    expect(orangeColorResults.length).toBe(2);
    expect(orangeColorResults.every((item) => item.metadata?.color === 'orange')).toBe(true);

    // 복합 조건: 'fruit' 카테고리이면서 'orange' 색상
    const fruitOrangeResults = await store.similaritySearch(
      'food',
      10,
      (doc) => doc.metadata?.category === 'fruit' && doc.metadata?.color === 'orange'
    );

    expect(fruitOrangeResults.length).toBe(1);
    expect(fruitOrangeResults[0].content).toBe('orange');
  });

  // 새로운 테스트: 메타데이터가 저장되고 로드되는지 확인
  it('should save and load metadata correctly', async () => {
    // 첫 번째 인스턴스 생성 및 메타데이터가 있는 데이터 추가
    const store1 = memoryVectorStore(mockVectorParser, {
      storagePath: TEST_FILE_PATH,
    });

    await store1.add(doc('apple', { category: 'fruit', origin: 'farm', count: 5 }));
    await store1.add(doc('notebook', { category: 'electronics', brand: 'TechBrand', price: 999 }));
    await store1.save(); // 명시적으로 저장

    // 두 번째 인스턴스 생성 (같은 저장소 경로)
    const store2 = memoryVectorStore(mockVectorParser, {
      storagePath: TEST_FILE_PATH,
    });

    // 새 인스턴스에서 데이터와 메타데이터가 모두 로드되었는지 확인
    expect(store2.count()).toBe(2);

    const loadedItems = store2.getAll();

    // apple 문서 확인
    const appleItem = loadedItems.find((item) => item.content === 'apple');
    expect(appleItem).toBeDefined();
    expect(appleItem?.metadata).toEqual({ category: 'fruit', origin: 'farm', count: 5 });

    // notebook 문서 확인
    const notebookItem = loadedItems.find((item) => item.content === 'notebook');
    expect(notebookItem).toBeDefined();
    expect(notebookItem?.metadata).toEqual({ category: 'electronics', brand: 'TechBrand', price: 999 });
  });

  // 기존 테스트들...
  it('should search for similar items', async () => {
    const store = memoryVectorStore(mockVectorParser, {
      storagePath: TEST_FILE_PATH,
    });

    await store.add('apple');
    await store.add('banana');
    await store.add('orange');
    await store.add('application');

    const results = await store.similaritySearch('app', 2);
    expect(results.length).toBe(2);
    expect(results.map((r) => r.content)).toContain('apple');
  });

  it('should remove items from the store', async () => {
    const store = memoryVectorStore(mockVectorParser, {
      storagePath: TEST_FILE_PATH,
    });

    await store.add('apple');
    await store.add('banana');
    expect(store.count()).toBe(2);

    await store.remove('apple');
    expect(store.count()).toBe(1);

    const allItems = store.getAll();
    expect(allItems.length).toBe(1);
    expect(allItems[0].content).toBe('banana');
  });

  it('should clear all items from the store', async () => {
    const store = memoryVectorStore(mockVectorParser, {
      storagePath: TEST_FILE_PATH,
    });

    await store.add('apple');
    await store.add('banana');
    expect(store.count()).toBe(2);

    store.clear();
    expect(store.count()).toBe(0);
    expect(store.getAll().length).toBe(0);
  });

  it('should save and load data from storage', async () => {
    // 첫 번째 인스턴스 생성 및 데이터 추가
    const store1 = memoryVectorStore(mockVectorParser, {
      storagePath: TEST_FILE_PATH,
    });

    await store1.add('apple');
    await store1.add('banana');
    await store1.save(); // 명시적으로 저장

    // 두 번째 인스턴스 생성 (같은 저장소 경로)
    const store2 = memoryVectorStore(mockVectorParser, {
      storagePath: TEST_FILE_PATH,
    });

    // 새 인스턴스에서도 이전 데이터가 로드되어야 함
    expect(store2.count()).toBe(2);
    expect(store2.getAll().map((item) => item.content)).toContain('apple');
    expect(store2.getAll().map((item) => item.content)).toContain('banana');
  });

  it('should apply filter function when searching', async () => {
    const store = memoryVectorStore(mockVectorParser, {
      storagePath: TEST_FILE_PATH,
    });

    await store.add('apple');
    await store.add('banana');
    await store.add('orange');

    // 'a'로 시작하는 항목만 필터링
    const results = await store.similaritySearch('fruit', 3, (doc) => doc.content.startsWith('a'));

    expect(results.length).toBe(1);
    expect(results[0].content).toBe('apple');
  });

  // MemoryDocument 객체로 항목 추가 테스트
  it('should add items with MemoryDocument object', async () => {
    const store = memoryVectorStore(mockVectorParser, {
      storagePath: TEST_FILE_PATH,
    });

    const document = doc('test data with metadata', { category: 'test', priority: 1 });
    const result = await store.add(document);

    expect(result).toEqual({
      document: {
        content: 'test data with metadata',
        metadata: { category: 'test', priority: 1 },
      },
      vector: [23, 116, 11.5], // vector 계산 결과
    });

    expect(store.count()).toBe(1);

    // 저장된 문서의 메타데이터 확인
    const allItems = store.getAll();
    expect(allItems[0].metadata).toEqual({ category: 'test', priority: 1 });
  });

  // score 값이 포함된 유사도 검색 결과 확인
  it('should return search results with score values', async () => {
    const store = memoryVectorStore(mockVectorParser, {
      storagePath: TEST_FILE_PATH,
    });

    await store.add('apple');
    await store.add('application');
    await store.add('orange');

    const results = await store.similaritySearch('app', 3);

    expect(results.length).toBe(3);

    // 각 결과에 score 속성이 포함되어 있는지 확인
    results.forEach((result) => {
      expect(result).toHaveProperty('score');
      expect(typeof result.score).toBe('number');
    });

    // score 값에 따른 정렬 확인 (내림차순)
    expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
    expect(results[1].score).toBeGreaterThanOrEqual(results[2].score);
  });

  // 메타데이터 저장 및 로드 테스트
  it('should save and load metadata correctly', async () => {
    // 첫 번째 인스턴스 생성 및 메타데이터가 있는 데이터 추가
    const store1 = memoryVectorStore(mockVectorParser, {
      storagePath: TEST_FILE_PATH,
    });

    await store1.add(doc('apple', { category: 'fruit', count: 5 }));
    await store1.save(); // 명시적으로 저장

    // 두 번째 인스턴스 생성 (같은 저장소 경로)
    const store2 = memoryVectorStore(mockVectorParser, {
      storagePath: TEST_FILE_PATH,
    });

    // 새 인스턴스에서 데이터와 메타데이터가 모두 로드되었는지 확인
    expect(store2.count()).toBe(1);

    const loadedItems = store2.getAll();
    expect(loadedItems[0].content).toBe('apple');
    expect(loadedItems[0].metadata).toEqual({ category: 'fruit', count: 5 });
  });
});
