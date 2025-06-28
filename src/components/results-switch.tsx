'use client'

import * as React from 'react'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronsUpDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ImportRecord {
  id: string
  user_id: string
  file_name: string
  upload_date: string
  total_keywords: number
}

export function ResultsSwitch() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [imports, setImports] = useState<ImportRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get current selection from URL search params
  const currentImportId = searchParams.get('import_id') || ''

  // Fetch imports on component mount
  useEffect(() => {
    const fetchImports = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const supabase = createClient()
        const { data: userData } = await supabase.auth.getUser()
        
        if (!userData.user) {
          setError('User not authenticated')
          return
        }

        // Fetch all imports for the current user
        const { data: importsData, error: importsError } = await supabase
          .from('imports')
          .select('*')
          .eq('user_id', userData.user.id)
          .order('upload_date', { ascending: false })

        if (importsError) {
          console.error('Error fetching imports:', importsError)
          setError('Failed to load imports')
          return
        }

        setImports(importsData as ImportRecord[])
        
      } catch (err) {
        console.error('Error in fetchImports:', err)
        setError('An error occurred while loading imports')
      } finally {
        setIsLoading(false)
      }
    }

    fetchImports()
  }, [])

  const handleSelect = (importId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (importId) {
      params.set('import_id', importId)
    } else {
      params.delete('import_id')
    }
    
    // Update the URL with the new search params
    router.push(`?${params.toString()}`, { scroll: false })
  }

  if (error) {
    return (
      <div className="text-sm text-red-600">
        Error: {error}
      </div>
    )
  }

  return (
    <div className="relative">
      <select
        value={currentImportId}
        onChange={(e) => handleSelect(e.target.value)}
        disabled={isLoading}
        className="appearance-none bg-background border border-input rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">
          {isLoading ? 'Loading imports...' : 'Select a file'}
        </option>
        {imports.map((importRecord) => (
          <option key={importRecord.id} value={importRecord.id}>
            {importRecord.file_name} ({importRecord.total_keywords} keywords)
          </option>
        ))}
      </select>
      <ChevronsUpDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
    </div>
  )
}