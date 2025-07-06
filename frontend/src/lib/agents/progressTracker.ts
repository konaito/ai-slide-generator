// エージェントの進捗を追跡するためのユーティリティ

export interface AgentProgress {
  phase: 'planning' | 'researching' | 'writing' | 'finalizing' | 'completed';
  currentStep: string;
  completedSteps: number;
  totalSteps: number;
  messages: ProgressMessage[];
}

export interface ProgressMessage {
  timestamp: Date;
  agent: string;
  action: string;
  details?: string;
}

export class ProgressTracker {
  private progress: AgentProgress = {
    phase: 'planning',
    currentStep: '初期化中...',
    completedSteps: 0,
    totalSteps: 4,
    messages: [],
  };

  private listeners: ((progress: AgentProgress) => void)[] = [];

  subscribe(listener: (progress: AgentProgress) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  updatePhase(phase: AgentProgress['phase'], currentStep: string) {
    this.progress.phase = phase;
    this.progress.currentStep = currentStep;
    
    // フェーズに応じて完了ステップを更新
    const phaseToSteps: Record<AgentProgress['phase'], number> = {
      planning: 1,
      researching: 2,
      writing: 3,
      finalizing: 4,
      completed: 4,
    };
    
    this.progress.completedSteps = phaseToSteps[phase];
    this.notifyListeners();
  }

  addMessage(agent: string, action: string, details?: string) {
    const message: ProgressMessage = {
      timestamp: new Date(),
      agent,
      action,
      details,
    };
    
    this.progress.messages.push(message);
    this.notifyListeners();
  }

  getProgress(): AgentProgress {
    return { ...this.progress };
  }

  reset() {
    this.progress = {
      phase: 'planning',
      currentStep: '初期化中...',
      completedSteps: 0,
      totalSteps: 4,
      messages: [],
    };
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.getProgress()));
  }
}

// グローバルインスタンス
export const globalProgressTracker = new ProgressTracker();