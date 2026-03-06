import moment from 'moment'
import { computed } from 'vue'
import type { SchedulerTask, SchedulerZoomScale } from '@/types/scheduler'
export interface UseSchedulerConfigProps<T> {
  height?: string | number
  width?: string | number
  startDate?: Date | string
  endDate?: Date | string
  scale?: SchedulerZoomScale
  headerHeight?: number
  headerWidth?: number
  resourceWidth?: number
  resourceHeight?: number
  taskPaddingVertical?: number
  tasks?: Array<SchedulerTask<T>>
}
export function useSchedulerConfig<T>(props: UseSchedulerConfigProps<T>) {
  const height = computed(() => props.height || '600px')
  const width = computed(() => props.width || '800px')
  const startDate = computed(() => props.startDate || moment().startOf('year').toDate())
  const endDate = computed(() => props.endDate || moment().add(5, 'year').endOf('year').toDate())
  const taskPaddingVertical = computed(() => props.taskPaddingVertical || 8)
  const scale = computed<SchedulerZoomScale>(
    () =>
      props.scale || {
        scale: 'd',
        step: 1,
      },
  )
  const headerHeight = computed(() => props.headerHeight || 30)
  const headerWidth = computed(() => props.headerWidth || 30)
  const resourceWidth = computed(() => props.resourceWidth || 120)
  const resourceHeight = computed(() => props.resourceHeight || 40)
  const totalColumns = computed(() => {
    const start = moment(startDate.value)
    const end = moment(endDate.value)
    const diff = end.diff(start, scale.value.scale) + 1
    return diff / scale.value.step
  })
  const tasksProp = computed(() =>
    props.tasks?.sort((a, b) => moment(a.start).valueOf() - moment(b.start).valueOf()),
  )
  return {
    height,
    width,
    startDate,
    endDate,
    taskPaddingVertical,
    scale,
    headerHeight,
    headerWidth,
    resourceWidth,
    resourceHeight,
    totalColumns,
    tasksProp,
  }
}
