'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { AgentProgressDisplay } from '@/components/AgentProgressDisplay';
import { AgentProgress } from '@/types/api';

export default function TaskDetailPage({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = use(params);
  const router = useRouter();
  const [status, setStatus] = useState<string>('queued');
  const [agentProgress, setAgentProgress] = useState<AgentProgress | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!taskId) return;

    const pollTaskStatus = async () => {
      const maxAttempts = 300; // 5分間に延長
      let attempts = 0;

      // 初回ポーリング前に少し待機（タスク作成を確実にするため）
      await new Promise(resolve => setTimeout(resolve, 500));

      const poll = async () => {
        try {
          const response = await fetch(`/api/v1/tasks/${taskId}`);
          
          if (!response.ok) {
            if (response.status === 404) {
              setError('タスクが見つかりません。');
              return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const result = await response.json();
          setStatus(result.status);

          // エージェントの進捗情報を更新
          if (result.agent_progress) {
            setAgentProgress(result.agent_progress);
          }

          if (result.status === 'completed') {
            setDownloadUrl(result.download_url);
            setViewUrl(result.view_url);
            
            // スライドページへ自動遷移
            if (result.view_url) {
              setTimeout(() => {
                router.push(result.view_url);
              }, 1500); // 1.5秒後に遷移（完了メッセージを表示するため）
            }
          } else if (result.status === 'failed') {
            setError(result.error || '不明なエラー');
          } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(poll, 1000); // 1秒ごとにポーリング
          } else {
            setError('タイムアウトしました');
          }
        } catch (error) {
          console.error('Polling error:', error);
          setError('エラーが発生しました。ページを更新してください。');
        }
      };

      poll();
    };

    pollTaskStatus();
  }, [taskId, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-red-700">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">エラーが発生しました</span>
            </div>
            <p className="mt-2 text-sm text-red-600">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              ホームに戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            AI スライド生成中
          </h1>
          <p className="text-gray-600 text-lg">
            エージェントがスライドを作成しています
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左側：タスク情報 */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-xl p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">タスク情報</h2>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-500">タスクID:</span>
                  <p className="text-sm font-mono text-gray-700">{taskId}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">ステータス:</span>
                  <p className="text-sm font-medium text-blue-600 capitalize">{status}</p>
                </div>
              </div>
            </div>

            {/* 完了時のアクション */}
            {status === 'completed' && (viewUrl || downloadUrl) && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-green-700">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">スライドが生成されました！</span>
                  </div>
                  <div className="flex space-x-2">
                    {viewUrl && (
                      <a
                        href={viewUrl}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>スライドを表示</span>
                      </a>
                    )}
                    {downloadUrl && (
                      <a
                        href={downloadUrl}
                        download
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>PDFダウンロード</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 右側：エージェント進捗 */}
          <div>
            {agentProgress ? (
              <AgentProgressDisplay progress={agentProgress} />
            ) : (
              <div className="bg-white rounded-lg shadow-xl p-6">
                <div className="flex items-center justify-center space-x-2 text-gray-500">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>エージェントの初期化中...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <footer className="text-center text-gray-500 text-sm mt-10">
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            ホームに戻る
          </button>
        </footer>
      </div>
    </div>
  );
}