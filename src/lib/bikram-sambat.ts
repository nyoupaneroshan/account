// ============================================================
// Bikram Sambat (BS) Calendar & Nepali Localization Engine
// Compliant with Government of Nepal (GoN) & IRD Standards
// ============================================================

export interface BsDate {
  year: number
  month: number
  day: number
  str: string // "YYYY-MM-DD"
  monthName: string // e.g. "Bhadra"
  monthNameNepali: string // e.g. "भदौ"
  formattedBs: string // e.g. "२०८१/०५/२७"
  formattedAd: string // e.g. "2024-09-12"
  fiscalYear: string // e.g. "2081/82"
}

export const NEPALI_MONTH_NAMES = [
  'Baishakh',
  'Jestha',
  'Ashadh',
  'Shrawan',
  'Bhadra',
  'Ashwin',
  'Kartik',
  'Mangsir',
  'Poush',
  'Magh',
  'Falgun',
  'Chaitra',
]

export const NEPALI_MONTH_NAMES_NEPALI = [
  'बैशाख',
  'जेठ',
  'असार',
  'साउन',
  'भदौ',
  'असोज',
  'कात्तिक',
  'मंसिर',
  'पुस',
  'माघ',
  'फागुन',
  'चैत',
]

export const NEPALI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९']

// Lookup table for BS calendar: [days in months 1..12], and Gregorian start date of Baishakh 1 (year, month 0-indexed, day)
interface CalendarYearData {
  days: number[]
  adStart: [number, number, number] // [Year, Month (0-11), Day]
}

const BS_CALENDAR: Record<number, CalendarYearData> = {
  2070: { days: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30], adStart: [2013, 3, 14] },
  2071: { days: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], adStart: [2014, 3, 14] },
  2072: { days: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], adStart: [2015, 3, 14] },
  2073: { days: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], adStart: [2016, 3, 13] },
  2074: { days: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30], adStart: [2017, 3, 14] },
  2075: { days: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], adStart: [2018, 3, 14] },
  2076: { days: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30], adStart: [2019, 3, 14] },
  2077: { days: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], adStart: [2020, 3, 13] },
  2078: { days: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30], adStart: [2021, 3, 14] },
  2079: { days: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], adStart: [2022, 3, 14] },
  2080: { days: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30], adStart: [2023, 3, 14] },
  2081: { days: [31, 31, 32, 32, 31, 30, 30, 30, 29, 30, 30, 30], adStart: [2024, 3, 13] },
  2082: { days: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30], adStart: [2025, 3, 14] },
  2083: { days: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30], adStart: [2026, 3, 14] },
  2084: { days: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30], adStart: [2027, 3, 14] },
  2085: { days: [31, 32, 31, 32, 30, 31, 30, 30, 29, 30, 30, 30], adStart: [2028, 3, 13] },
  2086: { days: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30], adStart: [2029, 3, 14] },
  2087: { days: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], adStart: [2030, 3, 14] },
  2088: { days: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30], adStart: [2031, 3, 14] },
  2089: { days: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30], adStart: [2032, 3, 13] },
  2090: { days: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], adStart: [2033, 3, 13] },
}

/**
 * Get available BS calendar years
 */
export function getBsCalendarYears(): number[] {
  return Object.keys(BS_CALENDAR).map(Number).sort((a, b) => a - b)
}

/**
 * Get number of days in a specific BS year and month (1-12)
 */
export function getDaysInBsMonth(bsYear: number, bsMonth: number): number {
  const yearData = BS_CALENDAR[bsYear]
  if (yearData && bsMonth >= 1 && bsMonth <= 12) {
    return yearData.days[bsMonth - 1]
  }
  return 30
}

/**
 * Convert Arabic number or string to Nepali Devanagari digits (०-९)
 */
export function toNepaliDigits(input: number | string): string {
  const str = String(input)
  return str.replace(/[0-9]/g, (d) => NEPALI_DIGITS[parseInt(d, 10)])
}

/**
 * Convert Nepali Devanagari digits to standard English digits (0-9)
 */
export function toEnglishDigits(input: string): string {
  const nepaliToArabic: Record<string, string> = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
  }
  return input.replace(/[०-९]/g, (d) => nepaliToArabic[d] || d)
}

/**
 * Calculate Nepal Fiscal Year from BS Year and Month
 * Shrawan (Month 4) to Chaitra (Month 12) -> FY = `${year}/${(year+1)%100}`
 * Baishakh (Month 1) to Ashadh (Month 3) -> FY = `${year-1}/${year%100}`
 */
export function getFiscalYearFromBs(bsYear: number, bsMonth: number): string {
  if (bsMonth >= 4) {
    const nextYear = (bsYear + 1).toString().slice(-2)
    return `${bsYear}/${nextYear}`
  } else {
    const currYear = bsYear.toString().slice(-2)
    return `${bsYear - 1}/${currYear}`
  }
}

