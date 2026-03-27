'use client'

import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NuraGoldLeafIcon } from './nura-logo'

interface TodaysRecipeCardProps {
  category?: string
  date?: string
  title?: string
  description?: string
  onExplore?: () => void
  className?: string
  variant?: 'peach' | 'gold'
}

export function TodaysRecipeCard({
  category = 'Wellness',
  date = '22nd Mar, 2026',
  title = "Today's Recipe",
  description = 'Discover insights that help you understand your health better.',
  onExplore,
  className,
  variant = 'peach',
}: TodaysRecipeCardProps) {
  const variantClasses = {
    peach: 'bg-nura-peach',
    gold: 'bg-nura-gold',
  }

  return (
    <div className={cn(
      'rounded-2xl p-5 relative overflow-hidden',
      variantClasses[variant],
      className
    )}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-nura-forest/80 mb-2">
            <span>{category}</span>
            <ArrowRight className="w-3 h-3" />
            <span>{date}</span>
          </div>
          <h2 className="text-2xl font-semibold text-nura-forest mb-2">{title}</h2>
          <p className="text-sm text-nura-forest/80 mb-4 max-w-[200px]">{description}</p>
          <button
            onClick={onExplore}
            className="inline-flex items-center gap-2 bg-card text-card-foreground px-4 py-2 rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Explore
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <NuraGoldLeafIcon size="lg" />
      </div>
    </div>
  )
}
