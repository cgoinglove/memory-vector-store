// test/node-vector-store.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryVectorStore } from '../src/core/node';
import fs from 'fs';
import path from 'path';

// 테스트용 임시 파일 경로
const TEST_FILE_PATH = path.join(process.cwd(), 'test-vector-store.json');

// 간단한 벡터 파서 함수
const mockVectorParser = (text: string): number[] => {
  // 간단한 벡터 생성 로직: 문자열 길이와 첫 글자의 코드 포인트를 사용
  return [text.length, text.charCodeAt(0), text.length * 0.5];
};

describe('MemoryVectorStore (Node)', () => {
  // 각 테스트 이전에 실행
  beforeEach(() => {
    // 이전 테스트 파일 삭제
    if (fs.existsSync(TEST_FILE_PATH)) {
      fs.unlinkSync(TEST_FILE_PATH);
    }
  });

  // 각 테스트 이후에 실행
  afterEach(() => {
    // 테스트 파일 정리
    if (fs.existsSync(TEST_FILE_PATH)) {
      fs.unlinkSync(TEST_FILE_PATH);
    }
  });

  it('should create a vector store instance', () => {
    const store = MemoryVectorStore(mockVectorParser, {
      storagePath: TEST_FILE_PATH,
    });
    expect(store).toBeDefined();
    expect(typeof store.add).toBe('function');
    expect(typeof store.similaritySearch).toBe('function');
  });

  it('should add items to the store', async () => {
    const store = MemoryVectorStore(mockVectorParser, {
      storagePath: TEST_FILE_PATH,
    });

    const result = await store.add('test data');
    expect(result).toEqual({
      data: 'test data',
      vector: [9, 116, 4.5], // 'test data'의 길이, 't'의 코드 포인트, 길이*0.5
    });

    expect(store.count()).toBe(1);
  });

  it('should return cached items when adding duplicate data', async () => {
    const store = MemoryVectorStore(mockVectorParser, {
      storagePath: TEST_FILE_PATH,
    });

    await store.add('test data');
    await store.save();
    const spyParser = vi.fn(mockVectorParser);
    const storeWithSpy = MemoryVectorStore(spyParser, {
      storagePath: TEST_FILE_PATH,
    });
    await storeWithSpy.add('test data');
    expect(spyParser).not.toHaveBeenCalled(); // 이미 캐시된 항목이므로 파서가 호출되지 않아야 함
    expect(storeWithSpy.count()).toBe(1);
    const data = await storeWithSpy.similaritySearch('test data');
    expect(data.length).toBe(1);
    expect(data[0].data).toBe('test data');
  });

  it('should search for similar items', async () => {
    const store = MemoryVectorStore(mockVectorParser, {
      storagePath: TEST_FILE_PATH,
    });

    await store.add('apple');
    await store.add('banana');
    await store.add('orange');
    await store.add('application');

    const results = await store.similaritySearch('app', 2);
    expect(results.length).toBe(2);
    expect(results.map((r) => r.data)).toContain('apple');
  });

  it('should remove items from the store', async () => {
    const store = MemoryVectorStore(mockVectorParser, {
      storagePath: TEST_FILE_PATH,
    });

    await store.add('apple');
    await store.add('banana');
    expect(store.count()).toBe(2);

    await store.remove('apple');
    expect(store.count()).toBe(1);

    const allItems = store.getAll();
    expect(allItems.length).toBe(1);
    expect(allItems[0].data).toBe('banana');
  });

  it('should clear all items from the store', async () => {
    const store = MemoryVectorStore(mockVectorParser, {
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
    const store1 = MemoryVectorStore(mockVectorParser, {
      storagePath: TEST_FILE_PATH,
    });

    await store1.add('apple');
    await store1.add('banana');
    await store1.save(); // 명시적으로 저장

    // 두 번째 인스턴스 생성 (같은 저장소 경로)
    const store2 = MemoryVectorStore(mockVectorParser, {
      storagePath: TEST_FILE_PATH,
    });

    // 새 인스턴스에서도 이전 데이터가 로드되어야 함
    expect(store2.count()).toBe(2);
    expect(store2.getAll().map((item) => item.data)).toContain('apple');
    expect(store2.getAll().map((item) => item.data)).toContain('banana');
  });

  it('should apply filter function when searching', async () => {
    const store = MemoryVectorStore(mockVectorParser, {
      storagePath: TEST_FILE_PATH,
    });

    await store.add('apple');
    await store.add('banana');
    await store.add('orange');

    // 'a'로 시작하는 항목만 필터링
    const results = await store.similaritySearch('fruit', 3, (doc) => doc.data.startsWith('a'));

    expect(results.length).toBe(1);
    expect(results[0].data).toBe('apple');
  });
});
