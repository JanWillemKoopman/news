'use client'

import * as React from 'react'

import type { RouteVoortgang } from '@/lib/bruiloft/guidance'
import { Card, CardContent, Progress } from '@/components/bruiloft/ui'

const FASE_LABEL: Record<string, string> = {
  '12 maanden voor': '12 mnd voor',
  '9 maanden voor': '9 mnd voor',
  '6 maanden voor': '6 mnd voor',
  '3 maanden voor': '3 mnd voor',
  '1 maand voor': '1 mnd voor',
  'laatste week': 'Laatste week',
  trouwweek: 'Trouwweek',
  'na de bruiloft': 'Na de bruiloft',
}

interface RoutekaartProps {
  route: RouteVoortgang
}

export function Routekaart({ route }: RoutekaartProps) {
  return (
    <Card className="border-rhino-100">
      <CardContent className="p-6">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-2xl font-medium text-foreground">Jullie routekaart</h2>
          <span className="text-sm font-medium text-muted-foreground">
            {route.overallPercentage}% klaar
          </span>
        </div>
        <Progress value={route.overallPercentage} className="mb-6 h-2" />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {route.fases.map((fase) => (
            <div
              key={fase.tijdsblok}
              className={`rounded-xl border p-3 transition-colors ${
                fase.isHuidig
                  ? 'border-rose-300 bg-rose-50 ring-1 ring-rose-300'
                  : 'border-border bg-background'
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-1">
                <span
                  className={`text-xs font-semibold ${
                    fase.isHuidig ? 'text-rose-700' : 'text-muted-foreground'
                  }`}
                >
                  {FASE_LABEL[fase.tijdsblok] ?? fase.tijdsblok}
                </span>
                {fase.isHuidig && (
                  <span className="inline-flex items-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    Nu
                  </span>
                )}
              </div>
              <Progress
                value={fase.percentage}
                className={`h-1.5 ${fase.isHuidig ? '[&>div]:bg-rose-500' : ''}`}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {fase.klaar}/{fase.totaal} klaar
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
