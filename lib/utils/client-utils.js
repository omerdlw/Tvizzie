'use client'

import { isBrowser } from '@/lib/utils'

export function getStorageItem(key, defaultValue = null) {
  if (!isBrowser()) {
    return defaultValue
  }

  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch (error) {
    console.error(`Error reading from localStorage (${key}):`, error)
    return defaultValue
  }
}

export function setStorageItem(key, value) {
  if (!isBrowser()) {
    return false
  }

  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    console.error(`Error writing to localStorage (${key}):`, error)
    return false
  }
}

export function removeStorageItem(key) {
  if (!isBrowser()) {
    return false
  }

  try {
    localStorage.removeItem(key)
    return true
  } catch (error) {
    console.error(`Error removing from localStorage (${key}):`, error)
    return false
  }
}

export function getDominantColor(imageUrl) {
  return new Promise((resolve) => {
    if (!isBrowser()) {
      resolve(null)
      return
    }

    const img = new Image()
    img.crossOrigin = 'Anonymous'
    if (
      imageUrl.startsWith('http') &&
      !imageUrl.includes(window.location.origin)
    ) {
      img.src = `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`
    } else {
      img.src = imageUrl
    }

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        canvas.width = 100
        canvas.height = 100

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        const colorCounts = {}
        let dominantColor = null
        let maxCount = 0

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          const alpha = data[i + 3]

          if (alpha < 200) continue

          const rNorm = r / 255
          const gNorm = g / 255
          const bNorm = b / 255
          const max = Math.max(rNorm, gNorm, bNorm)
          const min = Math.min(rNorm, gNorm, bNorm)
          let s
          const l = (max + min) / 2

          if (max === min) {
            s = 0
          } else {
            const d = max - min
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
          }

          const maxLightness = s > 0.7 ? 0.92 : 0.85

          if (l < 0.15 || l > maxLightness || s < 0.1) {
            continue
          }

          const qR = Math.round(r / 10) * 10
          const qG = Math.round(g / 10) * 10
          const qB = Math.round(b / 10) * 10

          const rgb = `${qR},${qG},${qB}`

          const score = 1 + s * 5

          colorCounts[rgb] = (colorCounts[rgb] || 0) + score

          if (colorCounts[rgb] > maxCount) {
            maxCount = colorCounts[rgb]
            dominantColor = rgb
          }
        }

        if (dominantColor) {
          const [r, g, b] = dominantColor.split(',')
          const toHex = (c) => {
            const hex = parseInt(c).toString(16)
            return hex.length === 1 ? '0' + hex : hex
          }
          resolve(`#${toHex(r)}${toHex(g)}${toHex(b)}`)
        } else {
          resolve('#000000')
        }
      } catch (e) {
        console.error('Error extracting color:', e)
        resolve(null)
      }
    }

    img.onerror = (e) => {
      console.error('Error loading image for color extraction:', e)
      resolve(null)
    }
  })
}
