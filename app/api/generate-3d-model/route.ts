import { NextRequest, NextResponse } from 'next/server';
import {
  createTextTo3DTask,
  checkTaskStatus,
  generateOptimizedPrompt,
} from '@/lib/meshy';

export const runtime = 'nodejs'; // Meshy API needs longer timeout
export const maxDuration = 300; // 5 minutes for 3D generation

export async function POST(req: NextRequest) {
  try {
    const { objectName, category, dimensions, taskId } = await req.json();

    // If taskId provided, check status of existing task
    if (taskId) {
      const status = await checkTaskStatus(taskId);
      return NextResponse.json({
        success: true,
        data: status,
      });
    }

    // Otherwise, create new task
    if (!objectName) {
      return NextResponse.json(
        { error: 'Object name is required' },
        { status: 400 }
      );
    }

    // Generate optimized prompt
    const prompt = generateOptimizedPrompt(objectName, dimensions);

    // Determine art style based on category
    let artStyle: 'realistic' | 'cartoon' | 'sculpture' | 'pbr' = 'realistic';
    if (category === 'Animals') artStyle = 'realistic';
    if (category === 'Vehicles') artStyle = 'pbr';
    if (category === 'Buildings') artStyle = 'realistic';

    // Create 3D generation task
    const newTaskId = await createTextTo3DTask(prompt, {
      artStyle,
      aiModel: 'meshy-3',
    });

    return NextResponse.json({
      success: true,
      data: {
        taskId: newTaskId,
        status: 'PENDING',
        message: '3D model generation started',
      },
    });
  } catch (error) {
    console.error('3D model generation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate 3D model',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const taskId = req.nextUrl.searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    const status = await checkTaskStatus(taskId);

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('Task status check error:', error);
    return NextResponse.json(
      {
        error: 'Failed to check task status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
