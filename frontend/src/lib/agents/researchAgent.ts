import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { LLMChain } from 'langchain/chains';
import { 
  ResearchResult, 
  Source, 
  PlanSection,
  DEFAULT_AGENT_CONFIG 
} from './types';
import { v4 as uuidv4 } from 'uuid';
import { researchCache } from '@/lib/cache/researchCache';

export class ResearchAgent {
  private llm: ChatOpenAI;
  private config = DEFAULT_AGENT_CONFIG.researcher;

  constructor() {
    this.llm = new ChatOpenAI({
      modelName: this.config.model,
      temperature: this.config.temperature,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
  }

  async conductResearch(
    section: PlanSection,
    existingContent?: string
  ): Promise<ResearchResult[]> {
    const results: ResearchResult[] = [];

    // researchQueriesが配列でない場合のフォールバック
    const queries = Array.isArray(section.researchQueries) 
      ? section.researchQueries 
      : [];

    if (queries.length === 0) {
      console.warn(`[ResearchAgent] No research queries for section: ${section.title}`);
      // デフォルトクエリを使用
      queries.push(section.title);
    }

    for (const query of queries) {
      try {
        // キャッシュをチェック
        const cachedResults = researchCache.get(query, existingContent);
        if (cachedResults && cachedResults.length > 0) {
          // キャッシュから結果を使用（sectionIdを更新）
          const updatedResults = cachedResults.map(r => ({
            ...r,
            sectionId: section.id
          }));
          results.push(...updatedResults);
          continue;
        }

        // Web検索をシミュレート（実際の実装では外部APIを使用）
        const searchResults = await this.simulateWebSearch(query);
        
        // 検索結果を分析・要約
        const analysis = await this.analyzeSearchResults(
          query,
          searchResults,
          section.expectedContent
        );

        const result: ResearchResult = {
          id: uuidv4(),
          sectionId: section.id,
          query,
          sources: searchResults,
          summary: analysis.summary,
          confidence: analysis.confidence,
          timestamp: new Date(),
        };

        results.push(result);
        
        // 結果をキャッシュに保存
        researchCache.set(query, [result], existingContent);
        
        console.log(`[ResearchAgent] Completed research for query: ${query}`);

      } catch (error) {
        console.error(`[ResearchAgent] Failed to research query "${query}":`, error);
      }
    }

    // 既存のコンテンツがある場合、それも分析に含める
    if (existingContent) {
      const contextAnalysis = await this.analyzeExistingContent(
        section,
        existingContent
      );
      results.push(contextAnalysis);
    }

    return results;
  }

  private async simulateWebSearch(query: string): Promise<Source[]> {
    // 実際の実装では、Tavily API、Google Custom Search API、
    // またはPerplexity APIなどを使用
    // ここではシミュレーションとして固定データを返す

    const simulatedSources: Source[] = [
      {
        url: `https://example.com/article-${Date.now()}`,
        title: `${query}に関する詳細な解説`,
        snippet: `${query}について、最新の情報と専門家の見解をまとめました...`,
        relevanceScore: 0.95,
      },
      {
        url: `https://research.example.com/paper-${Date.now()}`,
        title: `${query}の研究論文`,
        snippet: `本研究では${query}の重要性と将来の展望について分析...`,
        relevanceScore: 0.88,
      },
      {
        url: `https://blog.example.com/post-${Date.now()}`,
        title: `実践的な${query}のガイド`,
        snippet: `${query}を実際に活用するための具体的な方法とベストプラクティス...`,
        relevanceScore: 0.82,
      },
    ];

    return simulatedSources;
  }

  private async analyzeSearchResults(
    query: string,
    sources: Source[],
    expectedContent: string[]
  ): Promise<{ summary: string; confidence: number; detailedData: Record<string, unknown> }> {
    const analysisPrompt = PromptTemplate.fromTemplate(`
{query}について以下のJSON形式で簡潔に:
{{
  "summary": "2-3文の要約",
  "keyData": ["数値1", "数値2"],
  "confidence": 0.8
}}
    `);

    const chain = new LLMChain({
      llm: this.llm,
      prompt: analysisPrompt,
    });

    try {
      const sourcesText = sources
        .map(s => `- ${s.title}: ${s.snippet}`)
        .join('\n');

      const result = await chain.call({
        query,
        expectedContent: expectedContent.join(', '),
        sources: sourcesText,
      });

      // JSONを解析
      let jsonText = result.text;
      const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1].trim();
      }
      
      const analysis = JSON.parse(jsonText);
      return analysis;

    } catch (error) {
      console.error('[ResearchAgent] Failed to analyze search results:', error);
      return {
        summary: '検索結果の分析に失敗しました',
        confidence: 0.0,
        detailedData: {},
      };
    }
  }

