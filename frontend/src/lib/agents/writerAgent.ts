import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { LLMChain } from 'langchain/chains';
import { 
  SlideDraft, 
  ResearchResult, 
  SlideData,
  Feedback,
  ContentAllocation,
  DEFAULT_AGENT_CONFIG 
} from './types';
import { v4 as uuidv4 } from 'uuid';

export class WriterAgent {
  private llm: ChatOpenAI;
  private config = DEFAULT_AGENT_CONFIG.writer;

  constructor() {
    this.llm = new ChatOpenAI({
      modelName: this.config.model,
      temperature: this.config.temperature,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
  }

  async createSlideDraft(
    sectionId: string,
    sectionTitle: string,
    researchResults: ResearchResult[]
  ): Promise<SlideDraft> {
    const draftPrompt = PromptTemplate.fromTemplate(`
あなたは優秀なプレゼンテーション作成の専門家です。
以下のリサーチ結果を基に、「{sectionTitle}」に関するスライドを作成してください。

リサーチ結果:
{researchSummaries}

スライド作成のガイドライン：
1. タイトルは簡潔で印象的に
2. 内容は箇条書きまたは短い段落で構成
3. 重要なデータや統計を含める
4. 視覚的要素の提案も含める
5. スピーカーノートで補足説明を追加

JSON形式で返答してください：
{{
  "title": "スライドタイトル",
  "content": "スライドの本文内容",
  "visualSuggestions": ["視覚要素の提案"],
  "speakerNotes": "発表者用のメモ",
  "keyPoints": ["重要ポイント1", "重要ポイント2"]
}}
    `);

    const chain = new LLMChain({
      llm: this.llm,
      prompt: draftPrompt,
    });

    try {
      // リサーチ結果を要約形式に変換
      const researchSummaries = researchResults
        .map(r => `[${r.query}]\n${r.summary}\n信頼度: ${r.confidence}`)
        .join('\n\n');

      const result = await chain.call({
        sectionTitle,
        researchSummaries,
      });

      // JSONを解析
      let jsonText = result.text;
      const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1].trim();
      }
      
      const draftData = JSON.parse(jsonText);

      const draft: SlideDraft = {
        id: uuidv4(),
        sectionId,
        title: draftData.title,
        content: draftData.content,
        version: 1,
        feedback: [],
        status: 'draft',
      };

      console.log(`[WriterAgent] Created draft for section: ${sectionTitle}`);
      return draft;

    } catch (error) {
      console.error('[WriterAgent] Failed to create draft:', error);
      throw new Error('スライドドラフトの作成に失敗しました');
    }
  }

  async reviseDraft(
    draft: SlideDraft,
    feedback: Feedback
  ): Promise<SlideDraft> {
    const revisePrompt = PromptTemplate.fromTemplate(`
以下のスライドドラフトをフィードバックに基づいて改善してください。

現在のドラフト:
タイトル: {title}
内容: {content}

フィードバック:
{feedbackComment}

提案された改善点:
{suggestions}

改善されたスライドをJSON形式で返してください：
{{
  "title": "改善されたタイトル",
  "content": "改善された内容",
  "changesMode": ["変更点の説明"]
}}
    `);

    const chain = new LLMChain({
      llm: this.llm,
      prompt: revisePrompt,
    });

    try {
      const result = await chain.call({
        title: draft.title,
        content: draft.content,
        feedbackComment: feedback.comment,
        suggestions: feedback.suggestions.join('\n'),
      });

      // JSONを解析
      let jsonText = result.text;
      const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1].trim();
      }
      
      const revisedData = JSON.parse(jsonText);

      const revisedDraft: SlideDraft = {
        ...draft,
        title: revisedData.title,
        content: revisedData.content,
        version: draft.version + 1,
        feedback: [...draft.feedback, feedback],
        status: 'draft',
      };

