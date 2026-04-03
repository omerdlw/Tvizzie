import 'server-only'

const HEARTBEAT_INTERVAL_MS = 25000

const encoder = new TextEncoder()
const userSubscribers = new Map()

function normalizeValue(value) {
  return String(value || '').trim()
}

function formatSseMessage(eventType, payload = {}) {
  return encoder.encode(
    `event: ${eventType}\ndata: ${JSON.stringify({
      ...payload,
      timestamp: Date.now(),
    })}\n\n`
  )
}

function getUserSet(userId) {
  const normalizedUserId = normalizeValue(userId)

  if (!normalizedUserId) {
    return null
  }

  let subscribers = userSubscribers.get(normalizedUserId)

  if (!subscribers) {
    subscribers = new Set()
    userSubscribers.set(normalizedUserId, subscribers)
  }

  return subscribers
}

function removeUserSubscriber(userId, subscriber) {
  const subscribers = userSubscribers.get(userId)

  if (!subscribers) {
    return
  }

  subscribers.delete(subscriber)

  if (subscribers.size === 0) {
    userSubscribers.delete(userId)
  }
}

function safeEnqueue(controller, chunk) {
  try {
    controller.enqueue(chunk)
    return true
  } catch {
    return false
  }
}

export function publishUserEvent(userId, eventType, payload = {}) {
  const normalizedUserId = normalizeValue(userId)
  const normalizedEventType = normalizeValue(eventType)
  const subscribers = userSubscribers.get(normalizedUserId)

  if (!normalizedUserId || !normalizedEventType || !subscribers?.size) {
    return
  }

  const chunk = formatSseMessage(normalizedEventType, payload)

  subscribers.forEach((subscriber) => {
    if (!safeEnqueue(subscriber.controller, chunk)) {
      subscriber.cleanup()
    }
  })
}

export function createUserEventStream(userId) {
  const normalizedUserId = normalizeValue(userId)
  let cleanupCurrent = () => {}

  return new ReadableStream({
    start(controller) {
      const subscribers = getUserSet(normalizedUserId)

      if (!subscribers) {
        controller.close()
        return
      }

      let closed = false
      let heartbeatTimer = null

      const cleanup = () => {
        if (closed) {
          return
        }

        closed = true

        if (heartbeatTimer) {
          clearInterval(heartbeatTimer)
          heartbeatTimer = null
        }

        removeUserSubscriber(normalizedUserId, subscriber)

        try {
          controller.close()
        } catch {
          // Stream may already be closed during teardown.
        }
      }

      cleanupCurrent = cleanup

      const subscriber = {
        cleanup,
        controller,
      }

      subscribers.add(subscriber)

      safeEnqueue(controller, encoder.encode('retry: 1000\n\n'))
      safeEnqueue(controller, formatSseMessage('ready', { ok: true }))

      heartbeatTimer = setInterval(() => {
        if (!safeEnqueue(controller, formatSseMessage('ping', { ok: true }))) {
          cleanup()
        }
      }, HEARTBEAT_INTERVAL_MS)
    },
    cancel() {
      cleanupCurrent()
    },
  })
}