  private async analyzeExistingContent(
    section: PlanSection,
    content: string
  ): Promise<ResearchResult> {
    const contextPrompt = PromptTemplate.fromTemplate(`
提供されたコンテンツを分析し、「{sectionTitle}」セクションに関連する情報を抽出してください。

コンテンツ:
{content}

期待される内容:
{expectedContent}

関連する情報を要約し、信頼度を評価してください。

JSON形式で返答：
{{
  "summary": "抽出された情報の要約",
  "relevantPoints": ["関連ポイント1", "関連ポイント2"],
  "confidence": 0.9
}}
    `);

    const chain = new LLMChain({
      llm: this.llm,
      prompt: contextPrompt,
    });

    try {
      const result = await chain.call({
        sectionTitle: section.title,
        content: content.substring(0, 2000), // 長すぎる場合は切り詰め
        expectedContent: section.expectedContent.join('\n'),
      });

      // JSONを解析
      let jsonText = result.text;
      const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1].trim();
      }
      
      const analysis = JSON.parse(jsonText);

      return {
        id: uuidv4(),
        sectionId: section.id,
        query: 'アップロードされたコンテンツの分析',
        sources: [{
          url: 'uploaded-file',
          title: 'ユーザー提供のコンテンツ',
          snippet: analysis.relevantPoints?.join(' ') || analysis.summary,
          relevanceScore: 1.0,
        }],
        summary: analysis.summary,
        confidence: analysis.confidence || 0.8,
        timestamp: new Date(),
      };

    } catch (error) {
      console.error('[ResearchAgent] Failed to analyze existing content:', error);
      return {
        id: uuidv4(),
        sectionId: section.id,
        query: 'アップロードされたコンテンツの分析',
        sources: [],
        summary: 'コンテンツの分析に失敗しました',
        confidence: 0.0,
        timestamp: new Date(),
      };
    }
  }

  async evaluateResearchQuality(
    results: ResearchResult[]
  ): Promise<{
    overallQuality: number;
    gaps: string[];
    recommendations: string[];
  }> {
    const qualityPrompt = PromptTemplate.fromTemplate(`
以下のリサーチ結果の品質を評価してください：

リサーチ結果数: {resultCount}
平均信頼度: {avgConfidence}
カバーされたトピック: {topics}

品質評価基準：
1. 情報の網羅性
2. ソースの信頼性
3. 内容の一貫性
4. 実用性

JSON形式で評価を返してください：
{{
  "overallQuality": 0.85,
  "gaps": ["不足している情報"],
  "recommendations": ["追加リサーチの提案"]
}}
    `);

    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
    const topics = results.map(r => r.query).join(', ');

    const chain = new LLMChain({
      llm: this.llm,
      prompt: qualityPrompt,
    });

    try {
      const result = await chain.call({
        resultCount: results.length,
        avgConfidence: avgConfidence.toFixed(2),
        topics,
      });

      // JSONを解析
      let jsonText = result.text;
      const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1].trim();
      }
      
      return JSON.parse(jsonText);

    } catch (error) {
      console.error('[ResearchAgent] Failed to evaluate research quality:', error);
      return {
        overallQuality: avgConfidence,
        gaps: [],
        recommendations: [],
      };
    }
  }
}