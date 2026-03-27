'use client'

import { ChevronRight, Leaf } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickTipCardProps {
  title: string
  description: string
  className?: string
  onClick?: () => void
}

export function QuickTipCard({ title, description, className, onClick }: QuickTipCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full bg-card rounded-xl p-4 flex items-center gap-3 transition-opacity hover:opacity-90 text-left',
        className
      )}
    >
      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Leaf className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-card-foreground text-sm">
          Quick Tip - <span className="font-semibold">{title}</span>
        </p>
        <p className="text-sm text-muted-foreground truncate">{description}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
    </button>
  )
}
