'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { SlideDocument, SlideData } from '@/types/api';

export default function SlideView() {
  const params = useParams();
  const taskId = params.taskId as string;
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSlides();
  }, [taskId]);

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
  }, [currentSlide, slides.length]);

  const fetchSlides = async () => {
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
  };

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

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
          <a href="/" className="mt-4 inline-block text-blue-600 hover:underline">
            ホームに戻る
          </a>
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
        <a
          href="/"
          className="absolute top-8 left-8 text-gray-400 hover:text-white flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>ホームに戻る</span>
        </a>
      </div>

      {/* キーボードショートカット情報 */}
      <div className="fixed bottom-8 right-8 text-xs text-gray-500">
        ← → キーでナビゲート
      </div>
    </div>
  );
}