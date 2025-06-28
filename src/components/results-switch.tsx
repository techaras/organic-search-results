'use client'

import * as React from 'react'
import { useState } from 'react'
import { ChevronsUpDown } from 'lucide-react'

const resultOptions = [
  { value: 'all', label: 'All Results' },
  { value: 'organic', label: 'Organic Results' },
  { value: 'ads', label: 'Ads Results' },
  { value: 'featured', label: 'Featured Snippets' },
]

export function ResultsSwitch() {
  const [value, setValue] = useState('all')

  const handleSelect = (optionValue: string) => {
    setValue(optionValue)
    // Functionality will be added later
    console.log('Selected:', optionValue)
  }

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => handleSelect(e.target.value)}
        className="appearance-none bg-background border border-input rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
      >
        {resultOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronsUpDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
    </div>
  )
}