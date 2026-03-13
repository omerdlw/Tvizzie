'use client'

import { useState } from 'react'

import { toPng } from 'html-to-image'

import Icon from '@/ui/icon'

import {
  NAV_ACTION_ICON,
  NAV_ACTION_LAYOUT,
  navActionClass,
} from './constants'

export default function TVAction({ activeView, setActiveView }) {
  const [capturing, setCapturing] = useState(false)

  const handleCapture = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (capturing) return

    const element = document.getElementById('ratings-capture-area')
    if (!element) return

    setCapturing(true)

    const imgs = Array.from(element.querySelectorAll('img'))
    const origSrcs = imgs.map((img) => img.src)

    try {
      await Promise.all(
        imgs.map(async (img) => {
          try {
            const res = await fetch(img.src, {
              mode: 'cors',
              cache: 'force-cache',
            })
            const blob = await res.blob()
            img.src = URL.createObjectURL(blob)
          } catch (e) {
            console.error('Failed to load image for capture', img.src, e)
          }
        })
      )

      const dataUrl = await toPng(element, {
        cacheBust: true,
        backgroundColor: 'var(--color-black)',
        style: { margin: 0 },
      })

      const link = document.createElement('a')
      link.download = 'tv-ratings.png'
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Failed to capture image', err)
    } finally {
      imgs.forEach((img, i) => {
        const prev = img.src
        img.src = origSrcs[i]
        if (prev.startsWith('blob:')) URL.revokeObjectURL(prev)
      })
      setCapturing(false)
    }
  }

  return (
    <div className={NAV_ACTION_LAYOUT.row}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setActiveView(activeView === 'ratings' ? 'tv-page' : 'ratings')
        }}
        className={navActionClass({
          className: activeView === 'ratings' ? 'flex-1' : 'w-full',
          tone: 'toggle',
          isActive: activeView === 'ratings',
        })}
      >
        {activeView === 'ratings' ? (
          <>
            <Icon icon="solar:arrow-left-bold" size={NAV_ACTION_ICON.default} />
            Back
          </>
        ) : (
          <>
            <Icon
              icon="solar:chart-square-bold"
              size={NAV_ACTION_ICON.default}
            />
            Ratings
          </>
        )}
      </button>

      {activeView === 'ratings' && (
        <button
          type="button"
          onClick={handleCapture}
          disabled={capturing}
          className={navActionClass({
            tone: 'muted',
            className: `flex-1 ${capturing ? 'cursor-wait opacity-50' : ''}`,
          })}
        >
          <Icon
            icon={capturing ? 'solar:spinner-bold' : 'solar:camera-bold'}
            size={NAV_ACTION_ICON.default}
            className={capturing ? 'animate-spin' : ''}
          />
          {capturing ? 'Capturing' : 'Capture'}
        </button>
      )}
    </div>
  )
}
