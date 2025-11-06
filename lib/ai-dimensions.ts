/**
 * AI-Powered Dimension Fetching Service
 * Uses OpenAI GPT-4 to fetch accurate dimensions for any object
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export interface ObjectDimensions {
  name: string;
  category: string;
  height?: number;  // meters
  width?: number;   // meters
  length?: number;  // meters
  weight?: number;  // kg
  volume?: number;  // cubic meters
  description: string;
  funFacts: string[];
  confidence: number; // 0-1 score
  source?: string;
}

const DIMENSION_FETCH_PROMPT = `You are a precise measurement expert. Given an object name, provide accurate real-world dimensions and facts.

Return a JSON object with this exact structure:
{
  "name": "Official/common name of the object",
  "category": "One of: Animals, Vehicles, Buildings, Monuments, People, Nature, Technology, Sports, Everyday Objects",
  "height": number in meters (or null if not applicable),
  "width": number in meters (or null if not applicable),
  "length": number in meters (or null if not applicable),
  "weight": number in kilograms (or null if not applicable),
  "volume": number in cubic meters (or null if not applicable),
  "description": "Brief 1-2 sentence description",
  "funFacts": ["fact 1", "fact 2", "fact 3"],
  "confidence": 0.0-1.0 (how confident you are in these measurements)
}

IMPORTANT RULES:
- Use meters for all length measurements
- Use kilograms for weight
- Be as accurate as possible - use average values for things with variation
- If the object doesn't exist or is fictional, make reasonable estimations based on depictions
- For vehicles, length = front to back, width = side to side, height = ground to top
- For buildings, include antenna/spire in height if iconic
- Always include 3 interesting facts
- Confidence should reflect measurement certainty (0.9+ for well-documented objects)

Examples:
- "BMW X4" → compact luxury SUV with precise dimensions
- "Boeing 757" → commercial aircraft with exact specifications
- "Eiffel Tower" → famous monument with well-known measurements
- "Blue Whale" → largest animal with average adult dimensions
- "Coffee Mug" → typical household mug dimensions`;

/**
 * Fetch object dimensions using OpenAI GPT-4
 */
export async function fetchObjectDimensions(
  objectName: string
): Promise<ObjectDimensions> {
  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your_openai_api_key_here') {
    // Fallback: return estimated dimensions
    console.warn('OpenAI API key not set, using fallback estimation');
    return generateFallbackDimensions(objectName);
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Fast and cost-effective
        messages: [
          {
            role: 'system',
            content: DIMENSION_FETCH_PROMPT,
          },
          {
            role: 'user',
            content: `Get dimensions for: ${objectName}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1, // Low temperature for factual accuracy
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      return generateFallbackDimensions(objectName);
    }

    const data = await response.json();
    const dimensions = JSON.parse(data.choices[0].message.content);

    return {
      ...dimensions,
      name: dimensions.name || objectName,
      funFacts: dimensions.funFacts || [],
    };
  } catch (error) {
    console.error('Error fetching dimensions:', error);
    return generateFallbackDimensions(objectName);
  }
}

/**
 * Fallback dimension estimation when API is not available
 */
function generateFallbackDimensions(objectName: string): ObjectDimensions {
  const lowerName = objectName.toLowerCase();

  // Try to categorize and estimate
  let category = 'Everyday Objects';
  let height = 1;
  let width = 0.5;
  let length = 0.5;
  let weight = 10;

  // Vehicle patterns
  if (
    lowerName.includes('car') ||
    lowerName.includes('suv') ||
    lowerName.includes('truck') ||
    lowerName.includes('bmw') ||
    lowerName.includes('tesla') ||
    lowerName.includes('ford')
  ) {
    category = 'Vehicles';
    height = 1.6;
    width = 1.9;
    length = 4.5;
    weight = 1800;
  }

  // Aircraft patterns
  if (
    lowerName.includes('plane') ||
    lowerName.includes('aircraft') ||
    lowerName.includes('boeing') ||
    lowerName.includes('airbus') ||
    lowerName.includes('jet')
  ) {
    category = 'Vehicles';
    height = 13;
    width = 38;
    length = 47;
    weight = 90000;
  }

  // Building patterns
  if (
    lowerName.includes('tower') ||
    lowerName.includes('building') ||
    lowerName.includes('skyscraper') ||
    lowerName.includes('house')
  ) {
    category = 'Buildings';
    height = 50;
    width = 30;
    length = 30;
    weight = 1000000;
  }

  // Animal patterns
  if (
    lowerName.includes('whale') ||
    lowerName.includes('elephant') ||
    lowerName.includes('dog') ||
    lowerName.includes('cat') ||
    lowerName.includes('lion')
  ) {
    category = 'Animals';
    height = 2;
    width = 1;
    length = 3;
    weight = 500;
  }

  return {
    name: objectName,
    category,
    height,
    width,
    length,
    weight,
    volume: height * width * length,
    description: `A ${objectName} (estimated dimensions - connect OpenAI API for accurate data)`,
    funFacts: [
      `This is an estimated size for ${objectName}`,
      'Connect your OpenAI API key for accurate dimensions',
      'Real measurements will be fetched from AI knowledge base',
    ],
    confidence: 0.3,
  };
}

/**
 * Batch fetch multiple objects (optimized)
 */
export async function fetchMultipleObjectDimensions(
  objectNames: string[]
): Promise<ObjectDimensions[]> {
  // Fetch in parallel
  const promises = objectNames.map(name => fetchObjectDimensions(name));
  return Promise.all(promises);
}

/**
 * Validate if object dimensions are reasonable
 */
export function validateDimensions(dimensions: ObjectDimensions): boolean {
  const { height, width, length, weight, confidence } = dimensions;

  // Check for unreasonable values
  if (height && (height < 0.001 || height > 10000)) return false;
  if (width && (width < 0.001 || width > 10000)) return false;
  if (length && (length < 0.001 || length > 10000)) return false;
  if (weight && (weight < 0.001 || weight > 10000000)) return false;
  if (confidence < 0 || confidence > 1) return false;

  return true;
}

/**
 * Generate image prompt from dimensions
 */
export function generateImagePrompt(dimensions: ObjectDimensions): string {
  const { name, category, description } = dimensions;

  let prompt = `Professional photograph of ${name}, ${description}`;

  switch (category) {
    case 'Animals':
      prompt += ', natural habitat, high quality wildlife photography';
      break;
    case 'Vehicles':
      prompt += ', side profile view, studio lighting, photorealistic';
      break;
    case 'Buildings':
      prompt += ', architectural photography, clear sky, professional';
      break;
    default:
      prompt += ', professional photography, clean background';
  }

  return prompt;
}
