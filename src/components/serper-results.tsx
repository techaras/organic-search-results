import * as React from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ResultsSwitch } from '@/components/results-switch'
import { ExportCsv } from '@/components/export-csv'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

interface SearchResult {
  id: string
  query: string
  position: number
  link: string
  user_id: string
  import_id: string
  created_at: string
}

interface GroupedResults {
  [keyword: string]: SearchResult[]
}

interface SerperResultsProps {
  searchParams: Promise<{ import_id?: string }>
  className?: string
}

export async function SerperResults({ searchParams, className, ...props }: SerperResultsProps) {
  const params = await searchParams
  const importId = params.import_id

  let searchResults: SearchResult[] = []
  let importInfo: { file_name: string; total_keywords: number } | null = null
  let error: string | null = null

  if (importId) {
    try {
      const supabase = await createClient()
      
      // Verify user is authenticated
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        redirect('/auth/login')
      }

      // Fetch import info
      const { data: importData, error: importError } = await supabase
        .from('imports')
        .select('file_name, total_keywords')
        .eq('id', importId)
        .eq('user_id', userData.user.id)
        .single()

      if (importError) {
        console.error('Error fetching import info:', importError)
        error = 'Failed to load import information'
      } else {
        importInfo = importData
      }

      // Fetch search results for the selected import
      const { data: resultsData, error: resultsError } = await supabase
        .from('search_results')
        .select('*')
        .eq('import_id', importId)
        .eq('user_id', userData.user.id)
        .order('query', { ascending: true })
        .order('position', { ascending: true })

      if (resultsError) {
        console.error('Error fetching search results:', resultsError)
        error = 'Failed to load search results'
      } else {
        searchResults = resultsData as SearchResult[]
      }

    } catch (err) {
      console.error('Error in SerperResults:', err)
      error = 'An unexpected error occurred'
    }
  }

  // Group results by keyword
  const groupedResults: GroupedResults = searchResults.reduce((acc, result) => {
    if (!acc[result.query]) {
      acc[result.query] = []
    }
    acc[result.query].push(result)
    return acc
  }, {} as GroupedResults)

  const totalKeywords = Object.keys(groupedResults).length
  const totalResults = searchResults.length

  return (
    <Card className={`h-full ${className || ''}`} {...props}>
      <CardHeader>
        <div className="flex justify-start mb-6">
          <div className="flex items-center gap-2">
            <ExportCsv />
            <ResultsSwitch />
          </div>
        </div>
        <CardTitle>Search Results</CardTitle>
        <CardDescription>
          {importId && importInfo 
            ? `Results for ${importInfo.file_name} • ${totalKeywords} keywords • ${totalResults} search results`
            : 'Select a file to view search results'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-auto">
        {error ? (
          <div className="text-sm text-red-600 p-4 bg-red-50 rounded-md">
            Error: {error}
          </div>
        ) : !importId ? (
          <div className="text-sm text-muted-foreground">
            No file selected. Use the dropdown above to select a file and view search results.
          </div>
        ) : totalResults === 0 ? (
          <div className="text-sm text-muted-foreground">
            No search results found for this import. You may need to run searches first using the &quot;Send&quot; button in your imports list.
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedResults).map(([keyword, results]) => (
              <div key={keyword} className="border-b pb-4 last:border-b-0">
                <h3 className="font-semibold text-lg mb-3 text-primary">
                  {keyword}
                </h3>
                <div className="space-y-2">
                  {results.map((result) => (
                    <div
                      key={result.id}
                      className="flex items-start gap-3 p-3 bg-muted/30 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
                        {result.position}
                      </div>
                      <div className="flex-1 min-w-0">
                        <a
                          href={result.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline line-clamp-2"
                        >
                          {result.link}
                        </a>
                        <div className="text-xs text-muted-foreground mt-1">
                          Position {result.position} • Added {new Date(result.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}