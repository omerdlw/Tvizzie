'use client';

import { useMemo } from 'react';

import Container from '@/core/modules/modal/container';
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
          track: 'h-6 w-11 p-0.5 transition-colors duration-200',
          trackActive: '',
          circle: 'h-5 w-5 translate-x-0 duration-200',
          circleActive: 'translate-x-5',
          label: 'text-sm font-medium text-[#0f172a]',
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
        className="w-full border border-[#0284c7] px-4 py-3 text-sm font-medium text-[#0f172a] transition-colors outline-none placeholder:text-[#0f172a]"
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
        className="w-full border border-[#0284c7] px-4 py-3 text-sm font-medium text-[#0f172a] transition-colors outline-none placeholder:text-[#0f172a]"
      />
    );
  }

  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
      placeholder={definition.placeholder || ''}
      className="w-full border border-[#0284c7] px-4 py-3 text-sm font-medium text-[#0f172a] transition-colors outline-none placeholder:text-[#0f172a]"
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
      <div className="flex w-full flex-col gap-3 p-4 text-sm text-[#0f172a]">
        <div className="flex items-center justify-between gap-2 border border-[#0284c7] px-4 py-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold tracking-widest text-[#0f172a] uppercase">Storage</span>
            <span className="font-medium text-[#0f172a]">{storageKey}</span>
          </div>
          {hasDefinitions ? (
            <button
              type="button"
              className="h-11 w-full flex-auto border border-[#0284c7] px-6 text-[11px] font-bold tracking-widest text-[#0f172a] uppercase transition"
              onClick={() => resetSettings()}
            >
              Reset all
            </button>
          ) : null}
        </div>

        {!isHydrated ? (
          <div className="border border-[#0284c7] px-4 py-3 text-sm text-[#0f172a]">Loading settings</div>
        ) : null}

        {isHydrated && !hasDefinitions ? (
          <div className="border border-[#0284c7] px-4 py-3 text-sm text-[#0f172a]">
            No setting definitions are registered yet. The module is ready and persists decisions centrally under{' '}
            <strong>{storageKey}</strong>. Register definitions through the Settings API to render controls dynamically
            in this modal
          </div>
        ) : null}

        {isHydrated && hasDefinitions
          ? Object.entries(definitionGroups).map(([groupKey, groupDefinitions]) => (
              <section key={groupKey} className="flex flex-col gap-2">
                <div className="px-1 text-[10px] font-bold tracking-widest text-[#0f172a] uppercase">{groupKey}</div>

                {groupDefinitions.map((definition) => {
                  const currentValue = getSetting(definition.path, definition.defaultValue);
                  const control = inferControl(definition, currentValue);

                  return (
                    <div key={definition.path} className="flex flex-col gap-2 border border-[#0284c7] p-4">
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
                              <span className="text-sm font-semibold text-[#0f172a]">
                                {definition.label || formatLabel(definition.path)}
                              </span>
                              <button
                                type="button"
                                className="text-[10px] font-bold tracking-widest text-[#0f172a] uppercase transition"
                                onClick={() => resetSettings(definition.path)}
                              >
                                Reset
                              </button>
                            </div>
                            <span className="text-xs text-[#0f172a]">{definition.description || definition.path}</span>
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
                          <span className="text-xs text-[#0f172a]">{definition.description || definition.path}</span>
                          <button
                            type="button"
                            className="text-[10px] font-bold tracking-widest text-[#0f172a] uppercase transition"
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
                            className="border border-[#0284c7] px-2.5 py-1 text-[10px] font-bold tracking-widest text-[#0f172a] uppercase"
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
