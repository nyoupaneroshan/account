'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  adToBs,
  bsToAd,
  toNepaliDigits,
  NEPALI_MONTH_NAMES_NEPALI,
  NEPALI_MONTH_NAMES,
  getDaysInBsMonth,
  getBsCalendarYears,
} from '@/lib/bikram-sambat'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react'

interface BsDatePickerProps {
  value?: string // AD date "YYYY-MM-DD"
  onChange: (adDate: string, bsDateStr: string) => void
  label?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  align?: 'center' | 'start' | 'end'
}

export function BsDatePicker({
  value,
  onChange,
  label,
  placeholder = 'मिति छान्नुहोस् (Select Date)',
  disabled = false,
  className,
  align = 'start',
}: BsDatePickerProps) {
  const [open, setOpen] = useState(false)

  // Current selected BS info derived from value
  const currentBs = useMemo(() => {
    return adToBs(value ? new Date(value) : new Date())
  }, [value])

  // Viewing month/year navigation in calendar
  const [navYear, setNavYear] = useState<number | null>(null)
  const [navMonth, setNavMonth] = useState<number | null>(null)

  const viewYear = navYear ?? currentBs.year
  const viewMonth = navMonth ?? currentBs.month

  const setViewYear = (y: number) => setNavYear(y)
  const setViewMonth = (m: number) => setNavMonth(m)

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      setNavYear(currentBs.year)
      setNavMonth(currentBs.month)
    }
  }

  const years = useMemo(() => getBsCalendarYears(), [])
  const daysInCurrentMonth = useMemo(
    () => getDaysInBsMonth(viewYear, viewMonth),
    [viewYear, viewMonth]
  )

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      if (years.includes(viewYear - 1)) {
        setViewYear(viewYear - 1)
        setViewMonth(12)
      }
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      if (years.includes(viewYear + 1)) {
        setViewYear(viewYear + 1)
        setViewMonth(1)
      }
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  const handleSelectDay = (day: number) => {
    const adDate = bsToAd(viewYear, viewMonth, day)
    const yyyy = adDate.getFullYear()
    const mm = String(adDate.getMonth() + 1).padStart(2, '0')
    const dd = String(adDate.getDate()).padStart(2, '0')
    const adStr = `${yyyy}-${mm}-${dd}`
    const bsStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`

    onChange(adStr, bsStr)
    setOpen(false)
  }

  const handleSelectToday = () => {
    const today = new Date()
    const bsToday = adToBs(today)
    setViewYear(bsToday.year)
    setViewMonth(bsToday.month)
    handleSelectDay(bsToday.day)
  }

  const displayFormattedBs = value ? currentBs.formattedBs : null
  const displayMonthName = value ? `${currentBs.monthNameNepali} ${toNepaliDigits(currentBs.day)}, ${toNepaliDigits(currentBs.year)}` : null

  return (
    <div className={cn('relative inline-block w-full', className)}>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-zinc-300">{label}</label>
          {value && (
            <span className="text-[11px] text-zinc-500">AD: {value}</span>
          )}
        </div>
      )}

      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              'w-full justify-start text-left font-normal h-10 px-3 border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-zinc-100 hover:text-zinc-100 transition-colors',
              !value && 'text-zinc-500'
            )}
          >
            <CalendarIcon className="mr-2.5 h-4 w-4 text-emerald-400 shrink-0" />
            {value ? (
              <div className="flex items-center justify-between w-full min-w-0">
                <span className="truncate font-medium text-emerald-400">
                  {displayFormattedBs}
                  <span className="ml-2 text-xs text-zinc-400 font-normal">
                    ({displayMonthName})
                  </span>
                </span>
                <Badge
                  variant="outline"
                  className="ml-2 text-[10px] px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shrink-0 hidden sm:inline-flex"
                >
                  वि.सं. (BS)
                </Badge>
              </div>
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align={align}
          className="w-80 p-3 bg-[#131720] border-white/[0.1] text-zinc-100 shadow-2xl rounded-xl z-50"
        >
          {/* Calendar Header: Year & Month Selectors + Nav */}
          <div className="flex items-center justify-between gap-1 pb-3 border-b border-white/[0.08]">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
              onClick={handlePrevMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-1.5">
              {/* Month Selector */}
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="h-7 px-2 text-xs bg-white/[0.05] border border-white/[0.1] rounded text-zinc-200 focus:outline-none focus:border-emerald-500/50 cursor-pointer font-medium"
              >
                {NEPALI_MONTH_NAMES_NEPALI.map((nameNp, idx) => (
                  <option key={idx + 1} value={idx + 1} className="bg-[#1c2230] text-zinc-100">
                    {nameNp} ({NEPALI_MONTH_NAMES[idx]})
                  </option>
                ))}
              </select>

              {/* Year Selector */}
              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="h-7 px-2 text-xs bg-white/[0.05] border border-white/[0.1] rounded text-zinc-200 focus:outline-none focus:border-emerald-500/50 cursor-pointer font-medium"
              >
                {years.map((y) => (
                  <option key={y} value={y} className="bg-[#1c2230] text-zinc-100">
                    {toNepaliDigits(y)} ({y})
                  </option>
                ))}
              </select>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
              onClick={handleNextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Days Grid */}
          <div className="pt-3">
            <div className="grid grid-cols-7 gap-1 text-center mb-1.5 text-[11px] font-semibold text-zinc-500">
              <span>आइत</span>
              <span>सोम</span>
              <span>मंगल</span>
              <span>बुध</span>
              <span>बिही</span>
              <span>शुक्र</span>
              <span className="text-red-400/80">शनि</span>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {Array.from({ length: daysInCurrentMonth }, (_, i) => i + 1).map((d) => {
                const isSelected =
                  value &&
                  currentBs.year === viewYear &&
                  currentBs.month === viewMonth &&
                  currentBs.day === d

                const todayBs = adToBs(new Date())
                const isToday =
                  todayBs.year === viewYear &&
                  todayBs.month === viewMonth &&
                  todayBs.day === d

                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleSelectDay(d)}
                    className={cn(
                      'h-8 w-full rounded-md text-xs font-medium transition-all flex items-center justify-center relative',
                      isSelected
                        ? 'bg-emerald-500 text-white font-bold shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                        : isToday
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold'
                          : 'text-zinc-200 hover:bg-white/[0.08] hover:text-white'
                    )}
                  >
                    {toNepaliDigits(d)}
                    {isToday && !isSelected && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-emerald-400" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Footer Quick Actions */}
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-white/[0.08] text-xs">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSelectToday}
              className="h-7 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 gap-1"
            >
              <Sparkles className="h-3 w-3" />
              आज (Today)
            </Button>

            <span className="text-[11px] text-zinc-500">
              FY: {currentBs.fiscalYear}
            </span>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
