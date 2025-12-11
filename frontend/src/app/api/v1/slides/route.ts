import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { SlideGenerator } from '@/lib/slideGenerator';
import { PDFGenerator } from '@/lib/pdfGenerator';
import { taskStorage } from '@/lib/taskStorage';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const prompt = formData.get('prompt') as string;
    // const lang = formData.get('lang') as string || 'ja';
    // const formatsStr = formData.get('formats') as string;
    const file = formData.get('file') as File;

    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { error: 'プロンプトが必要です' },
        { status: 400 }
      );
    }

    // タスクIDを生成
    const taskId = uuidv4();
    
    // タスクを作成
    taskStorage.createTask(taskId, prompt, file ? [file.name] : undefined);
    console.log(`[API] Created task: ${taskId}`);
    console.log(`[API] Task storage now has ${taskStorage.getAllTasks().length} tasks`);

    // 非同期でスライド生成を開始
    processSlideGeneration(taskId, prompt, file).catch(error => {
      console.error('Slide generation failed:', error);
      taskStorage.updateTask(taskId, { 
        status: 'failed', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    });

    // タスクが確実に作成されたことを確認
    const createdTask = taskStorage.getTask(taskId);
    if (!createdTask) {
      throw new Error('タスクの作成に失敗しました');
    }
    
    return NextResponse.json({
      task_id: taskId,
      status: createdTask.status
    });

  } catch (error) {
    console.error('API Error:', error);
    
    // OpenAIクォータエラーの場合
    if (error instanceof Error && error.message.includes('quota')) {
      return NextResponse.json(
        { error: 'OpenAI APIの利用制限に達しました。課金設定を確認してください。' },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

async function processSlideGeneration(taskId: string, prompt: string, file?: File) {
  try {
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
    
    // 進捗更新用のインターバルを設定
    const progressInterval = setInterval(() => {
      const progress = slideGenerator.getDetailedProgress();
      taskStorage.updateTask(taskId, {
        agentProgress: progress
      });
    }, 5000); // 5秒ごとに更新（負荷軽減）

    try {
      // タイムアウト付きでスライド生成を実行
      const slideGenerationPromise = slideGenerator.generateSlides(prompt, fileContent);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('スライド生成がタイムアウトしました（10分）')), 600000); // 10分
      });
      
      const slideDocument = await Promise.race([slideGenerationPromise, timeoutPromise]);
      
      // インターバルをクリア
      clearInterval(progressInterval);
      
      // 最終的な進捗情報を更新
      const finalProgress = slideGenerator.getDetailedProgress();
      taskStorage.updateTask(taskId, {
        agentProgress: finalProgress
      });
      
      // デバッグ用：生成されたスライドの内容をログ出力（最初の100文字のみ）
      console.log('Generated slides preview:', JSON.stringify(slideDocument).substring(0, 100) + '...');

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
    
    taskStorage.updateTask(taskId, {
      status: 'failed',
      error: errorMessage
    });
  }
}