import { computed, type Ref } from 'vue'
import type {
  GroupedSchedulerTask,
  SchedulerResource,
  SchedulerTask,
  SchedulerZoomScale,
} from '@/types/scheduler'
import { useSchedulerConversion } from './useSchedulerConversion'
import moment from 'moment'
export interface SchedulerTaskLayout<T> {
  tasks: Array<GroupedSchedulerTask<T>>
  left: number
  top: number
  width: number
  type: 'task' | 'milestone'
}
export function useSchedulerTasks<T>(
  startDate: Ref<Date | string>,
  endDate: Ref<Date | string>,
  scale: Ref<SchedulerZoomScale>,
  headerWidth: Ref<number>,
  resourceHeight: Ref<number>,
  resources: Ref<Array<SchedulerResource>>,
  taskPaddingVertical: Ref<number>,
  tasks: Ref<Array<SchedulerTask<T>> | undefined>,
) {
  const startDateValue = moment(startDate.value)
  const endDateValue = moment(endDate.value)
  const { dateToPx } = useSchedulerConversion(startDate, scale, headerWidth)
  const processedTasks = computed<Array<SchedulerTaskLayout<T>>>(() => {
    if (!tasks.value) return []
    const mappedTasks = tasks.value
      .filter(
        (task) =>
          task.end.isSameOrAfter(startDate.value, scale.value.scale) &&
          task.start.isSameOrBefore(endDate.value, scale.value.scale),
      )
      .map((task) => {
        const start = moment.max(task.start, startDateValue)
        const end = moment.min(task.end, endDateValue)
        const startPx = dateToPx(start)
        const endPx = dateToPx(end)
        const resourceIndex = resources.value.findIndex((r) => r.id === task.resourceId)
        const top =
          resourceIndex >= 0
            ? resourceIndex * resourceHeight.value + taskPaddingVertical.value
            : -9999
        return {
          task,
          left: startPx,
          width: endPx - startPx,
          top,
          start: task.start.valueOf(),
          resourceIndex,
        }
      })
      .filter((t) => t.top !== -9999)
      .sort((a, b) => {
        if (a.resourceIndex !== b.resourceIndex) return a.resourceIndex - b.resourceIndex
        return a.start - b.start
      })
    const groupedTasks: Array<SchedulerTaskLayout<T>> = []
    mappedTasks.forEach((current) => {
      const lastGroup = groupedTasks[groupedTasks.length - 1]
      const isMilestone = current.task.type === 'milestone'
      if (
        isMilestone &&
        lastGroup &&
        lastGroup.type === 'milestone' &&
        lastGroup.top === current.top &&
        current.left - (lastGroup.left + lastGroup.width) < 10
      ) {
        lastGroup.tasks.push({
          task: current.task,
          left: current.left,
          width: current.width,
        })
        lastGroup.width = Math.max(lastGroup.width, current.left + current.width - lastGroup.left)
      } else {
        groupedTasks.push({
          tasks: [
            {
              task: current.task,
              left: current.left,
              width: current.width,
            },
          ],
          left: current.left,
          top: current.top,
          width: current.width,
          type: current.task.type,
        })
      }
    })
    return groupedTasks
  })
  return {
    processedTasks,
  }
}
