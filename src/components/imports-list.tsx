import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { SendButton } from '@/components/send-button'

interface ImportRecord {
  id: string
  user_id: string
  file_name: string
  upload_date: string
  total_keywords: number
}

interface ImportsListProps {
  className?: string
}

export async function ImportsList({ className }: ImportsListProps) {
  const supabase = await createClient()
  
  // Get the current user
  const { data: userData } = await supabase.auth.getUser()
  
  if (!userData.user) {
    return null
  }

  // Fetch all imports for the current user
  const { data: imports, error } = await supabase
    .from('imports')
    .select('*')
    .eq('user_id', userData.user.id)
    .order('upload_date', { ascending: false })

  if (error) {
    console.error('Error fetching imports:', error)
    return (
      <Card className={cn("w-full max-w-md", className)}>
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription>Failed to load imports</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const importRecords = imports as ImportRecord[]

  if (!importRecords.length) {
    return (
      <Card className={cn("w-full max-w-md", className)}>
        <CardHeader>
          <CardTitle>No Imports Yet</CardTitle>
          <CardDescription>Upload a CSV file to see your imports here</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardHeader>
        <CardTitle>Your Imports</CardTitle>
        <CardDescription>All your uploaded CSV files</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {importRecords.map((importRecord) => (
            <div
              key={importRecord.id}
              className="flex flex-col gap-1 p-3 border rounded-md bg-muted/30"
            >
              <div className="text-sm font-medium">{importRecord.file_name}</div>
              <div className="text-xs text-muted-foreground font-mono">
                ID: {importRecord.id}
              </div>
              <div className="flex items-center justify-between mt-1">
                <div className="text-xs text-muted-foreground">
                  {importRecord.total_keywords} keywords • {new Date(importRecord.upload_date).toLocaleDateString()}
                </div>
                <SendButton />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}