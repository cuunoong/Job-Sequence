import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useSchedulerHeaders, useSchedulerHeaderHours } from './useSchedulerHeaders'
import type { SchedulerHeader, SchedulerZoomScale } from '@/types/scheduler'
import moment from 'moment'

describe('useSchedulerHeaders', () => {
  const startDate = ref(moment().startOf('year').toDate())
  const endDate = ref(moment().add(1, 'year').endOf('year').toDate())
  const scale = ref<SchedulerZoomScale>({ scale: 'day', step: 7 })
  const headerWidth = ref(60)

  it('should calculate accumulated left position correctly', () => {
     const headersProp = ref<Array<SchedulerHeader> | undefined>([
      // {
      //     group: 'month',
      //     format: 'MMM',
      //   },
        {
          group: 'day',
          format: 'DD',
          step: 7,
        },
    ])
    const { headerGroups } = useSchedulerHeaders(headersProp, startDate, endDate, scale, headerWidth)

    expect(headerGroups.value).toBeDefined()
    if (headerGroups.value && headerGroups.value[0]) {
      const months = headerGroups.value[0]
      if (months.length > 1) {
          expect(months[1]!.left).toBe(months[0]!.width)
      }
    }
  })
})

describe('useSchedulerHeaderHours', () => {
  it('should calculate hours correctly for day step', () => {
    const header: SchedulerHeader = { group: 'day', step: 1 }
    const hours = useSchedulerHeaderHours(header)
    expect(hours).toBe(24)
  })

  it('should calculate hours correctly for week step', () => {
    const header: SchedulerHeader = { group: 'week', step: 1 }
    const hours = useSchedulerHeaderHours(header)
    expect(hours).toBe(168)
  })

  it('should calculate hours correctly for hour step', () => {
    const header: SchedulerHeader = { group: 'hour', step: 2 }
    const hours = useSchedulerHeaderHours(header)
    expect(hours).toBe(2)
  })

  it('should calculate hours correctly for month step', () => {
    // 2024-01-01 is used as base date, Jan has 31 days
    const header: SchedulerHeader = { group: 'month', step: 1 }
    const hours = useSchedulerHeaderHours(header)
    expect(hours).toBe(744) // 31 * 24
  })

  it('should calculate hours correctly for custom step', () => {
    const header: SchedulerHeader = { group: 'year'}
    const hours = useSchedulerHeaderHours(header)
    expect(hours).toBe(8784)
  })
})
