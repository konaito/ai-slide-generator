# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

このリポジトリは、LangChain × GPT-4oを使用したAIスライド生成ツールです。ユーザーがプロンプトやファイルをアップロードすることで、企画書・提案書・報告書を自動生成し、PDF形式で出力します。

## 主要なコマンド

### 開発環境のセットアップと実行
```bash
cd frontend
bun install      # 依存関係のインストール
bun run dev      # 開発サーバー起動 (http://localhost:3000)
```

### ビルドとテスト
```bash
cd frontend
bun run build    # プロダクションビルド
bun run test     # Playwrightテスト実行
```

## アーキテクチャ概要

### 技術スタック
- **フレームワーク**: Next.js 14 (App Router)
- **パッケージマネージャー**: Bun
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **PDF生成**: jsPDF
- **AI/LLM**: LangChain + OpenAI GPT-4o
- **テスト**: Playwright

### ディレクトリ構造
```
frontend/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── api/v1/       # API エンドポイント
│   │   │   ├── slides/   # スライド生成API
│   │   │   └── tasks/    # タスク管理API
│   │   └── uploads/      # ファイルアップロードAPI
│   ├── lib/              # ビジネスロジック
│   │   ├── slideGenerator.ts  # LangChain統合
│   │   ├── pdfGenerator.ts    # PDF生成
│   │   └── taskStorage.ts     # タスク管理
│   └── types/            # TypeScript型定義
└── tests/                # テストファイル
```

### 主要なAPI

1. **POST /api/v1/slides** - スライド生成リクエスト
   - プロンプトとファイルを受け取り、タスクIDを返す
   - 非同期でスライド生成を開始

2. **GET /api/v1/tasks/[taskId]** - タスク状態の確認
   - 生成の進捗状況を取得
   - 完了時にはダウンロードURLを含む

3. **POST /uploads/[filename]** - ファイルアップロード
   - アップロードされたファイルを一時的に保存

### スライド生成フロー

1. ユーザーがプロンプトとファイルをアップロード
2. LangChainを使用してGPT-4oでコンテンツを生成
3. 生成されたコンテンツをjsPDFでPDF化
4. 生成完了後、ダウンロードリンクを提供

### 環境変数

開発時は`.env.local`に以下の環境変数を設定:
```
OPENAI_API_KEY=your-api-key
```

### 開発時の注意事項

- **パッケージマネージャー**: Bunを使用（npm/yarn/pnpmは使用しない）
- **開発サーバー**: ユーザーが手動で起動するため、自動実行しない
  - **重要**: `bun run dev`コマンドは絶対に実行しない（ユーザーから明示的に要求された場合のみ）
- **MVP版の制限**: 
  - ローカル実行のみ
  - 同時ユーザー数: 1人
  - PDF出力のみ（PPTX/Web出力は未実装）
  - リサーチ機能なし（アップロードファイルのみ）