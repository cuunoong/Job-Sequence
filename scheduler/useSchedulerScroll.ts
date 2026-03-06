import { ref, watch } from 'vue'
export function useSchedulerScroll() {
  const scrollY = ref(0)
  const scrollX = ref(0)
  const timelineHeaderScroll = ref<HTMLElement | null>(null)
  const schedulerBody = ref<HTMLElement | null>(null)
  const resourceScroll = ref<HTMLElement | null>(null)
  const visibleHeaders = new Map<HTMLElement, { headerLeft: number; headerWidth: number }>()
  let animationFrameId: number | null = null
  function updateAllHeaders() {
    if (animationFrameId) return
    animationFrameId = requestAnimationFrame(() => {
      animationFrameId = null
      if (!timelineHeaderScroll.value) return
      const viewportScrollLeft = scrollX.value
      const viewportWidth = timelineHeaderScroll.value.clientWidth
      const viewportScrollRight = viewportScrollLeft + viewportWidth
      visibleHeaders.forEach(({ headerLeft, headerWidth }, target) => {
        const headerRight = headerLeft + headerWidth
        const visibleStart = Math.max(headerLeft, viewportScrollLeft)
        const visibleEnd = Math.min(headerRight, viewportScrollRight)
        const insetStart = Math.max(0, visibleStart - headerLeft)
        const insetEnd = Math.max(0, headerRight - visibleEnd)
        target.style.insetInlineStart = `${insetStart}px`
        target.style.insetInlineEnd = `${insetEnd}px`
      })
    })
  }
  watch(
    () => scrollX.value,
    () => {
      if (timelineHeaderScroll.value) {
        timelineHeaderScroll.value.scrollLeft = scrollX.value
      }
      updateAllHeaders()
    },
  )
  watch(
    () => scrollY.value,
    () => {
      if (resourceScroll.value) {
        resourceScroll.value.scrollTop = scrollY.value
      }
    },
  )
  function handleBodyScroll(event: Event) {
    const target = event.target as HTMLElement
    scrollY.value = target.scrollTop
    scrollX.value = target.scrollLeft
  }
  function handleHeaderIntersection(entries: IntersectionObserverEntry[]) {
    for (const entry of entries) {
      const target = entry.target as HTMLElement
      if (entry.isIntersecting) {
        const parent = target.parentElement as HTMLElement
        const headerLeft = parseFloat(parent?.style?.left || '0')
        const headerWidth = parseFloat(parent?.style?.width || '0')
        visibleHeaders.set(target, { headerLeft, headerWidth })
        updateAllHeaders()
      } else {
        visibleHeaders.delete(target)
        target.style.insetInlineStart = ''
        target.style.insetInlineEnd = ''
      }
    }
  }
  return {
    scrollY,
    scrollX,
    timelineHeaderScroll,
    resourceScroll,
    schedulerBody,
    handleBodyScroll,
    handleHeaderIntersection,
  }
}
