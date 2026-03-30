'use client'

import { cn } from '@/lib/utils'

interface NuraLogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'full' | 'icon' | 'text'
}

export function NuraLogo({ className, size = 'md', variant = 'full' }: NuraLogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20',
  }

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
  }

  const LogoIcon = () => (
    <div className={cn(
      'rounded-xl bg-nura-cream flex items-center justify-center',
      sizeClasses[size],
      className
    )}>
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-3/4 h-3/4"
      >
        <path
          d="M20 8C20 8 12 12 12 20C12 28 20 32 20 32"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="text-nura-forest"
        />
        <path
          d="M20 8C20 8 28 12 28 20C28 28 20 32 20 32"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="text-nura-forest"
        />
        <path
          d="M20 8V32"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="text-nura-forest"
        />
        <circle cx="20" cy="14" r="2" fill="currentColor" className="text-nura-forest" />
      </svg>
    </div>
  )

  if (variant === 'icon') {
    return <LogoIcon />
  }

  if (variant === 'text') {
    return (
      <span className={cn('font-semibold italic text-foreground', textSizeClasses[size], className)}>
        Nura.ai
      </span>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <LogoIcon />
      <span className={cn('font-semibold italic text-foreground', textSizeClasses[size])}>
        Nura.ai
      </span>
    </div>
  )
}

export function NuraLeafIcon({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  }

  return (
    <div className={cn(
      'rounded-full bg-nura-olive flex items-center justify-center',
      sizeClasses[size],
      className
    )}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-1/2 h-1/2"
      >
        <path
          d="M12 4C12 4 6 7 6 12C6 17 12 20 12 20"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="text-nura-cream"
        />
        <path
          d="M12 4C12 4 18 7 18 12C18 17 12 20 12 20"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="text-nura-cream"
        />
        <path
          d="M12 4V20"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="text-nura-cream"
        />
      </svg>
    </div>
  )
}

export function NuraGoldLeafIcon({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
  }

  return (
    <div className={cn(
      'rounded-full bg-nura-gold flex items-center justify-center',
      sizeClasses[size],
      className
    )}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-1/2 h-1/2"
      >
        <path
          d="M12 4C12 4 6 7 6 12C6 17 12 20 12 20"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="text-nura-cream"
        />
        <path
          d="M12 4C12 4 18 7 18 12C18 17 12 20 12 20"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="text-nura-cream"
        />
        <path
          d="M12 4V20"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="text-nura-cream"
        />
      </svg>
    </div>
  )
}
