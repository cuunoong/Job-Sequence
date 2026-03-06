import { computed, type Ref, ref } from 'vue'
import type { SchedulerResource } from '@/types/scheduler'
export function useSchedulerResources(resourcesProp: Ref<Array<SchedulerResource> | undefined>) {
  const resources = ref<SchedulerResource[]>(
    resourcesProp.value || [
      { id: '1', label: 'Resource 1', type: 'task' },
      { id: '2', label: 'Resource 2', type: 'task' },
      { id: '3', label: 'Resource 3', type: 'milestone' },
    ],
  )
  const totalRows = computed(() => {
    return resources.value.length
  })
  return {
    resources,
    totalRows,
  }
}
