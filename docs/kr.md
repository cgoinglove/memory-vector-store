# 🧩 Memory Vector Store

Node.js와 브라우저 환경 모두에서 작동하는 경량화된 메모리 기반 벡터 저장소입니다. 최소한의 의존성으로 벡터 임베딩을 효율적으로 저장, 검색, 검색할 수 있습니다.

> **참고:** 이 라이브러리는 주로 개발 환경과 프로토타이핑을 위해 설계되었습니다. 대규모 벡터 저장이 필요한 프로덕션 애플리케이션에서는 전용 벡터 데이터베이스나 특화된 솔루션을 고려하세요.

## 주요 기능

- 🪶 **경량화**: 최소한의 의존성과 작은 용량
- 🔄 **크로스 플랫폼**: Node.js와 브라우저 환경 모두에서 작동
- 💾 **영구 저장소**: 브라우저(localStorage)나 Node.js(파일 시스템)에서 자동 저장
- 🔍 **유사도 검색**: 코사인 유사도를 이용한 벡터 검색 내장
- 🧩 **프레임워크 독립적**: 어떤 임베딩 모델이나 프레임워크와도 호환
- ⚡ **성능 최적화**: 전역 캐싱, 경로 기반 공유, 디바운스 저장 메커니즘으로 성능 개선

## 설치

```bash
npm install memory-vector-store
# 또는
yarn add memory-vector-store
# 또는
pnpm add memory-vector-store
```

## 기본 사용법

```javascript
import { memoryVectorStore } from 'memory-vector-store';

// 벡터 파서 함수 정의
const vectorParser = (content) => {
  // 예시: 텍스트를 벡터로 변환
  return [1, 2, 3]; // 벡터 표현 반환
};

// 벡터 저장소 생성
const store = memoryVectorStore(vectorParser);
```

## OpenAI와 함께 사용하기

```javascript
import OpenAI from 'openai';
// Node.js용
import { memoryVectorStore, MemoryVectorParser } from 'memory-vector-store';
// 브라우저용: import { browserMemoryVectorStore } from 'memory-vector-store/browser';

const openai = new OpenAI({
  apiKey: 'YOUR_OPENAI_API_KEY',
});

const vectorParser: MemoryVectorParser = async (content) => {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: content,
  });

  return response.data[0].embedding;
};

const vectorStore = memoryVectorStore(vectorParser, { autoSave: false });

// 단순 텍스트 콘텐츠 추가
await vectorStore.add('아디다스 러닝화');

// 메타데이터를 포함한 콘텐츠 추가
await vectorStore.add({
  content: '나이키 농구화',
  metadata: { 브랜드: '나이키', 카테고리: '농구', 가격: 120000 },
});

// 필터를 사용한 검색
const result = await vectorStore.similaritySearch('스포츠 신발');

console.log(result);
// [
//   { content: '나이키 농구화', metadata: { 브랜드: '나이키', ... }, score: 0.89 },
//   { content: '아디다스 러닝화', score: 0.75 }
// ]
```

## Vercel AI SDK와 Ollama 사용하기

```javascript
import { embed } from 'ai';
import { ollama } from 'ollama-ai-provider';
// Node.js용
import { memoryVectorStore, MemoryVectorParser, doc } from 'memory-vector-store';
// 브라우저용: import { memoryVectorStore } from 'memory-vector-store/browser';

const vectorParser: MemoryVectorParser = async (content) => {
  const result = await embed({
    model: ollama.embedding('nomic-embed-text'),
    value: content,
  });
  return result.embedding;
};

const vectorStore = memoryVectorStore(vectorParser, { autoSave: false });

// 헬퍼 함수를 사용하여 메타데이터가 있는 문서 생성
const products = [
  doc('아디다스 축구화', { 카테고리: '축구', 브랜드: '아디다스' }),
  doc('나이키 스포츠 재킷', { 카테고리: '의류', 브랜드: '나이키' }),
  doc('아디다스 러닝화', { 카테고리: '러닝', 브랜드: '아디다스' }),
];

for (const product of products) {
  await vectorStore.add(product);
}

// 브랜드별 필터링 및 유사 항목 검색
const result = await vectorStore.similaritySearch('신발', 2);

console.log(result.map((item) => ({ content: item.content, score: item.score })));
// [
//   { content: '아디다스 러닝화', score: 0.92 },
//   { content: '아디다스 축구화', score: 0.86 }
// ]
```

