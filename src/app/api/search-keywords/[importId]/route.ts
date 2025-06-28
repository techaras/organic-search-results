import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface KeywordRecord {
  id: string
  keyword: string
  user_id: string
  import_id: string
  file_name: string
}

interface SerperSearchParams {
  q: string
  gl: string
  location: string
  hl: string
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

    // Search each keyword using Serper.dev
    const searchResults = []
    
    for (const keywordRecord of keywordRecords) {
      try {
        const searchParams: SerperSearchParams = {
          q: keywordRecord.keyword,
          gl: 'gb', // United Kingdom
          location: 'United Kingdom',
          hl: 'en' // English
        }

        const response = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: {
            'X-API-KEY': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(searchParams)
        })

        if (!response.ok) {
          console.error(`Serper API error for keyword "${keywordRecord.keyword}":`, response.status, response.statusText)
          continue
        }

        const searchData = await response.json()
        
        searchResults.push({
          keyword: keywordRecord.keyword,
          keywordId: keywordRecord.id,
          searchData
        })

        // Add a small delay to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error(`Error searching keyword "${keywordRecord.keyword}":`, error)
        continue
      }
    }

    return NextResponse.json({
      importId,
      totalKeywords: keywordRecords.length,
      searchResults,
      message: `Successfully searched ${searchResults.length} out of ${keywordRecords.length} keywords`
    })

  } catch (error) {
    console.error('Search keywords API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}