'use client'

import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import Papa from 'papaparse'

interface SearchResult {
  id: string
  query: string
  position: number
  link: string
  user_id: string
  import_id: string
  created_at: string
}

export function ExportCsv() {
  const searchParams = useSearchParams()
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const importId = searchParams.get('import_id')

  const handleExport = async () => {
    if (!importId) {
      setError('No import selected. Please select a file first.')
      return
    }

    setIsExporting(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // Verify user is authenticated
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        throw new Error('User not authenticated')
      }

      // Fetch search results for the selected import
      const { data: searchResults, error: resultsError } = await supabase
        .from('search_results')
        .select('*')
        .eq('import_id', importId)
        .eq('user_id', userData.user.id)
        .order('query', { ascending: true })
        .order('position', { ascending: true })

      if (resultsError) {
        throw new Error(`Failed to fetch search results: ${resultsError.message}`)
      }

      const results = searchResults as SearchResult[]

      if (!results || results.length === 0) {
        setError('No search results found for this import.')
        return
      }

      // Get import info for filename
      const { data: importData, error: importError } = await supabase
        .from('imports')
        .select('file_name')
        .eq('id', importId)
        .eq('user_id', userData.user.id)
        .single()

      if (importError) {
        console.warn('Could not fetch import filename:', importError)
      }

      // Format data for CSV export
      const csvData = results.map(result => ({
        Query: result.query,
        Position: result.position,
        Link: result.link
      }))

      // Convert to CSV string using Papa Parse
      const csvString = Papa.unparse(csvData)

      // Create filename
      const timestamp = new Date().toISOString().split('T')[0] // YYYY-MM-DD
      const baseFilename = importData?.file_name ? 
        importData.file_name.replace('.csv', '') : 
        'search_results'
      const filename = `${baseFilename}_search_results_${timestamp}.csv`

      // Create and trigger download
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', filename)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }

      console.log(`Successfully exported ${results.length} search results`)

    } catch (err) {
      console.error('Export error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred during export')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={isExporting || !importId}
        className="gap-2"
      >
        {isExporting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Exporting...
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            Export CSV
          </>
        )}
      </Button>
      {error && (
        <div className="text-xs text-red-600 max-w-48">
          {error}
        </div>
      )}
    </div>
  )
}