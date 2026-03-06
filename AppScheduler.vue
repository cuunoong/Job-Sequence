<template>
  <div>
    <div
      class="scheduler"
      :style="{
        '--scheduler-prop-height': height,
        '--scheduler-prop-width': width,
        '--scheduler-prop-header-height': headerHeight + 'px',
        '--scheduler-prop-header-width': headerWidth + 'px',
        '--scheduler-prop-header-rows': headerRowCount,
        '--scheduler-prop-resource-width': resourceWidth + 'px',
        '--scheduler-prop-resource-height': resourceHeight + 'px',
        '--scheduler-prop-total-columns': totalColumns,
        '--scheduler-prop-total-rows': totalRows,
        '--scheduler-header-row-width': headerRowWidth + 'px',
        '--scheduler-prop-task-padding-vertical': taskPaddingVertical + 'px',
      }"
    >
      <div class="scheduler-resource">
        <div class="scheduler-resource-corner">
          {{ cornerText }}
        </div>
        <div class="scheduler-resource-divider"></div>
        <div class="scheduler-resource-scroll" ref="resourceScroll">
          <div class="scheduler-resource-container">
            <div
              v-for="(resource, rowIndex) in processedResources"
              :key="rowIndex"
              class="scheduler-resource-row"
              :style="{
                top: rowIndex * resourceHeight + 'px',
              }"
            >
              <div class="scheduler-resource-row-label">
                <slot name="resource-label" :resource="resource">
                  {{ resource.label }}
                </slot>
              </div>
              <div class="scheduler-resource-row-divider"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="scheduler-divider"></div>
      <div class="scheduler-timeline">
        <div class="scheduler-timeline-header-scroll" ref="timelineHeaderScroll">
          <div class="scheduler-timeline-header-container">
            <div class="scheduler-timeline-header-group">
              <template v-for="(group, groupIndex) in headerGroups" :key="groupIndex">
                <div
                  v-for="(header, headerIndex) in group"
                  :key="headerIndex"
                  aria-hidden="true"
                  class="scheduler-timeline-header"
                  :style="{
                    left: header.left + 'px',
                    width: header.width + 'px',
                    top: groupIndex * headerHeight + 'px',
                  }"
                >
                  <div
                    :class="
                      'scheduler-timeline-header-cell ' +
                      (groupIndex != headerGroups.length - 1
                        ? 'scheduler-timeline-header-cell-inner'
                        : '')
                    "
                  ></div>
                  <div
                    class="scheduler-timeline-header-cell-label"
                    :id="`header-${groupIndex}-${headerIndex}`"
                    v-intersection-observer="[
                      handleHeaderIntersection,
                      { root: timelineHeaderScroll },
                    ]"
                  >
                    {{ header.label }}
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
        <div
          class="scheduler-body"
          ref="schedulerBody"
          @scroll="handleBodyScroll"
          @click="handleBodyClick"
        >
          <div
            class="scheduler-body-matrix"
            @pointerdown="handleItemDrag"
            @pointermove="handleItemDrag"
            @pointerup="handleItemDrag"
          >
            <div style="position: absolute">
              <div
                class="scheduler-body-matrix-date-cell pointer-events-none"
                v-for="({ date, resourceId, left, top, width, isOdd }, dateIndex) in resourceXDates"
                :key="dateIndex"
                :data-date="date.format('YYYY-MM-DD')"
                :data-resource-id="resourceId"
                :style="{
                  left: left + 'px',
                  top: top + 'px',
                  width: width + 'px',
                }"
                :class="{
                  'scheduler-body-matrix-date-cell-odd': isOdd,
                  'scheduler-body-matrix-date-cell-even': !isOdd,
                }"
              ></div>
            </div>
            <div style="position: absolute">
              <div
                v-for="(top, index) in horizontalLines"
                :key="'h-' + index"
                class="scheduler-body-matrix-divider-horizontal"
                :style="{ top: top - 1 + 'px' }"
              ></div>
              <div
                v-for="(left, index) in verticalLines"
                :key="'v-' + index"
                class="scheduler-body-matrix-divider-vertical"
                :style="{ left: left - 1 + 'px' }"
              ></div>
            </div>
            <div style="position: absolute">
              <div
                v-for="(group, groupIndex) in processedTasks"
                :key="groupIndex"
                class="scheduler-task"
                :style="{
                  left: group.left + 'px',
                  top: group.top + 'px',
                  width: group.width + 'px',
                }"
              >
                <UTooltip
                  v-if="group.type === 'milestone'"
                  arrow
                  :delay-duration="0"
                  :ui="{
                    content: 'h-auto',
                  }"
                  :content="{
                    side: 'right',
                  }"
                >
                  <div style="position: relative; width: 100%; height: 100%">
                    <div
                      v-for="(item, itemIndex) in group.tasks"
                      :key="itemIndex"
                      style="position: absolute; height: 100%"
                      :style="{
                        left: item.left - group.left + 'px',
                        width: item.width + 'px',
                      }"
                    >
                      <div class="scheduler-task-milestone"></div>
                    </div>
                  </div>

                  <template #content>
                    <div class="flex flex-col gap-1">
                      <div v-for="task in group.tasks" :key="task.task.id">
                        {{ task.task.start.format('DD/MM') }} : {{ task.task.label }}
                      </div>
                    </div>
                  </template>
                </UTooltip>

                <template v-else>
                  <div
                    v-for="(item, itemIndex) in group.tasks"
                    :key="itemIndex"
                    style="position: absolute; height: 100%"
                    :style="{ left: item.left - group.left + 'px', width: item.width + 'px' }"
                    @pointerdown.stop="editable ? handleItemDrag($event, item) : undefined"
                    @click="handleTaskClick($event, item.task)"
                  >
                    <slot name="task-item" :task="item.task">
                      <AppSchedulerTaskItem
                        :task="item.task"
                        :editable
                        :is-selected="isSelected(item.task.id)"
                        :rightClickItems="rightClickItems"
                        :left="item.left"
                        :top="group.top"
                        :width="item.width"
                        :is-indexed="matchedTaskIds?.has(item.task.id)"
                        @change-date="handleDateChange"
                      >
                        <template #item-content-hover="props">
                          <slot name="item-content-hover" v-bind="props" />
                        </template>

                        <template #item-content="props">
                          <slot name="item-content" v-bind="props" />
                        </template>
                      </AppSchedulerTaskItem>
                    </slot>
                  </div>
                </template>
              </div>
            </div>
            <div style="position: absolute">
              <div
                v-if="currentTimePosition !== null"
                class="scheduler-body-current-time"
                :style="{ left: currentTimePosition + 'px' }"
              ></div>
            </div>
          </div>
        </div>
        <div class="scheduler-timeline-divider"></div>
      </div>
    </div>

    <!-- Drag Tooltip -->
    <div
      v-if="tooltipState"
      class="fixed z-50 px-2 py-1 rounded text-sm pointer-events-none shadow-lg"
      :class="
        tooltipState.hasCollision
          ? 'bg-red-600 text-white'
          : 'bg-gray-900 dark:bg-gray-800 text-white'
      "
      :style="{ left: tooltipState.x + 'px', top: tooltipState.y + 'px' }"
    >
      {{ tooltipState.content }}
    </div>
  </div>
