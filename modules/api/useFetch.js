'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { apiClient } from '@/modules/api/client'

export function useFetch(endpoint, options = {}) {
  const { manual = false, ...requestOptions } = options

  const [state, setState] = useState({
    data: null,
    error: null,
    loading: !manual,
    status: null,
  })

  const optionsRef = useRef(requestOptions)
  useEffect(() => {
    optionsRef.current = requestOptions
  }, [requestOptions])

  const execute = useCallback(
    async (overrideOptions = {}) => {
      setState((prev) => ({ ...prev, loading: true, error: null }))

      const combinedOptions = {
        ...optionsRef.current,
        ...overrideOptions,
      }

      combinedOptions.retryCallback = () => execute(overrideOptions)

      const finalEndpoint = combinedOptions.endpoint || endpoint

      try {
        const response = await apiClient.request(finalEndpoint, combinedOptions)
        const result = {
          data: response.data,
          error: null,
          loading: false,
          status: response.status || 200,
        }
        setState(result)
        return result
      } catch (err) {
        const result = {
          data: null,
          error: err.message || 'An error occurred',
          loading: false,
          status: err.status || 0,
        }
        setState(result)
        return result
      }
    },
    [endpoint]
  )

  useEffect(() => {
    if (!manual) {
      execute()
    }
  }, [execute, manual])

  return {
    ...state,
    refresh: execute,
  }
}
