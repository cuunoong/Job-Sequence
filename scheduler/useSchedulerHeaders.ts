import moment from 'moment'
import { computed, type Ref } from 'vue'
import type { SchedulerHeader, SchedulerZoomScale } from '@/types/scheduler'
import { useSchedulerConversion } from './useSchedulerConversion'
interface HeaderGroup {
  label: string
  start: moment.Moment
  end: moment.Moment
  width: number
  left: number
}
export function useSchedulerHeaders(
  headersProp: Ref<Array<SchedulerHeader> | undefined>,
  startDate: Ref<Date | string>,
  endDate: Ref<Date | string>,
  scale: Ref<SchedulerZoomScale>,
  headerWidth: Ref<number>,
) {
  const { dateToPx } = useSchedulerConversion(startDate, scale, headerWidth)
  const headers = computed<Array<SchedulerHeader>>(
    () =>
      headersProp.value || [
        { group: 'month', format: 'MMMM YYYY' },
        { group: 'week', format: '[W-]WW' },
        {
          group: 'day',
          format: 'DD',
          step: 1,
        },
      ],
  )
  const headerRowCount = computed(() => headers.value.length)
  const headerGroups = computed(() => {
    const groups: Array<Array<HeaderGroup>> = []
    for(const header of headers.value) {
      const headerGroup: Array<HeaderGroup> = []
      const start = moment(startDate.value).startOf(header.group)
      const end = moment(endDate.value).endOf(header.group)
      const current = start.clone()
      while (current.isSameOrBefore(end, header.group)) {
        const groupStart = current.clone().startOf(header.group)
        const groupEnd = current
          .clone()
          .add((header.step || 1), header.group)
        const visibleStart = moment.max(groupStart, moment(startDate.value))
        const visibleEnd = moment.min(groupEnd, moment(endDate.value))
        const width = dateToPx(visibleEnd) - dateToPx(visibleStart)
        const left = dateToPx(visibleStart)
        headerGroup.push({
          label: current.format(header.format || 'YYYY'),
          start: groupStart,
          end: groupEnd,
          width,
          left,
        })
        current.add((header.step || 1), header.group)
      }
      groups.push(headerGroup)
    }
    return groups
  })
  const headerRowWidth = computed(() => {
    return headerGroups.value[0]?.reduce((total, header) => total + header.width, 0) || 0
  })
  return {
    headers,
    headerRowCount,
    headerGroups,
    headerRowWidth,
  }
}
export function useSchedulerHeaderHours(header: SchedulerHeader) {
  const date = moment('2024-01-01')
  const stepInHours = date.clone().add(header.step ?? 1, header.group)
      .diff(date, 'hour', true)
  return stepInHours
}
