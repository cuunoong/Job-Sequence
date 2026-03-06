import { ref, computed, type Ref } from 'vue'

export function useSequenceZoom(page: Ref<number>) {
  const zoom = ref<1 | 2 | 3 | 4 | 5>(5)

  const zoomIn = () => {
    zoom.value = Math.min(5, zoom.value + 1) as 1 | 2 | 3 | 4 | 5
    page.value = 1
  }

  const zoomOut = () => {
    zoom.value = Math.max(1, zoom.value - 1) as 1 | 2 | 3 | 4 | 5
    page.value = 1
  }

  const canZoomIn = computed(() => zoom.value < 5)
  const canZoomOut = computed(() => zoom.value > 1)

  return {
    zoom,
    zoomIn,
    zoomOut,
    canZoomIn,
    canZoomOut,
  }
}
