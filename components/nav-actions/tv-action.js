'use client'

import { useState } from 'react'

import { toPng } from 'html-to-image'

import Icon from '@/ui/icon'

import { NAV_ACTION_TONES, navActionBaseClass } from './constants'

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
        backgroundColor: '#0a0a0a',
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
    <div className="mt-2.5 flex w-full items-center gap-2">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setActiveView(activeView === 'ratings' ? 'tv-page' : 'ratings')
        }}
        className={navActionBaseClass({
          layout: 'flex cursor-pointer items-center justify-center gap-2 w-full',
          className: `${activeView === 'ratings' ? 'flex-1' : 'w-full'} ${
            activeView === 'ratings'
              ? NAV_ACTION_TONES.active
              : NAV_ACTION_TONES.muted
          }`,
        })}
      >
        {activeView === 'ratings' ? (
          <>
            <Icon icon="solar:arrow-left-bold" size={16} />
            Back
          </>
        ) : (
          <>
            <Icon icon="solar:chart-square-bold" size={16} />
            Ratings
          </>
        )}
      </button>

      {activeView === 'ratings' && (
        <button
          type="button"
          onClick={handleCapture}
          disabled={capturing}
          className={navActionBaseClass({
            layout:
              'flex cursor-pointer items-center justify-center gap-2 w-full',
            className: `flex-1 bg-white/5 text-white/50 ring-1 ring-white/10 ${
              capturing
                ? 'cursor-wait opacity-50'
                : 'hover:bg-white/10 hover:text-white/80'
            }`,
          })}
        >
          <Icon
            icon={capturing ? 'solar:spinner-bold' : 'solar:camera-bold'}
            size={16}
            className={capturing ? 'animate-spin' : ''}
          />
          {capturing ? 'Capturing' : 'Capture'}
        </button>
      )}
    </div>
  )
}
