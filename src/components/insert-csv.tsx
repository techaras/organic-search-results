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
}

interface CsvRow {
  Keywords: string
  [key: string]: string | number | boolean | null | undefined
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

      // Transform data for database
      const supabase = createClient()
      const { data: userData } = await supabase.auth.getUser()
      
      if (!userData.user) {
        throw new Error('User not authenticated')
      }

      const keywordsToInsert = (rows as CsvRow[])
        .map((row) => ({
          file_name: file.name,
          keyword: row.Keywords?.toString().trim(),
          user_id: userData.user.id
        }))
        .filter(item => item.keyword && item.keyword.length > 0)

      if (!keywordsToInsert.length) {
        throw new Error('No valid keywords found in CSV')
      }

      // Insert in chunks to avoid payload limits
      const CHUNK_SIZE = 500
      for (let i = 0; i < keywordsToInsert.length; i += CHUNK_SIZE) {
        const chunk = keywordsToInsert.slice(i, i + CHUNK_SIZE)
        const { error } = await supabase
          .from('keywords')
          .insert(chunk)

        if (error) {
          console.error('Database insertion error:', error)
          throw new Error(`Failed to save keywords: ${error.message}`)
        }
      }

      setResult({
        totalKeywords: keywordsToInsert.length,
        fileName: file.name
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
