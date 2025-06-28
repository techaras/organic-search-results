'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

export function ExportCsv() {
  const handleExport = () => {
    // Functionality will be added later
    console.log('Export CSV clicked')
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      Export CSV
    </Button>
  )
}