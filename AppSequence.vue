<template>
  <UCard
    :ui="{
      header: 'flex gap-2 flex-col',
      root: 'overflow-visible grow divide-none',
      body: 'p-6! pt-0!',
    }"
  >
    <template #header>
      <UPageCard
        :title="title"
        :description="description"
        orientation="horizontal"
        variant="naked"
        :ui="{
          container: 'flex! flex-col lg:flex-row lg:items-end ',
        }"
      >
        <div class="lg:w-fit lg:ms-auto flex flex-row gap-2">
          <UInput placeholder="Search ..." icon="i-lucide-search" v-model="searchText" />
        </div>
      </UPageCard>
      <div
        class="flex flex-col lg:flex-row gap-2 lg:justify-between justify-start lg:items-center items-start"
      >
        <div class="flex gap-2">
          <USelectMenu
            v-model="sequenceFilter"
            :items="sequenceFilterOptions"
            :search-input="false"
            :disabled="editable"
          />
          <UFieldGroup>
            <UButton icon="i-lucide-calendar" color="neutral" variant="soft" :disabled="editable" />
            <UButton icon="i-lucide-list" color="neutral" variant="soft" :disabled="editable" />
          </UFieldGroup>

          <UFieldGroup>
            <UButton
              icon="i-lucide-chevron-left"
              color="neutral"
              variant="soft"
              @click="handlePreviousPage"
            />
            <UButton
              icon="i-lucide-chevron-right"
              color="neutral"
              variant="soft"
              @click="handleNextPage"
            />
          </UFieldGroup>

          <UButton
            :label="addText"
            icon="i-lucide-plus"
            @click="showAddJobModal = true"
            v-if="editable"
          />
        </div>
        <div class="flex gap-2">
          <UFieldGroup>
            <UButton
              icon="i-lucide-zoom-out"
              color="neutral"
              variant="soft"
              :disabled="!canZoomOut"
              @click="zoomOut"
            />
            <UInput
              :model-value="`Zoom Level ${zoom}`"
              readonly
              :ui="{ base: 'text-center w-[140px] pointer-events-none' }"
              variant="soft"
            />
            <UButton
              icon="i-lucide-zoom-in"
              color="neutral"
              variant="soft"
              :disabled="!canZoomIn"
              @click="zoomIn"
            />
          </UFieldGroup>

          <template v-if="canEdit">
            <UTooltip text="Edit" v-if="!editable">
              <UButton icon="i-lucide-edit" color="neutral" variant="soft" @click="handleEdit" />
            </UTooltip>
            <template v-else>
              <UFieldGroup>
                <UTooltip text="Undo">
                  <UButton
                    icon="i-lucide-undo"
                    color="neutral"
                    variant="soft"
                    :disabled="!canUndo"
                    @click="undo"
                  />
                </UTooltip>
                <UTooltip text="Redo">
                  <UButton
                    icon="i-lucide-redo"
                    color="neutral"
                    variant="soft"
                    :disabled="!canRedo"
                    @click="redo"
                  />
                </UTooltip>
              </UFieldGroup>
              <UTooltip text="Save">
                <UButton
                  icon="i-lucide-save"
                  color="success"
                  variant="soft"
                  @click="handleSave"
                  label="Save"
                />
              </UTooltip>
              <UTooltip text="Cancel">
                <UButton
                  icon="i-lucide-x"
                  color="error"
                  variant="soft"
                  @click="handleCancel"
                  label="Cancel"
                />
              </UTooltip>
            </template>
          </template>

          <template v-if="!editable">
            <UTooltip text="Download" v-if="canDownload" @click="onDownload">
              <UButton icon="i-lucide-download" color="neutral" variant="soft" />
            </UTooltip>
            <UTooltip text="Publish" v-if="canPublish" @click="handlePublish">
              <UButton icon="i-lucide-plane-takeoff" color="success" variant="soft" />
            </UTooltip>
            <UTooltip text="Lock" v-if="canLock">
              <UButton
                icon="i-lucide-lock"
                color="warning"
                variant="soft"
                @click="handleLockAction"
              />
            </UTooltip>
          </template>
        </div>
      </div>
    </template>
    <AppTimeline
      :zoom="zoom"
      :resources="resources"
      :tasks="tasks"
      height="max(520px, 65svh)"
      :resource-height="resourceHeight"
      :corner-text="cornerText"
      :editable="editable"
      :page="page"
      :loading="loading"
      v-model="tasks"
      :matched-task-ids="matchedTaskIds"
      :can-drag-over-resource="canDragOverResource"
    >
      <template #task-item="props">
        <slot name="task-item" v-bind="props" />
      </template>

      <template #item-content="props">
        <slot name="item-content" v-bind="props" />
      </template>

      <template #item-content-hover="props">
        <slot name="item-content-hover" v-bind="props" />
      </template>
    </AppTimeline>

    <UModal
      v-model:open="showConfirmModal"
      title="Confirm Save"
      description="Please confirm the following changes before saving."
      :ui="{ footer: 'justify-end' }"
    >
      <template #body>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          You have
          <span class="font-semibold text-gray-900 dark:text-white">
            {{ pendingChangedTasks.length }} campaign(s)
          </span>
          with changes. Are you sure you want to save?
        </p>
      </template>
      <template #footer>
        <UButton
          color="neutral"
          variant="soft"
          label="Cancel"
          @click="cancelSave"
          :loading="isProcessing"
        />
        <UButton
          color="success"
          label="Save"
          icon="i-lucide-save"
          @click="confirmSave"
          :loading="isProcessing"
        />
      </template>
    </UModal>

    <UModal
      v-model:open="showCancelConfirmModal"
      title="Discard Changes"
      description="Are you sure you want to discard your changes?"
      :ui="{ footer: 'justify-end' }"
    >
      <template #footer>
        <UButton
          color="neutral"
          variant="soft"
          label="No, Keep Editing"
          @click="abortCancel"
          :loading="isProcessing"
        />
        <UButton
          color="error"
          label="Yes, Discard"
          icon="i-lucide-trash"
          @click="confirmCancel"
          :loading="isProcessing"
        />
      </template>
    </UModal>

    <UModal
      v-model:open="showPublishConfirmModal"
      title="Confirm Publish"
      description="Are you sure you want to publish the sequence?"
      :ui="{ footer: 'justify-end' }"
    >
      <template #footer>
        <UButton
          color="neutral"
          variant="soft"
          label="Cancel"
          @click="showPublishConfirmModal = false"
          :loading="isProcessing"
        />
        <UButton
          color="success"
          label="Yes, Publish"
          icon="i-lucide-plane-takeoff"
          @click="confirmPublish"
          :loading="isProcessing"
        />
      </template>
    </UModal>

    <UModal
      v-model:open="showLockConfirmModal"
      title="Confirm Lock"
      description="Are you sure you want to lock the sequence?"
      :ui="{ footer: 'justify-end' }"
    >
      <template #footer>
        <UButton
          color="neutral"
          variant="soft"
          label="Cancel"
          @click="showLockConfirmModal = false"
        />
        <UButton color="warning" label="Yes, Lock" icon="i-lucide-lock" @click="confirmLock" />
      </template>
    </UModal>

    <slot
      name="modal"
      :show-add-job-modal="showAddJobModal"
      :close="() => (showAddJobModal = false)"
      :on-add="onAddJobModal"
    />
  </UCard>
