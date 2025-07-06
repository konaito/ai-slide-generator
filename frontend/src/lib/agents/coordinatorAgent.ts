import { PlannerAgent } from './plannerAgent';
import { ResearchAgent } from './researchAgent';
import { WriterAgent } from './writerAgent';
import { 
  AgentState, 
  ResearchPlan, 
  ResearchResult,
  SlideDraft,
  SlideDocument,
  SlideData,
  Message,
  AgentType
} from './types';
import { v4 as uuidv4 } from 'uuid';

export class CoordinatorAgent {
  private plannerAgent: PlannerAgent;
  private researchAgent: ResearchAgent;
  private writerAgent: WriterAgent;
  private state: AgentState;
  private maxIterations: number = 20;

  constructor() {
    this.plannerAgent = new PlannerAgent();
    this.researchAgent = new ResearchAgent();
    this.writerAgent = new WriterAgent();
    this.state = this.initializeState();
  }

  private initializeState(): AgentState {
    return {
      messages: [],
      currentPlan: null,
      researchResults: [],
      drafts: [],
      finalSlides: null,
      errors: [],
    };
  }

  private addMessage(from: AgentType, to: AgentType, content: string, metadata?: any) {
    const message: Message = {
      id: uuidv4(),
      from,
      to,
      content,
      timestamp: new Date(),
      metadata,
    };
    this.state.messages.push(message);
    console.log(`[${from} -> ${to}] ${content}`);
  }

