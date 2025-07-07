'use client';

import React, { useState, useEffect } from 'react';
import { SlideData } from '@/types/api';

interface HTMLSlideViewerProps {
  slides: SlideData[];
  currentIndex?: number;
  onSlideChange?: (index: number) => void;
}

export function HTMLSlideViewer({ slides, currentIndex = 0, onSlideChange }: HTMLSlideViewerProps) {
  const [selectedIndex, setSelectedIndex] = useState(currentIndex);

  useEffect(() => {
    setSelectedIndex(currentIndex);
  }, [currentIndex]);

  const handlePrevious = () => {
    const newIndex = Math.max(0, selectedIndex - 1);
    setSelectedIndex(newIndex);
    onSlideChange?.(newIndex);
  };

  const handleNext = () => {
    const newIndex = Math.min(slides.length - 1, selectedIndex + 1);
    setSelectedIndex(newIndex);
    onSlideChange?.(newIndex);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      handlePrevious();
    } else if (e.key === 'ArrowRight') {
      handleNext();
    }
  };

  const currentSlide = slides[selectedIndex];

  return (
    <div 
      className="html-slide-viewer h-full w-full flex flex-col bg-gray-100"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* スライド表示エリア */}
      <div 
        className="flex-1 overflow-hidden"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0',
          margin: '0',
        }}
      >
        <div 
          className="slide-wrapper shadow-2xl rounded-lg overflow-hidden bg-white"
          style={{
            width: '90%',
            maxWidth: '1280px',
            aspectRatio: '16 / 9',
            position: 'relative',
          }}
        >
          {currentSlide?.htmlContent ? (
            <iframe
              srcDoc={`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1280, initial-scale=1, user-scalable=no">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html {
      width: 100%;
      height: 100%;
    }
    body {
      width: 1280px;
      height: 720px;
      margin: 0 auto;
      padding: 0;
      overflow: hidden;
      background: white;
      display: flex;
      align-items: center;
      justify-content: center;
      transform-origin: top left;
    }
    .slide-container {
      width: 1280px;
      height: 720px;
      position: relative;
    }
    
    /* デスクトップブラウザ用のスケーリング */
    @media (min-width: 1281px) {
      body {
        transform: scale(var(--scale, 1));
      }
    }
  </style>
</head>
<body>
  <div class="slide-container">
    ${currentSlide.htmlContent}
  </div>
  <script>
    // デスクトップブラウザのみスケーリングを適用
    function applyDesktopScaling() {
      if (window.innerWidth > 1280) {
        const scaleX = window.innerWidth / 1280;
        const scaleY = window.innerHeight / 720;
        const scale = Math.min(scaleX, scaleY) * 0.95;
        document.body.style.setProperty('--scale', scale);
      }
    }
    
    // 初期スケーリング
    applyDesktopScaling();
    
    // リサイズ時の再計算
    window.addEventListener('resize', applyDesktopScaling);
  </script>
</body>
</html>`}
              className="w-full h-full"
              style={{
                border: 'none',
                display: 'block',
                borderRadius: 'inherit',
              }}
              sandbox="allow-scripts"
              title={`Slide ${selectedIndex + 1}`}
            />
          ) : (
            // フォールバック: HTMLがない場合は従来のレンダリング
            <div className="w-full h-full flex flex-col justify-center items-center p-12">
              <h1 className="text-4xl font-bold mb-6 text-center text-gray-800">
                {currentSlide?.title}
              </h1>
              <div className="text-lg text-gray-600 whitespace-pre-wrap text-center max-w-3xl">
                {currentSlide?.content}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* コントロールバー */}
      <div className="bg-white border-t p-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handlePrevious}
            disabled={selectedIndex === 0}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded disabled:bg-gray-300 hover:bg-blue-600 transition-colors"
          >
            前へ
          </button>
          <span className="text-sm text-gray-600">
            {selectedIndex + 1} / {slides.length}
          </span>
          <button
            onClick={handleNext}
            disabled={selectedIndex === slides.length - 1}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded disabled:bg-gray-300 hover:bg-blue-600 transition-colors"
          >
            次へ
          </button>
        </div>

        {/* サムネイル表示 */}
        <div className="flex gap-2 overflow-x-auto max-w-md">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              onClick={() => {
                setSelectedIndex(index);
                onSlideChange?.(index);
              }}
              className={`w-12 h-7 border-2 rounded flex-shrink-0 ${
                index === selectedIndex 
                  ? 'border-blue-500' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              title={slide.title}
            >
              <div className="w-full h-full bg-gray-200 text-xs flex items-center justify-center">
                {index + 1}
              </div>
            </button>
          ))}
        </div>

        <div className="text-xs text-gray-500">
          矢印キーで操作できます
        </div>
      </div>
    </div>
  );
}

// プレゼンテーションモード用のフルスクリーンビューア
export function FullScreenSlideViewer({ slides }: { slides: SlideData[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const enterFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
      setIsFullscreen(true);
    }
  };

  const exitFullscreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div className="relative h-full">
      <HTMLSlideViewer 
        slides={slides} 
        currentIndex={currentIndex}
        onSlideChange={setCurrentIndex}
      />
      
      <button
        onClick={isFullscreen ? exitFullscreen : enterFullscreen}
        className="absolute top-4 right-4 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors z-10"
      >
        {isFullscreen ? '終了' : 'フルスクリーン'}
      </button>
    </div>
  );
}