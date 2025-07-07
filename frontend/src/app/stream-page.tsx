'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ProgressInfo {
  phase: string;
  completedSteps: number;
  totalSteps: number;
  currentAction: string;
  agents: {
    planner: { status: string; lastAction?: string; progress?: number };
    researcher: { status: string; lastAction?: string; completedSections?: number; totalSections?: number };
    writer: { status: string; lastAction?: string; completedSlides?: number; totalSlides?: number };
  };
}

export default function StreamPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('トランプ大統領についてまとめて');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      alert('プロンプトを入力してください');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setProgress(null);

    try {
      const formData = new FormData();
      formData.append('prompt', prompt);
      formData.append('lang', 'ja');
      formData.append('formats', JSON.stringify(['pdf']));
      
      if (file) {
        formData.append('file', file);
      }

      const response = await fetch('/api/v1/slides/stream', {
        method: 'POST',
        body: formData,
      });

      if (!response.body) {
        throw new Error('レスポンスボディがありません');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let taskId: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);

            switch (data.type) {
              case 'task_created':
                taskId = data.taskId;
                break;
              
              case 'progress':
                setProgress(data.progress);
                break;
              
              case 'status':
                // ステータス更新の処理
                break;
              
              case 'completed':
                if (taskId) {
                  router.push(`/tasks/${taskId}`);
                }
                break;
              
              case 'error':
                setError(data.error);
                setIsGenerating(false);
                break;
            }
          } catch (e) {
            console.error('JSON parse error:', e);
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : '不明なエラーが発生しました');
      setIsGenerating(false);
    }
  };

  const getAgentStatus = (status: string) => {
    switch (status) {
      case 'idle':
        return { text: '待機中', color: 'text-gray-500' };
      case 'working':
        return { text: '作業中', color: 'text-blue-500' };
      case 'completed':
        return { text: '完了', color: 'text-green-500' };
      default:
        return { text: status, color: 'text-gray-500' };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            AI スライドジェネレーター（ストリーミング版）
          </h1>
          <p className="text-gray-600 text-lg">
            リアルタイムで進捗を確認しながらスライドを生成
          </p>
        </header>

        <div className="bg-white rounded-lg shadow-xl p-8 mb-6">
          <div className="space-y-6">
            {/* ファイルアップロード */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                資料ファイル（オプション）
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  accept=".pdf,.txt,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  disabled={isGenerating}
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer"
                >
                  <div className="text-gray-500">
                    {file ? (
                      <span className="text-blue-600 font-medium">{file.name}</span>
                    ) : (
                      <span>クリックしてファイルを選択</span>
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* プロンプト入力 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                スライド生成プロンプト <span className="text-red-500">*</span>
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="例：海外市場の動向をまとめて、競合分析と今後の戦略を含めたプレゼンテーションを作成してください"
                className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                disabled={isGenerating}
              />
            </div>

            {/* エラー表示 */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* 進捗表示 */}
            {progress && isGenerating && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-3">生成進捗</h3>
                
                {/* 全体進捗 */}
                <div className="mb-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-blue-700">{progress.currentAction}</span>
                    <span className="text-sm text-blue-700">
                      {progress.completedSteps}/{progress.totalSteps}
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(progress.completedSteps / progress.totalSteps) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* エージェント別進捗 */}
                <div className="space-y-2">
                  {/* Planner */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">プランナー</span>
                    <span className={`text-sm ${getAgentStatus(progress.agents.planner.status).color}`}>
                      {getAgentStatus(progress.agents.planner.status).text}
                    </span>
                  </div>
                  {progress.agents.planner.lastAction && (
                    <p className="text-xs text-gray-600 ml-4">{progress.agents.planner.lastAction}</p>
                  )}

                  {/* Researcher */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">リサーチャー</span>
                    <span className={`text-sm ${getAgentStatus(progress.agents.researcher.status).color}`}>
                      {getAgentStatus(progress.agents.researcher.status).text}
                      {progress.agents.researcher.completedSections !== undefined && (
                        <> ({progress.agents.researcher.completedSections}/{progress.agents.researcher.totalSections})</>
                      )}
                    </span>
                  </div>
                  {progress.agents.researcher.lastAction && (
                    <p className="text-xs text-gray-600 ml-4">{progress.agents.researcher.lastAction}</p>
                  )}

                  {/* Writer */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">ライター</span>
                    <span className={`text-sm ${getAgentStatus(progress.agents.writer.status).color}`}>
                      {getAgentStatus(progress.agents.writer.status).text}
                      {progress.agents.writer.completedSlides !== undefined && (
                        <> ({progress.agents.writer.completedSlides}/{progress.agents.writer.totalSlides})</>
                      )}
                    </span>
                  </div>
                  {progress.agents.writer.lastAction && (
                    <p className="text-xs text-gray-600 ml-4">{progress.agents.writer.lastAction}</p>
                  )}
                </div>
              </div>
            )}

            {/* 生成ボタン */}
            <div className="flex justify-center">
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className={`px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200 ${
                  isGenerating || !prompt.trim()
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 transform hover:scale-105'
                }`}
              >
                {isGenerating ? (
                  <div className="flex items-center space-x-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>生成中...</span>
                  </div>
                ) : (
                  'スライドを生成'
                )}
              </button>
            </div>

          </div>
        </div>

        <footer className="text-center text-gray-500 text-sm">
          <p>© 2024 AI スライドジェネレーター - ストリーミングレスポンス対応</p>
        </footer>
      </div>
    </div>
  );
}