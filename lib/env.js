let ENV_CONFIG = {
  requiredEnvVars: [],
  requiredServerEnvVars: [],
}

export function setEnvConfig(config) {
  if (!config || typeof config !== 'object') return
  ENV_CONFIG = {
    ...ENV_CONFIG,
    ...config,
  }
}

export function validateEnv() {
  const { requiredServerEnvVars = [], requiredEnvVars = [] } = ENV_CONFIG
  const missingVars = []

  requiredEnvVars.forEach((key) => {
    if (!process.env[key]) {
      missingVars.push(key)
    }
  })

  if (typeof window === 'undefined') {
    requiredServerEnvVars.forEach((key) => {
      if (!process.env[key]) {
        missingVars.push(key)
      }
    })
  }

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    )
  }
}

export function getEnv(key, defaultValue) {
  if (!key || typeof key !== 'string') {
    throw new Error('getEnv requires a valid key string')
  }

  const value = process.env[key]

  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is not defined`)
  }

  return value || defaultValue
}
