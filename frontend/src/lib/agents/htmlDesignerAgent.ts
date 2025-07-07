import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { LLMChain } from 'langchain/chains';
import { 
  SlideData,
  DEFAULT_AGENT_CONFIG 
} from './types';

export interface SlideDesign {
  slideId: string;
  layout: 'title' | 'single-column' | 'two-column' | 'image-text' | 'bullet-points' | 'conclusion';
  theme: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    accentColor: string;
    fontFamily: string;
  };
  elements: DesignElement[];
  visualHierarchy: {
    titleSize: string;
    subtitleSize: string;
    bodySize: string;
    spacing: string;
  };
}

export interface DesignElement {
  type: 'title' | 'subtitle' | 'body' | 'bullet-list' | 'image' | 'chart' | 'quote' | 'footer';
  content: string;
  position: {
    x: string; // percentage or px
    y: string;
    width: string;
    height: string;
  };
  style: {
    fontSize?: string;
    fontWeight?: string;
    color?: string;
    textAlign?: 'left' | 'center' | 'right';
    animation?: string;
  };
}

export class HTMLDesignerAgent {
  private llm: ChatOpenAI;
  private config = DEFAULT_AGENT_CONFIG.htmlDesigner;

  constructor() {
    this.llm = new ChatOpenAI({
      modelName: this.config.model,
      temperature: this.config.temperature,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
  }

  async designSlideLayout(slide: SlideData, presentationTheme?: Partial<SlideDesign['theme']>): Promise<SlideDesign> {
    const designPrompt = PromptTemplate.fromTemplate(`
あなたはTED Talks、Apple Keynote、McKinseyプレゼンテーションスタイルの専門デザイナーです。
以下のスライド情報に基づいて、情報密度が高く視覚的にインパクトのあるデザインを作成してください。

スライドタイプ: {slideType}
タイトル: {title}
コンテンツ: {content}

デザイン原則:
1. **情報密度**: 1スライドに3-5個の主要ポイント、視覚要素、データを含める
2. **視覚的階層**: 明確な見出し、サブ見出し、本文の区別（Z-pattern、F-patternの活用）
3. **データビジュアライゼーション**: 
   - 数値→インフォグラフィック、チャート
   - 比較→テーブル、並列レイアウト
   - プロセス→フローチャート、タイムライン
4. **感情的訴求**: 
   - カラーサイコロジーの活用
   - アイコンとビジュアルメタファー
   - 静的だが印象的なデザイン
5. **プロフェッショナル装飾**:
   - グラデーション背景
   - アクセントライン（0.46875vw幅）
   - ボックスシャドウ
   - 境界線とセパレーター

スライドタイプ別の特別要件:
- title: ヒーローイメージ風、大胆なタイポグラフィ、印象的な配置
- content: グリッド/カラムレイアウト、視覚要素50%以上
- toc: 構造的な見た目、番号付きカード、視覚的階層
- conclusion: CTA重視、まとめグラフィック、次のステップ

{themeGuidelines}

JSON形式で返答してください：
{{
  "layout": "hero|two-column|three-column|grid|comparison|timeline|centered",
  "theme": {{
    "primaryColor": "#1a365d",
    "secondaryColor": "#2563eb",
    "backgroundColor": "#ffffff",
    "textColor": "#1a202c",
    "accentColor": "#e53e3e",
    "fontFamily": "\"Noto Sans JP\", \"Helvetica Neue\", Arial, sans-serif"
  }},
  "visualHierarchy": {{
    "titleSize": "3.75vw",
    "subtitleSize": "2.5vw", 
    "bodySize": "1.5625vw",
    "captionSize": "1.25vw",
    "spacing": "1.875vw"
  }},
  "elements": [
    {{
      "type": "title|subtitle|body|bulletList|keyPoint|infoGraphic|chart|table|timeline|quote|icon|divider",
      "position": {{"x": "vw値", "y": "vw値", "width": "vw値", "height": "vw値"}},
      "style": {{"padding": "vw値", "margin": "vw値", "borderRadius": "0.625vw"}},
      "content": "具体的なコンテンツや数値データ"
    }}
  ]
}}
    `);

    const chain = new LLMChain({
      llm: this.llm,
      prompt: designPrompt,
    });

    try {
      // テーマガイドラインの作成
      let themeGuidelines = '';
      if (presentationTheme) {
        themeGuidelines = `既存のテーマカラー:\n${JSON.stringify(presentationTheme, null, 2)}`;
      }

      const result = await chain.call({
        slideType: slide.type,
        title: slide.title,
        content: slide.content,
        themeGuidelines,
      });

      // JSONを解析
      let jsonText = result.text;
      const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1].trim();
      }
      
      const designData = JSON.parse(jsonText);

      // コンテンツを要素に分解して配置
      const elements = this.parseContentToElements(slide, designData);

      const design: SlideDesign = {
        slideId: slide.id,
        layout: designData.layout || this.getDefaultLayout(slide.type),
        theme: {
          primaryColor: designData.theme?.primaryColor || '#2C3E50',
          secondaryColor: designData.theme?.secondaryColor || '#3498DB',
          backgroundColor: designData.theme?.backgroundColor || '#FFFFFF',
          textColor: designData.theme?.textColor || '#2C3E50',
          accentColor: designData.theme?.accentColor || '#E74C3C',
          fontFamily: designData.theme?.fontFamily || '"Noto Sans JP", "Helvetica Neue", Arial, sans-serif',
        },
        elements: elements.length > 0 ? elements : designData.elements,
        visualHierarchy: designData.visualHierarchy || {
          titleSize: '3.75vw',
          subtitleSize: '2.5vw',
          bodySize: '1.875vw',
          spacing: '2.5vw',
        },
      };

      console.log(`[HTMLDesignerAgent] Designed layout for slide: ${slide.title}`);
      return design;

    } catch (error) {
      console.error('[HTMLDesignerAgent] Failed to design layout:', error);
      // フォールバックデザイン
      return this.createFallbackDesign(slide);
    }
  }

