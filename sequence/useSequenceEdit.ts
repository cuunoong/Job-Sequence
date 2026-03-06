import { ref, type Ref } from 'vue'
import { useRefHistory, onKeyStroke } from '@vueuse/core'
import type { SchedulerTask } from '@/types/scheduler'
import moment from 'moment'

export function useSequenceEdit<T>(
  tasks: Ref<SchedulerTask<T>[]>,
  initialTasks: SchedulerTask<T>[] | undefined,
  onSave?: (changedTasks: SchedulerTask<T>[]) => Promise<boolean>,
) {
  const editable = ref(false)
  const originalState = ref('')
  const showConfirmModal = ref(false)
  const showCancelConfirmModal = ref(false)
  const pendingChangedTasks = ref<SchedulerTask<T>[]>([])

  const handleEdit = () => {
    if (!editable.value) {
      originalState.value = JSON.stringify(tasks.value)
    }
    editable.value = !editable.value
  }

  const handleSave = () => {
    const original: SchedulerTask<T>[] = originalState.value
      ? JSON.parse(originalState.value).map((task: SchedulerTask<T>) => ({
          ...task,
          start: moment(task.start),
          end: moment(task.end),
        }))
      : []

    const originalMap = new Map(original.map((t) => [t.id, t]))

    pendingChangedTasks.value = tasks.value.filter((task) => {
      const orig = originalMap.get(task.id)
      if (!orig) return true
      return (
        !task.start.isSame(orig.start) ||
        !task.end.isSame(orig.end) ||
        task.resourceId !== orig.resourceId ||
        task.label !== orig.label
      )
    }) as SchedulerTask<T>[]

    if (pendingChangedTasks.value.length === 0) {
      confirmSave()
    } else {
      showConfirmModal.value = true
    }
  }

  const confirmSave = async () => {
    const changes = pendingChangedTasks.value as SchedulerTask<T>[]
    if (onSave) {
      const result = await onSave(changes)
      if (!result) {
        return
      }
    }

    editable.value = false
    originalState.value = ''
    commit()
    clear()
    showConfirmModal.value = false
    pendingChangedTasks.value = []
  }

  const cancelSave = () => {
    showConfirmModal.value = false
    pendingChangedTasks.value = []
  }

  const { undo, redo, canUndo, canRedo, clear, commit } = useRefHistory(tasks, {
    deep: true,
    capacity: 5,
    dump: (v) => JSON.stringify(v),
    parse(v) {
      return JSON.parse(v).map((task: SchedulerTask<T>) => ({
        ...task,
        start: moment(task.start),
        end: moment(task.end),
      }))
    },
  })

  const handleCancel = () => {
    // Check if there are any changes before showing confirmation
    const original: SchedulerTask<T>[] = originalState.value
      ? JSON.parse(originalState.value).map((task: SchedulerTask<T>) => ({
          ...task,
          start: moment(task.start),
          end: moment(task.end),
        }))
      : []

    const originalMap = new Map(original.map((t) => [t.id, t]))

    const hasChanges = tasks.value.some((task) => {
      const orig = originalMap.get(task.id)
      if (!orig) return true
      return (
        !task.start.isSame(orig.start) ||
        !task.end.isSame(orig.end) ||
        task.resourceId !== orig.resourceId ||
        task.label !== orig.label
      )
    })

    if (hasChanges) {
      showCancelConfirmModal.value = true
    } else {
      confirmCancel()
    }
  }

  const confirmCancel = () => {
    if (originalState.value) {
      tasks.value = JSON.parse(originalState.value).map((task: SchedulerTask<T>) => ({
        ...task,
        start: moment(task.start),
        end: moment(task.end),
      }))
    } else {
      tasks.value = initialTasks || []
    }
    commit()
    clear()
    editable.value = false
    showCancelConfirmModal.value = false
  }

  const abortCancel = () => {
    showCancelConfirmModal.value = false
  }

  const handleLock = () => {
    editable.value = !editable.value
  }

  onKeyStroke(['z', 'Z'], (e) => {
    if (editable.value) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        undo()
      }
    }
  })

  onKeyStroke(['y', 'Y'], (e) => {
    if (editable.value) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        redo()
      }
    }
  })

  return {
    editable,
    handleEdit,
    handleSave,
    confirmSave,
    cancelSave,
    showConfirmModal,
    showCancelConfirmModal,
    pendingChangedTasks,
    handleCancel,
    confirmCancel,
    abortCancel,
    handleLock,
    undo,
    redo,
    canUndo,
    canRedo,
  }
}
