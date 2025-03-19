// test/storage-provider.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NodeStorageProvider } from '../src/storage/node-file-storage';
import fs from 'fs';
import path from 'path';
import { MemoryVectorDataSerialize } from '../src/interface';

// 테스트용 임시 파일 경로
const TEST_FILE_PATH = path.join(process.cwd(), 'test-storage-provider.json');

describe('NodeStorageProvider', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_FILE_PATH)) {
      fs.unlinkSync(TEST_FILE_PATH);
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_FILE_PATH)) {
      fs.unlinkSync(TEST_FILE_PATH);
    }
  });

  it('should save and load data correctly', () => {
    const provider = new NodeStorageProvider();
    const testData: MemoryVectorDataSerialize[] = [
      ['apple', [1, 2, 3]],
      ['banana', [4, 5, 6]],
    ];

    provider.save(TEST_FILE_PATH, testData);
    expect(fs.existsSync(TEST_FILE_PATH)).toBe(true);

    const loadedData = provider.load(TEST_FILE_PATH);
    expect(loadedData).toEqual(testData);
  });

  it('should check if data exists', () => {
    const provider = new NodeStorageProvider();

    expect(provider.exists(TEST_FILE_PATH)).toBe(false);

    const testData: MemoryVectorDataSerialize[] = [['test', [1, 2, 3]]];
    provider.save(TEST_FILE_PATH, testData);

    expect(provider.exists(TEST_FILE_PATH)).toBe(true);
  });

  it('should return empty array when loading non-existing file', () => {
    const provider = new NodeStorageProvider();
    const nonExistingPath = path.join(process.cwd(), 'non-existing-file.json');

    const loadedData = provider.load(nonExistingPath);
    expect(loadedData).toEqual([]);
  });
});
