import { createClient } from '@/lib/supabase/server'

// TypeScript interfaces
export interface OrganicResult {
  title: string
  link: string
  snippet: string
  position: number
  date?: string
  sitelinks?: Array<{
    title: string
    link: string
  }>
}

export interface SerperResponse {
  searchParameters: {
    q: string
    gl: string
    type: string
    location: string
    engine: string
  }
  organic: OrganicResult[]
  credits: number
}

export interface SearchResultRecord {
  query: string
  position: number
  link: string
  user_id: string
  import_id: string
}

export interface ProcessedSearchResult {
  keyword: string
  keywordId: string
  totalResults: number
  savedResults: number
  searchData: SerperResponse
}

/**
 * Parse Serper response and extract first 10 organic results
 */
export function parseOrganicResults(
  serperResponse: SerperResponse,
  keyword: string,
  userId: string,
  importId: string
): SearchResultRecord[] {
  const organicResults = serperResponse.organic || []
  
  // Take only first 10 results
  const firstTenResults = organicResults.slice(0, 10)
  
  return firstTenResults.map((result) => ({
    query: keyword,
    position: result.position,
    link: result.link,
    user_id: userId,
    import_id: importId
  }))
}

/**
 * Save search results to database in batches
 */
export async function saveSearchResults(results: SearchResultRecord[]): Promise<number> {
  if (!results.length) return 0
  
  const supabase = await createClient()
  
  // Insert all results at once
  const { error } = await supabase
    .from('search_results')
    .insert(results)
  
  if (error) {
    console.error('Database insertion error for search results:', error)
    throw new Error(`Failed to save search results: ${error.message}`)
  }
  
  return results.length
}

/**
 * Process a single keyword search and save results
 */
export async function processKeywordSearch(
  keyword: string,
  keywordId: string,
  userId: string,
  importId: string,
  apiKey: string
): Promise<ProcessedSearchResult> {
  // Search parameters for UK location
  const searchParams = {
    q: keyword,
    gl: 'gb', // United Kingdom
    location: 'United Kingdom',
    hl: 'en' // English
  }

  // Call Serper API
  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(searchParams)
  })

  if (!response.ok) {
    throw new Error(`Serper API error for keyword "${keyword}": ${response.status} ${response.statusText}`)
  }

  const searchData: SerperResponse = await response.json()
  
  // Parse organic results
  const organicResults = parseOrganicResults(searchData, keyword, userId, importId)
  
  // Save to database
  const savedResults = await saveSearchResults(organicResults)
  
  return {
    keyword,
    keywordId,
    totalResults: searchData.organic?.length || 0,
    savedResults,
    searchData
  }
}

/**
 * Get search results for a specific import
 */
export async function getSearchResultsForImport(importId: string, userId: string) {
  const supabase = await createClient()
  
  const { data: results, error } = await supabase
    .from('search_results')
    .select('*')
    .eq('import_id', importId)
    .eq('user_id', userId)
    .order('query', { ascending: true })
    .order('position', { ascending: true })
  
  if (error) {
    console.error('Error fetching search results:', error)
    throw new Error(`Failed to fetch search results: ${error.message}`)
  }
  
  return results
}