      console.log(`[WriterAgent] Revised draft version ${revisedDraft.version}`);
      return revisedDraft;

    } catch (error) {
      console.error('[WriterAgent] Failed to revise draft:', error);
      return draft; // エラー時は元のドラフトを返す
    }
  }

  async convertToSlide(draft: SlideDraft, slideType: SlideData['type']): Promise<SlideData> {
    const convertPrompt = PromptTemplate.fromTemplate(`
以下のドラフトを最終的なスライド形式に変換してください。

ドラフト:
タイトル: {title}
内容: {content}
スライドタイプ: {slideType}

最終スライドの要件：
1. プレゼンテーションに適した形式
2. 視覚的階層の明確化
3. 重要ポイントの強調
4. 適切な情報量

JSON形式で返答：
{{
  "title": "最終タイトル",
  "content": "整形された内容",
  "bulletPoints": ["ポイント1", "ポイント2"],
  "emphasis": ["強調すべき単語やフレーズ"]
}}
    `);

    const chain = new LLMChain({
      llm: this.llm,
      prompt: convertPrompt,
    });

    try {
      const result = await chain.call({
        title: draft.title,
        content: draft.content,
        slideType,
      });

      // JSONを解析
      let jsonText = result.text;
      const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1].trim();
      }
      
      const slideData = JSON.parse(jsonText);

      // 箇条書きがある場合は整形
      let formattedContent = slideData.content;
      if (slideData.bulletPoints && slideData.bulletPoints.length > 0) {
        formattedContent = slideData.bulletPoints
          .map((point: string) => `• ${point}`)
          .join('\n');
      }

      const slide: SlideData = {
        id: uuidv4(),
        title: slideData.title,
        content: formattedContent,
        type: slideType,
        speakerNotes: draft.feedback.length > 0 
          ? `改訂履歴: ${draft.version}版` 
          : undefined,
      };

      return slide;

    } catch (error) {
      console.error('[WriterAgent] Failed to convert to slide:', error);
      // エラー時は基本的な変換を行う
      return {
        id: uuidv4(),
        title: draft.title,
        content: draft.content,
        type: slideType,
      };
    }
  }

  async createSlideDraftWithAllocation(
    sectionId: string,
    sectionTitle: string,
    researchResults: ResearchResult[],
    allocation?: ContentAllocation
  ): Promise<SlideDraft> {
    const draftPrompt = PromptTemplate.fromTemplate(`
あなたは優秀なプレゼンテーション作成の専門家です。
以下のリサーチ結果とコンテンツ割り振りを基に、「{sectionTitle}」に関するスライドを作成してください。

リサーチ結果:
{researchSummaries}

割り振られたコンテンツ:
主要ポイント:
{mainPoints}

サポート詳細:
{supportingDetails}

他セクションとの関連:
{connections}

スライド作成のガイドライン：
1. 主要ポイントを中心に構成
2. サポート詳細で説得力を持たせる
3. 他セクションとの関連性を意識
4. 論理的な流れを保つ
5. 視覚的要素の提案も含める

JSON形式で返答してください：
{{
  "title": "スライドタイトル",
  "content": "スライドの本文内容（構造化された箇条書き）",
  "visualSuggestions": ["視覚要素の提案"],
  "speakerNotes": "発表者用のメモ（他セクションとの繋がりを含む）",
  "keyPoints": ["重要ポイント1", "重要ポイント2"]
}}
    `);

    const chain = new LLMChain({
      llm: this.llm,
      prompt: draftPrompt,
    });

    try {
      const researchSummaries = researchResults
        .map(r => `[信頼度: ${r.confidence}] ${r.summary}`)
        .join('\n\n');

      const mainPoints = allocation?.allocatedContent.mainPoints.join('\n') || '情報なし';
      const supportingDetails = allocation?.allocatedContent.supportingDetails.join('\n') || '情報なし';
      const connections = allocation?.allocatedContent.connections.join('\n') || '他セクションとの関連なし';

      const result = await chain.call({
        sectionTitle,
        researchSummaries,
        mainPoints,
        supportingDetails,
        connections,
      });

      // JSONを解析
      let jsonText = result.text;
      const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1].trim();
      }
      
      const draftData = JSON.parse(jsonText);

      const draft: SlideDraft = {
        id: uuidv4(),
        sectionId,
        title: draftData.title || sectionTitle,
        content: draftData.content,
        version: 1,
        feedback: [],
        status: 'draft',
      };

      console.log(`[WriterAgent] Created slide draft with allocation for: ${sectionTitle}`);
      return draft;

    } catch (error) {
      console.error('[WriterAgent] Failed to create slide draft with allocation:', error);
      // フォールバック: 通常のドラフト作成
      return this.createSlideDraft(sectionId, sectionTitle, researchResults);
    }
  }

  async generateTransitions(slides: SlideData[]): Promise<string[]> {
    const transitionPrompt = PromptTemplate.fromTemplate(`
以下のスライド構成に対して、スムーズな遷移のための発表者用のトランジション文を作成してください。

スライド構成:
{slideTitles}

各スライド間の自然な繋ぎの文章を作成してください。

JSON形式で返答：
{{
  "transitions": [
    "スライド1から2への遷移文",
    "スライド2から3への遷移文"
  ]
}}
    `);

    const chain = new LLMChain({
      llm: this.llm,
      prompt: transitionPrompt,
    });

    try {
      const slideTitles = slides.map((s, i) => `${i + 1}. ${s.title}`).join('\n');

      const result = await chain.call({
        slideTitles,
      });

      // JSONを解析
      let jsonText = result.text;
      const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1].trim();
      }
      
      const data = JSON.parse(jsonText);
      return data.transitions || [];

    } catch (error) {
      console.error('[WriterAgent] Failed to generate transitions:', error);
      return [];
    }
  }
}