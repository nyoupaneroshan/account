'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function PartyForm() {
  return (
    <div className="p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>नयाँ पक्ष / New Party</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Party form coming soon.</p>
        </CardContent>
      </Card>
    </div>
  )
}
