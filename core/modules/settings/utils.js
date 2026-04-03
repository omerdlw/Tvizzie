import { isObject, isString } from '@/core/utils'

import { SETTINGS_STORAGE_TARGETS } from './config'

export const SETTING_UNSET = Symbol('SETTING_UNSET')

export function cloneSettingValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => cloneSettingValue(item))
  }

  if (isObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneSettingValue(item)])
    )
  }

  return value
}

export function normalizeSettingPath(path) {
  if (Array.isArray(path)) {
    return path.flatMap((segment) => normalizeSettingPath(segment))
  }

  if (isString(path)) {
    return path
      .split('.')
      .map((segment) => segment.trim())
      .filter(Boolean)
  }

  return []
}

export function getSettingValue(source, path, fallback = undefined) {
  const segments = normalizeSettingPath(path)

  if (segments.length === 0) {
    return source === undefined ? fallback : source
  }

  let current = source

  for (const segment of segments) {
    if (
      current === null ||
      current === undefined ||
      (!isObject(current) && !Array.isArray(current)) ||
      !(segment in current)
    ) {
      return fallback
    }

    current = current[segment]
  }

  return current === undefined ? fallback : current
}

export function setSettingValue(source, path, value) {
  const segments = normalizeSettingPath(path)

  if (segments.length === 0) {
    return cloneSettingValue(value)
  }

  const [segment, ...rest] = segments
  const base = Array.isArray(source)
    ? [...source]
    : isObject(source)
      ? { ...source }
      : {}

  base[segment] =
    rest.length === 0
      ? cloneSettingValue(value)
      : setSettingValue(base[segment], rest, value)

  return base
}

export function isSettingContainerEmpty(value) {
  if (Array.isArray(value)) {
    return value.length === 0
  }

  if (isObject(value)) {
    return Object.keys(value).length === 0
  }

  return false
}

export function removeSettingValue(source, path) {
  const segments = normalizeSettingPath(path)

  if (segments.length === 0) {
    return {}
  }

  const removeRecursive = (current, index) => {
    if (
      current === null ||
      current === undefined ||
      (!isObject(current) && !Array.isArray(current))
    ) {
      return current
    }

    const segment = segments[index]
    const clone = Array.isArray(current) ? [...current] : { ...current }

    if (index === segments.length - 1) {
      if (Array.isArray(clone) && /^\d+$/.test(segment)) {
        clone.splice(Number(segment), 1)
      } else {
        delete clone[segment]
      }

      return clone
    }

    const nextValue = removeRecursive(clone[segment], index + 1)

    if (nextValue === undefined || isSettingContainerEmpty(nextValue)) {
      if (Array.isArray(clone) && /^\d+$/.test(segment)) {
        clone.splice(Number(segment), 1)
      } else {
        delete clone[segment]
      }
    } else {
      clone[segment] = nextValue
    }

    return clone
  }

  return removeRecursive(source, 0)
}

function mergePair(base, incoming) {
  if (Array.isArray(incoming)) {
    return incoming.map((item) => cloneSettingValue(item))
  }

  if (!isObject(incoming)) {
    return cloneSettingValue(incoming)
  }

  const seed = isObject(base) ? { ...base } : {}

  Object.entries(incoming).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      seed[key] = value.map((item) => cloneSettingValue(item))
      return
    }

    if (isObject(value)) {
      seed[key] = mergePair(seed[key], value)
      return
    }

    seed[key] = value
  })

  return seed
}

export function mergeSettingsObjects(...sources) {
  return sources.reduce((accumulator, source) => {
    if (!isObject(source)) {
      return accumulator
    }

    return mergePair(accumulator, source)
  }, {})
}

function isDefinitionDescriptor(value) {
  return (
    isObject(value) &&
    [
      'defaultValue',
      'storage',
      'persist',
      'label',
      'description',
      'category',
      'control',
      'options',
      'placeholder',
      'validate',
      'serialize',
      'deserialize',
    ].some((key) => key in value)
  )
}

function normalizeAdditionalStorageTargets(storage) {
  if (!storage || storage === true) {
    return []
  }

  const rawTargets = Array.isArray(storage)
    ? storage
    : isString(storage)
      ? [storage]
      : isObject(storage)
        ? Object.entries(storage)
            .filter(([, enabled]) => Boolean(enabled))
            .map(([target]) => target)
        : []

  return Array.from(
    new Set(rawTargets.filter((target) => isString(target) && target.trim()))
  )
}

function normalizeDefinition(path, definition) {
  const descriptor = isDefinitionDescriptor(definition)
    ? definition
    : { defaultValue: definition }

  const isPersistent = descriptor.persist !== false
  const storage = isPersistent
    ? Array.from(
        new Set([
          SETTINGS_STORAGE_TARGETS.LOCAL_STORAGE,
          ...normalizeAdditionalStorageTargets(descriptor.storage),
        ])
      )
    : []

  return {
    path,
    storage,
    defaultValue: cloneSettingValue(descriptor.defaultValue),
    label: descriptor.label || null,
    description: descriptor.description || null,
    category: descriptor.category || null,
    control: descriptor.control || null,
    placeholder: descriptor.placeholder || null,
    options: Array.isArray(descriptor.options)
      ? descriptor.options.map((option) => ({ ...option }))
      : [],
    validate:
      typeof descriptor.validate === 'function' ? descriptor.validate : null,
    serialize:
      typeof descriptor.serialize === 'function' ? descriptor.serialize : null,
    deserialize:
      typeof descriptor.deserialize === 'function'
        ? descriptor.deserialize
        : null,
  }
}

