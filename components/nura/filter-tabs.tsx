'use client'

import { cn } from '@/lib/utils'

interface FilterTab {
  id: string
  label: string
}

interface FilterTabsProps {
  tabs: FilterTab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  className?: string
}

export function FilterTabs({ tabs, activeTab, onTabChange, className }: FilterTabsProps) {
  return (
    <div className={cn('flex gap-2 overflow-x-auto hide-scrollbar pb-2', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
            activeTab === tab.id
              ? 'bg-card text-card-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export const defaultWellnessTabs: FilterTab[] = [
  { id: 'all', label: 'All' },
  { id: 'heart', label: 'Heart' },
  { id: 'weight', label: 'Weight' },
  { id: 'liver-kidney', label: 'Liver/Kidney' },
  { id: 'detoxing', label: 'Detoxing' },
]
