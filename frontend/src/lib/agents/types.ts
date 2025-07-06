// エージェントシステムの型定義

export interface AgentState {
  messages: Message[];
  currentPlan: ResearchPlan | null;
  initialResearchResults?: ResearchResult[];
  researchResults: ResearchResult[];
  contentAllocation?: ContentAllocation[];
  drafts: SlideDraft[];
  finalSlides: SlideDocument | null;
  errors: string[];
}

export interface ContentAllocation {
  sectionId: string;
  allocatedContent: {
    mainPoints: string[];
    supportingDetails: string[];
    connections: string[];
  };
}

export interface Message {
  id: string;
  from: AgentType;
  to: AgentType;
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export type AgentType = 'planner' | 'researcher' | 'writer' | 'reviewer' | 'coordinator';

export interface ResearchPlan {
  id: string;
  objective: string;
  sections: PlanSection[];
  createdAt: Date;
  status: 'draft' | 'approved' | 'in_progress' | 'completed';
}

export interface PlanSection {
  id: string;
  title: string;
  description: string;
  researchQueries: string[];
  expectedContent: string[];
  priority: 'high' | 'medium' | 'low';
  estimatedSlides?: number;
  splitStrategy?: string;
}

export interface ResearchResult {
  id: string;
  sectionId: string;
  query: string;
  sources: Source[];
  summary: string;
  confidence: number;
  timestamp: Date;
}

export interface Source {
  url: string;
  title: string;
  snippet: string;
  relevanceScore: number;
}

export interface SlideDraft {
  id: string;
  sectionId: string;
  title: string;
  content: string;
  version: number;
  feedback: Feedback[];
  status: 'draft' | 'reviewing' | 'approved';
}

export interface Feedback {
  agentType: AgentType;
  comment: string;
  suggestions: string[];
  timestamp: Date;
}

export interface SlideDocument {
  title: string;
  slides: SlideData[];
  metadata: {
    researchPlanId: string;
    totalResearchTime: number;
    sourcesUsed: number;
    iterations: number;
  };
  created_at: string;
}

export interface SlideData {
  id: string;
  title: string;
  content: string;
  type: 'title' | 'content' | 'image' | 'chart' | 'conclusion';
  visualElements?: VisualElement[];
  speakerNotes?: string;
  sources?: string[];
}

export interface VisualElement {
  type: 'image' | 'chart' | 'diagram';
  data: unknown;
  caption?: string;
}

// エージェントのアクション定義
export interface AgentAction {
  type: string;
  payload: unknown;
}

export interface PlannerActions {
  CREATE_PLAN: {
    prompt: string;
    context: string;
  };
  REFINE_PLAN: {
    planId: string;
    feedback: string;
  };
  APPROVE_PLAN: {
    planId: string;
  };
}

export interface ResearcherActions {
  SEARCH_WEB: {
    query: string;
    sectionId: string;
  };
  ANALYZE_SOURCE: {
    sourceUrl: string;
    sectionId: string;
  };
  SUMMARIZE_FINDINGS: {
    sectionId: string;
    sources: Source[];
  };
}

export interface WriterActions {
  DRAFT_SLIDE: {
    sectionId: string;
    researchResults: ResearchResult[];
  };
  REVISE_SLIDE: {
    slideId: string;
    feedback: Feedback;
  };
  FINALIZE_SLIDE: {
    slideId: string;
  };
}

// エージェントの設定
export interface AgentConfig {
  maxIterations: number;
  timeoutMs: number;
  temperature: number;
  model: string;
  tools: string[];
}

export const DEFAULT_AGENT_CONFIG: Record<AgentType, AgentConfig> = {
  planner: {
    maxIterations: 3,
    timeoutMs: 30000,
    temperature: 0.7,
    model: 'gpt-4o',
    tools: ['create_outline', 'analyze_requirements'],
  },
  researcher: {
    maxIterations: 10,
    timeoutMs: 60000,
    temperature: 0.3,
    model: 'gpt-4o',
    tools: ['web_search', 'extract_content', 'summarize'],
  },
  writer: {
    maxIterations: 5,
    timeoutMs: 45000,
    temperature: 0.8,
    model: 'gpt-4o',
    tools: ['generate_content', 'format_slide', 'add_visuals'],
  },
  reviewer: {
    maxIterations: 2,
    timeoutMs: 20000,
    temperature: 0.2,
    model: 'gpt-4o',
    tools: ['evaluate_quality', 'check_consistency', 'suggest_improvements'],
  },
  coordinator: {
    maxIterations: 20,
    timeoutMs: 300000,
    temperature: 0.5,
    model: 'gpt-4o',
    tools: ['manage_workflow', 'track_progress', 'handle_errors'],
  },
};