export function normalizeSettingsDefinitions(definitions) {
  if (Array.isArray(definitions)) {
    return definitions.reduce((accumulator, definition) => {
      if (!definition?.path) {
        return accumulator
      }

      accumulator[definition.path] = normalizeDefinition(
        definition.path,
        definition
      )
      return accumulator
    }, {})
  }

  if (!isObject(definitions)) {
    return {}
  }

  return Object.entries(definitions).reduce(
    (accumulator, [path, definition]) => {
      accumulator[path] = normalizeDefinition(path, definition)
      return accumulator
    },
    {}
  )
}

export function buildSettingsDefaults(definitions = {}) {
  return Object.values(definitions).reduce((accumulator, definition) => {
    if (definition.defaultValue === undefined) {
      return accumulator
    }

    return setSettingValue(
      accumulator,
      definition.path,
      definition.defaultValue
    )
  }, {})
}

export function createSettingsBaseline(definitions = {}, initialSettings = {}) {
  return mergeSettingsObjects(
    buildSettingsDefaults(definitions),
    isObject(initialSettings) ? initialSettings : {}
  )
}

export function sanitizeSettingsState(snapshot, definitions = {}) {
  let nextSnapshot = isObject(snapshot) ? cloneSettingValue(snapshot) : {}

  Object.values(definitions).forEach((definition) => {
    const currentValue = getSettingValue(
      nextSnapshot,
      definition.path,
      SETTING_UNSET
    )

    if (currentValue === SETTING_UNSET || !definition.validate) {
      return
    }

    if (definition.validate(currentValue)) {
      return
    }

    if (definition.defaultValue === undefined) {
      nextSnapshot = removeSettingValue(nextSnapshot, definition.path)
      return
    }

    nextSnapshot = setSettingValue(
      nextSnapshot,
      definition.path,
      definition.defaultValue
    )
  })

  return nextSnapshot
}

export function hydrateSettingsSnapshot(snapshot, definitions = {}) {
  let nextSnapshot = isObject(snapshot) ? cloneSettingValue(snapshot) : {}

  Object.values(definitions).forEach((definition) => {
    const storedValue = getSettingValue(
      nextSnapshot,
      definition.path,
      SETTING_UNSET
    )

    if (storedValue === SETTING_UNSET) {
      return
    }

    const hydratedValue = definition.deserialize
      ? definition.deserialize(storedValue)
      : storedValue

    if (definition.validate && !definition.validate(hydratedValue)) {
      if (definition.defaultValue === undefined) {
        nextSnapshot = removeSettingValue(nextSnapshot, definition.path)
        return
      }

      nextSnapshot = setSettingValue(
        nextSnapshot,
        definition.path,
        definition.defaultValue
      )
      return
    }

    nextSnapshot = setSettingValue(nextSnapshot, definition.path, hydratedValue)
  })

  return nextSnapshot
}

export function createPersistedSettingsSnapshot(snapshot, definitions = {}) {
  let nextSnapshot = sanitizeSettingsState(snapshot, definitions)

  Object.values(definitions).forEach((definition) => {
    const currentValue = getSettingValue(
      nextSnapshot,
      definition.path,
      SETTING_UNSET
    )

    if (currentValue === SETTING_UNSET) {
      return
    }

    if (definition.storage.length === 0) {
      nextSnapshot = removeSettingValue(nextSnapshot, definition.path)
      return
    }

    if (definition.serialize) {
      nextSnapshot = setSettingValue(
        nextSnapshot,
        definition.path,
        definition.serialize(currentValue)
      )
    }
  })

  return nextSnapshot
}

export function createCookieSettingsSnapshot(snapshot, definitions = {}) {
  const persistedSnapshot = createPersistedSettingsSnapshot(
    snapshot,
    definitions
  )

  return Object.values(definitions).reduce((accumulator, definition) => {
    if (!definition.storage.includes(SETTINGS_STORAGE_TARGETS.COOKIE)) {
      return accumulator
    }

    const value = getSettingValue(
      persistedSnapshot,
      definition.path,
      SETTING_UNSET
    )

    if (value === SETTING_UNSET) {
      return accumulator
    }

    return setSettingValue(accumulator, definition.path, value)
  }, {})
}

export function resolveSettingsSnapshot({
  definitions = {},
  initialSettings = {},
  storedSettings = {},
}) {
  return mergeSettingsObjects(
    createSettingsBaseline(definitions, initialSettings),
    hydrateSettingsSnapshot(storedSettings, definitions)
  )
}
