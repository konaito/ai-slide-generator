// 統一されたデザインテンプレート

export interface UnifiedTheme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: {
      primary: string;
      secondary: string;
      inverse: string;
    };
    gradients: {
      primary: string;
      secondary: string;
      accent: string;
    };
  };
  typography: {
    fontFamily: string;
    sizes: {
      hero: string;      // 5.625vw (72px)
      title: string;     // 3.75vw (48px)
      subtitle: string;  // 2.5vw (32px)
      body: string;      // 1.5625vw (20px)
      caption: string;   // 1.25vw (16px)
      small: string;     // 1.09375vw (14px)
    };
    weights: {
      light: number;
      regular: number;
      medium: number;
      bold: number;
    };
  };
  spacing: {
    xs: string;   // 0.625vw (8px)
    sm: string;   // 1.25vw (16px)
    md: string;   // 1.875vw (24px)
    lg: string;   // 2.5vw (32px)
    xl: string;   // 3.75vw (48px)
    xxl: string;  // 5vw (64px)
  };
  effects: {
    shadow: {
      sm: string;
      md: string;
      lg: string;
    };
    borderRadius: string;
    accentLineWidth: string;
  };
}

export const PROFESSIONAL_THEME: UnifiedTheme = {
  name: 'Professional',
  colors: {
    primary: '#1a365d',
    secondary: '#2563eb',
    accent: '#e53e3e',
    background: '#ffffff',
    surface: '#f7fafc',
    text: {
      primary: '#1a202c',
      secondary: '#4a5568',
      inverse: '#ffffff',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #1a365d 0%, #2563eb 100%)',
      secondary: 'linear-gradient(135deg, #f7fafc 0%, #ffffff 100%)',
      accent: 'linear-gradient(90deg, #e53e3e 0%, #f56565 100%)',
    },
  },
  typography: {
    fontFamily: '"Noto Sans JP", "Helvetica Neue", Arial, sans-serif',
    sizes: {
      hero: '5.625vw',
      title: '3.75vw',
      subtitle: '2.5vw',
      body: '1.5625vw',
      caption: '1.25vw',
      small: '1.09375vw',
    },
    weights: {
      light: 300,
      regular: 400,
      medium: 500,
      bold: 700,
    },
  },
  spacing: {
    xs: '0.625vw',
    sm: '1.25vw',
    md: '1.875vw',
    lg: '2.5vw',
    xl: '3.75vw',
    xxl: '5vw',
  },
  effects: {
    shadow: {
      sm: '0 0.125vw 0.25vw rgba(0, 0, 0, 0.1)',
      md: '0 0.25vw 0.5vw rgba(0, 0, 0, 0.1)',
      lg: '0 0.5vw 1vw rgba(0, 0, 0, 0.1)',
    },
    borderRadius: '0.625vw',
    accentLineWidth: '0.46875vw',
  },
};

// スライドタイプ別のレイアウトテンプレート
export const SLIDE_LAYOUTS = {
  // タイトルスライド
  title: `
    <div class="slide-inner" style="
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: {spacing.xxl};
      background: {gradients.secondary};
    ">
      <h1 class="slide-title" style="
        font-size: {sizes.hero};
        font-weight: {weights.bold};
        color: {colors.primary};
        margin-bottom: {spacing.lg};
        letter-spacing: 0.078125vw;
      ">{title}</h1>
      
      <div class="accent-line" style="
        width: 9.375vw;
        height: {effects.accentLineWidth};
        background: {gradients.accent};
        margin: {spacing.lg} 0;
      "></div>
      
      <div class="slide-content" style="
        font-size: {sizes.subtitle};
        color: {text.secondary};
        line-height: 1.6;
      ">{content}</div>
      
      <div class="slide-metadata" style="
        position: absolute;
        bottom: {spacing.xl};
        right: {spacing.xl};
        font-size: {sizes.caption};
        color: {text.secondary};
        opacity: 0.7;
      ">{date}</div>
    </div>
  `,

  // 目次スライド
  toc: `
    <div class="slide-inner" style="
      padding: {spacing.xl};
      background: {colors.background};
    ">
      <div class="slide-header" style="
        margin-bottom: {spacing.xl};
      ">
        <h2 class="slide-title" style="
          font-size: {sizes.title};
          font-weight: {weights.bold};
          color: {colors.primary};
          margin-bottom: {spacing.sm};
        ">{title}</h2>
        <div class="accent-line" style="
          width: 7.8125vw;
          height: {effects.accentLineWidth};
          background: {gradients.accent};
        "></div>
      </div>
      
      <div class="toc-grid" style="
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: {spacing.lg};
      ">
        {tocItems}
      </div>
    </div>
  `,

  // コンテンツスライド
  content: `
    <div class="slide-inner" style="
      padding: {spacing.xl};
      background: {colors.background};
      height: 100%;
      display: flex;
      flex-direction: column;
    ">
      <div class="slide-header" style="
        margin-bottom: {spacing.lg};
      ">
        <h2 class="slide-title" style="
          font-size: {sizes.title};
          font-weight: {weights.bold};
          color: {colors.primary};
          margin-bottom: {spacing.sm};
        ">{title}</h2>
        <div class="accent-line" style="
          width: 7.8125vw;
          height: {effects.accentLineWidth};
          background: {gradients.accent};
        "></div>
      </div>
      
      <div class="slide-body" style="
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: {spacing.md};
      ">
        {contentBody}
      </div>
      
      <div class="slide-footer" style="
        margin-top: {spacing.lg};
        padding-top: {spacing.md};
        border-top: 0.078125vw solid rgba(0,0,0,0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: {sizes.small};
        color: {text.secondary};
      ">
        <div>{slideNumber}</div>
        <div>{footerText}</div>
      </div>
    </div>
  `,

  // 結論スライド
  conclusion: `
    <div class="slide-inner" style="
      padding: {spacing.xl};
      background: linear-gradient(135deg, {colors.surface} 0%, {colors.background} 100%);
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
    ">
      <h2 class="slide-title" style="
        font-size: {sizes.title};
        font-weight: {weights.bold};
        color: {colors.primary};
        text-align: center;
        margin-bottom: {spacing.xl};
      ">{title}</h2>
      
      <div class="conclusion-content" style="
        background: {colors.background};
        border-radius: {effects.borderRadius};
        padding: {spacing.lg};
        box-shadow: {effects.shadow.lg};
      ">
        {conclusionPoints}
      </div>
      
      <div class="call-to-action" style="
        text-align: center;
        margin-top: {spacing.xl};
        padding: {spacing.md} {spacing.lg};
        background: {gradients.primary};
        color: {text.inverse};
        border-radius: {effects.borderRadius};
        font-size: {sizes.subtitle};
        font-weight: {weights.medium};
        box-shadow: {effects.shadow.md};
      ">{callToAction}</div>
    </div>
  `,
};