</template>

<script setup lang="ts" generic="T">
import { toRefs, triggerRef } from 'vue'
import { vIntersectionObserver } from '@vueuse/components'
import type {
  SchedulerHeader,
  SchedulerResource,
  SchedulerTask,
  SchedulerZoomScale,
} from '@/types/scheduler'
import { useSchedulerConfig } from '@/composables/scheduler/useSchedulerConfig'
import { useSchedulerHeaders } from '@/composables/scheduler/useSchedulerHeaders'
import { useSchedulerResources } from '@/composables/scheduler/useSchedulerResources'
import { useSchedulerGrid } from '@/composables/scheduler/useSchedulerGrid'
import { useSchedulerScroll } from '@/composables/scheduler/useSchedulerScroll'
import { useSchedulerTasks } from '@/composables/scheduler/useSchedulerTasks'
import type { ContextMenuItem } from '@nuxt/ui'
import { useSchedulerConversion } from '@/composables/scheduler/useSchedulerConversion'
import { useSchedulerDrag } from '@/composables/scheduler/useSchedulerDrag'
import { useSchedulerSelection } from '@/composables/scheduler/useSchedulerSelection'
import { useSchedulerTaskPlacement } from '@/composables/scheduler/useSchedulerTaskPlacement'
import moment from 'moment'

