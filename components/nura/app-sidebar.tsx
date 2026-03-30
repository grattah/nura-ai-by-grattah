'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X, Bookmark, Bell, LogOut, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NuraLeafIcon } from './nura-logo'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface AppSidebarProps {
  isOpen: boolean
  onClose: () => void
  user?: {
    name: string
    email?: string
  } | null
}

export function AppSidebar({ isOpen, onClose, user }: AppSidebarProps) {
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setIsSigningOut(false)
      onClose()
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 z-40 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-nura-forest z-50 transform transition-transform duration-300 ease-in-out flex flex-col',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pt-12">
          <h2 className="text-xl font-semibold text-nura-cream">Menu</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-nura-forest-light flex items-center justify-center text-nura-cream hover:opacity-80 transition-opacity"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-6 py-4">
          <div className="space-y-3">
            <Link
              href="/bookmarks"
              onClick={onClose}
              className="flex items-center justify-between p-4 bg-nura-forest-light rounded-xl text-nura-cream hover:opacity-80 transition-opacity"
            >
              <div className="flex items-center gap-3">
                <Bookmark className="w-5 h-5" />
                <span className="font-medium">My Bookmarks</span>
              </div>
              <ChevronRight className="w-5 h-5 text-nura-cream/60" />
            </Link>

            <Link
              href="/notifications"
              onClick={onClose}
              className="flex items-center justify-between p-4 bg-nura-forest-light rounded-xl text-nura-cream hover:opacity-80 transition-opacity"
            >
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5" />
                <span className="font-medium">Notifications</span>
              </div>
              <ChevronRight className="w-5 h-5 text-nura-cream/60" />
            </Link>
          </div>
        </nav>

        {/* User Profile & Sign Out */}
        <div className="p-6 border-t border-nura-forest-light">
          {user && (
            <div className="flex items-center gap-3 mb-6">
              <NuraLeafIcon size="sm" />
              <span className="text-nura-cream font-medium">{user.name}</span>
            </div>
          )}
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="w-full flex items-center justify-center gap-2 bg-nura-cream text-nura-forest py-4 rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <LogOut className="w-5 h-5" />
            {isSigningOut ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      </div>
    </>
  )
}