// コンテンツ要素のテンプレート
export const CONTENT_ELEMENTS = {
  bulletList: (items: string[], theme: UnifiedTheme) => `
    <ul style="
      list-style: none;
      padding: 0;
      margin: 0;
      font-size: ${theme.typography.sizes.body};
      line-height: 1.8;
    ">
      ${items.map((item) => `
        <li style="
          margin-bottom: ${theme.spacing.md};
          padding-left: ${theme.spacing.lg};
          position: relative;
        ">
          <span style="
            position: absolute;
            left: 0;
            top: 0.234375vw;
            width: 1.25vw;
            height: 1.25vw;
            background: ${theme.colors.gradients.accent};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 0.78125vw;
            font-weight: ${theme.typography.weights.bold};
          ">✓</span>
          ${item}
        </li>
      `).join('')}
    </ul>
  `,

  keyPoint: (icon: string, title: string, description: string, theme: UnifiedTheme) => `
    <div class="key-point" style="
      display: flex;
      align-items: flex-start;
      margin-bottom: ${theme.spacing.lg};
      padding: ${theme.spacing.md};
      background: ${theme.colors.surface};
      border-radius: ${theme.effects.borderRadius};
      box-shadow: ${theme.effects.shadow.sm};
    ">
      <div class="icon-wrapper" style="
        width: 3.75vw;
        height: 3.75vw;
        background: ${theme.colors.gradients.primary};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: ${theme.spacing.md};
        flex-shrink: 0;
      ">
        <i class="${icon}" style="
          font-size: 1.875vw;
          color: ${theme.colors.text.inverse};
        "></i>
      </div>
      <div>
        <h3 style="
          font-size: ${theme.typography.sizes.subtitle};
          font-weight: ${theme.typography.weights.bold};
          color: ${theme.colors.primary};
          margin-bottom: ${theme.spacing.xs};
        ">${title}</h3>
        <p style="
          font-size: ${theme.typography.sizes.body};
          color: ${theme.colors.text.secondary};
          line-height: 1.6;
        ">${description}</p>
      </div>
    </div>
  `,

  gridLayout: (items: Array<{icon: string, title: string, content: string}>, theme: UnifiedTheme) => `
    <div class="grid-layout" style="
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: ${theme.spacing.md};
      margin: ${theme.spacing.lg} 0;
    ">
      ${items.map((item) => `
        <div class="grid-item" style="
          background: ${theme.colors.surface};
          border-radius: ${theme.effects.borderRadius};
          padding: ${theme.spacing.md};
          border-top: 0.3125vw solid ${theme.colors.accent};
          box-shadow: ${theme.effects.shadow.md};
        ">
          <div style="
            font-size: 2.5vw;
            color: ${theme.colors.secondary};
            margin-bottom: ${theme.spacing.sm};
          ">
            <i class="${item.icon}"></i>
          </div>
          <h4 style="
            font-size: ${theme.typography.sizes.caption};
            font-weight: ${theme.typography.weights.bold};
            color: ${theme.colors.primary};
            margin-bottom: ${theme.spacing.xs};
          ">${item.title}</h4>
          <p style="
            font-size: ${theme.typography.sizes.small};
            color: ${theme.colors.text.secondary};
            line-height: 1.5;
          ">${item.content}</p>
        </div>
      `).join('')}
    </div>
  `,

  comparisonTable: (headers: string[], rows: string[][], theme: UnifiedTheme) => `
    <div class="table-wrapper" style="
      overflow-x: auto;
      margin: ${theme.spacing.lg} 0;
      border-radius: ${theme.effects.borderRadius};
      box-shadow: ${theme.effects.shadow.md};
    ">
      <table style="
        width: 100%;
        border-collapse: collapse;
        background: ${theme.colors.background};
        font-size: ${theme.typography.sizes.body};
      ">
        <thead>
          <tr style="background: ${theme.colors.gradients.primary};">
            ${headers.map(header => `
              <th style="
                padding: ${theme.spacing.md};
                color: ${theme.colors.text.inverse};
                font-weight: ${theme.typography.weights.bold};
                text-align: left;
                border-right: 0.078125vw solid rgba(255,255,255,0.2);
              ">${header}</th>
            `).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map((row, index) => `
            <tr style="
              background: ${index % 2 === 0 ? theme.colors.background : theme.colors.surface};
            ">
              ${row.map((cell, cellIndex) => `
                <td style="
                  padding: ${theme.spacing.md};
                  color: ${cellIndex === 0 ? theme.colors.primary : theme.colors.text.primary};
                  font-weight: ${cellIndex === 0 ? theme.typography.weights.medium : theme.typography.weights.regular};
                  border-right: 0.078125vw solid rgba(0,0,0,0.1);
                  border-bottom: 0.078125vw solid rgba(0,0,0,0.1);
                ">${cell}</td>
              `).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `,

  visualChart: (type: 'pie' | 'bar' | 'line', data: unknown, theme: UnifiedTheme) => `
    <div class="chart-container" style="
      background: ${theme.colors.surface};
      border-radius: ${theme.effects.borderRadius};
      padding: ${theme.spacing.lg};
      box-shadow: ${theme.effects.shadow.md};
      margin: ${theme.spacing.lg} 0;
      text-align: center;
    ">
      <div style="
        font-size: ${theme.typography.sizes.caption};
        color: ${theme.colors.text.secondary};
        margin-bottom: ${theme.spacing.md};
      ">
        <i class="fas fa-chart-${type}"></i> ${(data as { title?: string }).title || 'Chart'}
      </div>
      <!-- Chart visualization would go here -->
      <div style="
        height: 15.625vw;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, ${theme.colors.surface} 0%, ${theme.colors.background} 100%);
        border-radius: ${theme.effects.borderRadius};
      ">
        <span style="
          font-size: ${theme.typography.sizes.body};
          color: ${theme.colors.text.secondary};
        ">Chart: ${(data as { description?: string }).description || 'Data visualization'}</span>
      </div>
    </div>
  `,
};

// 静的スタイル（アニメーションなし）
export const STATIC_STYLES = `
  /* 情報密度と視覚的階層に特化したスタイル */
  .slide-inner {
    width: 100%;
    height: 100%;
  }
  
  .content-grid {
    display: grid;
    gap: 1.25vw;
  }
  
  .data-visualization {
    background: rgba(0, 0, 0, 0.02);
    border-radius: 0.625vw;
    padding: 1.25vw;
  }
  
  .emphasis-box {
    border-left: 0.3125vw solid;
    padding-left: 1.25vw;
  }
`;

// テーマ適用関数
export function applyTheme(template: string, theme: UnifiedTheme, variables: Record<string, string> = {}): string {
  let result = template;
  
  // テーマ変数の置換
  Object.entries(theme.colors).forEach(([key, value]) => {
    if (typeof value === 'string') {
      result = result.replace(new RegExp(`{colors.${key}}`, 'g'), value);
    } else {
      Object.entries(value).forEach(([subKey, subValue]) => {
        result = result.replace(new RegExp(`{${key}.${subKey}}`, 'g'), subValue as string);
      });
    }
  });
  
  // タイポグラフィの置換
  Object.entries(theme.typography.sizes).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{sizes.${key}}`, 'g'), value);
  });
  
  Object.entries(theme.typography.weights).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{weights.${key}}`, 'g'), value.toString());
  });
  
  // スペーシングの置換
  Object.entries(theme.spacing).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{spacing.${key}}`, 'g'), value);
  });
  
  // エフェクトの置換
  Object.entries(theme.effects).forEach(([key, value]) => {
    if (typeof value === 'string') {
      result = result.replace(new RegExp(`{effects.${key}}`, 'g'), value);
    } else {
      Object.entries(value).forEach(([subKey, subValue]) => {
        result = result.replace(new RegExp(`{effects.${key}.${subKey}}`, 'g'), subValue as string);
      });
    }
  });
  
  // カスタム変数の置換
  Object.entries(variables).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{${key}}`, 'g'), value);
  });
  
  return result;
}