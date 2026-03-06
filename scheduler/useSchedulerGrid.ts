import moment from 'moment'
import { computed, type Ref, onUnmounted, ref } from 'vue'
import type { SchedulerResource, SchedulerZoomScale } from '@/types/scheduler'
import { useSchedulerConversion } from './useSchedulerConversion'
export function useSchedulerGrid(
  startDate: Ref<Date | string>,
  endDate: Ref<Date | string>,
  scale: Ref<SchedulerZoomScale>,
  headerWidth: Ref<number>,
  resourceHeight: Ref<number>,
  resources: Ref<Array<SchedulerResource>>,
) {
  const { dateToPx } = useSchedulerConversion(startDate, scale, headerWidth)
  const horizontalLines = computed(() => {
    const lines: Array<number> = []
    for (let i = 0; i < resources.value.length; i++) {
      lines.push((i + 1) * resourceHeight.value)
    }
    return lines
  })
  const verticalLines = computed(() => {
    const lines: Array<number> = []
    const start = moment(startDate.value).startOf(scale.value.scale)
    const end = moment(endDate.value).endOf(scale.value.scale)
    const current = start.clone()
    while (current.isSameOrBefore(end, scale.value.scale)) {
      const groupStart = current.clone().startOf(scale.value.scale)
      const groupEnd = current
        .clone()
        .add(scale.value.step - 1, scale.value.scale)
        .endOf(scale.value.scale)
      const visibleStart = moment.max(groupStart, moment(startDate.value))
      const visibleEnd = moment.min(groupEnd, moment(endDate.value))
      const width = dateToPx(visibleEnd) - dateToPx(visibleStart)
      const left = dateToPx(visibleStart)
      lines.push(left)
      lines.push(left + width)
      current.add(scale.value.step, scale.value.scale)
    }
    return [...new Set(lines)]
  })
  const resourceXDates = computed(() => {
    const dates: Array<{
      date: moment.Moment
      resourceId: string
      left: number
      top: number
      width: number
      isOdd: boolean
    }> = []
    const start = moment(startDate.value).startOf(scale.value.scale)
    const end = moment(endDate.value).endOf(scale.value.scale)
    const current = start.clone()
    let accumulatedLeft = 0
    while (current.isSameOrBefore(end, scale.value.scale)) {
      const groupStart = current.clone().startOf(scale.value.scale)
      const groupEnd = current
        .clone()
        .add(scale.value.step - 1, scale.value.scale)
        .endOf(scale.value.scale)
      const visibleStart = moment.max(groupStart, moment(startDate.value))
      const visibleEnd = moment.min(groupEnd, moment(endDate.value))
      const columnCount = visibleEnd.diff(visibleStart, scale.value.scale, true)
      const width = (columnCount / (scale.value.step || 1)) * headerWidth.value
      const left = accumulatedLeft
      resources.value.forEach((resource, index) => {
        dates.push({
          date: current.clone(),
          resourceId: resource.id,
          left,
          top: index * resourceHeight.value,
          width,
          isOdd: index % 2 === 0,
        })
      })
      accumulatedLeft += width
      current.add(scale.value.step, scale.value.scale)
    }
    return dates
  })
  const now = ref(moment())
  const timer = setInterval(() => {
    now.value = moment()
  }, 60000)
  onUnmounted(() => {
    clearInterval(timer)
  })
  const currentTimePosition = computed(() => {
    const start = moment(startDate.value)
    const end = moment(endDate.value)
    const current = now.value
    if (!current.isBetween(start, end, scale.value.scale, '[]')) {
      return null
    }
    const diff = current.diff(start, scale.value.scale, true)
    return (diff / (scale.value.step || 1)) * headerWidth.value
  })
  return {
    horizontalLines,
    verticalLines,
    resourceXDates,
    currentTimePosition,
    now,
  }
}
