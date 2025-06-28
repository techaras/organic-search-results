'use client'

import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react'

interface SendButtonProps {
  importId: string
}

interface SearchSummary {
  totalKeywords: number
  keywordsProcessed: number
  keywordsFailed: number
  totalSearchResults: number
  totalResultsSaved: number
}

interface SearchResponse {
  success: boolean
  importId: string
  summary: SearchSummary
  message: string
  errors?: Array<{ keyword: string; error: string }>
}

export function SendButton({ importId }: SendButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [lastResult, setLastResult] = useState<SearchResponse | null>(null)

  const handleSearch = async () => {
    setIsLoading(true)
    setLastResult(null)
    
    try {
      const response = await fetch(`/api/search-keywords/${importId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: SearchResponse = await response.json()
      setLastResult(result)
      
      if (result.success) {
        console.log('Search completed successfully:', result)
      } else {
        console.error('Search failed:', result)
      }
      
    } catch (error) {
      console.error('Error searching keywords:', error)
      setLastResult({
        success: false,
        importId,
        summary: {
          totalKeywords: 0,
          keywordsProcessed: 0,
          keywordsFailed: 0,
          totalSearchResults: 0,
          totalResultsSaved: 0
        },
        message: error instanceof Error ? error.message : 'Failed to search keywords. Please try again.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getButtonContent = () => {
    if (isLoading) {
      return (
        <>
          <Loader2 className="h-4 w-4 animate-spin mr-1" />
          Searching...
        </>
      )
    }

    if (lastResult) {
      if (lastResult.success) {
        return (
          <>
            <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
            Completed
          </>
        )
      } else {
        return (
          <>
            <AlertTriangle className="h-4 w-4 mr-1 text-red-600" />
            Failed
          </>
        )
      }
    }

    return 'Send'
  }

  const getButtonVariant = () => {
    if (lastResult) {
      return lastResult.success ? 'outline' : 'destructive'
    }
    return 'default'
  }

  return (
    <div className="flex flex-col gap-2">
      <Button 
        size="sm" 
        variant={getButtonVariant()}
        onClick={handleSearch}
        disabled={isLoading}
      >
        {getButtonContent()}
      </Button>
      
      {lastResult && (
        <div className="text-xs space-y-1">
          {lastResult.success ? (
            <div className="text-green-600 space-y-0.5">
              <div className="font-medium">✓ Search completed!</div>
              <div>
                {lastResult.summary.keywordsProcessed}/{lastResult.summary.totalKeywords} keywords processed
              </div>
              <div>
                {lastResult.summary.totalResultsSaved} results saved to database
              </div>
              {lastResult.summary.keywordsFailed > 0 && (
                <div className="text-orange-600">
                  ⚠ {lastResult.summary.keywordsFailed} keywords failed
                </div>
              )}
            </div>
          ) : (
            <div className="text-red-600">
              <div className="font-medium">✗ Search failed</div>
              <div className="text-xs opacity-75">
                {lastResult.message}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
