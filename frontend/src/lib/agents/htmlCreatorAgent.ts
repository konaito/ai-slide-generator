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
      openAIApiKey: process.env.OPENROUTER_API_KEY,
      configuration: {
        baseURL: 'https://openrouter.ai/api/v1',
      },
    });
  }

  async createSlideHTML(slide: SlideData, design: SlideDesign): Promise<string> {
    const htmlPrompt = PromptTemplate.fromTemplate(`
あなたはCanva、Figma、Adobe Creative Cloudレベルのデザイナーです。
世界トップクラスのプレゼンテーションスライドを作成してください。

スライド情報:
タイプ: {slideType}
タイトル: {title}
コンテンツ: {content}
レイアウト: {layout}

デザイン仕様:
{designSpec}

【重要】テキストの羅列は厳禁！以下の視覚的要素を必ず含めてください：
- 数値やデータ → 必ずチャート化（SVG）
- プロセスや手順 → フローチャートやタイムライン
- 比較や対比 → テーブル、マトリックス、並列カード
- 概念説明 → イラストやアイコンを使った図解
- 重要ポイント → インフォグラフィック形式

【Canvaレベルのデザイン要件】

1. **モダンなビジュアルデザイン**:
   - 多層グラデーション背景（例: linear-gradient(135deg, #667eea 0%, #764ba2 100%)）
   - グラスモーフィズム効果（backdrop-filter: blur(10px)、半透明要素）
   - ニューモーフィズム（柔らかい影とハイライト）
   - 幾何学的なシェイプとパターン（SVG使用）

2. **プロフェッショナルなレイアウト**:
   - 黄金比（1.618）を使った要素配置
   - 非対称でダイナミックなグリッド
   - オーバーラップする要素で奥行き表現
   - ネガティブスペースの戦略的活用

3. **高度なタイポグラフィ**:
   - フォントの組み合わせ（見出し: Montserrat/Poppins、本文: Noto Sans JP）
   - 文字の大小対比（最大96px、最小14px）
   - 文字間隔と行間の最適化
   - テキストにグラデーションやシャドウ効果

4. **リッチなビジュアル要素**:
   - カスタムSVGアイコン（Font Awesome + 独自デザイン）
   - 装飾的な図形（円、波形、幾何学模様）
   - データビジュアライゼーション：
     * 数値データがあれば必ずSVGチャートを生成（円グラフ、棒グラフ、折れ線グラフ）
     * プロセスは矢印とボックスのフローチャート
     * 比較はテーブルやマトリックス
     * パーセンテージは視覚的なプログレスバーやゲージ
   - インフォグラフィック（アイコン+数値+説明の組み合わせ）
   - 画像マスキング効果（clip-path使用）

5. **カラーとエフェクト**:
   - 5-7色の調和したカラーパレット
   - グラデーション、グロー、ブラー効果
   - box-shadow: 0 20px 40px rgba(0,0,0,0.1)
   - border-radius: 20px以上の丸みのあるデザイン

6. **実装詳細**:
   - <!DOCTYPE html>から始まる完全なHTML
   - 必須CDN:
     - Tailwind CSS: https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css
     - Google Fonts: Montserrat, Poppins, Noto Sans JP
     - Font Awesome: https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css
   - カスタムCSS（<style>タグ内）で高度なスタイリング
   - 1280px x 720pxの固定サイズ

【デザインの参考】
Canva、Pitch、Beautiful.AI、Slidebean、Decktopusのようなモダンで洗練されたデザインを目指してください。
単なる情報の羅列ではなく、視覚的にインパクトのある、記憶に残るスライドを作成してください。

【SVGチャートの例】
円グラフ:
<svg viewBox="0 0 200 200">
  <circle cx="100" cy="100" r="80" fill="none" stroke="#e0e0e0" stroke-width="40"/>
  <circle cx="100" cy="100" r="80" fill="none" stroke="#667eea" stroke-width="40" 
          stroke-dasharray="125.6 376.8" transform="rotate(-90 100 100)"/>
</svg>

棒グラフ:
<svg viewBox="0 0 400 300">
  <rect x="50" y="150" width="60" height="100" fill="#667eea" rx="5"/>
  <rect x="150" y="100" width="60" height="150" fill="#764ba2" rx="5"/>
</svg>

完全なHTMLドキュメント（<!DOCTYPE html>から</html>まで）を返してください。
必ず数値データはSVGチャートで表現し、テキストだけの羅列は避けてください。
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
    const contentStr = typeof slide.content === 'string' ? slide.content : String(slide.content || '');
    const isBulletList = contentStr.includes('•') || contentStr.includes('-') || contentStr.includes('【');

    // Canvaスタイルのグラデーション背景
    const gradientBg = isTitle 
      ? `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
      : `linear-gradient(135deg, #f093fb 0%, #f5576c 100%)`;

    let contentHTML = '';
    if (isBulletList) {
      const sections = contentStr.split(/【[^】]+】/).filter(s => s.trim());
      const sectionTitles = contentStr.match(/【[^】]+】/g) || [];
      
      contentHTML = `
        <div style="
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 30px;
          width: 100%;
        ">
          ${sectionTitles.map((title, index) => {
            const items = sections[index]?.split('\n').filter(line => line.trim()) || [];
            return `
              <div style="
                background: rgba(255, 255, 255, 0.9);
                backdrop-filter: blur(10px);
                border-radius: 20px;
                padding: 30px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                position: relative;
                overflow: hidden;
              ">
                <div style="
                  position: absolute;
                  top: -50px;
                  right: -50px;
                  width: 150px;
                  height: 150px;
                  background: ${design.theme.accentColor};
                  opacity: 0.1;
                  border-radius: 50%;
                "></div>
                <h3 style="
                  font-size: 24px;
                  font-weight: 700;
                  color: ${design.theme.primaryColor};
                  margin-bottom: 20px;
                  font-family: 'Poppins', sans-serif;
                ">${title.replace(/【|】/g, '')}</h3>
                <ul style="list-style: none; padding: 0; margin: 0;">
                  ${items.map(item => `
                    <li style="
                      margin-bottom: 15px;
                      padding-left: 30px;
                      position: relative;
                      font-size: 16px;
                      line-height: 1.6;
                    ">
                      <i class="fas fa-check-circle" style="
                        position: absolute;
                        left: 0;
                        top: 3px;
                        color: ${design.theme.accentColor};
                        font-size: 16px;
                      "></i>
                      ${item.replace(/^[•\-\d.]\s*/, '')}
                    </li>
                  `).join('')}
                </ul>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else {
      contentHTML = `
        <div style="
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border-radius: 30px;
          padding: 60px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.15);
          max-width: 90%;
          margin: 0 auto;
        ">
          <p style="
            font-size: ${design.visualHierarchy.bodySize};
            line-height: 1.8;
            margin: 0;
            white-space: pre-wrap;
            color: ${design.theme.textColor};
          ">${contentStr}</p>
        </div>
      `;
    }

    return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1280, initial-scale=1">
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800&family=Poppins:wght@400;600;700&family=Noto+Sans+JP:wght@400;700&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <style>
    body { margin: 0; padding: 0; overflow: hidden; }
    .slide-container {
      width: 1280px;
      height: 720px;
      position: relative;
      background: ${gradientBg};
      display: flex;
      flex-direction: column;
      ${isTitle ? 'justify-content: center; align-items: center;' : 'padding: 80px;'}
      overflow: hidden;
      font-family: 'Noto Sans JP', sans-serif;
    }
    
    /* 幾何学的な装飾 */
    .geometric-shape {
      position: absolute;
      opacity: 0.1;
    }
    
    .shape-1 {
      top: -100px;
      left: -100px;
      width: 300px;
      height: 300px;
      background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%);
      border-radius: 50%;
    }
    
    .shape-2 {
      bottom: -150px;
      right: -150px;
      width: 400px;
      height: 400px;
      background: conic-gradient(from 180deg at 50% 50%, #e0c3fc 0deg, #8ec5fc 360deg);
      opacity: 0.2;
      transform: rotate(45deg);
    }
    
    .title-decoration {
      position: absolute;
      bottom: -10px;
      left: 0;
      width: 100%;
      height: 6px;
      background: linear-gradient(90deg, ${design.theme.primaryColor} 0%, ${design.theme.accentColor} 100%);
      border-radius: 3px;
      transform: scaleX(0.3);
      transform-origin: left center;
    }
  </style>
</head>
<body>
  <div class="slide-container">
    <div class="geometric-shape shape-1"></div>
    <div class="geometric-shape shape-2"></div>
    
    ${isTitle ? `
      <div style="text-align: center; z-index: 10;">
        <h1 style="
          font-size: 72px;
          font-weight: 800;
          margin: 0 0 40px 0;
          color: white;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
          font-family: 'Montserrat', sans-serif;
          letter-spacing: -2px;
          position: relative;
        ">
          ${slide.title}
          <div class="title-decoration"></div>
        </h1>
        ${contentStr ? `
          <p style="
            font-size: 24px;
            color: rgba(255,255,255,0.9);
            font-weight: 400;
            letter-spacing: 1px;
          ">${contentStr}</p>
        ` : ''}
      </div>
    ` : `
      <div style="z-index: 10; width: 100%;">
        <h1 style="
          font-size: 48px;
          font-weight: 700;
          margin: 0 0 40px 0;
          color: white;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
          font-family: 'Poppins', sans-serif;
          position: relative;
          display: inline-block;
        ">
          ${slide.title}
          <div class="title-decoration"></div>
        </h1>
        
        ${contentHTML}
      </div>
    `}
    
    <!-- スライド番号 -->
    ${!isTitle ? `
      <div style="
        position: absolute;
        bottom: 30px;
        right: 40px;
        font-size: 14px;
        color: rgba(255,255,255,0.6);
        font-family: 'Poppins', sans-serif;
      ">
        ${new Date().toLocaleDateString('ja-JP')}
      </div>
    ` : ''}
  </div>
</body>
</html>
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