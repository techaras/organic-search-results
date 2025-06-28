import { redirect } from 'next/navigation'

import { LogoutButton } from '@/components/logout-button'
import { InsertCsv } from '@/components/insert-csv'
import { ImportsList } from '@/components/imports-list'
import { SerperResults } from '@/components/serper-results'
import { createClient } from '@/lib/supabase/server'

interface ProtectedPageProps {
  searchParams: Promise<{ import_id?: string }>
}

export default async function ProtectedPage({ searchParams }: ProtectedPageProps) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect('/auth/login')
  }

  return (
    <div className="relative h-svh w-full">
      {/* Greeting and logout button together in top right corner */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <p>
          <span>{data.user.email}</span>
        </p>
        <LogoutButton />
      </div>

      {/* Two-column layout */}
      <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-4 p-6 pt-20">
        {/* Left column: CSV upload and imports list */}
        <div className="flex flex-col gap-4 w-full">
          <InsertCsv className="w-full max-w-none" />
          <ImportsList className="w-full max-w-none" />
        </div>

        {/* Right column: Search results */}
        <div className="flex flex-col">
          <SerperResults searchParams={searchParams} />
        </div>
      </div>
    </div>
  )
}
