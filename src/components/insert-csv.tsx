'use client'

import * as React from 'react'
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

interface UploadResult {
  totalKeywords: number
  fileName: string
  importId: string
  uploadDate: string
}

interface CsvRow {
  Keywords: string
  [key: string]: string | number | boolean | null | undefined
}

interface ImportRecord {
  id: string
  user_id: string
  file_name: string
  upload_date: string
  total_keywords: number
}

interface KeywordRecord {
  file_name: string
  keyword: string
  user_id: string
  import_id: string
}

export function InsertCsv({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [status, setStatus] = React.useState<UploadStatus>('idle')
  const [dragActive, setDragActive] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [result, setResult] = React.useState<UploadResult | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Please select a CSV file')
      setStatus('error')
      return
    }

    setStatus('uploading')
    setError(null)
    setResult(null)

    try {
      // Read file content
      const csvText = await file.text()
      console.log('File content (first 500 chars):', csvText.substring(0, 500))
      
      // Parse CSV
      const Papa = await import('papaparse')
      const { data: rows, errors, meta } = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true
      })

      console.log('Papa Parse result:', { 
        rowCount: rows.length, 
        errors: errors, 
        meta: meta,
        firstThreeRows: rows.slice(0, 3)
      })

      // Filter out delimiter warnings - they're not actual errors for single-column CSVs
      const actualErrors = errors.filter(error => error.type !== 'Delimiter')

      if (actualErrors.length) {
        console.error('CSV parsing errors (detailed):', JSON.stringify(actualErrors, null, 2))
        throw new Error(`Failed to parse CSV file: ${actualErrors.map(e => e.message).join(', ')}`)
      }

      // Validate structure
      if (!rows.length) {
        throw new Error('CSV file is empty')
      }

      // Get first row to check column structure
      const firstRow = rows[0] as CsvRow
      if (!firstRow.hasOwnProperty('Keywords')) {
        throw new Error('CSV must have a "Keywords" column')
      }

      // Get user and setup Supabase client
      const supabase = createClient()
      const { data: userData } = await supabase.auth.getUser()
      
      if (!userData.user) {
        throw new Error('User not authenticated')
      }

      // Validate and prepare keywords data
      const validKeywords = (rows as CsvRow[])
        .map((row) => row.Keywords?.toString().trim())
        .filter(keyword => keyword && keyword.length > 0)

      if (!validKeywords.length) {
        throw new Error('No valid keywords found in CSV')
      }

      console.log(`Processing ${validKeywords.length} valid keywords`)

      // Step 1: Create import record to get import_id
      const { data: importData, error: importError } = await supabase
        .from('imports')
        .insert({
          user_id: userData.user.id,
          file_name: file.name,
          total_keywords: validKeywords.length
        })
        .select('*')
        .single()

      if (importError) {
        console.error('Failed to create import record:', importError)
        throw new Error(`Failed to create import record: ${importError.message}`)
      }

      console.log('Created import record:', importData)

      const importRecord = importData as ImportRecord

      // Step 2: Prepare keywords with import_id
      const keywordsToInsert: KeywordRecord[] = validKeywords.map((keyword) => ({
        file_name: file.name,
        keyword: keyword,
        user_id: userData.user.id,
        import_id: importRecord.id
      }))

      // Step 3: Insert keywords in chunks to avoid payload limits
      const CHUNK_SIZE = 500
      let totalInserted = 0

      for (let i = 0; i < keywordsToInsert.length; i += CHUNK_SIZE) {
        const chunk = keywordsToInsert.slice(i, i + CHUNK_SIZE)
        console.log(`Inserting chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(keywordsToInsert.length / CHUNK_SIZE)}`)
        
        const { error: keywordError } = await supabase
          .from('keywords')
          .insert(chunk)

        if (keywordError) {
          console.error('Database insertion error:', keywordError)
          // If keyword insertion fails, we should clean up the import record
          await supabase.from('imports').delete().eq('id', importRecord.id)
          throw new Error(`Failed to save keywords: ${keywordError.message}`)
        }

        totalInserted += chunk.length
      }

      console.log(`Successfully inserted ${totalInserted} keywords for import ${importRecord.id}`)

      // Step 4: Set success result
      setResult({
        totalKeywords: totalInserted,
        fileName: file.name,
        importId: importRecord.id,
        uploadDate: importRecord.upload_date
      })
      setStatus('success')

    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      setStatus('error')
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleFile(files[0])
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0]) {
      handleFile(files[0])
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'uploading':
        return <Loader2 className="h-6 w-6 text-primary animate-spin" />
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-600" />
      case 'error':
        return <AlertCircle className="h-6 w-6 text-red-600" />
      default:
        return <Upload className="h-6 w-6 text-primary" />
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'uploading':
        return {
          title: 'Uploading CSV...',
          description: 'Please wait while we process your file'
        }
      case 'success':
        return {
          title: 'Upload Successful!',
          description: `${result?.totalKeywords} keywords uploaded from ${result?.fileName}`
        }
      case 'error':
        return {
          title: 'Upload Failed',
          description: error || 'An error occurred during upload'
        }
      default:
        return {
          title: 'Upload CSV File',
          description: 'Click here to browse or drag and drop your CSV file'
        }
    }
  }

  const { title, description } = getStatusText()

  return (
    <div className={cn('w-full max-w-md', className)} {...props}>
      <Card 
        className={cn(
          'border-dashed border-2 transition-colors cursor-pointer',
          dragActive && 'border-primary bg-primary/5',
          status === 'success' && 'border-green-600 bg-green-50',
          status === 'error' && 'border-red-600 bg-red-50',
          status === 'uploading' && 'cursor-not-allowed'
        )}
        onClick={status !== 'uploading' ? handleClick : undefined}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            {getStatusIcon()}
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription className={cn(
            status === 'error' && 'text-red-600'
          )}>
            {description}
          </CardDescription>
          {status === 'success' && result && (
            <div className="mt-4 text-left">
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Import ID: {result.importId}</div>
                <div>Upload Date: {new Date(result.uploadDate).toLocaleString()}</div>
              </div>
            </div>
          )}
        </CardHeader>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleInputChange}
        className="hidden"
        disabled={status === 'uploading'}
      />
    </div>
  )
}