## API

### `memoryVectorStore(vectorParser, options?)`

Node.js 환경용 벡터 저장소 인스턴스를 생성합니다.

### `browserMemoryVectorStore(vectorParser, options?)` ('memory-vector-store/browser'에서 가져옴)

브라우저 환경용 벡터 저장소 인스턴스를 생성합니다.

### `doc(content, metadata?)`

메타데이터가 있는 문서 객체를 생성하는 헬퍼 함수입니다.

**매개변수:**

- `vectorParser`: 텍스트를 벡터 표현으로 변환하는 함수
- `options`: (선택 사항) 구성 옵션

**옵션:**

- `autoSave`: (기본값: `true`) 변경 사항을 저장소에 자동으로 저장
- `debug`: (기본값: `false`) 디버그 로깅 활성화
- `maxFileSizeMB`: 최대 저장 용량(MB) (브라우저: 0.1-3MB, Node: 1-1000MB)
- `storagePath`: 저장 경로/키 (기본값 브라우저: 'memory-vector-store', Node: '{cwd}/node_modules/**mvsl**/data.json')

### 저장소 메서드

- `add(content: string)`: 텍스트 콘텐츠를 벡터 저장소에 추가
- `add(document: MemoryDocument)`: 메타데이터가 있는 문서를 벡터 저장소에 추가
- `similaritySearch(query: string, k?: number, filter?: (doc: MemoryDocument) => boolean)`: 선택적 필터링을 통한 유사 항목 검색
- `remove(content: string)`: 특정 항목 제거
- `clear()`: 모든 항목 제거
- `getAll()`: 저장된 모든 문서 가져오기
- `count()`: 저장된 항목 수 확인
- `save()`: 저장소 수동 저장

### 데이터 타입

- `MemoryDocument<T>`: `{ content: string, metadata?: T }` - 콘텐츠와 선택적 메타데이터가 있는 문서
- 검색 결과에는 문서와 유사도를 나타내는 `score` 속성이 포함됩니다

## 고급 기능

### 전역 캐싱

라이브러리는 더 나은 성능을 위해 자동으로 전역 캐시를 사용합니다:

- 동일한 저장 경로를 가진 여러 벡터 저장소 인스턴스가 같은 데이터를 공유합니다
- 한 인스턴스에서 변경한 내용이 다른 모든 인스턴스에 반영됩니다
- 동일한 데이터에 대한 중복 디스크 읽기를 방지합니다

```javascript
// 두 저장소가 동일한 데이터를 공유합니다
const store1 = memoryVectorStore(vectorParser, { storagePath: './data.json' });
const store2 = memoryVectorStore(vectorParser, { storagePath: './data.json' });

await store1.add('안녕하세요');
console.log(await store2.count()); // 출력: 1
```

## 제한사항 및 권장사항

- **크기 제약**:
  - 브라우저 버전은 localStorage 제약으로 인해 3MB로 제한됩니다.
  - Node.js 버전은 기본적으로 최대 500MB로 설정되어 있어 매우 큰 데이터셋에는 적합하지 않을 수 있습니다.
- **분산 지원 없음**: 분산 환경이나 다중 사용자 시나리오를 지원하지 않습니다.
- **기본 벡터 검색**: 단순 코사인 유사도를 사용하며, 전용 벡터 데이터베이스의 특화된 최적화를 제공하지 않습니다.

## 저장소

라이브러리는 자동으로 적절한 저장 메커니즘을 사용합니다:

- **브라우저**: 기본 3MB 제한으로 `localStorage` 사용
- **Node.js**: 기본 500MB 제한으로 파일 시스템 저장소 사용
