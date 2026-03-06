import { ref, computed } from 'vue'
export interface UseSchedulerSelectionOptions {
  mode?: 'single' | 'multi'
}
export function useSchedulerSelection(options: UseSchedulerSelectionOptions = {}) {
  const mode = ref(options.mode || 'single')
  const selectedTaskIds = ref<Set<string>>(new Set())
  const currentResourceId = ref<string | number | null>(null)
  const selectedCount = computed(() => selectedTaskIds.value.size)
  const selectTask = (taskId: string, resourceId: string | number, addToSelection = false) => {
    if (currentResourceId.value !== null && currentResourceId.value !== resourceId) {
      selectedTaskIds.value.clear()
    }
    if (mode.value === 'single' && !addToSelection) {
      selectedTaskIds.value.clear()
    }
    selectedTaskIds.value.add(taskId)
    currentResourceId.value = resourceId
  }
  const deselectTask = (taskId: string) => {
    selectedTaskIds.value.delete(taskId)
    if (selectedTaskIds.value.size === 0) {
      currentResourceId.value = null
    }
  }
  const toggleTask = (taskId: string, resourceId: string | number, addToSelection = false) => {
    if (selectedTaskIds.value.has(taskId)) {
      deselectTask(taskId)
    } else {
      selectTask(taskId, resourceId, addToSelection)
    }
  }
  const clearSelection = () => {
    selectedTaskIds.value.clear()
    currentResourceId.value = null
  }
  const isSelected = (taskId: string) => {
    return selectedTaskIds.value.has(taskId)
  }
  const getSelectedTaskIds = () => {
    return Array.from(selectedTaskIds.value)
  }
  return {
    selectedTaskIds,
    selectedCount,
    currentResourceId,
    mode,
    selectTask,
    deselectTask,
    toggleTask,
    clearSelection,
    isSelected,
    getSelectedTaskIds,
  }
}