/**
 * Convert Gregorian (AD) Date to Bikram Sambat (BS) Date
 */
export function adToBs(dateInput?: Date | string | null): BsDate {
  let date: Date
  if (!dateInput) {
    date = new Date()
  } else if (typeof dateInput === 'string') {
    date = new Date(dateInput)
  } else {
    date = dateInput
  }

  if (isNaN(date.getTime())) {
    date = new Date()
  }

  // Set to midnight UTC for stable day difference calculation
  const targetUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())

  // Find the matching BS year
  const bsYears = Object.keys(BS_CALENDAR)
    .map(Number)
    .sort((a, b) => a - b)

  let matchedYear = bsYears[0]

  for (let i = bsYears.length - 1; i >= 0; i--) {
    const y = bsYears[i]
    const [adY, adM, adD] = BS_CALENDAR[y].adStart
    const startUtc = Date.UTC(adY, adM, adD)
    if (targetUtc >= startUtc) {
      matchedYear = y
      break
    }
  }

  const yearData = BS_CALENDAR[matchedYear] || BS_CALENDAR[2081]
  const [startY, startM, startD] = yearData.adStart
  const startUtc = Date.UTC(startY, startM, startD)

  let remainingDays = Math.floor((targetUtc - startUtc) / (1000 * 60 * 60 * 24))

  let matchedMonth = 1
  let matchedDay = 1

  for (let m = 0; m < 12; m++) {
    const daysInM = yearData.days[m]
    if (remainingDays < daysInM) {
      matchedMonth = m + 1
      matchedDay = remainingDays + 1
      break
    }
    remainingDays -= daysInM
  }

  // Format strings
  const mm = String(matchedMonth).padStart(2, '0')
  const dd = String(matchedDay).padStart(2, '0')
  const bsStr = `${matchedYear}-${mm}-${dd}`
  const formattedBs = `${toNepaliDigits(matchedYear)}/${toNepaliDigits(mm)}/${toNepaliDigits(dd)}`
  const formattedAd = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  const fiscalYear = getFiscalYearFromBs(matchedYear, matchedMonth)

  return {
    year: matchedYear,
    month: matchedMonth,
    day: matchedDay,
    str: bsStr,
    monthName: NEPALI_MONTH_NAMES[matchedMonth - 1],
    monthNameNepali: NEPALI_MONTH_NAMES_NEPALI[matchedMonth - 1],
    formattedBs,
    formattedAd,
    fiscalYear,
  }
}

/**
 * Convert Bikram Sambat (BS) date to Gregorian (AD) Date
 */
export function bsToAd(bsYear: number, bsMonth: number, bsDay: number): Date {
  const yearData = BS_CALENDAR[bsYear]
  if (!yearData) {
    // Default fallback calculation: roughly 56.7 years difference
    return new Date(bsYear - 57, bsMonth - 1, bsDay)
  }

  const [startY, startM, startD] = yearData.adStart
  let daysOffset = bsDay - 1

  for (let m = 0; m < bsMonth - 1; m++) {
    daysOffset += yearData.days[m]
  }

  const adDate = new Date(startY, startM, startD)
  adDate.setDate(adDate.getDate() + daysOffset)
  return adDate
}

/**
 * Validate Nepali 9-digit Permanent Account Number (PAN)
 */
export function isValidNepaliPAN(pan: string | null | undefined): boolean {
  if (!pan) return false
  const cleanPan = pan.trim().replace(/[-\s]/g, '')
  return /^[0-9]{9}$/.test(cleanPan)
}

// ============================================================
// Amount to Words Converter (English & Nepali)
// ============================================================

const NEPALI_ONES = [
  '', 'एक', 'दुई', 'तीन', 'चार', 'पाँच', 'छ', 'सात', 'आठ', 'नौ',
  'दश', 'एघार', 'बाह्र', 'तेह्र', 'चौध', 'पन्ध्र', 'सोध', 'सत्र', 'अठार', 'उन्नाइस',
  'बीस', 'एक्काइस', 'बाइस', 'तेइस', 'चौबीस', 'पच्चीस', 'छब्बीस', 'सत्ताइस', 'अठ्ठाइस', 'उनन्तिस',
  'तीस', 'एकत्तिस', 'बत्तिस', 'तेत्तिस', 'चौँतिस', 'पैँतिस', 'छत्तीस', 'सरसत्तिस', 'अठतीस', 'उनन्चालीस',
  'चालीस', 'एकचालीस', 'बयालीस', 'त्रिचालीस', 'चवालीस', 'पैँतालीस', 'छयालीस', 'सत्चालीस', 'अठ्चालीस', 'उनन्पचास',
  'पचास', 'एकाउन्न', 'बाउन्न', 'त्रिपन्न', 'चउन्न', 'पचपन्न', 'छपन्न', 'सन्ताउन्न', 'अन्ठाउन्न', 'उनन्साठी',
  'साठी', 'एकसट्ठी', 'बासट्ठी', 'त्रिसट्ठी', 'चौंसट्ठी', 'पैंसट्ठी', 'छयसट्ठी', 'सत्सट्ठी', 'अठसट्ठी', 'उनन्सत्तरी',
  'सत्तरी', 'एकहत्तर', 'बहत्तर', 'त्रिहत्तर', 'चौहत्तर', 'पचहत्तर', 'छयहत्तर', 'सतहत्तर', 'अठहत्तर', 'उनासी',
  'असी', 'एकासी', 'बयासी', 'त्रियासी', 'चौरासी', 'पचासी', 'छयासी', 'सतासी', 'अठासी', 'उनान्नब्बे',
  'नब्बे', 'एकान्नब्बे', 'बयानब्बे', 'त्रियान्नब्बे', 'चौरान्नब्बे', 'पन्चानब्बे', 'छयान्नब्बे', 'सन्तान्नब्बे', 'अन्ठान्नब्बे', 'उनान्सय',
]

