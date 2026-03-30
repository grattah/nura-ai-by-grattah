import { createClient } from '@/lib/supabase/server'
import { HomeContent } from '@/components/nura/home-content'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return <HomeContent user={user} />
}
