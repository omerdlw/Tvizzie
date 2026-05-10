'use client';

import { useMemo } from 'react';

import { motion } from 'framer-motion';

import Container from '@/core/modules/modal/container';
import { MODAL_ACTION_MOTION, getModalContentMotion } from '@/core/modules/motion';
import { Switch } from '@/ui/elements';

import { useSettings } from './context';

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
      <Switch
        checked={Boolean(value)}
        onCheckedChange={onChange}
        className={{
          wrapper: 'w-full items-center justify-between gap-3',
          track: 'h-6 w-11 p-px',
          trackActive: '',
          circle: 'h-5 w-5 translate-x-0',
          circleActive: 'translate-x-5',
          label: 'text-sm font-medium',
        }}
      >
        {definition.label || formatLabel(definition.path)}
      </Switch>
    );
  }

  if (control === 'select') {
    return (
      <select
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        className="placeholder: border-info w-full border px-4 py-3 text-sm font-medium outline-none"
      >
        <option value="" disabled>
          {definition.placeholder || 'Select'}
        </option>
        {definition.options.map((option) => (
          <option key={option.value} value={option.value} className="">
            {option.label || option.value}
          </option>
        ))}
      </select>
    );
  }

  if (control === 'number') {
    return (
      <input
        type="number"
        value={value ?? ''}
        onChange={(event) => {
          const nextValue = event.target.value;
          onChange(nextValue === '' ? '' : Number(nextValue));
        }}
        placeholder={definition.placeholder || ''}
        className="placeholder: border-info w-full border px-4 py-3 text-sm font-medium outline-none"
      />
    );
  }

  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
      placeholder={definition.placeholder || ''}
      className="placeholder: border-info w-full border px-4 py-3 text-sm font-medium outline-none"
    />
  );
}

export default function SettingsModal({ close, header }) {
  const { definitions, getSetting, isHydrated, resetSettings, setSetting, storageKey } = useSettings();

  const definitionGroups = useMemo(() => {
    return Object.values(definitions)
      .sort((left, right) => left.path.localeCompare(right.path))
      .reduce((groups, definition) => {
        const groupKey = definition.category || 'General';
        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }

        groups[groupKey].push(definition);
        return groups;
      }, {});
  }, [definitions]);

  const hasDefinitions = Object.keys(definitionGroups).length > 0;

  return (
    <Container
      className="w-full sm:w-[560px]"
      header={{
        title: header?.title || 'Settings',
      }}
      close={close}
    >
      <motion.div className="flex w-full flex-col gap-3 p-4 text-sm" {...getModalContentMotion(0)}>
        <motion.div className="border-info flex items-center justify-between gap-2 border px-4 py-3" {...getModalContentMotion(1)}>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold tracking-widest uppercase">Storage</span>
            <span className="font-medium">{storageKey}</span>
          </div>
          {hasDefinitions ? (
            <motion.button
              type="button"
              className="h-11 w-full flex-auto border border-white/10 bg-transparent px-6 text-[11px] font-bold tracking-wide uppercase text-white/70 transition-colors hover:border-white/15 hover:bg-white/10 hover:text-white"
              onClick={() => resetSettings()}
              {...MODAL_ACTION_MOTION}
            >
              Reset all
            </motion.button>
          ) : null}
        </motion.div>

        {!isHydrated ? (
          <motion.div className="border-info border px-4 py-3 text-sm" {...getModalContentMotion(2)}>
            Loading settings
          </motion.div>
        ) : null}

        {isHydrated && !hasDefinitions ? (
          <motion.div className="border-info border px-4 py-3 text-sm" {...getModalContentMotion(2)}>
            No setting definitions are registered yet. The module is ready and persists decisions centrally under{' '}
            <strong>{storageKey}</strong>. Register definitions through the Settings API to render controls dynamically
            in this modal
          </motion.div>
        ) : null}

        {isHydrated && hasDefinitions
          ? Object.entries(definitionGroups).map(([groupKey, groupDefinitions], groupIndex) => (
              <motion.section key={groupKey} className="flex flex-col gap-2" {...getModalContentMotion(groupIndex + 2)}>
                <div className="px-1 text-[10px] font-bold tracking-widest uppercase">{groupKey}</div>

                {groupDefinitions.map((definition, definitionIndex) => {
                  const currentValue = getSetting(definition.path, definition.defaultValue);
                  const control = inferControl(definition, currentValue);

                  return (
                    <motion.div
                      key={definition.path}
                      className="border-info flex flex-col gap-2 border p-4"
                      {...getModalContentMotion(groupIndex + definitionIndex + 3)}
                    >
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
                              <motion.button
                                type="button"
                                className="text-[10px] font-bold tracking-widest uppercase"
                                onClick={() => resetSettings(definition.path)}
                                {...MODAL_ACTION_MOTION}
                              >
                                Reset
                              </motion.button>
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
                          <motion.button
                            type="button"
                            className="text-[10px] font-bold tracking-widest uppercase"
                            onClick={() => resetSettings(definition.path)}
                            {...MODAL_ACTION_MOTION}
                          >
                            Reset
                          </motion.button>
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
                    </motion.div>
                  );
                })}
              </motion.section>
            ))
          : null}
      </motion.div>
    </Container>
  );
}
