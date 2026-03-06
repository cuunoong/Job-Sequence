export function useTextColor() {
  const getContrastColor = (hexColor: string) => {
    // Remove the hash at the start if it's there
    let hex = hexColor.replace('#', '')

    // Handle 3-digit hex codes
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((char) => char + char)
        .join('')
    }

    if (hex.length !== 6) {
      return '#000000' // Default to black
    }

    // Parse r, g, b values
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)

    // Calculate the brightness/luminance
    // YIQ formula: ((r*299) + (g*587) + (b*114)) / 1000
    const yiq = (r * 299 + g * 587 + b * 114) / 1000

    // Return black or white depending on brightness
    return yiq >= 128 ? '#000000' : '#FFFFFF'
  }

  return {
    getContrastColor,
  }
}
