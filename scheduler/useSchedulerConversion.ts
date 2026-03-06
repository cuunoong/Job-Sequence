import moment, { type Moment } from 'moment'
import { type Ref } from 'vue'
import type { SchedulerZoomScale } from '@/types/scheduler'
import { useSchedulerHeaderHours } from './useSchedulerHeaders'
export function useSchedulerConversion(
  startDate: Ref<Date | string>,
  scale: Ref<SchedulerZoomScale>,
  headerWidth: Ref<number>,
) {
  const stepInHours = useSchedulerHeaderHours({ group: scale.value.scale, step: scale.value.step })
  function dateToPx(date: Date | string | moment.Moment): number {
    const start = moment(startDate.value)
    const target = moment(date)
    const diff = target.diff(start, 'hours', true)
    return (diff / stepInHours) * headerWidth.value
  }
  function pxToDate(px: number): Moment {
    const start = moment(startDate.value)
    const unitsToAdd = (px / headerWidth.value) * stepInHours
    return start.add(unitsToAdd, 'hours')
  }
  return {
    dateToPx,
    pxToDate,
  }
}
