'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

interface RecipeCardProps {
  id: string
  title: string
  ingredients?: string[]
  imageUrl?: string
  className?: string
  variant?: 'default' | 'compact' | 'horizontal'
  href?: string
}

export function RecipeCard({
  id,
  title,
  ingredients = [],
  imageUrl,
  className,
  variant = 'default',
  href,
}: RecipeCardProps) {
  const cardContent = (
    <>
      {variant === 'horizontal' ? (
        <div className="flex gap-4">
          <div className="w-24 h-24 rounded-lg bg-muted overflow-hidden shrink-0">
            {imageUrl ? (
              <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-muted" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-card-foreground mb-2">{title}</h3>
            {ingredients.length > 0 && (
              <ul className="text-sm text-muted-foreground space-y-0.5">
                {ingredients.slice(0, 3).map((ingredient, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-muted-foreground">•</span>
                    <span className="truncate">{ingredient}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className={cn(
            'bg-muted rounded-lg overflow-hidden',
            variant === 'compact' ? 'h-28' : 'h-32'
          )}>
            {imageUrl ? (
              <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-muted" />
            )}
          </div>
          <div className="p-3">
            <h3 className="font-semibold text-card-foreground mb-1 text-sm">{title}</h3>
            {ingredients.length > 0 && variant !== 'compact' && (
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {ingredients.slice(0, 3).map((ingredient, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span>•</span>
                    <span className="truncate">{ingredient}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </>
  )

  const cardClasses = cn(
    'bg-card rounded-xl overflow-hidden transition-transform hover:scale-[1.02]',
    variant === 'horizontal' ? 'p-4' : '',
    className
  )

  if (href) {
    return (
      <Link href={href} className={cardClasses}>
        {cardContent}
      </Link>
    )
  }

  return (
    <div className={cardClasses}>
      {cardContent}
    </div>
  )
}

interface CategoryCardProps {
  id: string
  title: string
  imageUrl?: string
  className?: string
  href?: string
  color?: 'sage' | 'gray' | 'peach'
}

export function CategoryCard({
  id,
  title,
  imageUrl,
  className,
  href,
  color = 'sage',
}: CategoryCardProps) {
  const colorClasses = {
    sage: 'bg-nura-sage',
    gray: 'bg-muted',
    peach: 'bg-nura-peach',
  }

  const content = (
    <>
      <div className={cn('h-32 rounded-t-xl', colorClasses[color])}>
        {imageUrl && (
          <img src={imageUrl} alt={title} className="w-full h-full object-cover rounded-t-xl" />
        )}
      </div>
      <div className="p-3 bg-card rounded-b-xl">
        <h3 className="font-medium text-card-foreground text-sm">{title}</h3>
      </div>
    </>
  )

  if (href) {
    return (
      <Link href={href} className={cn('block rounded-xl overflow-hidden transition-transform hover:scale-[1.02]', className)}>
        {content}
      </Link>
    )
  }

  return (
    <div className={cn('rounded-xl overflow-hidden', className)}>
      {content}
    </div>
  )
}
