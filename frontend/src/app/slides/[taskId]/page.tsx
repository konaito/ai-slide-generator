'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { SlideData } from '@/lib/agents/types';
import { HTMLSlideViewer } from '@/components/HTMLSlideViewer';

export default function SlideView() {
  const params = useParams();
  const taskId = params.taskId as string;
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSlides = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/tasks/${taskId}`);
      if (!response.ok) {
        throw new Error('スライドの取得に失敗しました');
      }
      
      const data = await response.json();
      if (data.status === 'completed' && data.result) {
        setSlides(data.result.slides || []);
      } else if (data.status === 'failed') {
        throw new Error('スライドの生成に失敗しました');
      } else {
        throw new Error('スライドがまだ準備できていません');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  const nextSlide = useCallback(() => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  }, [currentSlide, slides.length]);

  const prevSlide = useCallback(() => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  }, [currentSlide]);

  useEffect(() => {
    fetchSlides();
  }, [fetchSlides]);

  // キーボードナビゲーション
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        prevSlide();
      } else if (e.key === 'ArrowRight') {
        nextSlide();
      } else if (e.key === 'Escape') {
        window.location.href = '/';
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [nextSlide, prevSlide]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">スライドを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <Link href="/" className="mt-4 inline-block text-blue-600 hover:underline">
            ホームに戻る
          </Link>
        </div>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-600">スライドが見つかりません</p>
      </div>
    );
  }

  const slide = slides[currentSlide];
  
  // HTMLコンテンツがある場合は新しいビューアを使用
  const hasHtmlContent = slides.some(s => s.htmlContent);
  
  if (hasHtmlContent) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="h-screen flex flex-col">
          {/* ヘッダー */}
          <div className="bg-white shadow-sm px-4 py-3 flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-800">
              スライドプレゼンテーション
            </h1>
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                ホームに戻る
              </Link>
            </div>
          </div>

          {/* スライドビューア */}
          <div className="flex-1">
            <HTMLSlideViewer 
              slides={slides} 
              currentIndex={currentSlide}
              onSlideChange={setCurrentSlide}
            />
          </div>
        </div>
      </div>
    );
  }

  // 既存のレンダリング（HTMLコンテンツがない場合）
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* スライドコンテナ */}
      <div className="relative h-screen flex items-center justify-center">
        {/* スライド */}
        <div className="w-full max-w-6xl mx-auto px-8">
          <div 
            className={`bg-white text-gray-900 rounded-lg shadow-2xl p-16 aspect-[16/9] flex flex-col ${
              slide.type === 'title' ? 'justify-center items-center text-center' : ''
            }`}
          >
            {/* スライドタイプに応じた装飾 */}
            {slide.type === 'title' && (
              <div className="absolute top-0 left-0 w-full h-2 bg-blue-600 rounded-t-lg"></div>
            )}
            {slide.type === 'content' && (
              <div className="absolute left-0 top-0 w-2 h-full bg-green-500 rounded-l-lg"></div>
            )}
            
            {/* タイトル */}
            <h1 className={`font-bold mb-8 ${
              slide.type === 'title' ? 'text-6xl' : 'text-4xl'
            }`}>
              {slide.title}
            </h1>
            
            {/* コンテンツ */}
            {slide.content && (
              <div className={`${slide.type === 'title' ? 'text-2xl' : 'text-xl'} leading-relaxed`}>
                {String(slide.content).split('\n').map((line, index) => (
                  <p key={index} className={line.startsWith('•') ? 'ml-4 mb-4' : 'mb-4'}>
                    {line}
                  </p>
                ))}
              </div>
            )}
            
            {/* 画像プレースホルダー */}
            {slide.type === 'image' && (
              <div className="mt-8 bg-gray-200 rounded-lg p-8 text-center">
                <p className="text-gray-500">画像プレースホルダー</p>
              </div>
            )}
            
            {/* チャートプレースホルダー */}
            {slide.type === 'chart' && (
              <div className="mt-8 bg-yellow-50 rounded-lg p-8 text-center">
                <p className="text-yellow-700">チャートプレースホルダー</p>
              </div>
            )}
          </div>
        </div>

        {/* ナビゲーション */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center space-x-4">
          <button
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className={`p-3 rounded-full ${
              currentSlide === 0 
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="flex space-x-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full ${
                  index === currentSlide ? 'bg-white' : 'bg-gray-600 hover:bg-gray-500'
                }`}
              />
            ))}
          </div>
          
          <button
            onClick={nextSlide}
            disabled={currentSlide === slides.length - 1}
            className={`p-3 rounded-full ${
              currentSlide === slides.length - 1 
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* スライド番号 */}
        <div className="absolute top-8 right-8 text-gray-400">
          {currentSlide + 1} / {slides.length}
        </div>

        {/* 戻るボタン */}
        <Link
          href="/"
          className="absolute top-8 left-8 text-gray-400 hover:text-white flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>ホームに戻る</span>
        </Link>
      </div>

      {/* キーボードショートカット情報 */}
      <div className="fixed bottom-8 right-8 text-xs text-gray-500">
        ← → キーでナビゲート
      </div>
    </div>
  );
}