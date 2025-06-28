'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function SendKeywords({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div className={cn('w-full max-w-md', className)} {...props}>
      <Button className="w-full">
        Send Keywords to Serper
      </Button>
    </div>
  )
}