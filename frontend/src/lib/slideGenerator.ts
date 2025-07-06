import { CoordinatorAgent } from './agents/coordinatorAgent';
import { SlideDocument } from '@/types/api';

export class SlideGenerator {
  private coordinatorAgent: CoordinatorAgent;

  constructor() {
    this.coordinatorAgent = new CoordinatorAgent();
  }

  async generateSlides(prompt: string, fileContent?: string): Promise<SlideDocument> {
    console.log('[SlideGenerator] Using Agentic architecture for slide generation');
    const result = await this.coordinatorAgent.generateSlides(prompt, fileContent);
    
    // 進捗情報をログ出力
    const progress = this.coordinatorAgent.getProgress();
    console.log('[SlideGenerator] Generation completed:', progress);
    
    return result;
  }

  getProgress() {
    return this.coordinatorAgent.getProgress();
  }

  getDetailedProgress() {
    return this.coordinatorAgent.getDetailedProgress();
  }

  getState() {
    return this.coordinatorAgent.getState();
  }
}