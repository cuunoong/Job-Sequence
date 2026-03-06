import { ref, type Ref, watch, shallowRef } from 'vue'
import moment from 'moment'
import type { SchedulerTask, SchedulerResource } from '@/types/scheduler'
import { useSchedulerTaskPlacement } from './useSchedulerTaskPlacement'
export function useSchedulerDrag<T>(
  tasksProp: Ref<SchedulerTask<T>[] | undefined>,
  processedResources: Ref<SchedulerResource[]>,
  resourceHeight: Ref<number>,
  pxToDate: (px: number) => moment.Moment,
  dateToPx: (date: moment.Moment) => number,
  triggerRef: (ref: Ref) => void,
  containerRef: Ref<HTMLElement | null>,
  startDate: Ref<Date | string>,
  endDate: Ref<Date | string>,
  getSelectedTaskIds: () => string[],
  canDragOverResource?: Ref<boolean | undefined>,
) {
  const effectiveTasks = shallowRef<SchedulerTask<T>[]>(tasksProp.value || [])
  interface DragState<T> {
    isDragging: boolean
    hasMoved: boolean
    startX: number
    startY: number
    task: SchedulerTask<T> | null
    originalStart: number
    originalEnd: number
    originalResourceId: string | number
    action: 'resize-both' | 'resize-end'
    originalTaskPositions: Map<string, { start: number; end: number }>
    selectedTaskIds: string[]
    selectedTaskOffsets: Map<
      string,
      { offsetDays: number; duration: number; resourceId: string | number }
    >
    hasCollision: boolean
  }

  const dragState = shallowRef<DragState<T> | null>(null)
  watch(
    tasksProp,
    (newValue: SchedulerTask<T>[] | undefined) => {
      if (!dragState.value?.isDragging) {
        effectiveTasks.value = newValue || []
      }
    },
    { deep: true, immediate: true },
  )
  const tooltipState = ref<{
    visible: boolean
    x: number
    y: number
    content: string
    hasCollision: boolean
  } | null>(null)
  const updateTooltip = (
    event: PointerEvent,
    action: 'resize-both' | 'resize-end',
    startDate: moment.Moment,
    endDate: moment.Moment,
    hasCollision: boolean = false,
  ) => {
    const format = 'MM/DD/YYYY'
    let content = ''
    if (action === 'resize-end') {
      content = `End: ${endDate.format(format)}`
    } else {
      content = `${startDate.format(format)} - ${endDate.format(format)}`
    }

    if (hasCollision) {
      content = `Clash: ${content}`
    }
    tooltipState.value = {
      visible: true,
      x: event.clientX + 10,
      y: event.clientY + 10,
      content,
      hasCollision,
    }
  }
  const { placeTasks, resizeTaskEnd, getGlobalKeysOverlap } =
    useSchedulerTaskPlacement(effectiveTasks)
  const handleItemDrag = (event: PointerEvent, item?: { task: SchedulerTask<T> }) => {
    if (event.type === 'pointerdown' && item) {
      if (effectiveTasks.value) {
        effectiveTasks.value = effectiveTasks.value.map((t) => ({ ...t }))
      }
      const target = event.target as HTMLElement
      const action =
        (target.getAttribute('data-action') as 'resize-both' | 'resize-end' | null) || 'resize-both'
      const originalTaskPositions = new Map<string, { start: number; end: number }>()
      effectiveTasks.value?.forEach((task) => {
        originalTaskPositions.set(task.id, {
          start: moment(task.start).valueOf(),
          end: moment(task.end).valueOf(),
        })
      })
      const selectedIds = getSelectedTaskIds()
      const selectedTaskOffsets = new Map<
        string,
        { offsetDays: number; duration: number; resourceId: string | number }
      >()
      if (selectedIds.length > 1 && selectedIds.includes(item.task.id)) {
        const draggedTaskStart = moment(item.task.start)
        selectedIds.forEach((taskId) => {
          const task = effectiveTasks.value?.find((t) => t.id === taskId && t.type === 'task')
          if (task) {
            selectedTaskOffsets.set(taskId, {
              offsetDays: moment(task.start).diff(draggedTaskStart, 'days'),
              duration: moment(task.end).diff(moment(task.start), 'days'),
              resourceId: task.resourceId,
            })
          }
        })
      }
      dragState.value = {
        isDragging: true,
        hasMoved: false,
        startX: event.clientX,
        startY: event.clientY,
        task: item.task,
        originalStart: item.task.start.valueOf(),
        originalEnd: item.task.end.valueOf(),
        originalResourceId: item.task.resourceId,
        action,
        originalTaskPositions,
        selectedTaskIds:
          selectedIds.length > 1 && selectedIds.includes(item.task.id) ? selectedIds : [],
        selectedTaskOffsets,
        hasCollision: false,
      }
      updateTooltip(event, action, moment(item.task.start), moment(item.task.end))
      window.addEventListener('pointermove', onWindowPointerMove)
      window.addEventListener('pointerup', onWindowPointerUp)
    }
  }
  const onWindowPointerMove = (event: PointerEvent) => {
    if (!dragState.value?.isDragging) return
    const deltaX = event.clientX - dragState.value.startX
    const deltaY = event.clientY - dragState.value.startY
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      dragState.value.hasMoved = true
    }
    const taskItem = effectiveTasks.value?.find((t) => t.id === dragState.value!.task!.id)
    const boundaryStart = moment(startDate.value).startOf('day')
    const boundaryEnd = moment(endDate.value).endOf('day')
    if (taskItem) {
      const originalEndDate = moment(dragState.value.originalEnd)
      const originalEndPx = dateToPx(originalEndDate)
      if (dragState.value.action === 'resize-end') {
        const newEndPx = originalEndPx + deltaX
        const newEndDate = pxToDate(newEndPx).startOf('day')
        dragState.value.originalTaskPositions.forEach(
          (pos: { start: number; end: number }, taskId: string) => {
            const task = effectiveTasks.value?.find((t) => t.id === taskId)
            if (task) {
              task.start = moment(pos.start)
              task.end = moment(pos.end)
            }
          },
        )
        resizeTaskEnd(taskItem.id, newEndDate)

        const collision = getGlobalKeysOverlap(
          taskItem.id,
          taskItem.keys || [],
          moment(taskItem.start),
          newEndDate,
        )
        dragState.value.hasCollision = !!collision

        updateTooltip(
          event,
          dragState.value.action,
          moment(taskItem.start),
          newEndDate,
          dragState.value.hasCollision,
        )
      } else {
        if (!containerRef.value) return

        const rect = containerRef.value.getBoundingClientRect()
        const scrollLeft = containerRef.value.scrollLeft
        const containerRelativeX = event.clientX - rect.left + scrollLeft
        let newStartDate = pxToDate(containerRelativeX).startOf('day')
        if (newStartDate.isBefore(boundaryStart)) {
          newStartDate = boundaryStart.clone()
        } else if (newStartDate.isAfter(boundaryEnd)) {
          newStartDate = boundaryEnd.clone()
        }
        const duration = dragState.value.originalEnd - dragState.value.originalStart
        const newEndDate = newStartDate.clone().add(duration, 'ms').startOf('day')

        const deltaY = event.clientY - dragState.value.startY
        const rowChange = Math.round(deltaY / resourceHeight.value)
        let targetResourceId = taskItem.resourceId
        const originalResourceIndex = processedResources.value.findIndex(
          (r) => r.id === dragState.value?.originalResourceId,
        )
        if (originalResourceIndex !== -1 && canDragOverResource?.value !== false) {
          let newRowIndex = originalResourceIndex + rowChange
          newRowIndex = Math.max(0, Math.min(newRowIndex, processedResources.value.length - 1))
          const newResource = processedResources.value[newRowIndex]
          if (newResource && newResource.type !== 'milestone') {
            targetResourceId = newResource.id
          }
        }
        dragState.value.originalTaskPositions.forEach(
          (pos: { start: number; end: number }, taskId: string) => {
            const task = effectiveTasks.value?.find((t) => t.id === taskId)
            if (task) {
              task.start = moment(pos.start)
              task.end = moment(pos.end)
            }
          },
        )
        const taskIds =
          dragState.value.selectedTaskIds.length > 0
            ? dragState.value.selectedTaskIds
            : [taskItem.id]
        placeTasks(taskIds, newStartDate, { resourceId: targetResourceId })

        // Check for keys collision after placement (to account for pushed tasks)
        const collision = getGlobalKeysOverlap(
          taskItem.id,
          taskItem.keys || [],
          newStartDate,
          newEndDate,
        )
        dragState.value.hasCollision = !!collision

        updateTooltip(
          event,
          dragState.value.action,
          newStartDate,
          newEndDate,
          dragState.value.hasCollision,
        )
      }
      triggerRef(effectiveTasks)
    }
  }
  const onWindowPointerUp = () => {
    const hadMoved = dragState.value?.hasMoved ?? false
    const hasCollision = dragState.value?.hasCollision ?? false
    window.removeEventListener('pointermove', onWindowPointerMove)
    window.removeEventListener('pointerup', onWindowPointerUp)

    if (hadMoved && !hasCollision) {
      lastDragEndTime.value = Date.now()
      tasksProp.value = effectiveTasks.value // Update the model only on finish
    } else {
      effectiveTasks.value = tasksProp.value ? [...tasksProp.value] : []
    }
    dragState.value = null
    tooltipState.value = null
  }
  const lastDragEndTime = ref<number>(0)
  return {
    effectiveTasks,
    dragState,
    handleItemDrag,
    tooltipState,
    lastDragEndTime,
  }
}