  private parseContentToElements(slide: SlideData, designData: any): DesignElement[] {
    const elements: DesignElement[] = [];

    // タイトル要素
    if (slide.title) {
      elements.push({
        type: 'title',
        content: slide.title,
        position: this.getPositionForType(slide.type, 'title'),
        style: {
          fontSize: designData.visualHierarchy?.titleSize || '3.75vw',
          fontWeight: 'bold',
          textAlign: 'center',
        },
      });
    }

    // コンテンツの解析と配置
    if (slide.content) {
      const lines = slide.content.split('\n').filter(line => line.trim());
      
      // 箇条書きの検出
      const bulletPoints = lines.filter(line => line.startsWith('•') || line.startsWith('-'));
      const nonBulletContent = lines.filter(line => !line.startsWith('•') && !line.startsWith('-'));

      if (bulletPoints.length > 0) {
        elements.push({
          type: 'bullet-list',
          content: bulletPoints.join('\n'),
          position: this.getPositionForType(slide.type, 'bullets'),
          style: {
            fontSize: designData.visualHierarchy?.bodySize || '1.875vw',
            textAlign: 'left',
          },
        });
      }

      if (nonBulletContent.length > 0) {
        elements.push({
          type: 'body',
          content: nonBulletContent.join('\n'),
          position: this.getPositionForType(slide.type, 'body'),
          style: {
            fontSize: designData.visualHierarchy?.bodySize || '1.875vw',
            textAlign: slide.type === 'title' ? 'center' : 'left',
          },
        });
      }
    }

    return elements;
  }

  private getPositionForType(slideType: SlideData['type'], elementType: DesignElement['type']): DesignElement['position'] {
    const positions: Record<string, Record<string, DesignElement['position']>> = {
      title: {
        title: { x: '10%', y: '35%', width: '80%', height: 'auto' },
        body: { x: '10%', y: '55%', width: '80%', height: 'auto' },
      },
      content: {
        title: { x: '5%', y: '8%', width: '90%', height: 'auto' },
        body: { x: '5%', y: '25%', width: '90%', height: '65%' },
        bullets: { x: '10%', y: '30%', width: '80%', height: '60%' },
      },
      conclusion: {
        title: { x: '10%', y: '20%', width: '80%', height: 'auto' },
        body: { x: '10%', y: '40%', width: '80%', height: '50%' },
        bullets: { x: '15%', y: '45%', width: '70%', height: '45%' },
      },
    };

    return positions[slideType]?.[elementType] || { x: '5%', y: '20%', width: '90%', height: 'auto' };
  }

  private getDefaultLayout(slideType: SlideData['type']): SlideDesign['layout'] {
    const layoutMap: Record<SlideData['type'], SlideDesign['layout']> = {
      title: 'title',
      content: 'single-column',
      image: 'image-text',
      chart: 'image-text',
      conclusion: 'bullet-points',
    };
    return layoutMap[slideType] || 'single-column';
  }

  private createFallbackDesign(slide: SlideData): SlideDesign {
    return {
      slideId: slide.id,
      layout: this.getDefaultLayout(slide.type),
      theme: {
        primaryColor: '#2C3E50',
        secondaryColor: '#3498DB',
        backgroundColor: '#FFFFFF',
        textColor: '#2C3E50',
        accentColor: '#E74C3C',
        fontFamily: '"Noto Sans JP", "Helvetica Neue", Arial, sans-serif',
      },
      elements: [
        {
          type: 'title',
          content: slide.title,
          position: { x: '5%', y: '10%', width: '90%', height: 'auto' },
          style: {
            fontSize: '3.75vw',
            fontWeight: 'bold',
            textAlign: 'center',
          },
        },
        {
          type: 'body',
          content: slide.content,
          position: { x: '5%', y: '30%', width: '90%', height: '60%' },
          style: {
            fontSize: '1.875vw',
            textAlign: 'left',
          },
        },
      ],
      visualHierarchy: {
        titleSize: '3.75vw',
        subtitleSize: '2.5vw',
        bodySize: '1.875vw',
        spacing: '2.5vw',
      },
    };
  }
}