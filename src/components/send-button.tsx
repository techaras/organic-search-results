'use client'

import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'

interface SendButtonProps {
  importId: string
}

export function SendButton({ importId }: SendButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleSearch = async () => {
    setIsLoading(true)
    
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

      const result = await response.json()
      console.log('Search results:', result)
      
      // TODO: Handle the search results (display them, store them, etc.)
      alert(`Successfully searched ${result.searchResults?.length || 0} keywords!`)
      
    } catch (error) {
      console.error('Error searching keywords:', error)
      alert('Failed to search keywords. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button 
      size="sm" 
      onClick={handleSearch}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin mr-1" />
          Searching...
        </>
      ) : (
        'Send'
      )}
    </Button>
  )
}
