import { PlannerAgent } from './plannerAgent';
import { ResearchAgent } from './researchAgent';
import { WriterAgent } from './writerAgent';
import { 
  AgentState, 
  ResearchResult,
  SlideDocument,
  SlideData,
  Message,
  AgentType,
  ContentAllocation,
  PlanSection
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

  private addMessage(from: AgentType, to: AgentType, content: string, metadata?: Record<string, unknown>) {
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
    this.addMessage('planner', 'coordinator', `計画が承認されました - ${this.state.currentPlan!.sections.length}セクション、推定${this.state.currentPlan!.sections.reduce((sum, s) => sum + (s.estimatedSlides || 1), 0)}枚のスライド`);
  }

  private async detailedResearchPhase(fileContent?: string): Promise<void> {
    if (!this.state.currentPlan) {
      throw new Error('リサーチ計画が存在しません');
    }

    const plan = this.state.currentPlan;
    
    // 並列実行数を制限（3つずつ）
    const batchSize = 3;
    const allResults: ResearchResult[] = [];
    
    for (let i = 0; i < plan.sections.length; i += batchSize) {
      const batch = plan.sections.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (section) => {
        this.addMessage('coordinator', 'researcher', 
          `「${section.title}」のリサーチを開始してください`
        );

        const sectionResults = await this.researchAgent.conductResearch(
          section,
          fileContent
        );

        return sectionResults;
      });

      // バッチごとに結果を待機
      const batchResults = await Promise.all(batchPromises);
      allResults.push(...batchResults.flat());
    }
    
    // 結果を保存
    this.state.researchResults = allResults;

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

  private isRelevantToSection(content: string | unknown, section: PlanSection): boolean {
    // contentが文字列であることを確認
    const contentStr = typeof content === 'string' ? content : String(content);
    
    // セクションのキーワードとの関連性をチェック
    const keywords = [
      ...section.title.toLowerCase().split(' '),
      ...section.expectedContent.map(e => e.toLowerCase()),
    ];
    
    const contentLower = contentStr.toLowerCase();
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
      // summaryが文字列であることを確認
      const summary = typeof result.summary === 'string' ? result.summary : String(result.summary);
      const summaryPoints = summary.split('\n').filter(p => p.trim());
      points.push(...summaryPoints.slice(0, 3)); // 各結果から最大3ポイント
    });

    // 初期リサーチからも関連ポイントを追加
    initialResults.forEach(result => {
      const summary = typeof result.summary === 'string' ? result.summary : String(result.summary);
      const relevantPoints = summary.split('\n')
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
        const currentQueries = Array.isArray(currentSection.researchQueries) 
          ? currentSection.researchQueries 
          : [];
        const sectionQueries = Array.isArray(section.researchQueries) 
          ? section.researchQueries 
          : [];
          
        const commonQueries = currentQueries.filter(
          q => sectionQueries.some(sq => 
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

    // 各セクションのスライド作成をバッチで実行（メモリ効率のため）
    // Arrow関数を使用してthisのコンテキストを保持
    const contentSlides: SlideData[] = [];
    const batchSize = 2; // 2セクションずつ処理
    
    for (let i = 0; i < this.state.currentPlan.sections.length; i += batchSize) {
      const batch = this.state.currentPlan.sections.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (section) => {
      this.addMessage('coordinator', 'writer', 
        `「${section.title}」のスライドを作成してください（推定${section.estimatedSlides || 1}枚）`
      );

      // セクションに関連するリサーチ結果を取得
      const sectionResearch = this.state.researchResults.filter(
        r => r.sectionId === section.id
      );

      // コンテンツ割り振りを取得
      const allocation = this.state.contentAllocation?.find(
        a => a.sectionId === section.id
      );

      // 情報量に応じてスライド数を決定
      let shouldSplit = false;
      try {
        shouldSplit = this.shouldSplitIntoMultipleSlides(
          sectionResearch, 
          allocation, 
          section
        );
      } catch (error) {
        console.error('[CoordinatorAgent] Error checking split:', error);
        // エラー時はデフォルト動作（単一スライド）
        shouldSplit = false;
      }

      if (shouldSplit) {
        // 複数スライドに分割
        return await this.createMultipleSlidesForSection(
          section,
          sectionResearch,
          allocation
        );
      } else {
        // 単一スライドとして作成
        const draft = await this.writerAgent.createSlideDraftWithAllocation(
          section.id,
          section.title,
          sectionResearch,
          allocation
        );

        this.state.drafts.push(draft);

        const slide = await this.writerAgent.convertToSlide(
          draft,
          'content'
        );
        
        if (!slide.content || slide.content.trim() === '') {
          slide.content = draft.content;
        }

        return [slide];
      }
      });

      // バッチごとにスライド作成を待機
      const batchSlidesArrays = await Promise.all(batchPromises);
      const batchSlides = batchSlidesArrays.flat();
      contentSlides.push(...batchSlides);
    }
    
    // 作成したスライドを追加
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
    const totalSteps = 6; // Initial Research, Planning, Detailed Research, Allocation, Writing, Finalization
    let completedSteps = 0;
    let phase = 'initializing';
    let currentAction = '初期化中...';

    if (this.state.initialResearchResults && this.state.initialResearchResults.length > 0) {
      completedSteps = 1;
      phase = 'initial_research';
      currentAction = '初期リサーチ完了';
    }

    if (this.state.currentPlan) {
      completedSteps = 2;
      phase = 'planning';
      currentAction = '構成立案完了';
    }

    if (this.state.researchResults.length > 0) {
      completedSteps = 3;
      phase = 'detailed_research';
      currentAction = '詳細リサーチ完了';
    }

    if (this.state.contentAllocation && this.state.contentAllocation.length > 0) {
      completedSteps = 4;
      phase = 'content_allocation';
      currentAction = 'コンテンツ割り振り完了';
    }

    if (this.state.drafts.length > 0) {
      completedSteps = 5;
      phase = 'writing';
      currentAction = 'スライド作成中...';
    }

    if (this.state.finalSlides) {
      completedSteps = 6;
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

  private shouldSplitIntoMultipleSlides(
    research: ResearchResult[],
    allocation?: ContentAllocation,
    section?: PlanSection
  ): boolean {
    // 情報量の判定基準
    const mainPointsCount = allocation?.allocatedContent.mainPoints.length || 0;
    const detailsCount = allocation?.allocatedContent.supportingDetails.length || 0;
    const totalInfoPoints = mainPointsCount + detailsCount;
    
    // 推定スライド数が2以上
    if (section?.estimatedSlides && section.estimatedSlides >= 2) {
      return true;
    }
    
    // 情報量が多い（5ポイント以上）
    if (totalInfoPoints >= 5) {
      return true;
    }
    
    // 優先度が高く、リサーチ結果が豊富
    if (section?.priority === 'high' && research.length >= 3) {
      return true;
    }
    
    return false;
  }

  private async createMultipleSlidesForSection(
    section: PlanSection,
    research: ResearchResult[],
    allocation?: ContentAllocation
  ): Promise<SlideData[]> {
    const slides: SlideData[] = [];
    const mainPoints = allocation?.allocatedContent.mainPoints || [];
    const supportingDetails = allocation?.allocatedContent.supportingDetails || [];
    
    // メインポイントを分割
    const pointsPerSlide = Math.ceil(mainPoints.length / (section.estimatedSlides || 2));
    const slideSets: { points: string[]; details: string[] }[] = [];
    
    for (let i = 0; i < mainPoints.length; i += pointsPerSlide) {
      const slidePoints = mainPoints.slice(i, i + pointsPerSlide);
      const slideDetails = supportingDetails.slice(
        i * 2, 
        (i + pointsPerSlide) * 2
      );
      slideSets.push({ points: slidePoints, details: slideDetails });
    }
    
    // 各スライドセットに対してスライドを作成
    for (let i = 0; i < slideSets.length; i++) {
      const slideSet = slideSets[i];
      const slideTitle = slideSets.length > 1 
        ? `${section.title} (${i + 1}/${slideSets.length})`
        : section.title;
      
      // 各サブセクション用の仮想allocation
      const subAllocation: ContentAllocation = {
        sectionId: section.id,
        allocatedContent: {
          mainPoints: slideSet.points,
          supportingDetails: slideSet.details,
          connections: allocation?.allocatedContent.connections || [],
        },
      };
      
      const draft = await this.writerAgent.createSlideDraftWithAllocation(
        section.id,
        slideTitle,
        research.slice(i * 2, (i + 1) * 2), // 関連するリサーチ結果も分割
        subAllocation
      );
      
      this.state.drafts.push(draft);
      
      const slide = await this.writerAgent.convertToSlide(
        draft,
        'content'
      );
      
      if (!slide.content || slide.content.trim() === '') {
        slide.content = draft.content;
      }
      
      slides.push(slide);
    }
    
    return slides;
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
    detailedStats?: {
      totalSections: number;
      estimatedTotalSlides: number;
      actualSlides: number;
      researchQueries: number;
      researchResults: number;
      initialResearchCount: number;
      allocatedContentPoints: number;
    };
  } {
    const basicProgress = this.getProgress();
    
    // フェーズに基づいて各エージェントの状態を判定
    let plannerStatus: 'idle' | 'working' | 'completed' = 'idle';
    let plannerLastAction = '待機中';
    let plannerProgress = 0;
    
    let researcherStatus: 'idle' | 'working' | 'completed' = 'idle';
    let researcherLastAction = '待機中';
    
    let writerStatus: 'idle' | 'working' | 'completed' = 'idle';
    let writerLastAction = '待機中';

    // フェーズごとの状態判定
    switch (basicProgress.phase) {
      case 'initial_research':
        researcherStatus = this.state.initialResearchResults && this.state.initialResearchResults.length > 0 
          ? 'completed' : 'working';
        researcherLastAction = researcherStatus === 'completed' 
          ? '初期リサーチ完了' : '初期リサーチ実行中...';
        break;
        
      case 'planning':
        researcherStatus = 'completed';
        researcherLastAction = '初期リサーチ完了';
        plannerStatus = this.state.currentPlan ? 'completed' : 'working';
        plannerLastAction = plannerStatus === 'completed' 
          ? '構成立案完了' : '初期リサーチ結果を基に構成立案中...';
        plannerProgress = this.state.currentPlan ? 100 : 60;
        break;
        
      case 'detailed_research':
        plannerStatus = 'completed';
        plannerLastAction = '構成立案完了';
        plannerProgress = 100;
        researcherStatus = this.state.researchResults.length > 0 ? 'completed' : 'working';
        researcherLastAction = researcherStatus === 'completed' 
          ? '詳細リサーチ完了' : '各セクションの詳細リサーチ実行中...';
        break;
        
      case 'content_allocation':
        plannerStatus = 'working';
        plannerLastAction = 'コンテンツ割り振り中...';
        plannerProgress = 80;
        researcherStatus = 'completed';
        researcherLastAction = '詳細リサーチ完了';
        break;
        
      case 'writing':
        plannerStatus = 'completed';
        plannerLastAction = 'コンテンツ割り振り完了';
        plannerProgress = 100;
        researcherStatus = 'completed';
        researcherLastAction = '詳細リサーチ完了';
        writerStatus = this.state.drafts.length >= (this.state.currentPlan?.sections.length || 0) 
          ? 'completed' : 'working';
        writerLastAction = writerStatus === 'completed' 
          ? 'スライド作成完了' : '割り振られたコンテンツを基にスライド作成中...';
        break;
        
      case 'completed':
        plannerStatus = 'completed';
        plannerLastAction = 'コンテンツ割り振り完了';
        plannerProgress = 100;
        researcherStatus = 'completed';
        researcherLastAction = '詳細リサーチ完了';
        writerStatus = 'completed';
        writerLastAction = 'スライド作成完了';
        break;
    }

    // 最新のメッセージを取得（最大15件）
    const recentMessages = this.state.messages
      .slice(-15)
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
          lastAction: plannerLastAction,
          progress: plannerProgress,
        },
        researcher: {
          status: researcherStatus,
          lastAction: researcherLastAction,
          completedSections: this.state.researchResults.filter((r, index, self) => 
            self.findIndex(item => item.sectionId === r.sectionId) === index
          ).length,
          totalSections: this.state.currentPlan?.sections.length || 0,
        },
        writer: {
          status: writerStatus,
          lastAction: writerLastAction,
          completedSlides: this.state.drafts.length,
          totalSlides: this.state.currentPlan?.sections.length || 0,
        },
      },
      messages: recentMessages,
      detailedStats: {
        totalSections: this.state.currentPlan?.sections.length || 0,
        estimatedTotalSlides: this.state.currentPlan?.sections.reduce((sum, s) => sum + (s.estimatedSlides || 1), 0) || 0,
        actualSlides: this.state.finalSlides?.slides.length || this.state.drafts.length,
        researchQueries: this.state.currentPlan?.sections.reduce((sum, s) => {
          const queries = Array.isArray(s.researchQueries) ? s.researchQueries : [];
          return sum + queries.length;
        }, 0) || 0,
        researchResults: this.state.researchResults.length,
        initialResearchCount: this.state.initialResearchResults?.length || 0,
        allocatedContentPoints: this.state.contentAllocation?.reduce((sum, a) => 
          sum + a.allocatedContent.mainPoints.length + a.allocatedContent.supportingDetails.length, 0
        ) || 0,
      },
    };
  }
}