import { NextRequest, NextResponse } from 'next/server';
import { taskStorage } from '@/lib/taskStorage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;

    if (!taskId) {
      return NextResponse.json(
        { error: 'タスクIDが必要です' },
        { status: 400 }
      );
    }

    console.log(`[Task API] Looking for task: ${taskId}`);
    console.log(`[Task API] Total tasks in storage: ${taskStorage.getAllTasks().length}`);
    
    const task = taskStorage.getTask(taskId);

    if (!task) {
      console.log(`[Task API] Task not found: ${taskId}`);
      console.log(`[Task API] Available tasks:`, taskStorage.getAllTasks().map(t => ({ id: t.id, status: t.status })));
      return NextResponse.json(
        { error: 'タスクが見つかりません' },
        { status: 404 }
      );
    }

    const response = {
      task_id: task.id,
      status: task.status,
      ...(task.result && { result: task.result }),
      ...(task.download_url && { download_url: task.download_url }),
      ...(task.error && { error: task.error }),
      // HTMLビューURLを追加
      ...(task.status === 'completed' && { view_url: `/slides/${task.id}` }),
      // エージェントの進捗情報を追加
      ...(task.agentProgress && { agent_progress: task.agentProgress }),
    };
    
    // デバッグ用：タスクの内容をログ出力
    if (task.status === 'completed' && task.result) {
      console.log('[Task API] Returning completed task with slides:', task.result.slides?.length);
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}