## 企画書

### 1. 背景

膨大な調査・資料作成工数を削減し、誰でも短時間で高品質なスライドを生成できる環境が求められている。Genspark のような“インテント駆動”型 AI スライドジェネレーターのUXを参考に、オープンソーススタック（LangChain × マルチLLM × ツール群）で自社向けソリューションを構築する。

### 2. 目的

* **企画/営業/開発**各部門が口頭または簡易プロンプトから即時に企画書・提案書・報告書を生成できる基盤を整備。
* 生成後も自然言語でリアルタイム編集が可能な“対話型ドキュメント”を提供。
* 情報収集・要約・アウトライン・ビジュアル化まで一気通貫で自動化し、作業工数を 70% 以上削減。

### 3. 到達目標（KPI）

| 項目           | 現状   | 目標        | 計測方法          |
| ------------ | ---- | --------- | ------------- |
| 1案件あたり資料作成時間 | 4〜6h | **1h以内**  | Notion での工数ログ |
| 部門横断利用率      | 0%   | **80%**   | 週次アンケート       |
| スライド品質満足度    | -    | **90%以上** | 5段階CS調査       |

### 4. 機能要件

1. **インプット解析**: 日本語・英語プロンプト、URL、PDF、表計算を受付。
2. **リサーチ連携**: SerpAPI, PubMed, NotePM など外部/社内データ検索。
3. **自動要約 & ストーリー化**: GPT‑4o + Gemini によるMap‑Reduce要約 → JSONアウトライン生成。
4. **ビジュアル生成**: Matplotlibチャート、DALL·E 画像、社内アイコンライブラリ。
5. **レイアウト/テーマ**: **Next.js 14 (App Router)** + Tailwind CSS + pptxgenJS でブランドカラー即反映。
6. **エクスポート**: Web (React), PDF, PPTX の同時出力。
7. **対話的リファイン**: Chat UI から差分指示→即再描画。
8. **ガバナンス**: Strict JSON & Guardrails による安全出力。社内APIキー管理。

### 5. 技術構成

```mermaid
flowchart TD
  A[ユーザープロンプト] --> B[PlannerAgent<br>(GPT‑4o)]
  B --> C{LangGraph DAG}
  C -->|非同期| D[ResearchAgent]
  C -->|非同期| E[SummarizeMap]
  E --> F[SummarizeReduce]
  F --> G[OutlineAgent]
  G -->|非同期| H[VisualAgent]
  H --> I[TemplateSelector]
  I --> J[LayoutMapper]
  J -->|並列| K1[PDF Export]
  J -->|並列| K2[PPTX Export]
  J -->|並列| K3[Web Embed]
```

### 5-1. 技術要件定義（詳細）

| 要件        | 内容                                             | 指標/目標                      |
| --------- | ---------------------------------------------- | -------------------------- |
| 同時利用ユーザ   | 100 ユーザ（社内想定）                                  | P95 レイテンシ 60 秒以内           |
| 入力許容サイズ   | 最大 20 MB / 100 ページ PDF, 1 000 行 CSV            | Map-Reduce 分割 1 000 トークン単位 |
| API コスト上限 | GPT‑4o 50 万 tok / 月GPT‑3.5 Turbo 300 万 tok / 月 | 低コストモデル自動ルーティング            |
| 可用性       | 99.5 % / 月                                     | 冗長化 + キュー再試行               |
| セキュリティ    | VPC 内推論・SAML SSO・PII マスキング                     | 監査ログ 365 日保持               |

### 5-2. インターフェース仕様

#### (A) ユーザー向け REST API

* **POST /api/v1/slides** – スライド生成要求

  ```jsonc
  {
    "prompt": "海外市場の動向をまとめて",
    "files": [
      { "name": "report.pdf", "url": "https://…" }
    ],
    "lang": "ja",
    "formats": ["pdf", "pptx", "web"]
  }
  ```

  **200 Response**

  ```json
  { "task_id": "uuid", "status": "queued" }
  ```

* **GET /api/v1/tasks/{task\_id}** – 進捗取得

  * `status` = queued / running / completed / failed
  * `download_urls` に PDF・PPTX S3 URL

#### (B) 内部マイクロサービス間

| Channel              | プロトコル                    | Schema                   | 方向              |
| -------------------- | ------------------------ | ------------------------ | --------------- |
| Planner → Research   | Kafka `research.req`     | `{task_id, query}`       | fire‑and‑forget |
| Research → Summarize | S3 `raw/{task_id}/*.txt` | プレーンテキスト                 | pull            |
| Summarize → Outline  | gRPC `SummarizeResult`   | `{task_id, summaries[]}` | sync            |
| Outline → Visual     | Redis Queue              | `{task_id, slide_json}`  | async           |
| Layout → Exporter    | Local call (python‑pptx) | `SlideDeck` obj.         | sync            |

#### (C) Tool 呼び出し JSON スキーマ（一例）

```json
{
  "tool": "chart_gen",
  "args": {
    "data": [
      ["Year", "Sales"],
      [2021, 120.5],
      [2022, 158.2]
    ],
    "kind": "line"
  }
}
```

