export interface SlideGenerationRequest {
  prompt: string;
  lang?: string;
  formats?: string[];
  files?: File[];
}

export interface SlideGenerationResponse {
  task_id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
}

export interface TaskStatusResponse {
  task_id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress?: number;
  download_url?: string;
  error?: string;
}

export interface SlideData {
  id?: string;
  title: string;
  content?: string;
  type: 'title' | 'content' | 'image' | 'chart' | 'conclusion';
  image_url?: string;
  chart_data?: unknown;
  speakerNotes?: string;
}

export interface SlideDocument {
  title: string;
  slides: SlideData[];
  theme?: string;
  created_at: string;
  metadata?: {
    totalResearchTime?: number;
    agentVersion?: string;
  };
}

export interface AgentProgress {
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
}

export interface Task {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  prompt: string;
  files?: string[];
  result?: SlideDocument;
  download_url?: string;
  error?: string;
  created_at: string;
  updated_at: string;
  agentProgress?: AgentProgress;
}