# AI Slide Generator - アーキテクチャ図

## システム全体のフロー

```mermaid
flowchart TB
    subgraph "フロントエンド"
        UI[ユーザーインターフェース]
        TP[タスク詳細ページ]
        APD[エージェント進捗表示]
    end

    subgraph "APIレイヤー"
        SA[Slides API<br/>/api/v1/slides]
        TA[Tasks API<br/>/api/v1/tasks/[taskId]]
        TS[タスクストレージ<br/>グローバルシングルトン]
    end

    subgraph "エージェントシステム"
        CA[CoordinatorAgent<br/>全体調整]
        PA[PlannerAgent<br/>計画立案]
        RA[ResearchAgent<br/>情報収集]
        WA[WriterAgent<br/>コンテンツ作成]
    end

    subgraph "外部サービス"
        OAI[OpenAI GPT-4o]
        PDF[PDFGenerator]
    end

    UI -->|プロンプト送信| SA
    SA -->|タスクID返却| UI
    UI -->|リダイレクト| TP
    TP -->|ポーリング| TA
    TA -->|進捗情報| APD
    
    SA --> TS
    TA --> TS
    
    SA -->|非同期処理| CA
    CA --> PA
    CA --> RA
    CA --> WA
    
    PA --> OAI
    RA --> OAI
    WA --> OAI
    
    CA -->|完成後| PDF
    PDF -->|保存| TS
```

## エージェント間の通信フロー

```mermaid
sequenceDiagram
    participant C as CoordinatorAgent
    participant P as PlannerAgent
    participant R as ResearchAgent
    participant W as WriterAgent
    participant S as AgentState

    Note over C: Phase 1: Planning
    C->>P: リサーチ計画を作成してください
    P->>P: createResearchPlan()
    P-->>C: ResearchPlan
    C->>P: 計画の評価
    P->>P: evaluatePlanCompleteness()
    P-->>C: 評価結果
    C->>S: 計画を保存

    Note over C: Phase 2: Research (並列実行)
    par 各セクションのリサーチ
        C->>R: セクション1のリサーチ
        R-->>C: リサーチ結果1
    and
        C->>R: セクション2のリサーチ
        R-->>C: リサーチ結果2
    and
        C->>R: セクション3のリサーチ
        R-->>C: リサーチ結果3
    end
    C->>S: リサーチ結果を保存

    Note over C: Phase 3: Writing (並列実行)
    par 各セクションのスライド作成
        C->>W: セクション1のスライド作成
        W-->>C: スライド1
    and
        C->>W: セクション2のスライド作成
        W-->>C: スライド2
    and
        C->>W: セクション3のスライド作成
        W-->>C: スライド3
    end
    C->>S: ドラフトを保存

    Note over C: Phase 4: Finalization
    C->>W: トランジション生成
    W-->>C: トランジション文
    C->>S: 最終スライドを保存
```

## エージェントの状態管理

```mermaid
stateDiagram-v2
    [*] --> Initializing: タスク開始
    Initializing --> Planning: 初期化完了
    
    state Planning {
        [*] --> CreatingPlan: 計画作成
        CreatingPlan --> EvaluatingPlan: 計画完成
        EvaluatingPlan --> RefiningPlan: 改善必要
        EvaluatingPlan --> [*]: 承認
        RefiningPlan --> EvaluatingPlan: 改善完了
    }
    
    Planning --> Researching: 計画承認
    
    state Researching {
        [*] --> ParallelResearch: 並列リサーチ開始
        ParallelResearch --> QualityCheck: 全セクション完了
        QualityCheck --> [*]: 品質OK
        QualityCheck --> AdditionalResearch: 品質不足
        AdditionalResearch --> QualityCheck: 追加完了
    }
    
    Researching --> Writing: リサーチ完了
    
    state Writing {
        [*] --> ParallelWriting: 並列執筆開始
        ParallelWriting --> ContentReview: 全スライド作成
        ContentReview --> [*]: レビュー完了
    }
    
    Writing --> Finalizing: 執筆完了
    
    state Finalizing {
        [*] --> GeneratingTransitions: トランジション生成
        GeneratingTransitions --> AddingMetadata: メタデータ追加
        AddingMetadata --> [*]: 完了
    }
    
    Finalizing --> Completed: 最終化完了
    Completed --> [*]
```

## データ構造

```mermaid
classDiagram
    class AgentState {
        +Message[] messages
        +ResearchPlan currentPlan
        +ResearchResult[] researchResults
        +SlideDraft[] drafts
        +SlideDocument finalSlides
        +string[] errors
    }

    class ResearchPlan {
        +string id
        +string objective
        +PlanSection[] sections
        +Date createdAt
        +string status
    }

    class PlanSection {
        +string id
        +string title
        +string description
        +string[] researchQueries
        +string[] expectedContent
        +string priority
    }

    class ResearchResult {
        +string id
        +string sectionId
        +string content
        +number confidence
        +Source[] sources
        +Date timestamp
    }

    class SlideDocument {
        +string title
        +SlideData[] slides
        +Metadata metadata
        +string created_at
    }

    class SlideData {
        +string id
        +string title
        +string content
        +string type
        +string speakerNotes
    }

    AgentState --> ResearchPlan
    AgentState --> ResearchResult
    AgentState --> SlideDocument
    ResearchPlan --> PlanSection
    ResearchResult --> Source
    SlideDocument --> SlideData
    SlideDocument --> Metadata
```

## フロントエンドのコンポーネント構成

```mermaid
graph TB
    subgraph "ページコンポーネント"
        HP[Home Page<br/>/]
        TP[Task Detail Page<br/>/tasks/[taskId]]
        SP[Slide View Page<br/>/slides/[taskId]]
    end

    subgraph "UIコンポーネント"
        APD[AgentProgressDisplay]
        PB[ProgressBar]
        AS[AgentStatus]
        ML[MessageLog]
    end

    HP -->|タスク作成| TP
    TP --> APD
    APD --> PB
    APD --> AS
    APD --> ML
    TP -->|完了時| SP
```

## API通信フロー

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant F as フロントエンド
    participant SA as Slides API
    participant TA as Tasks API
    participant TS as TaskStorage
    participant AG as エージェント群

    U->>F: プロンプト入力
    F->>SA: POST /api/v1/slides
    SA->>TS: createTask()
    SA->>AG: 非同期処理開始
    SA-->>F: { task_id }
    F->>F: /tasks/[taskId]へ遷移
    
    loop ポーリング (1秒間隔)
        F->>TA: GET /api/v1/tasks/[taskId]
        TA->>TS: getTask()
        TS-->>TA: Task with agentProgress
        TA-->>F: 進捗情報
        F->>F: 進捗表示更新
    end
    
    AG->>TS: updateTask(進捗)
    AG->>TS: updateTask(完了)
    
    F->>TA: GET /api/v1/tasks/[taskId]
    TA-->>F: { status: "completed", view_url }
    F->>F: /slides/[taskId]へ遷移
```