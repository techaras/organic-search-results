import * as React from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function SerperResults({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Search Results</CardTitle>
        <CardDescription>Google search results will appear here</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground">
          No search results yet. Select keywords from your imports to see search results.
        </div>
      </CardContent>
    </Card>
  )
}