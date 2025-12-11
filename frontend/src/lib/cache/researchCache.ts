import { ResearchResult } from '../agents/types';

interface CacheEntry {
  data: ResearchResult[];
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export class ResearchCache {
  private cache: Map<string, CacheEntry> = new Map();
  private defaultTTL = 15 * 60 * 1000; // 15分

  // キャッシュキーを生成
  private generateKey(query: string, fileContent?: string): string {
    const contentHash = fileContent ? this.simpleHash(fileContent) : 'no-file';
    return `${query}-${contentHash}`;
  }

  // シンプルなハッシュ関数
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  // キャッシュから取得
  get(query: string, fileContent?: string): ResearchResult[] | null {
    const key = this.generateKey(query, fileContent);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // TTLチェック
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    console.log(`[ResearchCache] Cache hit for query: ${query}`);
    return entry.data;
  }

  // キャッシュに保存
  set(query: string, data: ResearchResult[], fileContent?: string, ttl?: number): void {
    const key = this.generateKey(query, fileContent);
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    };

    this.cache.set(key, entry);
    console.log(`[ResearchCache] Cached results for query: ${query}`);
  }

  // キャッシュをクリア
  clear(): void {
    this.cache.clear();
  }

  // 期限切れエントリを削除
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // キャッシュサイズを取得
  size(): number {
    return this.cache.size;
  }
}

// シングルトンインスタンス
export const researchCache = new ResearchCache();