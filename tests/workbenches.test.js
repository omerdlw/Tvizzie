import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';

// Import all 11 workbenches
import WorkbenchAccount from '@/app/modules/workbenches/account';
import WorkbenchAuth from '@/app/modules/workbenches/auth';
import WorkbenchBackground from '@/app/modules/workbenches/background';
import WorkbenchContextMenu from '@/app/modules/workbenches/context-menu';
import WorkbenchControls from '@/app/modules/workbenches/controls';
import WorkbenchErrorBoundary from '@/app/modules/workbenches/error-boundary';
import WorkbenchLoading from '@/app/modules/workbenches/loading';
import WorkbenchModal from '@/app/modules/workbenches/modal';
import WorkbenchNav from '@/app/modules/workbenches/nav';
import WorkbenchNotification from '@/app/modules/workbenches/notification';
import WorkbenchRegistry from '@/app/modules/workbenches/registry';
import WorkbenchIntegrations from '@/app/modules/workbenches/integrations';

test('all 11 workbenches can be imported as valid React component functions', () => {
  const workbenches = [
    { name: 'Account', comp: WorkbenchAccount },
    { name: 'Auth', comp: WorkbenchAuth },
    { name: 'Background', comp: WorkbenchBackground },
    { name: 'ContextMenu', comp: WorkbenchContextMenu },
    { name: 'Controls', comp: WorkbenchControls },
    { name: 'ErrorBoundary', comp: WorkbenchErrorBoundary },
    { name: 'Loading', comp: WorkbenchLoading },
    { name: 'Modal', comp: WorkbenchModal },
    { name: 'Nav', comp: WorkbenchNav },
    { name: 'Notification', comp: WorkbenchNotification },
    { name: 'Registry', comp: WorkbenchRegistry },
    { name: 'Integrations', comp: WorkbenchIntegrations },
  ];

  for (const { name, comp } of workbenches) {
    assert.equal(typeof comp, 'function', `Workbench ${name} must be a valid component function`);
  }
});
