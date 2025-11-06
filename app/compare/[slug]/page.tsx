// Dynamic route for shareable comparison pages
// URL format: /compare/elephant-vs-bus

import { Metadata } from 'next'
import { getObjectById } from '@/lib/objects'

interface Props {
  params: {
    slug: string
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Parse slug like "elephant-vs-bus"
  const [obj1Id, , obj2Id] = params.slug.split('-vs-')

  const obj1 = getObjectById(obj1Id)
  const obj2 = getObjectById(obj2Id)

  if (!obj1 || !obj2) {
    return {
      title: 'Comparison Not Found - SizeEasy',
    }
  }

  return {
    title: `${obj1.name} vs ${obj2.name} - SizeEasy`,
    description: `Compare the size of ${obj1.name} and ${obj2.name}. ${obj1.description} vs ${obj2.description}`,
    openGraph: {
      title: `${obj1.name} vs ${obj2.name}`,
      description: `Compare the size of ${obj1.name} and ${obj2.name}`,
      images: [
        {
          url: `/api/og?obj1=${obj1Id}&obj2=${obj2Id}`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${obj1.name} vs ${obj2.name}`,
      description: `Compare the size of ${obj1.name} and ${obj2.name}`,
      images: [`/api/og?obj1=${obj1Id}&obj2=${obj2Id}`],
    },
  }
}

export default function ComparisonPage({ params }: Props) {
  // This would render the comparison with pre-selected objects
  // For MVP, redirect to home with query params
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Loading comparison...</h1>
        <p className="text-gray-600">Redirecting you to the comparison tool</p>
      </div>
    </div>
  )
}
