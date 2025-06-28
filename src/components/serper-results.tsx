import * as React from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
} from '@/components/ui/card'
import { ResultsSwitch } from '@/components/results-switch'
import { ExportCsv } from '@/components/export-csv'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function SerperResults({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Search Results</CardTitle>
        <CardDescription>Google search results will appear here</CardDescription>
        <CardAction>
          <div className="flex items-center gap-2">
            <ResultsSwitch />
            <ExportCsv />
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground">
          No search results yet. Select keywords from your imports to see search results.
        </div>
      </CardContent>
    </Card>
  )
}