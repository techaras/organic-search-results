import { redirect } from 'next/navigation'

import { LogoutButton } from '@/components/logout-button'
import { InsertCsv } from '@/components/insert-csv'
import { createClient } from '@/lib/supabase/server'

export default async function ProtectedPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect('/auth/login')
  }

  return (
    <div className="relative h-svh w-full">
      {/* Greeting and logout button together in top right corner */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <p>
          <span>{data.user.email}</span>
        </p>
        <LogoutButton />
      </div>

      {/* CSV upload component and serper button at center */}
      <div className="flex flex-col items-center pt-20 gap-4">
        <InsertCsv />
      </div>
    </div>
  )
}
