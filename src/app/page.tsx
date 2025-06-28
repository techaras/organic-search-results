'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export default function LandingPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const router = useRouter()

  // Check initial auth state
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      await supabase.auth.getUser()
      setIsCheckingAuth(false)
    }
    checkAuth()
  }, [])

  const handleGetStarted = async () => {
    setIsLoading(true)
    
    try {
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      
      if (data.user) {
        // User is logged in, go to protected page
        router.push('/protected')
      } else {
        // User is not logged in, go to sign up
        router.push('/auth/sign-up')
      }
    } catch (error) {
      console.error('Error checking auth:', error)
      // Default to sign up if there's an error
      router.push('/auth/sign-up')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-6">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Organic Search Results
          </h1>
          <p className="text-xl text-muted-foreground max-w-lg mx-auto">
            Upload keywords, track Google search rankings, and analyze organic search results effortlessly.
          </p>
        </div>



        {/* CTA Button */}
        <div>
          <Button 
            size="lg" 
            onClick={handleGetStarted}
            disabled={isLoading || isCheckingAuth}
            className="px-8 py-3 text-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading...
              </>
            ) : isCheckingAuth ? (
              'Loading...'
            ) : (
              'Get Started'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
