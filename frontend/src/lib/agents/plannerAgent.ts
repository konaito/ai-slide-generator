import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { LLMChain } from 'langchain/chains';
import { 
  AgentState, 
  ResearchPlan, 
  PlanSection, 
  AgentType,
  DEFAULT_AGENT_CONFIG 
} from './types';
import { v4 as uuidv4 } from 'uuid';

export class PlannerAgent {
  private llm: ChatOpenAI;
  private config = DEFAULT_AGENT_CONFIG.planner;

  constructor() {
    this.llm = new ChatOpenAI({
      modelName: this.config.model,
      temperature: this.config.temperature,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
  }

  async createResearchPlan(prompt: string, fileContent?: string): Promise<ResearchPlan> {
    const planPrompt = PromptTemplate.fromTemplate(`
あなたは優秀なリサーチプランナーです。ユーザーの要求を分析し、包括的なスライド作成のためのリサーチ計画を立案してください。

ユーザーの要求: {prompt}

{fileContent}

以下の構造でリサーチ計画を作成してください：

1. 全体の目標を明確に定義
2. 必要な情報収集セクションを特定（3-5セクション）
3. 各セクションごとに：
   - タイトル
   - 説明
   - 検索クエリ（2-3個）
   - 期待される内容
   - 優先度（high/medium/low）

回答はJSON形式のみで返してください：
{{
  "objective": "明確な目標",
  "sections": [
    {{
      "title": "セクションタイトル",
      "description": "このセクションの目的",
      "researchQueries": ["検索クエリ1", "検索クエリ2"],
      "expectedContent": ["期待される内容1", "期待される内容2"],
      "priority": "high"
    }}
  ]
}}
    `);

    const chain = new LLMChain({
      llm: this.llm,
      prompt: planPrompt,
    });

    try {
      const result = await chain.call({
        prompt,
        fileContent: fileContent ? `\n\n参考資料:\n${fileContent}` : '',
      });

      // JSONを解析
      let jsonText = result.text;
      const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1].trim();
      }

      const planData = JSON.parse(jsonText);

      // ResearchPlan型に変換
      const plan: ResearchPlan = {
        id: uuidv4(),
        objective: planData.objective,
        sections: planData.sections.map((section: any) => ({
          id: uuidv4(),
          title: section.title,
          description: section.description,
          researchQueries: section.researchQueries,
          expectedContent: section.expectedContent,
          priority: section.priority,
        })),
        createdAt: new Date(),
        status: 'draft',
      };

      console.log('[PlannerAgent] Created research plan:', plan);
      return plan;

    } catch (error) {
      console.error('[PlannerAgent] Failed to create plan:', error);
      throw new Error('リサーチ計画の作成に失敗しました');
    }
  }

  async refinePlan(
    currentPlan: ResearchPlan, 
    feedback: string
  ): Promise<ResearchPlan> {
    const refinePrompt = PromptTemplate.fromTemplate(`
現在のリサーチ計画を以下のフィードバックに基づいて改善してください。

現在の計画:
目標: {objective}
セクション数: {sectionCount}

フィードバック: {feedback}

改善された計画をJSON形式で返してください。構造は元の計画と同じにしてください。
    `);

    const chain = new LLMChain({
      llm: this.llm,
      prompt: refinePrompt,
    });

    try {
      const result = await chain.call({
        objective: currentPlan.objective,
        sectionCount: currentPlan.sections.length,
        feedback,
      });

      // JSONを解析して新しい計画を作成
      let jsonText = result.text;
      const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1].trim();
      }

      const refinedData = JSON.parse(jsonText);

      const refinedPlan: ResearchPlan = {
        ...currentPlan,
        objective: refinedData.objective || currentPlan.objective,
        sections: refinedData.sections?.map((section: any) => ({
          id: uuidv4(),
          title: section.title,
          description: section.description,
          researchQueries: section.researchQueries,
          expectedContent: section.expectedContent,
          priority: section.priority,
        })) || currentPlan.sections,
        status: 'draft',
      };

      console.log('[PlannerAgent] Refined research plan');
      return refinedPlan;

    } catch (error) {
      console.error('[PlannerAgent] Failed to refine plan:', error);
      return currentPlan; // エラー時は元の計画を返す
    }
  }

  async evaluatePlanCompleteness(plan: ResearchPlan): Promise<{
    isComplete: boolean;
    missingElements: string[];
    suggestions: string[];
  }> {
    const evaluatePrompt = PromptTemplate.fromTemplate(`
以下のリサーチ計画の完全性を評価してください：

目標: {objective}
セクション数: {sectionCount}
セクションタイトル: {sectionTitles}

評価基準：
1. 目標に対して必要な情報が網羅されているか
2. セクションの構成が論理的か
3. 検索クエリが適切か

JSON形式で評価結果を返してください：
{{
  "isComplete": true/false,
  "missingElements": ["不足している要素"],
  "suggestions": ["改善提案"]
}}
    `);

    const chain = new LLMChain({
      llm: this.llm,
      prompt: evaluatePrompt,
    });

    try {
      const result = await chain.call({
        objective: plan.objective,
        sectionCount: plan.sections.length,
        sectionTitles: plan.sections.map(s => s.title).join(', '),
      });

      // JSONを解析
      let jsonText = result.text;
      const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1].trim();
      }
      
      const evaluation = JSON.parse(jsonText);
      return evaluation;

    } catch (error) {
      console.error('[PlannerAgent] Failed to evaluate plan:', error);
      return {
        isComplete: true,
        missingElements: [],
        suggestions: [],
      };
    }
  }
}