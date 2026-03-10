'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { BaseService } from '@/services/base.service'

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

      const result = await BaseService.request(finalEndpoint, combinedOptions)

      setState({
        data: result.data,
        error: result.error,
        loading: result.loading,
        status: result.status,
      })

      return result
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
