'use client'

import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NotificationCardProps {
  id: string
  title: string
  message: string
  timestamp: string
  isRead?: boolean
  className?: string
  onClick?: () => void
}

export function NotificationCard({
  id,
  title,
  message,
  timestamp,
  isRead = false,
  className,
  onClick,
}: NotificationCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-card rounded-xl p-4 cursor-pointer transition-opacity hover:opacity-90',
        !isRead && 'border-l-2 border-nura-peach',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
          <Bell className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-card-foreground mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
            {message}
          </p>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-border">
        <p className="text-sm text-muted-foreground">{timestamp}</p>
      </div>
    </div>
  )
}
