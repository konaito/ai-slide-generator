# AI Slide Generator - 技術スタック

## 現在のスライド生成技術

### 1. PDF生成
- **ライブラリ**: `jsPDF`
- **特徴**:
  - 横向きA4サイズでPDF生成
  - プログラマティックにテキストと図形を配置
  - 日本語フォント非対応（文字化け問題あり）
  - 各スライドタイプに応じた装飾（カラーバー）

### 2. HTMLスライドビュー
- **技術**: React + Tailwind CSS
- **特徴**:
  - SPAとして実装（Next.js App Router）
  - レスポンシブデザイン
  - 16:9のアスペクト比
  - キーボードナビゲーション（矢印キー対応）
  - スライドタイプごとのビジュアル装飾

### 3. スライドデータ構造
```typescript
interface SlideData {
  id?: string;
  title: string;
  content?: string;
  type: 'title' | 'content' | 'image' | 'chart';
  image_url?: string;
  chart_data?: unknown;
  speakerNotes?: string;
}
```

### 4. 表示形式の比較

| 機能 | PDF | HTML |
|------|-----|------|
| 日本語対応 | ❌ 文字化け | ✅ 完全対応 |
| インタラクティブ | ❌ 静的 | ✅ ナビゲーション可能 |
| オフライン利用 | ✅ ダウンロード可能 | ❌ オンライン必須 |
| プレゼンモード | ❌ | ✅ フルスクリーン対応 |
| 共有性 | ✅ ファイル共有 | ✅ URL共有 |

## スタイリング技術

### Tailwind CSS
- **バージョン**: v4（最新）
- **使用例**:
  ```jsx
  // タイトルスライドのスタイリング
  <div className="bg-white text-gray-900 rounded-lg shadow-2xl p-16 aspect-[16/9] flex flex-col justify-center items-center text-center">
    <div className="absolute top-0 left-0 w-full h-2 bg-blue-600 rounded-t-lg"></div>
    <h1 className="text-6xl font-bold mb-8">{slide.title}</h1>
  </div>
  ```

### デザインシステム
- **カラーパレット**:
  - タイトルスライド: 青（blue-600）
  - コンテンツスライド: 緑（green-500）
  - 背景: グレー（gray-900）
  - テキスト: 白/黒のコントラスト

## プレゼンテーション機能

### 現在実装済み
1. **キーボードナビゲーション**
   - `←` : 前のスライド
   - `→` : 次のスライド
   - `Escape` : ホームに戻る

2. **スライドインジケーター**
   - ドットナビゲーション
   - スライド番号表示（例: 3/10）

3. **レスポンシブデザイン**
   - 画面サイズに応じて自動調整
   - モバイルでも閲覧可能

### 未実装の機能
- スピーカーノートの表示
- プレゼンタービュー
- アニメーション/トランジション
- 画像・チャートの実装（現在プレースホルダー）
- PDFエクスポート時の日本語対応

## アーキテクチャの利点

### 1. 分離された関心事
- **データ生成**: エージェントシステム（GPT-4o）
- **表示**: React コンポーネント
- **スタイリング**: Tailwind CSS
- **永続化**: PDF（オプション）

### 2. 拡張性
- 新しいスライドタイプの追加が容易
- テーマシステムの実装可能
- エクスポート形式の追加（PowerPoint等）

### 3. パフォーマンス
- クライアントサイドレンダリング
- 軽量なHTMLビュー
- 必要に応じてPDF生成

## 今後の技術的改善案

1. **PDF日本語対応**
   - `pdfmake` や `PDFKit` への移行
   - カスタムフォントの埋め込み

2. **リッチコンテンツ**
   - Markdown パーサーの統合
   - Chart.js による動的グラフ
   - 画像アップロード・表示

3. **プレゼン機能強化**
   - WebSocketによるリモートコントロール
   - 録画・配信機能
   - アニメーション効果

4. **エクスポート形式**
   - PowerPoint (PPTX)
   - Keynote
   - Google Slides連携