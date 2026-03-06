import { ref } from 'vue'

export function useSequencePagination() {
  const page = ref(1)

  const handleNextPage = () => {
    page.value++
  }

  const handlePreviousPage = () => {
    page.value--
  }

  return {
    page,
    handleNextPage,
    handlePreviousPage,
  }
}
