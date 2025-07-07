import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { LLMChain } from 'langchain/chains';
import { 
  SlideData,
  DEFAULT_AGENT_CONFIG 
} from './types';
import { SlideDesign } from './htmlDesignerAgent';

export class HTMLCreatorAgent {
  private llm: ChatOpenAI;
  private config = DEFAULT_AGENT_CONFIG.htmlCreator;

  constructor() {
    this.llm = new ChatOpenAI({
      modelName: this.config.model,
      temperature: this.config.temperature,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
  }

  async createSlideHTML(slide: SlideData, design: SlideDesign): Promise<string> {
    const htmlPrompt = PromptTemplate.fromTemplate(`
あなたはプロフェッショナルなHTML/CSS専門家です。
情報密度が高く、洗練された1280x720ピクセルのHTMLスライドを作成してください。

スライド情報:
タイプ: {slideType}
タイトル: {title}
コンテンツ: {content}
レイアウト: {layout}

デザイン仕様:
{designSpec}

HTML生成の絶対要件:
1. **完全なHTMLドキュメント**:
   - <!DOCTYPE html>から始まる独立したHTML
   - <head>にメタ情報、外部CSS、フォントを含む
   - Tailwind CSS CDN: https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css
   - Noto Sans JP: https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&display=swap
   - Font Awesome: https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css

2. **情報密度の最大化**:
   - 各スライドに3-5個の主要ポイント
   - 具体的な数値、統計、事例を含む
   - 視覚的要素（アイコン、図表、グリッド）を50%以上
   - 空白を最小限に、情報を最大限に

3. **静的で洗練されたデザイン**:
   - アニメーションなし（静的表示）
   - グリッドレイアウトで情報を整理
   - カード、ボックス、テーブルで構造化
   - 色彩とサイズで視覚的階層を表現

4. **構造化されたレイアウト**:
   - 1280px x 720pxの固定サイズ
   - .slide-containerクラスで全体を包含
   - グリッド/フレックスボックスで要素配置
   - パディング: 40-60px

5. **視覚的要素**:
   - Font Awesomeアイコンを積極的に使用
   - 背景グラデーション、ボーダー、シャドウ
   - アクセントカラーで重要情報を強調
   - データは必ず視覚化（表、リスト、カード）

完全なHTMLドキュメント（<!DOCTYPE html>から</html>まで）を返してください。
    `);

    const chain = new LLMChain({
      llm: this.llm,
      prompt: htmlPrompt,
    });

    try {
      const designSpec = this.formatDesignSpec(design);

      const result = await chain.call({
        slideType: slide.type,
        title: slide.title,
        content: typeof slide.content === 'string' ? slide.content : String(slide.content || ''),
        layout: design.layout,
        designSpec,
      });

      // HTMLコードの抽出
      let htmlCode = result.text;
      
      // コードブロックの除去
      const codeMatch = htmlCode.match(/```html?\s*([\s\S]*?)```/);
      if (codeMatch) {
        htmlCode = codeMatch[1].trim();
      }

      // 基本的なHTMLラッパーの確認
      if (!htmlCode.includes('class="slide"')) {
        htmlCode = this.wrapInSlideContainer(htmlCode, design);
      }

      console.log(`[HTMLCreatorAgent] Created HTML for slide: ${slide.title}`);
      return htmlCode;

    } catch (error) {
      console.error('[HTMLCreatorAgent] Failed to create HTML:', error);
      // フォールバックHTML
      return this.createFallbackHTML(slide, design);
    }
  }

  private formatDesignSpec(design: SlideDesign): string {
    return `
テーマカラー:
- 主要色: ${design.theme.primaryColor}
- 補助色: ${design.theme.secondaryColor}
- 背景色: ${design.theme.backgroundColor}
- テキスト色: ${design.theme.textColor}
- アクセント色: ${design.theme.accentColor}
- フォント: ${design.theme.fontFamily}

視覚的階層:
- タイトルサイズ: ${design.visualHierarchy.titleSize}
- サブタイトルサイズ: ${design.visualHierarchy.subtitleSize}
- 本文サイズ: ${design.visualHierarchy.bodySize}
- 要素間隔: ${design.visualHierarchy.spacing}

要素配置:
${design.elements.map(el => `
- ${el.type}: 
  位置: (${el.position.x}, ${el.position.y})
  サイズ: ${el.position.width} x ${el.position.height}
  スタイル: ${JSON.stringify(el.style)}
`).join('\n')}
    `;
  }

  private wrapInSlideContainer(content: string, design: SlideDesign): string {
    return `<div class="slide" style="
      width: 1280px;
      height: 720px;
      background-color: ${design.theme.backgroundColor};
      color: ${design.theme.textColor};
      font-family: ${design.theme.fontFamily};
      position: absolute;
      top: 0;
      left: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      padding: 6.25vw;
      box-sizing: border-box;
    ">
      ${content}
    </div>`;
  }

  private createFallbackHTML(slide: SlideData, design: SlideDesign): string {
    const isTitle = slide.type === 'title';
    // slide.contentが文字列であることを確認
    const contentStr = typeof slide.content === 'string' ? slide.content : String(slide.content || '');
    const isBulletList = contentStr.includes('•') || contentStr.includes('-');

    let contentHTML = '';
    if (isBulletList) {
      const items = contentStr.split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/^[•-]\s*/, ''));
      
      contentHTML = `
        <ul style="
          list-style: none;
          padding: 0;
          margin: 0;
          font-size: ${design.visualHierarchy.bodySize};
          line-height: 1.8;
        ">
          ${items.map((item, index) => `
            <li style="
              margin-bottom: 1.5625vw;
              padding-left: 3.125vw;
              position: relative;
            ">
              <span style="
                position: absolute;
                left: 0;
                top: 0.3125vw;
                width: 1.5625vw;
                height: 1.5625vw;
                background-color: ${design.theme.accentColor};
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 0.9375vw;
              ">✓</span>
              ${item}
            </li>
          `).join('')}
        </ul>
      `;
    } else {
      contentHTML = `<p style="
        font-size: ${design.visualHierarchy.bodySize};
        line-height: 1.6;
        margin: 0;
        white-space: pre-wrap;
      ">${contentStr}</p>`;
    }

    return `
      <div class="slide" style="
        width: 1280px;
        height: 720px;
        background: linear-gradient(135deg, ${design.theme.backgroundColor} 0%, ${this.lightenColor(design.theme.backgroundColor, 10)} 100%);
        color: ${design.theme.textColor};
        font-family: ${design.theme.fontFamily};
        position: absolute;
        top: 0;
        left: 0;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        ${isTitle ? 'justify-content: center; align-items: center;' : 'padding: 6.25vw;'}
        box-sizing: border-box;
      ">
        ${!isTitle ? `
          <div style="
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 0.625vw;
            background: linear-gradient(90deg, ${design.theme.primaryColor} 0%, ${design.theme.secondaryColor} 100%);
          "></div>
        ` : ''}
        
        <h1 style="
          font-size: ${isTitle ? '5.625vw' : design.visualHierarchy.titleSize};
          font-weight: bold;
          margin: 0 0 ${isTitle ? '3.125vw' : '4.6875vw'} 0;
          color: ${design.theme.primaryColor};
          ${isTitle ? 'text-align: center;' : ''}
          text-shadow: 0.15625vw 0.15625vw 0.3125vw rgba(0,0,0,0.1);
        ">${slide.title}</h1>
        
        ${!isTitle ? `
          <div style="
            width: 9.375vw;
            height: 0.46875vw;
            background-color: ${design.theme.accentColor};
            margin-bottom: 2.34375vw;
          "></div>
        ` : ''}
        
        ${contentHTML}
        
        ${!isTitle ? `
          <div style="
            position: absolute;
            bottom: 3.125vw;
            right: 6.25vw;
            width: 4.6875vw;
            height: 4.6875vw;
            background-color: ${design.theme.accentColor};
            opacity: 0.1;
            border-radius: 50%;
          "></div>
        ` : ''}
      </div>
    `;
  }

