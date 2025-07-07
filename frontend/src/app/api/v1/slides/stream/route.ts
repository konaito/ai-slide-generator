import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { SlideGenerator } from '@/lib/slideGenerator';
import { PDFGenerator } from '@/lib/pdfGenerator';
import { taskStorage } from '@/lib/taskStorage';

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const formData = await request.formData();
        const prompt = formData.get('prompt') as string;
        const file = formData.get('file') as File;

        if (!prompt || !prompt.trim()) {
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'error',
            error: 'プロンプトが必要です'
          }) + '\n'));
          controller.close();
          return;
        }

        // タスクIDを生成
        const taskId = uuidv4();
        
        // タスクを作成
        taskStorage.createTask(taskId, prompt, file ? [file.name] : undefined);
        
        // タスクID送信
        controller.enqueue(encoder.encode(JSON.stringify({
          type: 'task_created',
          taskId,
          status: 'pending'
        }) + '\n'));

        // タスクを実行中に更新
        taskStorage.updateTask(taskId, { status: 'running' });

        let fileContent = '';
        if (file) {
          const fileBuffer = await file.arrayBuffer();
          const fileText = new TextDecoder().decode(fileBuffer);
          fileContent = fileText;
        }

        // スライド生成
        const slideGenerator = new SlideGenerator();
        
        // 進捗情報をストリーミング
        const sendProgress = () => {
          const progress = slideGenerator.getDetailedProgress();
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'progress',
            progress
          }) + '\n'));
        };

        // 初期進捗送信
        sendProgress();

        // 定期的な進捗送信（5秒ごとに変更）
        const progressInterval = setInterval(sendProgress, 5000);

        try {
          // タイムアウトを10分に延長
          const slideGenerationPromise = slideGenerator.generateSlides(prompt, fileContent);
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('スライド生成がタイムアウトしました（10分）')), 600000);
          });
          
          const slideDocument = await Promise.race([slideGenerationPromise, timeoutPromise]);
          
          // インターバルをクリア
          clearInterval(progressInterval);
          
          // 最終的な進捗情報を送信
          sendProgress();
          
          // PDF生成開始通知
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'status',
            status: 'generating_pdf'
          }) + '\n'));

          // PDF生成
          const pdfGenerator = new PDFGenerator();
          const pdfBuffer = await pdfGenerator.generatePDF(slideDocument);
          const filename = `slide_${taskId}.pdf`;
          const downloadUrl = await pdfGenerator.savePDF(pdfBuffer, filename);

          // タスクを完了として更新
          taskStorage.updateTask(taskId, {
            status: 'completed',
            result: slideDocument,
            download_url: downloadUrl
          });

          // 完了通知
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'completed',
            result: slideDocument,
            downloadUrl
          }) + '\n'));

        } catch (error) {
          clearInterval(progressInterval);
          throw error;
        }

      } catch (error) {
        console.error('Slide generation error:', error);
        
        let errorMessage = 'Unknown error';
        if (error instanceof Error) {
          if (error.message.includes('quota')) {
            errorMessage = 'OpenAI APIの利用制限に達しました。課金設定を確認してください。';
          } else {
            errorMessage = error.message;
          }
        }
        
        controller.enqueue(encoder.encode(JSON.stringify({
          type: 'error',
          error: errorMessage
        }) + '\n'));
        
        if (taskStorage) {
          const taskId = (controller as unknown as Record<string, unknown>).taskId as string;
          if (taskId) {
            taskStorage.updateTask(taskId, {
              status: 'failed',
              error: errorMessage
            });
          }
        }
      } finally {
        controller.close();
      }
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}