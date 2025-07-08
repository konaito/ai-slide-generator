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
import { HTMLDesignerAgent, SlideDesign } from './htmlDesignerAgent';
import { HTMLCreatorAgent } from './htmlCreatorAgent';
import { 
  PROFESSIONAL_THEME, 
  UnifiedTheme, 
  SLIDE_LAYOUTS, 
  CONTENT_ELEMENTS, 
  STATIC_STYLES,
  applyTheme 
} from './designTemplates';

export class WriterAgent {
  private llm: ChatOpenAI;
  private config = DEFAULT_AGENT_CONFIG.writer;
  private htmlDesigner: HTMLDesignerAgent;
  private htmlCreator: HTMLCreatorAgent;

  constructor() {
    this.llm = new ChatOpenAI({
      modelName: this.config.model,
      temperature: this.config.temperature,
      openAIApiKey: process.env.OPENROUTER_API_KEY,
      configuration: {
        baseURL: 'https://openrouter.ai/api/v1',
      },
    });
    this.htmlDesigner = new HTMLDesignerAgent();
    this.htmlCreator = new HTMLCreatorAgent();
  }

  async createSlideDraft(
    sectionId: string,
    sectionTitle: string,
    researchResults: ResearchResult[]
  ): Promise<SlideDraft> {
    const draftPrompt = PromptTemplate.fromTemplate(`
「{sectionTitle}」のスライドを作成してください。

リサーチ結果:
{researchSummaries}

以下のJSON形式で簡潔に返答してください：
{{
  "title": "{sectionTitle}に関する明確なタイトル",
  "content": "3-5個の主要ポイント（箇条書き形式）",
  "mainPoints": [
    {{
      "icon": "fas fa-chart-line",
      "title": "ポイント",
      "description": "説明（数値含む）",
      "data": {{"value": "85%"}}
    }}
  ],
  "visualElements": {{
    "primaryChart": {{
      "type": "bar",
      "title": "チャート名",
      "data": {{"labels": ["A", "B"], "values": [50, 80]}}
    }}
  }},
  "speakerNotes": "発表時の要点"
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

      // 新しいJSON構造を処理して高密度なコンテンツを生成
      let formattedContent = draftData.content || '';
      
      // メインポイントがある場合は構造化されたコンテンツを生成
      if (draftData.mainPoints && draftData.mainPoints.length > 0) {
        formattedContent = draftData.mainPoints
          .map((point: { title: string; description: string; data?: { value: string; trend?: string } }) => `【${point.title}】\n${point.description}${point.data ? `\n・数値: ${point.data.value} ${point.data.trend || ''}` : ''}`)
          .join('\n\n');
      }
      
      // キーデータがある場合は追加
      if (draftData.keyData && draftData.keyData.length > 0) {
        formattedContent += '\n\n■ 重要指標\n' + 
          draftData.keyData
            .map((data: { label: string; value: string; unit?: string; context?: string }) => `• ${data.label}: ${data.value}${data.unit || ''} ${data.context || ''}`)
            .join('\n');
      }
      
      // ケーススタディがある場合は追加
      if (draftData.caseStudy) {
        const cs = draftData.caseStudy;
        formattedContent += `\n\n■ 事例: ${cs.company}\n課題: ${cs.challenge}\n解決策: ${cs.solution}\n成果: ${cs.result}`;
      }

      const draft: SlideDraft = {
        id: uuidv4(),
        sectionId,
        title: draftData.title,
        content: formattedContent,
        version: 1,
        feedback: [],
        status: 'draft'
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

  async convertToSlide(draft: SlideDraft, slideType: SlideData['type'], presentationTheme?: Partial<UnifiedTheme>): Promise<SlideData> {
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

      // HTML生成フェーズ - 統一テーマを使用
      try {
        // プレゼンテーション全体のテーマを取得（デフォルト: PROFESSIONAL_THEME）
        const theme = presentationTheme || PROFESSIONAL_THEME;
        
        // 1. HTMLデザイナーがレイアウトを設計（統一テーマを適用）
        const design = await this.htmlDesigner.designSlideLayout(slide);
        
        // 2. テンプレートベースのHTML生成を試みる
        let htmlContent: string;
        
        // スライドタイプに応じたテンプレート選択
        if (slide.type === 'title' || slide.type === 'conclusion') {
          // 特別なスライドタイプには専用テンプレートを使用
          htmlContent = await this.generateTemplateBasedHTML(slide, design, theme as UnifiedTheme);
        } else {
          // 通常のコンテンツスライドはAIに生成させる
          htmlContent = await this.htmlCreator.createSlideHTML(slide, design);
        }
        
        // 3. HTMLコンテンツをスライドに追加
        slide.htmlContent = htmlContent;
        
        console.log(`[WriterAgent] Generated HTML for slide: ${slide.title}`);
      } catch (htmlError) {
        console.error('[WriterAgent] Failed to generate HTML:', htmlError);
        // HTMLなしでも続行
      }

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

  async createConclusionSlide(
    sectionId: string,
    title: string,
    conclusionContent: {
      keyPoints: string[];
      insights: string[];
      nextSteps: string[];
    },
    researchResults: ResearchResult[]
  ): Promise<SlideDraft> {
    const conclusionPrompt = PromptTemplate.fromTemplate(`
あなたはMcKinsey、BCGレベルのプレゼンテーション専門家です。
全体のまとめスライドを作成してください。

重要ポイント:
{keyPoints}

主要な洞察:
{insights}

次のステップ:
{nextSteps}

研究データ:
{researchSummaries}

まとめスライドの要件：
1. **構造**: 
   - 「主要な発見」セクション（3-5個の最重要ポイント）
   - 「戦略的示唆」セクション（2-3個の洞察）
   - 「今後の取り組み」セクション（3個の具体的アクション）
2. **情報密度**: 各ポイントは簡潔だが具体的に
3. **視覚的階層**: アイコン、色分け、グルーピングで構造化
4. **結論の強さ**: 明確な行動指針とビジョンを提示

JSON形式で返してください:
{{
  "mainPoints": ["ポイント1", "ポイント2", ...],
  "insights": ["洞察1", "洞察2", ...],
  "actionItems": ["アクション1", "アクション2", ...],
  "visualElements": {{
    "icons": ["アイコン提案"],
    "layout": "レイアウトタイプ",
    "emphasis": ["強調要素"]
  }}
}}
    `);

    const chain = new LLMChain({
      llm: this.llm,
      prompt: conclusionPrompt,
    });

    try {
      const result = await chain.call({
        keyPoints: conclusionContent.keyPoints.join('\n'),
        insights: conclusionContent.insights.join('\n'),
        nextSteps: conclusionContent.nextSteps.join('\n'),
        researchSummaries: researchResults.map(r => r.summary).join('\n\n'),
      });

      // JSON形式でパース
      let parsedContent;
      try {
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedContent = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('JSON not found');
        }
      } catch (parseError) {
        console.error('[WriterAgent] Failed to parse conclusion JSON:', parseError);
        parsedContent = {
          mainPoints: conclusionContent.keyPoints,
          insights: conclusionContent.insights,
          actionItems: conclusionContent.nextSteps,
          visualElements: { icons: [], layout: 'grid', emphasis: [] }
        };
      }

      // コンテンツの構造化
      const structuredContent = `
【主要な発見】
${parsedContent.mainPoints.map((point: string, i: number) => `${i + 1}. ${point}`).join('\n')}

【戦略的示唆】
${parsedContent.insights.map((insight: string) => `• ${insight}`).join('\n')}

【今後の取り組み】
${parsedContent.actionItems.map((action: string, i: number) => `${i + 1}. ${action}`).join('\n')}
      `.trim();

      const draft: SlideDraft = {
        id: uuidv4(),
        sectionId,
        title,
        content: structuredContent,
        version: 1,
        feedback: [],
        status: 'draft',
      };

      console.log(`[WriterAgent] Created conclusion slide`);
      return draft;

    } catch (error) {
      console.error('[WriterAgent] Failed to create conclusion slide:', error);
      // フォールバック
      const fallbackContent = `
【主要な発見】
${conclusionContent.keyPoints.map((point, i) => `${i + 1}. ${point}`).join('\n')}

【戦略的示唆】
${conclusionContent.insights.map((insight) => `• ${insight}`).join('\n')}

【今後の取り組み】
${conclusionContent.nextSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}
      `.trim();

      return {
        id: uuidv4(),
        sectionId,
        title,
        content: fallbackContent,
        version: 1,
        feedback: [],
        status: 'draft',
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
あなたはTED Talksスタイルの優秀なプレゼンテーション作成専門家です。
以下のリサーチ結果とコンテンツ割り振りを基に、「{sectionTitle}」に関する情報密度の高いスライドを作成してください。

リサーチ結果:
{researchSummaries}

割り振られたコンテンツ:
主要ポイント:
{mainPoints}

サポート詳細:
{supportingDetails}

他セクションとの関連:
{connections}

スライド作成の絶対要件：
1. **タイトル設計**: 
   - セクションタイトル「{sectionTitle}」を基準に
   - 主要ポイントの内容を反映した具体的なサブタイトル
   - 「概要」「詳細」などの曖昧な表現は避ける
2. **情報密度**: 3-5個の具体的な論点、データ、事例
3. **視覚的要素**: チャート、表、アイコンの具体的な提案
4. **論理的構成**: 導入→展開→結論の明確な流れ
5. **アクション指向**: 聴衆が実践できる具体的なポイント

JSON形式で返答してください：
{{
  "title": "セクションに沿った具体的で明確なタイトル",
  "content": "情報豊富で構造化されたコンテンツ",
  "visualData": {{
    "charts": [
      {{
        "type": "pie|bar|line|donut|area",
        "data": [["ラベル", 値], ...],
        "title": "チャートタイトル",
        "colors": ["#hex1", "#hex2", ...]
      }}
    ],
    "infographics": [
      {{
        "type": "process|comparison|timeline|hierarchy",
        "items": [
          {{"label": "ステップ1", "value": "説明", "icon": "fa-search"}},
          {{"label": "ステップ2", "value": "説明", "icon": "fa-chart-line"}}
        ]
      }}
    ],
    "illustrations": [
      {{
        "type": "concept|metaphor|diagram",
        "description": "イラストの説明",
        "elements": ["中心の円", "放射状の線", "アイコン"]
      }}
    ],
    "keyMetrics": [
      {{"label": "重要指標", "value": "85%", "trend": "up", "icon": "fa-chart-line"}}
    ]
  }},
  "layout": "cards|dashboard|infographic|storytelling",
  "speakerNotes": "発表者用の詳細メモ",
  "keyPoints": ["核心的ポイント1", "核心的ポイント2", "核心的ポイント3"]
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

  private async generateTemplateBasedHTML(
    slide: SlideData, 
    design: SlideDesign, 
    theme: UnifiedTheme
  ): Promise<string> {
    try {
      // スライドタイプに応じたテンプレートを選択
      let template = '';
      const variables: Record<string, string> = {
        title: slide.title,
        content: slide.content || '',
        date: new Date().toLocaleDateString('ja-JP'),
        slideNumber: '',
        footerText: '',
      };

      if (slide.type === 'title') {
        template = SLIDE_LAYOUTS.title;
      } else if (slide.type === 'conclusion') {
        template = SLIDE_LAYOUTS.conclusion;
        // 結論スライドのポイントを生成
        const contentStr = typeof slide.content === 'string' ? slide.content : String(slide.content || '');
        const points = contentStr.split('\n')
          .filter(line => line.trim())
          .map(line => CONTENT_ELEMENTS.keyPoint(
            'fas fa-check-circle',
            line.replace(/^[•-]\s*/, ''),
            '',
            theme
          ))
          .join('');
        variables.conclusionPoints = points;
        variables.callToAction = 'ご清聴ありがとうございました';
      }

      // テーマを適用してHTMLを生成
      let html = applyTheme(template, theme, variables);
      
      // Font Awesomeと静的スタイルを追加
      html = `
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
        <style>
          ${STATIC_STYLES}
        </style>
        ${html}
      `;

      return html;
    } catch (error) {
      console.error('[WriterAgent] Failed to generate template-based HTML:', error);
      // フォールバック：HTMLCreatorを使用
      return this.htmlCreator.createSlideHTML(slide, design);
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