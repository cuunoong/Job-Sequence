import moment from 'moment'
import type { SchedulerTask } from '@/types/scheduler'
import type { Ref } from 'vue'
export function useSchedulerTaskPlacement<T>(tasks: Ref<SchedulerTask<T>[]>) {
  const getAllTasksOnResource = (
    resourceId: string | number,
    excludeTaskIds?: string | string[],
  ) => {
    const excludeSet = excludeTaskIds
      ? new Set(Array.isArray(excludeTaskIds) ? excludeTaskIds : [excludeTaskIds])
      : new Set()
    return tasks.value
      .filter((t) => t.resourceId === resourceId && !excludeSet.has(t.id) && t.type === 'task')
      .sort((a, b) => moment(a.start).valueOf() - moment(b.start).valueOf())
  }
  const getOverlappingTask = (
    taskId: string,
    resourceId: string | number,
    start: moment.Moment,
    end: moment.Moment,
  ) => {
    return tasks.value.find((t) => {
      if (t.id === taskId || t.resourceId !== resourceId || t.type !== 'task') return false
      const tStart = moment(t.start)
      const tEnd = moment(t.end)
      return start.isBefore(tEnd) && end.isAfter(tStart)
    })
  }
  const chainPushTasks = (
    resourceId: string | number,
    newStart: moment.Moment,
    newEnd: moment.Moment,
    excludeTaskIds: string | string[],
  ) => {
    const tasksOnResource = getAllTasksOnResource(resourceId, excludeTaskIds).sort(
      (a, b) => moment(a.start).valueOf() - moment(b.start).valueOf(),
    )

    let currentPushEnd = newEnd.clone()

    for (const task of tasksOnResource) {
      const taskStart = moment(task.start)
      const taskEnd = moment(task.end)

      if (
        (taskStart.isSameOrAfter(newStart) && taskStart.isBefore(currentPushEnd)) ||
        (taskStart.isSameOrBefore(newStart) && taskEnd.isAfter(newStart)) ||
        (taskStart.isSameOrBefore(newStart) && taskEnd.isSameOrAfter(currentPushEnd))
      ) {
        const pushAmount = currentPushEnd.diff(taskStart, 'days')
        task.start = taskStart.add(pushAmount, 'days').startOf('day')
        task.end = taskEnd.add(pushAmount, 'days').startOf('day')

        currentPushEnd = moment(task.end).clone()
      } else if (taskStart.isSameOrAfter(currentPushEnd)) {
        break
      }
    }
  }
  const pushTasksForward = (
    resourceId: string | number,
    fromDate: moment.Moment,
    pushAmount: number,
    excludeTaskId: string,
  ) => {
    const tasksOnResource = getAllTasksOnResource(resourceId, excludeTaskId)
    let currentEndDate = fromDate.clone()
    let pushRemaining = pushAmount
    for (let i = 0; i < tasksOnResource.length; i++) {
      const task = tasksOnResource[i]!
      const taskStart = moment(task.start)
      if (taskStart.isSameOrAfter(currentEndDate)) {
        const gap = taskStart.diff(currentEndDate, 'days')
        pushRemaining -= gap
        if (pushRemaining <= 0) {
          break
        }
        currentEndDate = moment(task.end).clone()
        task.start = moment(task.start).add(pushRemaining, 'days').startOf('day')
        task.end = moment(task.end).add(pushRemaining, 'days').startOf('day')
      }
    }
  }
  const placeTasks = (
    taskIds: string | string[],
    targetDate: moment.Moment,
    options?: {
      resourceId?: string | number
      mode?: 'sequential' | 'preserve-gaps'
    },
  ) => {
    const ids = Array.isArray(taskIds) ? taskIds : [taskIds]
    if (ids.length === 0) return

    const mode = options?.mode ?? 'sequential'
    const selectedTasks = tasks.value
      .filter((t) => ids.includes(t.id) && t.type === 'task')
      .sort((a, b) => moment(a.start).valueOf() - moment(b.start).valueOf())

    if (selectedTasks.length === 0) return

    if (mode === 'preserve-gaps') {
      const firstTask = selectedTasks[0]!
      const firstTaskStart = moment(firstTask.start)
      const taskOffsets = selectedTasks.map((task) => ({
        task,
        offsetDays: moment(task.start).diff(firstTaskStart, 'days'),
        duration: moment(task.end).diff(moment(task.start), 'milliseconds'),
      }))

      taskOffsets.forEach(({ task, offsetDays, duration }) => {
        const newStart = targetDate.clone().add(offsetDays, 'days').startOf('day')
        const newEnd = newStart.clone().add(duration, 'milliseconds').startOf('day')
        const targetResourceId = options?.resourceId ?? task.resourceId
        chainPushTasks(targetResourceId, newStart, newEnd, task.id)
        task.start = newStart
        task.end = newEnd
        task.resourceId = String(targetResourceId)
      })
    } else {
      const taskDurations = selectedTasks.map((task) => ({
        task,
        duration: moment(task.end).diff(moment(task.start), 'days'),
      }))

      const totalDuration = taskDurations.reduce((sum, item) => sum + item.duration, 0)
      const totalEndDate = targetDate.clone().add(totalDuration, 'days').startOf('day')
      const targetResourceId = options?.resourceId ?? selectedTasks[0]!.resourceId

      chainPushTasks(String(targetResourceId), targetDate, totalEndDate, ids)

      let currentStartDate = targetDate.clone()
      taskDurations.forEach(({ task, duration }) => {
        const taskNewStart = currentStartDate.clone().startOf('day')
        const taskNewEnd = taskNewStart.clone().add(duration, 'days').startOf('day')
        task.start = taskNewStart
        task.end = taskNewEnd
        task.resourceId = String(targetResourceId)
        currentStartDate = taskNewEnd.clone()
      })
    }
  }

  const resizeTaskEnd = (taskId: string, newEndDate: moment.Moment) => {
    const task = tasks.value.find((t) => t.id === taskId)
    if (!task) return

    const overlap = getOverlappingTask(taskId, task.resourceId, moment(task.start), newEndDate)
    if (overlap) {
      const pushDays = newEndDate.diff(overlap.start, 'days')
      if (pushDays > 0) {
        pushTasksForward(task.resourceId, overlap.start, pushDays, taskId)
      }
    }
    if (newEndDate.isAfter(task.start)) {
      task.end = newEndDate
    }
  }

  const getGlobalKeysOverlap = (
    taskId: string,
    keys: (string | number)[],
    start: moment.Moment,
    end: moment.Moment,
  ) => {
    if (!keys || keys.length === 0) return null

    return tasks.value.find((t) => {
      if (t.id === taskId || t.type !== 'task' || !t.keys || t.keys.length === 0) return false

      // Check if any key from this task exists in the target task
      const hasSharedKey = keys.some((key) => t.keys!.includes(key))
      if (!hasSharedKey) return false

      const tStart = moment(t.start)
      const tEnd = moment(t.end)
      return start.isBefore(tEnd) && end.isAfter(tStart)
    })
  }

  return {
    getAllTasksOnResource,
    getOverlappingTask,
    chainPushTasks,
    pushTasksForward,
    placeTasks,
    resizeTaskEnd,
    getGlobalKeysOverlap,
  }
}
