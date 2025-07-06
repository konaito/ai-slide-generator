'use client';

import { AgentProgress } from '@/types/api';

interface AgentProgressDisplayProps {
  progress: AgentProgress;
}

export function AgentProgressDisplay({ progress }: AgentProgressDisplayProps) {
  const getAgentStatusIcon = (status: 'idle' | 'working' | 'completed') => {
    switch (status) {
      case 'idle':
        return (
          <div className="w-4 h-4 rounded-full bg-gray-300" />
        );
      case 'working':
        return (
          <svg className="animate-spin h-4 w-4 text-blue-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        );
      case 'completed':
        return (
          <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        );
    }
  };

  const getAgentStatusColor = (status: 'idle' | 'working' | 'completed') => {
    switch (status) {
      case 'idle': return 'text-gray-500';
      case 'working': return 'text-blue-600';
      case 'completed': return 'text-green-600';
    }
  };

  return (
    <div className="space-y-4">
      {/* 全体の進捗バー */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-semibold text-gray-700">全体進捗</h3>
          <span className="text-sm text-gray-500">
            {progress.completedSteps} / {progress.totalSteps} ステップ
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${(progress.completedSteps / progress.totalSteps) * 100}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-gray-600">{progress.currentAction}</p>
      </div>

      {/* エージェントごとの状態 */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">エージェント状態</h3>
        
        {/* Planner Agent */}
        <div className="flex items-center justify-between mb-3 pb-3 border-b">
          <div className="flex items-center space-x-3">
            {getAgentStatusIcon(progress.agents.planner.status)}
            <div>
              <h4 className={`text-sm font-medium ${getAgentStatusColor(progress.agents.planner.status)}`}>
                計画エージェント
              </h4>
              <p className="text-xs text-gray-500">{progress.agents.planner.lastAction}</p>
            </div>
          </div>
          {progress.agents.planner.progress !== undefined && (
            <div className="text-sm text-gray-600">
              {progress.agents.planner.progress}%
            </div>
          )}
        </div>

        {/* Research Agent */}
        <div className="flex items-center justify-between mb-3 pb-3 border-b">
          <div className="flex items-center space-x-3">
            {getAgentStatusIcon(progress.agents.researcher.status)}
            <div>
              <h4 className={`text-sm font-medium ${getAgentStatusColor(progress.agents.researcher.status)}`}>
                リサーチエージェント
              </h4>
              <p className="text-xs text-gray-500">{progress.agents.researcher.lastAction}</p>
            </div>
          </div>
          {progress.agents.researcher.totalSections !== undefined && progress.agents.researcher.totalSections > 0 && (
            <div className="text-sm text-gray-600">
              {progress.agents.researcher.completedSections} / {progress.agents.researcher.totalSections} セクション
            </div>
          )}
        </div>

        {/* Writer Agent */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getAgentStatusIcon(progress.agents.writer.status)}
            <div>
              <h4 className={`text-sm font-medium ${getAgentStatusColor(progress.agents.writer.status)}`}>
                ライターエージェント
              </h4>
              <p className="text-xs text-gray-500">{progress.agents.writer.lastAction}</p>
            </div>
          </div>
          {progress.agents.writer.totalSlides !== undefined && progress.agents.writer.totalSlides > 0 && (
            <div className="text-sm text-gray-600">
              {progress.agents.writer.completedSlides} / {progress.agents.writer.totalSlides} スライド
            </div>
          )}
        </div>
      </div>

      {/* メッセージログ */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">エージェント間通信</h3>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {progress.messages.map((msg, index) => (
            <div key={index} className="text-xs">
              <span className="font-medium text-gray-600">{msg.from} → {msg.to}:</span>
              <span className="text-gray-500 ml-2">{msg.content}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}