'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExploreItem {
  id: string
  title: string
  description: string
  href?: string
}

interface ExploreMoreSectionProps {
  title?: string
  items: ExploreItem[]
  className?: string
}

export function ExploreMoreSection({ title = 'Explore More', items, className }: ExploreMoreSectionProps) {
  return (
    <div className={cn('bg-card rounded-2xl p-5', className)}>
      <h2 className="text-lg font-semibold text-card-foreground mb-4">{title}</h2>
      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={item.id}>
            <ExploreItem item={item} />
            {index < items.length - 1 && <div className="border-b border-border mt-4" />}
          </div>
        ))}
      </div>
    </div>
  )
}

function ExploreItem({ item }: { item: ExploreItem }) {
  const content = (
    <>
      <h3 className="font-semibold text-card-foreground mb-1">{item.title}</h3>
      <p className="text-sm text-muted-foreground mb-2 leading-relaxed">{item.description}</p>
      <span className="inline-flex items-center gap-1 text-nura-peach text-sm font-medium">
        Review <ArrowRight className="w-4 h-4" />
      </span>
    </>
  )

  if (item.href) {
    return (
      <Link href={item.href} className="block hover:opacity-80 transition-opacity">
        {content}
      </Link>
    )
  }

  return <div>{content}</div>
}

export const defaultExploreItems: ExploreItem[] = [
  {
    id: '1',
    title: 'High Cancer Risks',
    description: 'You have got a huge appetite and are not scared to lose your health',
    href: '/cancer-risks',
  },
  {
    id: '2',
    title: 'Remedies & Preventions',
    description: 'Save for long term goals. Minimum period of 1 year with awesome returns.',
    href: '/remedies',
  },
  {
    id: '3',
    title: 'Recipes',
    description: 'Save for long term goals. Minimum period of 1 year with awesome returns.',
    href: '/recipes',
  },
]
