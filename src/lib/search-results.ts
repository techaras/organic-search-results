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
  
  // Log the raw data we received
  console.log(`🔍 Parsing results for keyword: "${keyword}"`)
  console.log(`📊 Raw organic results count: ${organicResults.length}`)
  console.log(`📋 First few positions: ${organicResults.slice(0, 3).map(r => r.position).join(', ')}`)
  
  // Take only first 10 results
  const firstTenResults = organicResults.slice(0, 10)
  
  console.log(`✂️ Taking first ${firstTenResults.length} results (max 10)`)
  
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
  console.log(`\n🚀 Starting search for keyword: "${keyword}"`)
  console.log(`🔑 Keyword ID: ${keywordId}`)
  
  // Search parameters for UK location
  const searchParams = {
    q: keyword,
    gl: 'gb', // United Kingdom
    location: 'United Kingdom',
    hl: 'en' // English
  }

  console.log(`📡 Calling Serper API with params:`, JSON.stringify(searchParams, null, 2))

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
    console.error(`❌ Serper API error for keyword "${keyword}": ${response.status} ${response.statusText}`)
    throw new Error(`Serper API error for keyword "${keyword}": ${response.status} ${response.statusText}`)
  }

  const searchData: SerperResponse = await response.json()
  
  console.log(`✅ Serper API response received for "${keyword}"`)
  console.log(`📊 Total organic results in response: ${searchData.organic?.length || 0}`)
  console.log(`🏷️ Credits used: ${searchData.credits}`)
  
  // Log the raw organic results array for debugging
  if (searchData.organic && searchData.organic.length > 0) {
    console.log(`📝 Raw organic results summary:`)
    searchData.organic.forEach((result, index) => {
      console.log(`   ${index + 1}. Position ${result.position}: ${result.link.substring(0, 60)}...`)
    })
  } else {
    console.log(`⚠️ No organic results found in response for "${keyword}"`)
  }
  
  // Parse organic results
  const organicResults = parseOrganicResults(searchData, keyword, userId, importId)
  
  console.log(`📦 Parsed ${organicResults.length} results for database insertion`)
  
  // Save to database
  const savedResults = await saveSearchResults(organicResults)
  
  console.log(`💾 Successfully saved ${savedResults} results to database for "${keyword}"`)
  console.log(`✨ Completed processing keyword: "${keyword}"\n`)
  
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