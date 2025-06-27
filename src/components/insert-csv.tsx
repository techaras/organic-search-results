import * as React from 'react'
import { Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function InsertCsv({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div className={cn('w-full max-w-md', className)} {...props}>
      <Card className="border-dashed border-2">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Upload CSV File</CardTitle>
          <CardDescription>
            Click here to browse and select your CSV file
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="flex justify-end">
            <Button size="sm">
              Process CSV
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
