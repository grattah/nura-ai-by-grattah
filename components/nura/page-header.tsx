'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  showBack?: boolean
  backHref?: string
  onBack?: () => void
  className?: string
  rightContent?: React.ReactNode
}

export function PageHeader({
  title,
  showBack = true,
  backHref = '/',
  onBack,
  className,
  rightContent,
}: PageHeaderProps) {
  const BackButton = () => (
    <button
      onClick={onBack}
      className="flex items-center gap-1 text-foreground hover:opacity-80 transition-opacity"
    >
      <ChevronLeft className="w-5 h-5" />
      <span className="text-base">Back</span>
    </button>
  )

  const BackLink = () => (
    <Link
      href={backHref}
      className="flex items-center gap-1 text-foreground hover:opacity-80 transition-opacity"
    >
      <ChevronLeft className="w-5 h-5" />
      <span className="text-base">Back</span>
    </Link>
  )

  return (
    <header className={cn('flex items-center justify-between px-4 py-4', className)}>
      <div className="w-20">
        {showBack && (onBack ? <BackButton /> : <BackLink />)}
      </div>
      <h1 className="text-xl font-semibold text-foreground text-center flex-1">
        {title}
      </h1>
      <div className="w-20 flex justify-end">
        {rightContent}
      </div>
    </header>
  )
}