> すべての Tool は **idempotent / side‑effect‑free** 規約。リトライ時は同一 `task_id` + `step_id` で再実行。

---

### 5-3. MVP 要件定義（スケーラビリティ無視版）

| 項目           | 必須条件                                         | 備考                                           |
| ------------ | -------------------------------------------- | -------------------------------------------- |
| 同時ユーザ数       | **1 人**                                      | 単一リクエスト処理。開発者ローカル環境で完結                       |
| 依存クラウド       | **なし**                                       | 全処理を **ローカル Node.js 実行**で完結。外部APIは OpenAI のみ |
| 入力形式         | PDF or プレーンテキスト 1 ファイル                       | 最大 5 MB / 50 ページ想定                           |
| 出力形式         | PDF スライドのみ                                   | PPTX/Web は後回し                                |
| リサーチ機能       | **不要**                                       | アップロード資料のみに限定（外部検索を切る）                       |
| 画像生成         | プレースホルダ画像 (`https://picsum.photos/1280/720`) | デザイントーン検証用に固定画像                              |
| LangChain 利用 | **必須**                                       | LangGraph DAG + Tool 連携をフル実装                 |
| LLM モデル      | **GPT‑4o (最高精度)**                            | コストは気にせず品質最優先。LangChain DAG 全ステージで多段推論       |
| 非同期処理        | **未実装**                                      | 全フェーズ逐次実行で OK                                |
| UI           | simple **Next.js 14** アプリ (App Router)       | ファイルアップロード＋プロンプト入力＋ダウンロードボタン                 |
| Guardrails   | 簡易 JSON スキーマ検証のみ                             | Pydantic で Slide JSON をバリデーション               |

>

---

### 5-4. フロントエンド技術スタック

* **Next.js 14**（App Router, `src/` ディレクトリ構成）
* TypeScript + ESLint + Prettier
* Tailwind CSS / shadcn/ui コンポーネント
* React Server Components で LLM 呼び出しのストリーミング表示
* Vercel Edge Functions or Cloud Run 部署（開発時は `next dev` / `bun` ベース）

---

### 7. 体制案

| 役割         | 人月  | 主担当 |
| ---------- | --- | --- |
| PM/PL      | 1.0 | ○○  |
| LLM基盤エンジニア | 2.0 | △△  |
| フロントエンド    | 1.5 | □□  |
| データエンジニア   | 0.5 | ◎◎  |
| UXリサーチ     | 0.3 | ◆◆  |

### 8. 予算概算

| 区分                | 金額/月        | 備考                     |
| ----------------- | ----------- | ---------------------- |
| OpenAI/Gemini API | 40万円        | GPT‑4o 100万 token/日 想定 |
| Cloud (GPU含む)     | 15万円        | Vertex AI, Lambda GPU  |
| 人件費 (4人)          | 250万円       | 社内コスト換算                |
| 予備費               | 20万円        | 10% 想定                 |
| **合計**            | **325万円/月** | 3.5か月 ≒ 1,138万円        |

### 9. リスク & 対策

| リスク        | 影響 | 対策                 |
| ---------- | -- | ------------------ |
| LLM 出力の誤情報 | 高  | 自動ファクトチェック、二重モデル比較 |
| API コスト高騰  | 中  | 低コストモデル併用、キャッシュ機構  |
| 社内データ漏洩    | 高  | VPC内推論、機密ラベリング     |
| レイアウト崩れ    | 中  | PPTXエクスポートのQA自動テスト |

### 10. 成功指標

* 2026/Q1 までに社内利用部門 3→10 部門へ拡大
* 平均資料作成時間 70% 削減達成
* AI 生成資料の平均満足度 4.5 / 5 以上

---

## セットアップ手順

### 環境変数の設定

1. **OpenRouterアカウントの作成**
   - [OpenRouter](https://openrouter.ai/)でアカウントを作成
   - APIキーを取得

2. **環境変数ファイルの作成**
   ```bash
   cd frontend
   cp .env.local.example .env.local
   ```

3. **.env.localの編集**
   ```env
   # OpenRouter API Key
   OPENROUTER_API_KEY=your-openrouter-api-key-here
   
   # Next.js環境変数
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   
   # 開発環境設定
   NODE_ENV=development
   ```

### 開発環境の起動

```bash
cd frontend
bun install
bun run dev
```

アプリケーションが http://localhost:3000 で起動します。

### 使用可能なモデル

OpenRouter経由で以下のモデルが利用可能です：
- GPT-4o (openai/gpt-4o)
- GPT-4 Turbo (openai/gpt-4-turbo)
- Claude 3 Opus (anthropic/claude-3-opus)
- Claude 3 Sonnet (anthropic/claude-3-sonnet)
- その他多数のLLMモデル

モデルの変更は `frontend/src/lib/agents/types.ts` の `DEFAULT_AGENT_CONFIG` で設定できます。

---

*以上、企画書案です。フィードバック・追記箇所があればお知らせください。*
