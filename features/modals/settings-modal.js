'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';

import { Container } from '@/core/modules/modal';
import { Switch } from '@/ui/elements';

import { useSettings } from '@/core/modules/settings';

function formatLabel(value) {
  return String(value)
    .split('.')
    .pop()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function inferControl(definition, value) {
  if (definition.control) {
    return definition.control;
  }

  if (Array.isArray(definition.options) && definition.options.length > 0) {
    return 'select';
  }

  if (typeof value === 'boolean' || typeof definition.defaultValue === 'boolean') {
    return 'switch';
  }

  if (typeof value === 'number' || typeof definition.defaultValue === 'number') {
    return 'number';
  }

  return 'text';
}

function renderControl({ definition, value, onChange }) {
  const control = inferControl(definition, value);

  if (control === 'switch') {
    return (
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-semibold">
          {definition.label || formatLabel(definition.path)}
        </span>
        <Switch checked={Boolean(value)} onChange={onChange} />
      </div>
    );
  }

  if (control === 'select') {
    return (
      <select
        className="h-10 w-full border border-black/10 bg-white px-3 text-sm font-medium text-black outline-none focus:border-black/20"
        value={String(value ?? definition.defaultValue ?? '')}
        onChange={(e) => onChange(e.target.value)}
      >
        {definition.options?.map((opt) => {
          const optValue = typeof opt === 'object' ? opt.value : opt;
          const optLabel = typeof opt === 'object' ? opt.label : opt;
          return (
            <option key={String(optValue)} value={String(optValue)}>
              {optLabel}
            </option>
          );
        })}
      </select>
    );
  }

  return (
    <input
      type={control === 'number' ? 'number' : 'text'}
      className="h-10 w-full border border-black/10 bg-white px-3 text-sm font-medium text-black outline-none focus:border-black/20"
      value={value ?? ''}
      onChange={(e) =>
        onChange(control === 'number' ? Number(e.target.value) : e.target.value)
      }
    />
  );
}

export default function SettingsModal({ close, header }) {
  const { storageKey, definitions, isHydrated, getSetting, setSetting, resetSettings } =
    useSettings();

  const hasDefinitions = definitions && Object.keys(definitions).length > 0;

  const definitionGroups = useMemo(() => {
    if (!hasDefinitions) return {};
    const groups = {};
    Object.values(definitions).forEach((def) => {
      const group = def.group || 'General';
      if (!groups[group]) groups[group] = [];
      groups[group].push(def);
    });
    return groups;
  }, [definitions, hasDefinitions]);

  return (
    <Container
      className="w-full sm:w-[560px]"
      header={{
        title: header?.title || 'Settings',
      }}
      close={close}
    >
      <div className="flex w-full flex-col gap-3 p-4 text-sm">
        <div className="border-info flex items-center justify-between gap-2 border px-4 py-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold tracking-widest uppercase">Storage</span>
            <span className="font-medium">{storageKey}</span>
          </div>
          {hasDefinitions ? (
            <motion.button
              type="button"
              whileHover={{ scale: 1.012 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 450, damping: 26 }}
              className="h-11 w-full flex-auto border border-black/10 bg-transparent px-6 text-[11px] font-bold tracking-wide text-black/70 uppercase hover:border-black/15 hover:bg-black/5 hover:text-black rounded-xl transition-colors duration-200"
              onClick={() => resetSettings()}
            >
              Reset all
            </motion.button>
          ) : null}
        </div>

        {!isHydrated ? (
          <div className="border-info border px-4 py-3 text-sm">Loading settings</div>
        ) : null}

        {isHydrated && !hasDefinitions ? (
          <div className="border-info border px-4 py-3 text-sm">
            No setting definitions are registered yet. The module is ready and persists decisions
            centrally under <strong>{storageKey}</strong>. Register definitions through the Settings
            API to render controls dynamically in this modal
          </div>
        ) : null}

        {isHydrated && hasDefinitions
          ? Object.entries(definitionGroups).map(([groupKey, groupDefinitions]) => (
              <section key={groupKey} className="flex flex-col gap-2">
                <div className="px-1 text-[10px] font-bold tracking-widest uppercase">
                  {groupKey}
                </div>

                {groupDefinitions.map((definition) => {
                  const currentValue = getSetting(definition.path, definition.defaultValue);
                  const control = inferControl(definition, currentValue);

                  return (
                    <div key={definition.path} className="border-info flex flex-col gap-2 border p-4">
                      {control === 'switch' ? (
                        renderControl({
                          definition,
                          value: currentValue,
                          onChange: (nextValue) => setSetting(definition.path, nextValue),
                        })
                      ) : (
                        <>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold">
                                {definition.label || formatLabel(definition.path)}
                              </span>
                              <button
                                type="button"
                                className="text-[10px] font-bold tracking-widest uppercase"
                                onClick={() => resetSettings(definition.path)}
                              >
                                Reset
                              </button>
                            </div>
                            <span className="text-xs">{definition.description || definition.path}</span>
                          </div>
                          {renderControl({
                            definition,
                            value: currentValue,
                            onChange: (nextValue) => setSetting(definition.path, nextValue),
                          })}
                        </>
                      )}

                      {control === 'switch' ? (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs">{definition.description || definition.path}</span>
                          <button
                            type="button"
                            className="text-[10px] font-bold tracking-widest uppercase"
                            onClick={() => resetSettings(definition.path)}
                          >
                            Reset
                          </button>
                        </div>
                      ) : null}

                      <div className="flex flex-wrap gap-2">
                        {definition.storage.map((target) => (
                          <span
                            key={target}
                            className="border-info border px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase"
                          >
                            {target}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </section>
            ))
          : null}
      </div>
    </Container>
  );
}
