import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { processKeywordSearch, ProcessedSearchResult } from '@/lib/search-results'

interface KeywordRecord {
  id: string
  keyword: string
  user_id: string
  import_id: string
  file_name: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ importId: string }> }
) {
  try {
    const { importId } = await params
    
    // Verify user is authenticated
    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()
    
    if (!userData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch keywords for the import
    const { data: keywords, error: keywordsError } = await supabase
      .from('keywords')
      .select('*')
      .eq('import_id', importId)
      .eq('user_id', userData.user.id)

    if (keywordsError) {
      console.error('Error fetching keywords:', keywordsError)
      return NextResponse.json({ error: 'Failed to fetch keywords' }, { status: 500 })
    }

    const keywordRecords = keywords as KeywordRecord[]

    if (!keywordRecords.length) {
      return NextResponse.json({ error: 'No keywords found for this import' }, { status: 404 })
    }

    // Check for API key
    const apiKey = process.env.SERPER_API_KEY
    if (!apiKey) {
      console.error('SERPER_API_KEY not found in environment variables')
      return NextResponse.json({ error: 'API configuration error' }, { status: 500 })
    }

    // Process each keyword and save results to database
    const processedResults: ProcessedSearchResult[] = []
    const errors: Array<{ keyword: string; error: string }> = []
    
    for (const keywordRecord of keywordRecords) {
      try {
        console.log(`Processing keyword: "${keywordRecord.keyword}"`)
        
        const result = await processKeywordSearch(
          keywordRecord.keyword,
          keywordRecord.id,
          userData.user.id,
          importId,
          apiKey
        )
        
        processedResults.push(result)
        console.log(`✓ Saved ${result.savedResults} results for "${keywordRecord.keyword}"`)

        // Add a small delay to be respectful to the API (300 queries/second limit)
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`Error processing keyword "${keywordRecord.keyword}":`, errorMessage)
        
        errors.push({
          keyword: keywordRecord.keyword,
          error: errorMessage
        })
      }
    }

    // Calculate summary statistics
    const totalKeywordsProcessed = processedResults.length
    const totalResultsSaved = processedResults.reduce((sum, result) => sum + result.savedResults, 0)
    const totalSearchResults = processedResults.reduce((sum, result) => sum + result.totalResults, 0)

    return NextResponse.json({
      success: true,
      importId,
      summary: {
        totalKeywords: keywordRecords.length,
        keywordsProcessed: totalKeywordsProcessed,
        keywordsFailed: errors.length,
        totalSearchResults,
        totalResultsSaved
      },
      processedResults: processedResults.map(result => ({
        keyword: result.keyword,
        keywordId: result.keywordId,
        totalResults: result.totalResults,
        savedResults: result.savedResults
      })),
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully processed ${totalKeywordsProcessed} keywords and saved ${totalResultsSaved} search results`
    })

  } catch (error) {
    console.error('Search keywords API error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}