<template>
  <div
    class="scheduler-task-item relative inset-0"
    :class="{
      'scheduler-task-item--selected': isSelected,
      'scheduler-task-item--not-indexed': isIndexed === false,
    }"
    :style="{
      '--scheduler-task-item-background-color': backgroundColor,
      '--scheduler-task-item-text-color': textColor,
      '--scheduler-task-item-border-color': borderColor,
      '--scheduler-task-item-header-color': headerColor,
      '--scheduler-task-item-header-text-color': headerTextColor,
    }"
  >
    <div class="scheduler-task-item-header">
      <slot name="item-header" :task="task">
        {{ task.label }}
      </slot>
    </div>
    <div class="scheduler-task-item-content">
      <slot name="item-content" :task="task">
        <div class="flex flex-col gap-1">
          <span>Drilling ({{ task.end.diff(task.start, 'days') }} days)</span>
          <span>{{ task.label }}</span>
        </div>
      </slot>
    </div>

    <UPopover
      mode="hover"
      :open-delay="200"
      :close-delay="0"
      :reference="reference"
      :content="{ updatePositionStrategy: 'optimized', side: 'right' }"
      v-if="!editable"
    >
      <div class="absolute inset-0 cursor-pointer" @pointermove="onPointerMove"></div>
      <template #content>
        <slot name="item-content-hover" :task="task">
          <div class="flex flex-col gap-1 text-sm p-2">
            <div v-for="value in 10" :key="value" class="flex flex-col justify-center">
              <UPopover
                mode="hover"
                :open-delay="200"
                :close-delay="300"
                arrow
                :content="{ side: 'right' }"
              >
                <div class="flex-1">{{ value }}</div>
                <template #content>
                  <div class="flex flex-col gap-1 text-sm p-2">
                    <div v-for="values in 10" :key="values">Content {{ values }}</div>
                  </div>
                </template>
              </UPopover>
            </div>
          </div>
        </slot>
      </template>
    </UPopover>

    <UContextMenu :items="rightClickItems" v-if="editable">
      <div class="absolute inset-0">
        <div class="absolute inset-0 cursor-move draggable" data-action="resize-both"></div>
        <div
          class="absolute right-0 bottom-0 flex items-end cursor-e-resize"
          data-action="resize-end"
        >
          <UIcon name="i-lucide-arrow-down-right" class="w-3.5 h-3.5 pointer-events-none" />
        </div>
      </div>
    </UContextMenu>

    <AppDatePickerModal
      :open="openCalendarModal"
      @update:open="openCalendarModal = $event"
      @select="handleSelectDate"
      :initial-value="task.start"
    />
  </div>
</template>

<script setup lang="ts" generic="T">
import type { SchedulerTask } from '@/types/scheduler'
import { computed, ref } from 'vue'
import { useTextColor } from '@/composables/useTextColor'
import type { ContextMenuItem } from '@nuxt/ui'
import moment from 'moment'
import AppDatePickerModal from './AppDatePickerModal.vue'

const { getContrastColor } = useTextColor()

interface Props {
  task: SchedulerTask<T>

  editable?: boolean
  isSelected?: boolean

  rightClickItems?: ContextMenuItem[][]
  top?: number
  left?: number
  width?: number
  isIndexed?: boolean
}

const props = defineProps<Props>()

interface Emits {
  (e: 'change-date', selectedDate: moment.Moment, task: SchedulerTask<T>): void
}

const emit = defineEmits<Emits>()

const headerColor = computed(() => props.task.headerColor ?? '#000000')
const headerTextColor = computed(() => getContrastColor(headerColor.value))
const backgroundColor = computed(() => props.task.backgroundColor ?? '#00ff00')
const borderColor = computed(() => props.task.borderColor ?? '#000000')
const textColor = computed(() => getContrastColor(backgroundColor.value))

const anchor = ref({ x: 0, y: 0 })

const reference = computed(() => ({
  getBoundingClientRect: () =>
    ({
      width: 0,
      height: 0,
      left: anchor.value.x,
      right: anchor.value.x,
      top: anchor.value.y,
      bottom: anchor.value.y,
      ...anchor.value,
    }) as DOMRect,
}))

const onPointerMove = (event: PointerEvent) => {
  anchor.value = { x: event.clientX, y: event.clientY }
}

const handleSelectDate = (selectedDate: moment.Moment) => {
  emit('change-date', selectedDate, props.task)
}

const openCalendarModal = ref(false)

const rightClickItems = computed<ContextMenuItem[][]>(() => {
  if (props.rightClickItems) {
    return props.rightClickItems
  }

  return [
    [
      {
        label: 'Move to Date',
        icon: 'i-heroicons-calendar',
        onClick: async () => {
          openCalendarModal.value = true
        },
      },
      {
        label: 'Edit',
        icon: 'i-heroicons-pencil',
      },
    ],
    [
      {
        label: 'Delete',
        icon: 'i-heroicons-trash',
        color: 'error',
      },
    ],
  ] as ContextMenuItem[][]
})
</script>
