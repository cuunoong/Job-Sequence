<template>
  <Transition name="fade" mode="out-in">
    <AppScheduler
      v-model="tasks"
      :key="animatedKey"
      v-if="!loading"
      width="100%"
      :startDate="startDate"
      :endDate="endDate"
      :scale="scale"
      :headers="headers"
      :header-width="headerWidth"
      :resource-height="resourceHeight ?? 80"
      :resources="resources"
      :height="height"
      :corner-text="cornerText"
      :editable="editable"
      :right-click-items="rightClickItems"
      :matched-task-ids="matchedTaskIds"
      :can-drag-over-resource="canDragOverResource"
    >
      <template #resource-label="{ resource }">
        <slot name="resource-label" :resource="resource" />
      </template>

      <template #task-item="props">
        <slot name="task-item" v-bind="props" />
      </template>

      <template #item-content="props">
        <slot name="item-content" v-bind="props" />
      </template>

      <template #item-content-hover="props">
        <slot name="item-content-hover" v-bind="props" />
      </template>
    </AppScheduler>
  </Transition>
</template>

<script setup lang="ts" generic="T">
import type {
  SchedulerHeader,
  SchedulerResource,
  SchedulerTask,
  SchedulerZoomScale,
} from '@/types/scheduler'
import moment, { type unitOfTime } from 'moment'
import { computed } from 'vue'
import type { ContextMenuItem } from '@nuxt/ui'

interface Props {
  startDate?: Date | string

  zoom?: 1 | 2 | 3 | 4 | 5
  page?: number

  height?: string

  cornerText?: string

  resources?: SchedulerResource[]
  resourceHeight?: number

  editable?: boolean

  rightClickItems?: ContextMenuItem[][]

  matchedTaskIds?: Set<string>

  loading?: boolean
  canDragOverResource?: boolean
}

const animatedKey = computed(() => {
  return `${props.zoom}-${props.startDate}-${props.height}-${props.resources?.length}-${props.cornerText}-${props.page}`
})

const props = defineProps<Props>()

const tasks = defineModel<SchedulerTask<T>[]>({ default: () => [] })

const zoom = computed(() => props.zoom || 5)

const scale = computed<SchedulerZoomScale>(() => {
  switch (zoom.value) {
    case 1:
      return {
        scale: 'hour',
        step: 2,
      }
    case 2:
      return {
        scale: 'day',
        step: 1,
      }
    case 3:
      return {
        scale: 'day',
        step: 1,
      }
    case 4:
      return {
        scale: 'week',
        step: 1,
      }
    case 5:
      return {
        scale: 'month',
        step: 1,
      }
    default:
      return {
        scale: 'day',
        step: 1,
      }
  }
})

const headers = computed<SchedulerHeader[]>(() => {
  switch (zoom.value) {
    case 1:
      return [
        {
          group: 'year',
          format: 'yyyy',
        },
        {
          group: 'day',
          format: 'DD MMM',
        },
        {
          group: 'hour',
          format: 'HH',
          step: 2,
        },
      ]
    case 2:
      return [
        {
          group: 'year',
          format: 'yyyy',
        },
        {
          group: 'month',
          format: 'MMM',
        },
        {
          group: 'day',
          format: 'DD',
        },
      ]
    case 3:
      return [
        {
          group: 'year',
          format: 'yyyy',
        },
        {
          group: 'month',
          format: 'MMM',
        },
        {
          group: 'day',
          format: 'DD',
          step: 1,
        },
      ]
    case 4:
      return [
        {
          group: 'year',
          format: 'yyyy',
        },
        {
          group: 'month',
          format: 'MMM',
        },
        {
          group: 'week',
          format: '[W-]WW',
        },
      ]
    case 5:
      return [
        {
          group: 'year',
          format: 'yyyy',
        },
        {
          group: 'month',
          format: 'MMM',
        },
      ]
    default:
      return [
        {
          group: 'day',
          format: 'DD',
        },
      ]
  }
})

const headerWidth = computed(() => {
  switch (zoom.value) {
    case 1:
      return 30
    case 2:
      return 35
    case 3:
      return 25
    case 4:
      return 70
    case 5:
      return 61
    default:
      return 35
  }
})

const page = computed(() => (props.page ?? 1) - 1)

const pageOffset = computed<{ scale: unitOfTime.Base; step: number }>(() => {
  switch (zoom.value) {
    case 1:
      return {
        scale: 'day',
        step: 10,
      }
    default:
      return {
        scale: 'year',
        step: 1,
      }
  }
})

const startDate = computed(() => {
  const start = props.startDate ? moment(props.startDate) : moment().startOf('year')

  start.add(page.value * pageOffset.value.step, pageOffset.value.scale)

  return start.toDate()
})

const endDate = computed(() => {
  const end = moment(startDate.value)

  return end
    .add(pageOffset.value.step, pageOffset.value.scale)
    .endOf(pageOffset.value.scale)
    .toDate()
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
