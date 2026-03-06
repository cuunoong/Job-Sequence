import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import moment from 'moment'
import { useSchedulerConversion } from './useSchedulerConversion'
import type { SchedulerZoomScale } from '@/types/scheduler'

describe('useSchedulerConversion', () => {
  it('correctly converts date to pixels (Day scale)', () => {
    const startDate = ref('2024-01-01T00:00:00.000Z')
    const scale = ref<SchedulerZoomScale>({ scale: 'day', step: 1 })
    const headerWidth = ref(24)

    const { dateToPx } = useSchedulerConversion(startDate, scale, headerWidth)

    // Same time: 0px
    expect(dateToPx('2024-01-01T00:00:00.000Z')).toBeCloseTo(0)

    // +24 hours (1 day) -> 1 step -> 100px
    expect(dateToPx('2024-01-02T00:00:00.000Z')).toBeCloseTo(24)

    // +12 hours (0.5 day) -> 0.5 step -> 50px
    expect(dateToPx('2024-01-01T12:00:00.000Z')).toBeCloseTo(12)
  })

  it('correctly converts pixels to date (Day scale)', () => {
    const startDate = ref('2024-01-01T00:00:00.000Z')
    const scale = ref<SchedulerZoomScale>({ scale: 'day', step: 1 })
    const headerWidth = ref(24)

    const { pxToDate } = useSchedulerConversion(startDate, scale, headerWidth)

    // 0px -> Start Date
    const date0 = pxToDate(0)
    expect(moment(date0).format()).toBe(moment('2024-01-01T00:00:00.000Z').format())

    // 100px -> +1 Day
    const date100 = pxToDate(24)
    expect(moment(date100).format()).toBe(moment('2024-01-02T00:00:00.000Z').format())

    // 50px -> +12 Hours
    const date50 = pxToDate(12)
    expect(moment(date50).format()).toBe(moment('2024-01-01T12:00:00.000Z').format())
  })

  it('handles different scales (Week)', () => {
    const startDate = ref('2024-01-01T00:00:00.000Z')
    // Week = 7 days = 168 hours
    const scale = ref<SchedulerZoomScale>({ scale: 'week', step: 1 })
    const headerWidth = ref(200)

    const { dateToPx, pxToDate } = useSchedulerConversion(startDate, scale, headerWidth)

    // +1 Week -> 200px
    const nextWeek = moment('2024-01-01T00:00:00.000Z').add(1, 'week')
    expect(dateToPx(nextWeek)).toBeCloseTo(200)

    // 200px -> +1 Week
    const dateFromPx = pxToDate(200)
    expect(moment(dateFromPx).isSame(nextWeek)).toBe(true)
  })

  it('handles custom steps (2 Days)', () => {
    const startDate = ref('2024-01-01T00:00:00.000Z')
    // Step = 2 days = 48 hours
    const scale = ref<SchedulerZoomScale>({ scale: 'day', step: 2 })
    const headerWidth = ref(100)

    const { dateToPx } = useSchedulerConversion(startDate, scale, headerWidth)

    // +2 Days -> 1 Step -> 100px
    const twoDaysLater = moment('2024-01-01T00:00:00.000Z').add(2, 'day')
    expect(dateToPx(twoDaysLater)).toBeCloseTo(100)

    // +1 Day -> 0.5 Step -> 50px
    const oneDayLater = moment('2024-01-01T00:00:00.000Z').add(1, 'day')
    expect(dateToPx(oneDayLater)).toBeCloseTo(50)
  })

  it('verifies round-trip conversion (date -> px -> date)', () => {
    const startDate = ref('2024-01-01T00:00:00.000Z')
    const scale = ref<SchedulerZoomScale>({ scale: 'day', step: 1 })
    const headerWidth = ref(100)

    const { dateToPx, pxToDate } = useSchedulerConversion(startDate, scale, headerWidth)

    const originalDate = moment('2024-01-03T12:00:00.000Z') // +2.5 days

    // 1. Date -> Px
    const px = dateToPx(originalDate)

    // 2. Px -> Date
    const convertedDate = pxToDate(px)

    // Should be exactly same or very close (floating point precision)
    expect(Math.abs(convertedDate.diff(originalDate, 'milliseconds'))).toBeLessThan(1)
  })
})