  private lightenColor(color: string, percent: number): string {
    // 簡易的な色の明度調整
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255))
      .toString(16).slice(1);
  }

  async createAdvancedHTML(slide: SlideData, design: SlideDesign): Promise<string> {
    const advancedPrompt = PromptTemplate.fromTemplate(`
プロフェッショナルなHTMLスライドデザイナーとして、以下の要件で洗練されたスライドを作成してください。

スライド情報:
{slideInfo}

デザイン要件:
1. 1280x720px固定サイズ
2. 美しいグラデーション背景
3. 洗練されたタイポグラフィ
4. 静的で明確な視覚的階層（アニメーションなし）
5. プロフェッショナルな装飾要素
6. 視覚的バランスと余白

以下の構造でHTMLを作成:
- モダンなCSS Grid/Flexboxレイアウト
- CSS変数を使用した一貫性のあるデザイン
- 印刷対応の高品質デザイン
- 日本語に最適化されたフォント設定

<div class="slide">から</div>までの完全なHTMLを返してください。
    `);

    const chain = new LLMChain({
      llm: this.llm,
      prompt: advancedPrompt,
    });

    try {
      const slideInfo = JSON.stringify({
        title: slide.title,
        content: typeof slide.content === 'string' ? slide.content : String(slide.content || ''),
        type: slide.type,
        design: design,
      }, null, 2);

      const result = await chain.call({
        slideInfo,
      });

      let htmlCode = result.text;
      const codeMatch = htmlCode.match(/```html?\s*([\s\S]*?)```/);
      if (codeMatch) {
        htmlCode = codeMatch[1].trim();
      }

      // <div class="slide">が含まれているか確認
      if (!htmlCode.includes('class="slide"')) {
        htmlCode = `<div class="slide" style="width: 1280px; height: 720px; position: absolute; top: 0; left: 0;">${htmlCode}</div>`;
      }

      return htmlCode;

    } catch (error) {
      console.error('[HTMLCreatorAgent] Failed to create advanced HTML:', error);
      return this.createFallbackHTML(slide, design);
    }
  }
}