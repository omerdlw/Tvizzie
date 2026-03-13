import { EVENT_TYPES, globalEvents } from '@/lib/events'

import { ApiError } from './types'

const HTTP_STATUS = {
  INTERNAL_SERVER_ERROR: 500,
  UNAUTHORIZED: 401,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  CREATED: 201,
  OK: 200,
}

export class ApiClient {
  constructor(config = {}) {
    this.baseURL = config.baseURL || ''
    this.timeout = config.timeout || 30000
    this.headers = config.headers || { 'Content-Type': 'application/json' }
    this.interceptors = { request: [], response: [], error: [] }
    this.queue = []
    this.isOnline = typeof window !== 'undefined' ? navigator.onLine : true
    this.pendingRequests = new Map()
    this.retryConfig = {
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      retryOn: config.retryOn ?? [408, 429, 500, 502, 503, 504],
    }
    this.maxQueueSize = config.maxQueueSize ?? 50
    this.onRetry = config.onRetry || null

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline.bind(this))
      window.addEventListener('offline', () => {
        this.isOnline = false
      })
    }
  }

  isFormData(value) {
    return typeof FormData !== 'undefined' && value instanceof FormData
  }

  serializeBodyForKey(body) {
    if (!body) return ''

    if (this.isFormData(body)) {
      const entries = []
      body.forEach((value, key) => {
        let serializedValue = ''
        if (typeof File !== 'undefined' && value instanceof File) {
          serializedValue = `file:${value.name}:${value.size}:${value.type}`
        } else if (typeof Blob !== 'undefined' && value instanceof Blob) {
          serializedValue = `blob:${value.size}:${value.type}`
        } else {
          serializedValue = String(value)
        }
        entries.push([key, serializedValue])
      })
      entries.sort(([aKey, aVal], [bKey, bVal]) => {
        if (aKey !== bKey) return aKey.localeCompare(bKey)
        return aVal.localeCompare(bVal)
      })
      return `form:${entries.map(([k, v]) => `${k}=${v}`).join('&')}`
    }

    if (typeof body === 'string') return body

    try {
      return JSON.stringify(body)
    } catch {
      return String(body)
    }
  }

  createRequestKey(endpoint, options = {}) {
    const method = options.method || 'GET'
    const body = this.serializeBodyForKey(options.body)
    const endpointStr =
      typeof endpoint === 'string' ? endpoint : String(endpoint || '')
    return `${method}:${endpointStr}:${body}`
  }

  handleOnline() {
    this.isOnline = true
    const currentQueue = [...this.queue]
    this.queue = []
    currentQueue.forEach(({ requestFn, resolve, reject }) => {
      requestFn().then(resolve).catch(reject)
    })
  }

  addRequestInterceptor(interceptor) {
    this.interceptors.request.push(interceptor)
    return this
  }
  addResponseInterceptor(interceptor) {
    this.interceptors.response.push(interceptor)
    return this
  }
  addErrorInterceptor(interceptor) {
    this.interceptors.error.push(interceptor)
    return this
  }

  async runRequestInterceptors(config) {
    let modifiedConfig = { ...config }
    for (const interceptor of this.interceptors.request)
      modifiedConfig = await interceptor(modifiedConfig)
    return modifiedConfig
  }

  async runResponseInterceptors(response) {
    let modifiedResponse = response
    for (const interceptor of this.interceptors.response)
      modifiedResponse = await interceptor(modifiedResponse)
    return modifiedResponse
  }

  async runErrorInterceptors(error) {
    let modifiedError = error
    for (const interceptor of this.interceptors.error)
      modifiedError = await interceptor(modifiedError)
    return modifiedError
  }

  createTimeoutController() {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)
    return { controller, timeoutId }
  }

  async request(endpoint, options = {}) {
    if (typeof endpoint !== 'string' || !endpoint) {
      throw new ApiError(
        `Invalid endpoint: expected non-empty string, got ${typeof endpoint}`,
        0
      )
    }

    const {
      deduplicate,
      retryDelay,
      maxRetries,
      retry = true,
      onRetry,
    } = options
    const retries = maxRetries ?? this.retryConfig.maxRetries
    const delay = retryDelay ?? this.retryConfig.retryDelay
    const isFormDataBody = this.isFormData(options.body)
    const shouldDedupe =
      deduplicate ?? ((options.method || 'GET') === 'GET' && !isFormDataBody)

    if (!this.isOnline) {
      if (this.queue.length >= this.maxQueueSize) {
        return Promise.reject(new ApiError('Offline queue full', 0))
      }
      return new Promise((resolve, reject) => {
        this.queue.push({
          requestFn: () => this.request(endpoint, options),
          resolve,
          reject,
        })
      })
    }

    const requestKey = this.createRequestKey(endpoint, options)
    if (shouldDedupe && this.pendingRequests.has(requestKey)) {
      return this.pendingRequests.get(requestKey)
    }

    const retryCallback = onRetry || this.onRetry
    const promise = this._executeWithRetry(
      endpoint,
      options,
      retry ? retries : 0,
      delay,
      0,
      retryCallback
    )

    if (shouldDedupe) {
      this.pendingRequests.set(requestKey, promise)
      promise.finally(() => this.pendingRequests.delete(requestKey))
    }

    return promise
  }

  async _executeWithRetry(
    endpoint,
    options,
    retriesLeft,
    delay,
    attempt = 0,
    onRetry = null
  ) {
    try {
      const isString =
        typeof endpoint === 'string' || endpoint instanceof String
      const safeEndpoint = isString
        ? endpoint.toString()
        : String(endpoint || '')

      const url = safeEndpoint.startsWith('http')
        ? safeEndpoint
        : `${this.baseURL}${safeEndpoint}`
      let config = {
        method: options.method || 'GET',
        headers: { ...this.headers, ...options.headers },
        ...options,
      }

      if (options.next) {
        config.next = options.next
      }

      if (options.body && !this.isFormData(options.body)) {
        config.body = JSON.stringify(options.body)
      }

      if (this.isFormData(options.body)) {
        const headers = { ...(config.headers || {}) }
        delete headers['Content-Type']
        delete headers['content-type']
        config.headers = headers
        config.body = options.body
      }

      const hasExternalSignal = !!options.signal
      const { controller, timeoutId } = hasExternalSignal
        ? { controller: null, timeoutId: null }
        : this.createTimeoutController()
      config.signal = hasExternalSignal ? options.signal : controller.signal

      config = await this.runRequestInterceptors(config)

      let response
      try {
        response = await fetch(url, config)
      } finally {
        if (timeoutId) clearTimeout(timeoutId)
      }

      response = await this.runResponseInterceptors(response)
      const data = await this.parseResponse(response)

      if (!response.ok) {
        const errorMessage =
          data && typeof data === 'object' && 'message' in data
            ? data.message
            : `HTTP ${response.status}`
        const willRetryResponse =
          retriesLeft > 0 && this.retryConfig.retryOn.includes(response.status)

        if (!options.silent) {
          if (response.status === HTTP_STATUS.UNAUTHORIZED)
            globalEvents.emit(EVENT_TYPES.API_UNAUTHORIZED)
          else if (response.status === HTTP_STATUS.FORBIDDEN)
            globalEvents.emit(EVENT_TYPES.API_FORBIDDEN)

          if (options.critical && !willRetryResponse) {
            globalEvents.emit(EVENT_TYPES.API_ERROR, {
              status: response.status,
              message: errorMessage,
              isCritical: true,
              retry:
                options.retryCallback ||
                (() =>
                  this._executeWithRetry(
                    endpoint,
                    options,
                    retriesLeft,
                    delay,
                    attempt,
                    onRetry
                  )),
            })
          }
        }

        throw new ApiError(errorMessage, response.status, data, response)
      }

      return {
        headers: response.headers,
        status: response.status,
        ok: response.ok,
        data,
      }
    } catch (error) {
      const normalizedError = this._normalizeRequestError(error, options)

      if (normalizedError.name === 'AbortError' && options.signal?.aborted) {
        throw normalizedError
      }

      const shouldRetry =
        retriesLeft > 0 && this._isRetryable(normalizedError)

      if (shouldRetry) {
        const backoffDelay = delay * Math.pow(2, attempt)
        const retryInfo = {
          maxRetries: options.maxRetries ?? this.retryConfig.maxRetries,
          delay: backoffDelay,
          attempt: attempt + 1,
          endpoint,
          error: normalizedError,
        }

        globalEvents.emit(EVENT_TYPES.API_RETRY, retryInfo)

        if (onRetry) {
          try {
            onRetry(retryInfo)
          } catch (retryError) {
            void retryError
          }
        }

        await new Promise((r) => setTimeout(r, backoffDelay))

        return this._executeWithRetry(
          endpoint,
          options,
          retriesLeft - 1,
          delay,
          attempt + 1,
          onRetry
        )
      }

      if (
        normalizedError instanceof ApiError &&
        !(normalizedError.response && normalizedError.status > 0)
      ) {
        this._emitCriticalError(
          options,
          normalizedError.status || 0,
          normalizedError.message || 'Network error',
          this._createRetryHandler(
            endpoint,
            options,
            retriesLeft,
            delay,
            attempt,
            onRetry
          )
        )
      }

      throw await this.runErrorInterceptors(normalizedError)
    }
  }

  _createRetryHandler(endpoint, options, retriesLeft, delay, attempt, onRetry) {
    if (typeof options.retryCallback === 'function') {
      return options.retryCallback
    }

    return () =>
      this._executeWithRetry(
        endpoint,
        options,
        retriesLeft,
        delay,
        attempt,
        onRetry
      )
  }

  _emitCriticalError(options, status, message, retry) {
    if (options.silent || !options.critical) return

    globalEvents.emit(EVENT_TYPES.API_ERROR, {
      isCritical: true,
      message,
      status,
      retry,
    })
  }

  _normalizeRequestError(error, options) {
    if (error?.name === 'AbortError') {
      if (options.signal?.aborted) return error
      return new ApiError('Request timeout', 408)
    }

    if (error instanceof ApiError) {
      return error
    }

    return new ApiError(error?.message || 'Network error', error?.status || 0)
  }

  _isRetryable(error) {
    if (error.status === 0) return true
    if (error.status && this.retryConfig.retryOn.includes(error.status))
      return true
    if (error.name === 'AbortError') return true
    return false
  }

  async parseResponse(response) {
    if (response.status === 204) return null

    const contentType = response.headers.get('content-type') || ''
    const isJson =
      contentType.includes('application/json') || contentType.includes('+json')

    let text = ''
    try {
      text = await response.text()
    } catch {
      return null
    }

    if (!text) return null

    if (isJson) {
      try {
        return JSON.parse(text)
      } catch {
        return null
      }
    }

    return text
  }

  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' })
  }
  async post(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body })
  }
  async put(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body })
  }
  async patch(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PATCH', body })
  }
  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' })
  }
}

export const apiClient = new ApiClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '',
  timeout: 30000,
})