  async generateSlides(prompt: string, fileContent?: string): Promise<SlideDocument> {
    try {
      // フェーズ1: 初期リサーチ
      console.log('\n=== Phase 1: Initial Research ===');
      await this.initialResearchPhase(prompt, fileContent);

      // フェーズ2: 構成立案
      console.log('\n=== Phase 2: Planning with Context ===');
      await this.planningPhase(prompt, fileContent);

      // フェーズ3: 詳細リサーチ
      console.log('\n=== Phase 3: Detailed Research ===');
      await this.detailedResearchPhase(fileContent);

      // フェーズ4: 構成割り振り
      console.log('\n=== Phase 4: Content Allocation ===');
      await this.contentAllocationPhase();

      // フェーズ5: コンテンツ作成
      console.log('\n=== Phase 5: Writing ===');
      await this.writingPhase();

      // フェーズ6: 最終化
      console.log('\n=== Phase 6: Finalization ===');
      await this.finalizationPhase();

      if (!this.state.finalSlides) {
        throw new Error('スライドの生成に失敗しました');
      }

      return this.state.finalSlides;

    } catch (error) {
      console.error('[CoordinatorAgent] Error:', error);
      this.state.errors.push(error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  private async initialResearchPhase(prompt: string, fileContent?: string): Promise<void> {
    this.addMessage('coordinator', 'researcher', '初期リサーチを実施してください');

    // トピックについての基本的な情報収集
    const initialQuery = {
      id: uuidv4(),
      title: '初期調査',
      description: 'トピック全体の概要と重要なポイントを把握',
      researchQueries: [prompt],
      expectedContent: ['概要', '主要トピック', '重要な側面'],
      priority: 'high' as const,
    };

    const initialResults = await this.researchAgent.conductResearch(
      initialQuery,
      fileContent
    );

    // 初期リサーチ結果を保存
    this.state.initialResearchResults = initialResults;
    
    this.addMessage('researcher', 'coordinator', 
      `初期リサーチ完了: ${initialResults.length}件の結果`
    );
  }

  private async planningPhase(prompt: string, fileContent?: string): Promise<void> {
    this.addMessage('coordinator', 'planner', '初期リサーチ結果を踏まえて構成を立案してください');

    // 初期リサーチ結果のコンテキストを作成
    const initialContext = this.state.initialResearchResults
      ?.map(r => r.summary)
      .join('\n\n') || '';

    // 初期計画の作成（初期リサーチ結果を考慮）
    const contextualPrompt = `${prompt}\n\n初期リサーチ結果:\n${initialContext}`;
    const initialPlan = await this.plannerAgent.createResearchPlan(contextualPrompt, fileContent);
    this.state.currentPlan = initialPlan;

    // 計画の評価
    const evaluation = await this.plannerAgent.evaluatePlanCompleteness(initialPlan);
    
    if (!evaluation.isComplete && evaluation.suggestions.length > 0) {
      this.addMessage('coordinator', 'planner', '計画を改善してください', {
        suggestions: evaluation.suggestions
      });

      // 計画の改善
      const refinedPlan = await this.plannerAgent.refinePlan(
        initialPlan,
        evaluation.suggestions.join('\n')
      );
      this.state.currentPlan = refinedPlan;
    }

    this.state.currentPlan!.status = 'approved';
    this.addMessage('planner', 'coordinator', '計画が承認されました');
  }

  private async detailedResearchPhase(fileContent?: string): Promise<void> {
    if (!this.state.currentPlan) {
      throw new Error('リサーチ計画が存在しません');
    }

    const plan = this.state.currentPlan;
    
    // 全セクションのリサーチを並列実行
    const researchPromises = plan.sections.map(async (section) => {
      this.addMessage('coordinator', 'researcher', 
        `「${section.title}」のリサーチを開始してください`
      );

      const sectionResults = await this.researchAgent.conductResearch(
        section,
        fileContent
      );

      return sectionResults;
    });

    // 全てのリサーチ結果を待機
    const allResults = await Promise.all(researchPromises);
    
    // 結果をフラット化して保存
    this.state.researchResults = allResults.flat();

    // リサーチ品質の評価
    const qualityEvaluation = await this.researchAgent.evaluateResearchQuality(
      this.state.researchResults
    );

    if (qualityEvaluation.overallQuality < 0.7) {
      console.warn('[CoordinatorAgent] Research quality is below threshold:', 
        qualityEvaluation.overallQuality
      );
      // 追加リサーチが必要な場合の処理
    }

    this.addMessage('researcher', 'coordinator', 
      `詳細リサーチ完了: ${this.state.researchResults.length}件の結果`
    );
  }

  private async contentAllocationPhase(): Promise<void> {
    if (!this.state.currentPlan || this.state.researchResults.length === 0) {
      throw new Error('構成割り振りに必要な情報が不足しています');
    }

    this.addMessage('coordinator', 'planner', 'リサーチ結果を各セクションに割り振ってください');

    const allocations: ContentAllocation[] = [];

    // 各セクションに対してコンテンツを割り振る
    for (const section of this.state.currentPlan.sections) {
      // セクションに関連するリサーチ結果を収集
      const sectionResults = this.state.researchResults.filter(
        r => r.sectionId === section.id
      );

      // 初期リサーチ結果も考慮
      const relevantInitialResults = this.state.initialResearchResults?.filter(
        r => this.isRelevantToSection(r.summary, section)
      ) || [];

      // コンテンツの構造化
      const allocation: ContentAllocation = {
        sectionId: section.id,
        allocatedContent: {
          mainPoints: this.extractMainPoints(sectionResults, relevantInitialResults),
          supportingDetails: this.extractSupportingDetails(sectionResults),
          connections: this.identifyConnections(section, this.state.currentPlan.sections),
        },
      };

      allocations.push(allocation);
    }

    this.state.contentAllocation = allocations;
    
    this.addMessage('planner', 'coordinator', 
      `コンテンツ割り振り完了: ${allocations.length}セクション`
    );
  }

  private isRelevantToSection(content: string, section: PlanSection): boolean {
    // セクションのキーワードとの関連性をチェック
    const keywords = [
      ...section.title.toLowerCase().split(' '),
      ...section.expectedContent.map(e => e.toLowerCase()),
    ];
    
    const contentLower = content.toLowerCase();
    return keywords.some(keyword => contentLower.includes(keyword));
  }

  private extractMainPoints(
    sectionResults: ResearchResult[], 
    initialResults: ResearchResult[]
  ): string[] {
    // 主要ポイントを抽出
    const points: string[] = [];
    
    // 高信頼度の結果から主要ポイントを抽出
    const highConfidenceResults = sectionResults
      .filter(r => r.confidence > 0.7)
      .sort((a, b) => b.confidence - a.confidence);
    
    highConfidenceResults.forEach(result => {
      const summaryPoints = result.summary.split('\n').filter(p => p.trim());
      points.push(...summaryPoints.slice(0, 3)); // 各結果から最大3ポイント
    });

    // 初期リサーチからも関連ポイントを追加
    initialResults.forEach(result => {
      const relevantPoints = result.summary.split('\n')
        .filter(p => p.trim() && !points.includes(p));
      points.push(...relevantPoints.slice(0, 2));
    });

    return points.slice(0, 5); // 最大5つの主要ポイント
  }

  private extractSupportingDetails(sectionResults: ResearchResult[]): string[] {
    // サポート詳細を抽出
    const details: string[] = [];
    
    sectionResults.forEach(result => {
      result.sources.forEach(source => {
        if (source.relevanceScore > 0.6) {
          details.push(source.snippet);
        }
      });
    });

    return details.slice(0, 8); // 最大8つの詳細
  }

  private identifyConnections(
    currentSection: PlanSection, 
    allSections: PlanSection[]
  ): string[] {
    // 他のセクションとの関連性を特定
    const connections: string[] = [];
    
    allSections.forEach(section => {
      if (section.id !== currentSection.id) {
        // 共通のキーワードやテーマを探す
        const commonQueries = currentSection.researchQueries.filter(
          q => section.researchQueries.some(sq => 
            sq.toLowerCase().includes(q.toLowerCase()) || 
            q.toLowerCase().includes(sq.toLowerCase())
          )
        );
        
        if (commonQueries.length > 0) {
          connections.push(`${section.title}との関連: ${commonQueries.join(', ')}`);
        }
      }
    });

    return connections;
  }

  private async writingPhase(): Promise<void> {
    if (!this.state.currentPlan) {
      throw new Error('リサーチ計画が存在しません');
    }

    const slides: SlideData[] = [];

    // タイトルスライドの作成
    const titleSlide: SlideData = {
      id: uuidv4(),
      title: this.state.currentPlan.objective,
      content: `${new Date().toLocaleDateString('ja-JP')}`,
      type: 'title',
    };
    slides.push(titleSlide);

    // 目次スライドの作成
    const tocSlide: SlideData = {
      id: uuidv4(),
      title: '目次',
      content: this.state.currentPlan.sections
        .map((s, i) => `${i + 1}. ${s.title}`)
        .join('\n'),
      type: 'content',
    };
    slides.push(tocSlide);

    // 各セクションのスライド作成を並列実行
    const slidePromises = this.state.currentPlan.sections.map(async (section) => {
      this.addMessage('coordinator', 'writer', 
        `「${section.title}」のスライドを作成してください`
      );

      // セクションに関連するリサーチ結果を取得
      const sectionResearch = this.state.researchResults.filter(
        r => r.sectionId === section.id
      );

      // コンテンツ割り振りを取得
      const allocation = this.state.contentAllocation?.find(
        a => a.sectionId === section.id
      );

      // ドラフト作成（割り振られたコンテンツを考慮）
      const draft = await this.writerAgent.createSlideDraftWithAllocation(
        section.id,
        section.title,
        sectionResearch,
        allocation
      );

      this.state.drafts.push(draft);

      // ドラフトをスライドに変換
      const slide = await this.writerAgent.convertToSlide(
        draft,
        'content'
      );
      
      // コンテンツが空の場合はドラフトの内容を使用
      if (!slide.content || slide.content.trim() === '') {
        slide.content = draft.content;
      }

      return slide;
    });

    // 全てのスライド作成を待機
    const contentSlides = await Promise.all(slidePromises);
    slides.push(...contentSlides);

    // まとめスライドの作成
    const conclusionSlide: SlideData = {
      id: uuidv4(),
      title: 'まとめ',
      content: this.state.currentPlan.sections
        .map(s => `• ${s.title}`)
        .join('\n'),
      type: 'conclusion',
    };
    slides.push(conclusionSlide);

    // 一時的にスライドを保存
    this.state.finalSlides = {
      title: this.state.currentPlan.objective,
      slides,
      metadata: {
        researchPlanId: this.state.currentPlan.id,
        totalResearchTime: 0,
        sourcesUsed: this.state.researchResults.reduce(
          (sum, r) => sum + r.sources.length, 0
        ),
        iterations: this.state.messages.length,
      },
      created_at: new Date().toISOString(),
    };

    this.addMessage('writer', 'coordinator', 
      `${slides.length}枚のスライドを作成しました`
    );
  }

  private async finalizationPhase(): Promise<void> {
    if (!this.state.finalSlides) {
      throw new Error('スライドが存在しません');
    }

    // トランジション文の生成
    const transitions = await this.writerAgent.generateTransitions(
      this.state.finalSlides.slides
    );

    // スピーカーノートにトランジションを追加
    this.state.finalSlides.slides.forEach((slide, index) => {
      if (index < transitions.length) {
        slide.speakerNotes = (slide.speakerNotes || '') + 
          '\n\n次のスライドへ: ' + transitions[index];
      }
    });

    // 処理時間の計算
    const startTime = this.state.messages[0]?.timestamp || new Date();
    const endTime = new Date();
    const totalTime = endTime.getTime() - startTime.getTime();

    this.state.finalSlides.metadata.totalResearchTime = totalTime;

    this.addMessage('coordinator', 'coordinator', 
      `スライド生成完了: ${totalTime}ms`
    );
  }

  getState(): AgentState {
    return { ...this.state };
  }

  getProgress(): {
    phase: string;
    completedSteps: number;
    totalSteps: number;
    currentAction: string;
  } {
    const totalSteps = 4; // Planning, Research, Writing, Finalization
    let completedSteps = 0;
    let phase = 'initializing';
    let currentAction = '初期化中...';

    if (this.state.currentPlan) {
      completedSteps = 1;
      phase = 'planning';
      currentAction = '計画立案完了';
    }

    if (this.state.researchResults.length > 0) {
      completedSteps = 2;
      phase = 'researching';
      currentAction = 'リサーチ実行中...';
    }

    if (this.state.drafts.length > 0) {
      completedSteps = 3;
      phase = 'writing';
      currentAction = 'スライド作成中...';
    }

    if (this.state.finalSlides) {
      completedSteps = 4;
      phase = 'completed';
      currentAction = '完了';
    }

    return {
      phase,
      completedSteps,
      totalSteps,
      currentAction,
    };
  }

  getDetailedProgress(): {
    phase: string;
    completedSteps: number;
    totalSteps: number;
    currentAction: string;
    agents: {
      planner: {
        status: 'idle' | 'working' | 'completed';
        lastAction?: string;
        progress?: number;
      };
      researcher: {
        status: 'idle' | 'working' | 'completed';
        lastAction?: string;
        completedSections?: number;
        totalSections?: number;
      };
      writer: {
        status: 'idle' | 'working' | 'completed';
        lastAction?: string;
        completedSlides?: number;
        totalSlides?: number;
      };
    };
    messages: Array<{
      from: string;
      to: string;
      content: string;
      timestamp: Date;
    }>;
  } {
    const basicProgress = this.getProgress();
    
    // 各エージェントの状態を判定
    const plannerStatus = this.state.currentPlan 
      ? 'completed' 
      : this.state.messages.some(m => m.to === 'planner' && !m.metadata?.completed)
        ? 'working' 
        : 'idle';
    
    const researcherStatus = this.state.researchResults.length > 0
      ? 'completed'
      : this.state.messages.some(m => m.to === 'researcher' && !m.metadata?.completed)
        ? 'working'
        : 'idle';
    
    const writerStatus = this.state.finalSlides
      ? 'completed'
      : this.state.drafts.length > 0
        ? 'working'
        : 'idle';

    // 最新のメッセージを取得（最大10件）
    const recentMessages = this.state.messages
      .slice(-10)
      .map(m => ({
        from: m.from,
        to: m.to,
        content: m.content,
        timestamp: m.timestamp,
      }));

    return {
      ...basicProgress,
      agents: {
        planner: {
          status: plannerStatus,
          lastAction: this.state.currentPlan ? '計画立案完了' : '計画立案中...',
          progress: this.state.currentPlan ? 100 : 50,
        },
        researcher: {
          status: researcherStatus,
          lastAction: researcherStatus === 'completed' 
            ? 'リサーチ完了' 
            : researcherStatus === 'working'
              ? 'リサーチ実行中...'
              : '待機中',
          completedSections: this.state.researchResults.length,
          totalSections: this.state.currentPlan?.sections.length || 0,
        },
        writer: {
          status: writerStatus,
          lastAction: writerStatus === 'completed'
            ? 'スライド作成完了'
            : writerStatus === 'working'
              ? 'スライド作成中...'
              : '待機中',
          completedSlides: this.state.drafts.length,
          totalSlides: this.state.currentPlan?.sections.length || 0,
        },
      },
      messages: recentMessages,
    };
  }
}