/**
 * Convert numerical amount to Nepali words (e.g. "बाह्र हजार तीन सय रुपैयाँ मात्र")
 */
export function numberToNepaliWords(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'शून्य रुपैयाँ मात्र'

  const isNegative = amount < 0
  const absAmount = Math.abs(amount)
  const parts = absAmount.toFixed(2).split('.')
  let intVal = parseInt(parts[0], 10)
  const paisaVal = parseInt(parts[1], 10)

  if (intVal === 0 && paisaVal === 0) return 'शून्य रुपैयाँ मात्र'

  let words = ''

  // Crores (करोड: 1,00,00,000)
  const crore = Math.floor(intVal / 10000000)
  intVal %= 10000000
  if (crore > 0) {
    words += `${NEPALI_ONES[crore] || crore} करोड `
  }

  // Lakhs (लाख: 1,00,000)
  const lakh = Math.floor(intVal / 100000)
  intVal %= 100000
  if (lakh > 0) {
    words += `${NEPALI_ONES[lakh] || lakh} लाख `
  }

  // Thousands (हजार: 1,000)
  const thousand = Math.floor(intVal / 1000)
  intVal %= 1000
  if (thousand > 0) {
    words += `${NEPALI_ONES[thousand] || thousand} हजार `
  }

  // Hundreds (सय: 100)
  const hundred = Math.floor(intVal / 100)
  intVal %= 100
  if (hundred > 0) {
    words += `${NEPALI_ONES[hundred] || hundred} सय `
  }

  // Remaining 1..99
  if (intVal > 0) {
    words += `${NEPALI_ONES[intVal]} `
  }

  words = words.trim()
  if (words) {
    words += ' रुपैयाँ'
  }

  if (paisaVal > 0) {
    words += ` ${NEPALI_ONES[paisaVal] || paisaVal} पैसा`
  }

  words += ' मात्र'

  return `${isNegative ? 'ऋणात्मक ' : ''}${words}`
}

const ENGLISH_ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
]

const ENGLISH_TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
]

function englishConvertBelowThousand(n: number): string {
  let str = ''
  if (n >= 100) {
    str += `${ENGLISH_ONES[Math.floor(n / 100)]} Hundred `
    n %= 100
  }
  if (n >= 20) {
    str += `${ENGLISH_TENS[Math.floor(n / 10)]} `
    n %= 10
  }
  if (n > 0) {
    str += `${ENGLISH_ONES[n]} `
  }
  return str.trim()
}

/**
 * Convert numerical amount to English words in South Asian numbering (Rupees, Lakhs, Crores)
 */
export function numberToEnglishWords(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'Zero Rupees Only'

  const isNegative = amount < 0
  const absAmount = Math.abs(amount)
  const parts = absAmount.toFixed(2).split('.')
  let intVal = parseInt(parts[0], 10)
  const paisaVal = parseInt(parts[1], 10)

  if (intVal === 0 && paisaVal === 0) return 'Zero Rupees Only'

  let words = ''

  const crore = Math.floor(intVal / 10000000)
  intVal %= 10000000
  if (crore > 0) {
    words += `${englishConvertBelowThousand(crore)} Crore `
  }

  const lakh = Math.floor(intVal / 100000)
  intVal %= 100000
  if (lakh > 0) {
    words += `${englishConvertBelowThousand(lakh)} Lakh `
  }

  const thousand = Math.floor(intVal / 1000)
  intVal %= 1000
  if (thousand > 0) {
    words += `${englishConvertBelowThousand(thousand)} Thousand `
  }

  if (intVal > 0) {
    words += `${englishConvertBelowThousand(intVal)} `
  }

  words = words.trim()
  if (words) {
    words += ' Rupees'
  }

  if (paisaVal > 0) {
    words += ` and ${englishConvertBelowThousand(paisaVal)} Paisa`
  }

  words += ' Only'

  return `${isNegative ? 'Negative ' : ''}${words}`
}