</template>

<script setup lang="ts" generic="T">
import type { SchedulerResource, SchedulerTask } from '@/types/scheduler'
import { shallowRef, ref, watch } from 'vue'
import { useSequencePagination } from '@/composables/sequence/useSequencePagination'
import { useSequenceZoom } from '@/composables/sequence/useSequenceZoom'
import { useSequenceEdit } from '@/composables/sequence/useSequenceEdit'
import FlexSearch from 'flexsearch'
import { GetSequenceBargePlatformSequenceFilter } from '@/types/api/cs'

interface Props {
  resources?: SchedulerResource[]
  resourceHeight?: number
  cornerText?: string
  tasks?: SchedulerTask<T>[]
  canDownload?: boolean
  canEdit?: boolean
  canPublish?: boolean
  canLock?: boolean
  searchableFields?: (task: SchedulerTask<T>) => string[]
  loading?: boolean

  title?: string
  description?: string

  onPublish?: () => Promise<void>
  onLock?: () => Promise<void>
  onSave?: (changedTasks: SchedulerTask<T>[]) => Promise<void>
  onDownload?: () => Promise<void>
  addText?: string
  canDragOverResource?: boolean
}

interface Emits {
  (e: 'start-edit'): void
  (e: 'finish-edit'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const tasks = shallowRef<SchedulerTask<T>[]>(props.tasks || [])

watch(
  () => props.tasks,
  (newTasks) => {
    tasks.value = newTasks || []
  },
  { deep: true },
)

const { page, handleNextPage, handlePreviousPage } = useSequencePagination()

const { zoom, zoomIn, zoomOut, canZoomIn, canZoomOut } = useSequenceZoom(page)

const sequenceFilterOptions = [
  { label: 'By Barge', value: GetSequenceBargePlatformSequenceFilter.BargeToPlatform },
  { label: 'By Platform', value: GetSequenceBargePlatformSequenceFilter.PlatformToBarge },
]
const sequenceFilter = defineModel<{
  label: string
  value: GetSequenceBargePlatformSequenceFilter
}>('sequenceFilter', {
  default: () => ({
    label: 'By Barge',
    value: GetSequenceBargePlatformSequenceFilter.BargeToPlatform,
  }),
})

const searchText = ref('')
const matchedTaskIds = ref<Set<string>>()

watch(searchText, (value) => {
  if (!value) {
    matchedTaskIds.value = undefined
    return
  }

  const index = new FlexSearch.Index({ tokenize: 'full' })

  tasks.value
    .filter((task) => task.type === 'task')
    .forEach((task) => {
      const searchableText = props.searchableFields?.(task)?.join(' ') ?? task.label
      index.add(task.id, searchableText)
    })

  const result = index.search(value)

  matchedTaskIds.value = new Set(result as string[])
})

const showPublishConfirmModal = ref(false)
const showLockConfirmModal = ref(false)

const isProcessing = ref(false)
const toast = useToast()

const showAddJobModal = ref(false)

const handlePublish = () => {
  showPublishConfirmModal.value = true
}

const confirmPublish = async () => {
  try {
    isProcessing.value = true
    if (props.onPublish) {
      await props.onPublish()
    }
    showPublishConfirmModal.value = false
    toast.add({
      title: 'Success',
      description: 'Sequence published successfully',
      color: 'success',
    })
  } catch (error) {
    console.error(error)
    showPublishConfirmModal.value = false
    toast.add({
      title: 'Error',
      description: 'Failed to publish sequence',
      color: 'error',
    })
  } finally {
    isProcessing.value = false
  }
}

const handleLockAction = () => {
  showLockConfirmModal.value = true
}

const confirmLock = async () => {
  try {
    isProcessing.value = true
    if (props.onLock) {
      await props.onLock()
    }
    showLockConfirmModal.value = false
    toast.add({
      title: 'Success',
      description: 'Sequence locked successfully',
      color: 'success',
    })
  } catch (error) {
    console.error(error)
    showLockConfirmModal.value = false
    toast.add({
      title: 'Error',
      description: 'Failed to lock sequence',
      color: 'error',
    })
  } finally {
    isProcessing.value = false
  }
}

const confirmSaveAction = async (changedTasks: SchedulerTask<T>[]) => {
  try {
    isProcessing.value = true
    if (props.onSave) {
      await props.onSave(changedTasks)
    }
    toast.add({
      title: 'Success',
      description: 'Sequence saved successfully',
      color: 'success',
    })
  } catch (error) {
    console.error(error)
    toast.add({
      title: 'Error',
      description: 'Failed to save sequence',
      color: 'error',
    })
    isProcessing.value = false
    return false
  }

  isProcessing.value = false
  return true
}

const onAddJobModal = (task: SchedulerTask<T>) => {
  showAddJobModal.value = true
  console.log(task)
}

const {
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
  undo,
  redo,
  canUndo,
  canRedo,
} = useSequenceEdit(tasks, props.tasks, confirmSaveAction)

watch(editable, (value) => {
  if (value) {
    emit('start-edit')
  } else {
    emit('finish-edit')
  }
})
</script>
