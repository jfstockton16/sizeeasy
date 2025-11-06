import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'

// Initialize Replicate client
const replicate = process.env.REPLICATE_API_TOKEN
  ? new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    })
  : null

export async function POST(req: NextRequest) {
  try {
    if (!replicate) {
      return NextResponse.json(
        { error: 'Replicate API token not configured' },
        { status: 500 }
      )
    }

    const { prompt, object1, object2 } = await req.json()

    // Generate comparison image using Stable Diffusion
    const output = await replicate.run(
      'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
      {
        input: {
          prompt: prompt || `Side by side comparison of ${object1} and ${object2}, photorealistic, detailed, professional photography, white background`,
          negative_prompt: 'ugly, blurry, low quality, distorted',
          width: 1024,
          height: 768,
          num_inference_steps: 30,
          guidance_scale: 7.5,
        },
      }
    )

    return NextResponse.json({ image: output })
  } catch (error) {
    console.error('Error generating image:', error)
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    )
  }
}

export const runtime = 'edge'
