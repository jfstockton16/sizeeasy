/**
 * Meshy API Service
 * Handles 3D model generation using Meshy's AI API
 * Docs: https://docs.meshy.ai/
 */

const MESHY_API_KEY = process.env.MESHY_API_KEY;
const MESHY_BASE_URL = 'https://api.meshy.ai/v1';

export interface MeshyTaskResponse {
  id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED';
  model_url?: string;
  thumbnail_url?: string;
  progress?: number;
  error_message?: string;
}

export interface MeshyModelResult {
  taskId: string;
  status: string;
  modelUrl?: string;
  thumbnailUrl?: string;
  glbUrl?: string;
  fbxUrl?: string;
  usdzUrl?: string;
}

/**
 * Create a text-to-3D generation task
 */
export async function createTextTo3DTask(
  prompt: string,
  options: {
    artStyle?: 'realistic' | 'cartoon' | 'sculpture' | 'pbr';
    negativePrompt?: string;
    aiModel?: 'meshy-3' | 'meshy-2';
  } = {}
): Promise<string> {
  const {
    artStyle = 'realistic',
    negativePrompt = 'low quality, low resolution, blurry',
    aiModel = 'meshy-3'
  } = options;

  const response = await fetch(`${MESHY_BASE_URL}/text-to-3d`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MESHY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mode: 'preview',
      prompt,
      art_style: artStyle,
      negative_prompt: negativePrompt,
      ai_model: aiModel,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Meshy API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.result; // Returns task ID
}

/**
 * Check the status of a 3D generation task
 */
export async function checkTaskStatus(taskId: string): Promise<MeshyTaskResponse> {
  const response = await fetch(`${MESHY_BASE_URL}/text-to-3d/${taskId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${MESHY_API_KEY}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Meshy API error: ${response.status} - ${error}`);
  }

  return await response.json();
}

/**
 * Poll for task completion with timeout
 */
export async function waitForTaskCompletion(
  taskId: string,
  maxWaitTime: number = 300000, // 5 minutes
  pollInterval: number = 3000 // 3 seconds
): Promise<MeshyModelResult> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    const status = await checkTaskStatus(taskId);

    if (status.status === 'SUCCEEDED') {
      return {
        taskId,
        status: 'SUCCEEDED',
        modelUrl: status.model_url,
        thumbnailUrl: status.thumbnail_url,
        glbUrl: status.model_url, // Meshy typically returns GLB
        fbxUrl: status.model_url,
        usdzUrl: status.model_url,
      };
    }

    if (status.status === 'FAILED') {
      throw new Error(`3D generation failed: ${status.error_message || 'Unknown error'}`);
    }

    // Still processing, wait before next check
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error('3D generation timeout - task took too long');
}

/**
 * Generate a 3D model from text prompt (complete flow)
 */
export async function generateModel(
  objectName: string,
  category?: string
): Promise<MeshyModelResult> {
  // Enhance prompt based on category
  let enhancedPrompt = objectName;

  if (category) {
    switch (category.toLowerCase()) {
      case 'animals':
        enhancedPrompt = `Realistic ${objectName}, detailed textures, natural pose, high quality 3D model`;
        break;
      case 'vehicles':
        enhancedPrompt = `Detailed ${objectName} vehicle, accurate proportions, realistic materials, high quality 3D model`;
        break;
      case 'buildings':
        enhancedPrompt = `Architectural ${objectName}, detailed structure, realistic materials, high quality 3D model`;
        break;
      default:
        enhancedPrompt = `Realistic ${objectName}, detailed and accurate, high quality 3D model`;
    }
  }

  // Create task
  const taskId = await createTextTo3DTask(enhancedPrompt, {
    artStyle: 'realistic',
  });

  // Wait for completion
  return await waitForTaskCompletion(taskId);
}

/**
 * Refine a preview model to high quality
 * (Optional - preview models are usually sufficient for comparison)
 */
export async function refineModel(previewTaskId: string): Promise<string> {
  const response = await fetch(`${MESHY_BASE_URL}/text-to-3d/${previewTaskId}/refine`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MESHY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mode: 'refine',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Meshy API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.result; // Returns refined task ID
}

/**
 * Generate optimized prompt for better 3D model results
 */
export function generateOptimizedPrompt(
  objectName: string,
  dimensions?: { height?: number; width?: number; length?: number }
): string {
  let prompt = `Highly detailed ${objectName}, realistic textures, accurate proportions`;

  if (dimensions) {
    const aspectRatio = calculateAspectRatio(dimensions);
    prompt += `, ${aspectRatio} proportions`;
  }

  return prompt;
}

function calculateAspectRatio(dimensions: {
  height?: number;
  width?: number;
  length?: number;
}): string {
  const { height = 1, width = 1, length = 1 } = dimensions;
  const max = Math.max(height, width, length);

  if (height === max) return 'tall vertical';
  if (length === max) return 'elongated horizontal';
  if (width === max) return 'wide horizontal';
  return 'cubic';
}