const props = defineProps<{
  height?: string
  width?: string

  headers?: Array<SchedulerHeader>
  headerHeight?: number
  headerWidth?: number

  startDate?: Date | string
  endDate?: Date | string

  scale?: SchedulerZoomScale

  resources?: Array<SchedulerResource>
  resourceWidth?: number
  resourceHeight?: number

  cornerText?: string

  taskPaddingVertical?: number

  editable?: boolean
  rightClickItems?: ContextMenuItem[][]

  matchedTaskIds?: Set<string>
  canDragOverResource?: boolean
}>()

const tasks = defineModel<SchedulerTask<T>[]>({ default: () => [] })

const { headers: headersProp, resources: resourcesProp } = toRefs(props)

const {
  height,
  width,
  startDate,
  endDate,
  scale,
  headerHeight,
  headerWidth,
  resourceWidth,
  resourceHeight,
  totalColumns,
  taskPaddingVertical,
} = useSchedulerConfig(props)

const { headerGroups, headerRowCount, headerRowWidth } = useSchedulerHeaders(
  headersProp,
  startDate,
  endDate,
  scale,
  headerWidth,
)

const { resources: processedResources, totalRows } = useSchedulerResources(resourcesProp)

const { horizontalLines, verticalLines, resourceXDates, currentTimePosition } = useSchedulerGrid(
  startDate,
  endDate,
  scale,
  headerWidth,
  resourceHeight,
  processedResources,
)

const {
  timelineHeaderScroll,
  handleBodyScroll,
  schedulerBody,
  resourceScroll,
  handleHeaderIntersection,
} = useSchedulerScroll()

const { pxToDate, dateToPx } = useSchedulerConversion(startDate, scale, headerWidth)

const { isSelected, toggleTask, clearSelection, getSelectedTaskIds } = useSchedulerSelection()

const { handleItemDrag, tooltipState, effectiveTasks } = useSchedulerDrag(
  tasks,
  processedResources,
  resourceHeight,
  pxToDate,
  dateToPx,
  triggerRef,
  schedulerBody,
  startDate,
  endDate,
  getSelectedTaskIds,
  toRefs(props).canDragOverResource,
)

const { processedTasks } = useSchedulerTasks(
  startDate,
  endDate,
  scale,
  headerWidth,
  resourceHeight,
  processedResources,
  taskPaddingVertical,
  effectiveTasks,
)

const { placeTasks } = useSchedulerTaskPlacement(effectiveTasks)

const handleTaskClick = (event: MouseEvent, task: SchedulerTask<T>) => {
  const isSelectMode = event.ctrlKey || event.metaKey
  if (isSelectMode && props.editable) {
    toggleTask(task.id, task.resourceId, true)
  }
}

const handleBodyClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (
    target.classList.contains('scheduler-body') ||
    target.classList.contains('scheduler-body-matrix')
  ) {
    clearSelection()
  }
}

const handleDateChange = (selectedDate: moment.Moment, selectedTask: SchedulerTask<T>) => {
  if (!selectedDate) return

  let selectedTaskIds = getSelectedTaskIds()

  if (selectedTaskIds.length === 0) {
    selectedTaskIds = [selectedTask.id]
  }

  const task = effectiveTasks.value?.find((t) => t.id === selectedTaskIds[0])
  if (!task) return

  if (selectedTaskIds.length > 1) {
    placeTasks(selectedTaskIds, selectedDate, { mode: 'preserve-gaps' })
  } else {
    placeTasks(task.id, selectedDate)
  }

  triggerRef(effectiveTasks)
  tasks.value = effectiveTasks.value
  clearSelection()
}
</script>

<style lang="scss" src="@/assets/scheduler.scss"></style>
