'use client';

import { useEffect, useState } from 'react';
import { AgentProgress } from '@/lib/agents/progressTracker';

interface AgentProgressProps {
  progress: AgentProgress | null;
}

export default function AgentProgressComponent({ progress }: AgentProgressProps) {
  if (!progress) return null;

  const phaseNames: Record<AgentProgress['phase'], string> = {
    planning: '計画立案',
    researching: 'リサーチ',
    writing: 'コンテンツ作成',
    finalizing: '最終調整',
    completed: '完了',
  };

  const phaseIcons: Record<AgentProgress['phase'], string> = {
    planning: '📋',
    researching: '🔍',
    writing: '✍️',
    finalizing: '🎯',
    completed: '✅',
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-4">
      {/* 全体の進捗バー */}
      <div>
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium text-blue-700">
            {phaseIcons[progress.phase]} {phaseNames[progress.phase]}
          </span>
          <span className="text-sm text-blue-600">
            {progress.completedSteps}/{progress.totalSteps} ステップ完了
          </span>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${(progress.completedSteps / progress.totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* 現在のアクション */}
      <div className="flex items-center space-x-2">
        <div className="animate-pulse h-2 w-2 bg-blue-600 rounded-full" />
        <span className="text-sm text-blue-700">{progress.currentStep}</span>
      </div>

      {/* エージェントのメッセージ（最新5件） */}
      {progress.messages.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-xs font-semibold text-blue-800 uppercase tracking-wider">
            エージェントアクティビティ
          </h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {progress.messages.slice(-5).reverse().map((msg, index) => (
              <div 
                key={index} 
                className="text-xs text-blue-600 flex items-start space-x-2"
              >
                <span className="text-blue-400">
                  [{msg.agent}]
                </span>
                <span className="flex-1">{msg.action}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* フェーズ別の詳細表示 */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        {Object.entries(phaseNames).map(([phase, name]) => {
          const currentPhaseIndex = Object.keys(phaseNames).indexOf(progress.phase);
          const phaseIndex = Object.keys(phaseNames).indexOf(phase);
          const isCompleted = phaseIndex < currentPhaseIndex;
          const isCurrent = phase === progress.phase;
          const isPending = phaseIndex > currentPhaseIndex;

          return (
            <div
              key={phase}
              className={`
                text-center p-2 rounded-lg text-xs font-medium transition-all
                ${isCompleted ? 'bg-green-100 text-green-700' : ''}
                ${isCurrent ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-300' : ''}
                ${isPending ? 'bg-gray-100 text-gray-400' : ''}
              `}
            >
              <div className="text-lg mb-1">
                {phaseIcons[phase as AgentProgress['phase']]}
              </div>
              <div>{name}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}