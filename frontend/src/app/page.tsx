'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('トランプ大統領についてまとめて');
  const [isGenerating, setIsGenerating] = useState(false);

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

    try {
      const formData = new FormData();
      formData.append('prompt', prompt);
      formData.append('lang', 'ja');
      formData.append('formats', JSON.stringify(['pdf']));
      
      if (file) {
        formData.append('file', file);
      }

      // AbortControllerでタイムアウトを設定（5分に延長）
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5分のタイムアウト

      const response = await fetch('/api/v1/slides', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      const result = await response.json();
      
      if (response.ok) {
        // タスク詳細ページへ遷移
        router.push(`/tasks/${result.task_id}`);
      } else {
        alert('エラーが発生しました: ' + result.error);
        setIsGenerating(false);
      }
    } catch (error) {
      console.error('Error:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        alert('リクエストがタイムアウトしました。内容を簡潔にして再度お試しください。');
      } else {
        alert('エラーが発生しました: ' + (error instanceof Error ? error.message : '不明なエラー'));
      }
      setIsGenerating(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            AI スライドジェネレーター
          </h1>
          <p className="text-gray-600 text-lg">
            プロンプトから高品質なスライドを自動生成
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
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer"
                >
                  <div className="text-gray-500">
                    <svg className="mx-auto h-12 w-12 mb-4" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {file ? (
                      <span className="text-blue-600 font-medium">{file.name}</span>
                    ) : (
                      <span>クリックしてファイルを選択、またはドラッグ&ドロップ</span>
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
          <p>© 2024 AI スライドジェネレーター - LangChain × GPT-4o で高品質なスライドを自動生成</p>
        </footer>
      </div>
    </div>
  );
}
