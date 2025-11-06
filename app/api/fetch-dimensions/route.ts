import { NextRequest, NextResponse } from 'next/server';
import { fetchObjectDimensions, validateDimensions } from '@/lib/ai-dimensions';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { objectName } = await req.json();

    if (!objectName || typeof objectName !== 'string') {
      return NextResponse.json(
        { error: 'Object name is required' },
        { status: 400 }
      );
    }

    // Sanitize input
    const sanitized = objectName.trim().slice(0, 200);

    if (sanitized.length === 0) {
      return NextResponse.json(
        { error: 'Object name cannot be empty' },
        { status: 400 }
      );
    }

    // Fetch dimensions using AI
    const dimensions = await fetchObjectDimensions(sanitized);

    // Validate results
    if (!validateDimensions(dimensions)) {
      return NextResponse.json(
        { error: 'Invalid dimensions received' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: dimensions,
    });
  } catch (error) {
    console.error('Dimension fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dimensions' },
      { status: 500 }
    );
  }
}
