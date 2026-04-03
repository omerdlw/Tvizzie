'use client'

import { useCallback, useEffect, useState, useMemo, useRef } from 'react'

import { useRegistryHistory } from './context'

function formatTimestamp(timestamp) {
  if (!timestamp) return '--:--:--'

  try {
    return new Intl.DateTimeFormat('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(timestamp))
  } catch {
    return '--:--:--'
  }
}

function formatPayload(payload) {
  if (!payload || typeof payload !== 'object') return ''

  if (payload.kind === 'object') {
    const keys = Array.isArray(payload.keys) ? payload.keys : []
    return `{${keys.join(', ')}}`
  }

  if (payload.kind === 'array') {
    return `array(${payload.size ?? 0})`
  }

  if (payload.kind === 'string') {
    return payload.value || 'string'
  }

  return payload.kind || ''
}

function formatEntry(entry) {
  const parts = [entry.action]

  if (entry.type) parts.push(entry.type)
  if (entry.key) parts.push(entry.key)
  if (entry.source) parts.push(entry.source)
  if (Number.isFinite(Number(entry.priority))) {
    parts.push(`priority:${Number(entry.priority)}`)
  }
  if (Number.isFinite(Number(entry.count))) {
    parts.push(`count:${Number(entry.count)}`)
  }

  return parts.join(' | ')
}

function formatBatchOperation(operation, index) {
  const parts = [String(index + 1), operation.action || 'unknown']

  if (operation.type) parts.push(operation.type)
  if (operation.key) parts.push(operation.key)
  if (operation.source) parts.push(operation.source)
  if (Number.isFinite(Number(operation.priority))) {
    parts.push(`priority:${Number(operation.priority)}`)
  }
  if (Number.isFinite(Number(operation.expiresAt))) {
    parts.push(`expiresAt:${Number(operation.expiresAt)}`)
  }

  return parts.join(' | ')
}

async function copyText(text) {
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
    await navigator.clipboard.writeText(text)
    return true
  }

  if (typeof document === 'undefined') {
    return false
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()

  const copySucceeded = document.execCommand('copy')
  document.body.removeChild(textarea)
  return copySucceeded
}

export function RegistryDebugPanel({ limit = 120 }) {
  const copyResetTimerRef = useRef(null)
  const [copyState, setCopyState] = useState('idle')
  const [isOpen, setIsOpen] = useState(false)
  const { clearHistory, enabled, history } = useRegistryHistory(limit)

  const items = useMemo(() => {
    return [...history].reverse()
  }, [history])

  const jsonText = useMemo(() => JSON.stringify(history, null, 2), [history])

  const handleCopy = useCallback(async () => {
    const succeeded = await copyText(jsonText)
    setCopyState(succeeded ? 'copied' : 'failed')

    if (copyResetTimerRef.current) {
      clearTimeout(copyResetTimerRef.current)
    }

    copyResetTimerRef.current = setTimeout(() => {
      setCopyState('idle')
      copyResetTimerRef.current = null
    }, 2000)
  }, [jsonText])

  useEffect(() => {
    return () => {
      if (!copyResetTimerRef.current) return
      clearTimeout(copyResetTimerRef.current)
      copyResetTimerRef.current = null
    }
  }, [])

  const copyLabel =
    copyState === 'copied'
      ? 'Copied'
      : copyState === 'failed'
        ? 'Copy Failed'
        : 'Copy JSON'

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[1500] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2">
      <button
        className="pointer-events-auto  border border-white/5  px-3 py-2 text-left text-xs font-medium text-white"
        onClick={() => setIsOpen((prev) => !prev)}
        type="button"
      >
        Registry Log ({history.length})
      </button>

      {isOpen && (
        <div className="pointer-events-auto overflow-hidden  border border-white/5  text-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
            <span className="text-[11px] font-semibold tracking-wide">
              REGISTRY
            </span>
            <div className="flex items-center gap-1.5">
              <button
                className=" border border-white/5 px-2 py-1 text-[10px] font-medium text-white"
                onClick={handleCopy}
                type="button"
              >
                {copyLabel}
              </button>
              <button
                className=" border border-white/5 px-2 py-1 text-[10px] font-medium text-white"
                onClick={clearHistory}
                type="button"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="pointer-events-auto max-h-[70vh] overflow-auto overscroll-contain px-2 py-2">
            {items.length === 0 ? (
              <div className="  px-2 py-3 text-center text-xs text-white">
                {enabled ? 'Log bos' : 'Log kapali (captureHistory=false)'}
              </div>
            ) : (
              items.map((entry, index) => {
                const payloadText = formatPayload(entry.payload)

                return (
                  <div
                    key={`${entry.timestamp || 0}-${index}`}
                    className="mb-2   px-2 py-2 select-text"
                  >
                    <div className="mb-1 text-[10px] text-white">
                      {formatTimestamp(entry.timestamp)}
                    </div>
                    <div className="overflow-auto">
                      <div className="text-[11px] leading-4 break-words">
                        {formatEntry(entry)}
                      </div>
                    </div>
                    {payloadText && (
                      <div className="mt-1 text-[10px] break-words text-white">
                        {payloadText}
                      </div>
                    )}
                    {Array.isArray(entry.operations) &&
                      entry.operations.length > 0 && (
                        <div className="mt-2  border border-white/5  p-1">
                          <div className="mb-1 text-[10px] text-white">
                            operations
                          </div>
                          <div className="max-h-28 overflow-auto pr-1">
                            {entry.operations.map(
                              (operation, operationIndex) => {
                                const operationPayloadText = formatPayload(
                                  operation.payload
                                )

                                return (
                                  <div
                                    key={`${entry.timestamp || 0}-${index}-${operationIndex}`}
                                    className="mb-1   px-1.5 py-1"
                                  >
                                    <div className="text-[10px] leading-4 break-words">
                                      {formatBatchOperation(
                                        operation,
                                        operationIndex
                                      )}
                                    </div>
                                    {operationPayloadText && (
                                      <div className="mt-1 text-[10px] leading-4 break-words text-white">
                                        {operationPayloadText}
                                      </div>
                                    )}
                                  </div>
                                )
                              }
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
