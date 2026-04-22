'use client';

import { useState } from 'react';
import { Wifi, WifiOff, AlertTriangle, User, LogOut, UserPlus, Trash2, Search, XCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/ui/elements';
import { EVENT_TYPES, globalEvents } from '@/core/constants/events';

export default function NavStatusTestPage() {
  const [loading, setLoading] = useState({});

  const triggerApiError = (isCritical = true) => {
    globalEvents.emit(EVENT_TYPES.API_ERROR, {
      status: 500,
      message: 'Failed to fetch data from the server. Please try again.',
      isCritical,
      retry: () => console.log('Retrying API request...'),
    });
  };

  const triggerBatchApiErrors = () => {
    for (let i = 0; i < 3; i++) {
      globalEvents.emit(EVENT_TYPES.API_ERROR, {
        status: 404 + i,
        message: `Error ${i + 1} occurred`,
        isCritical: true,
      });
    }
  };

  const triggerAppError = () => {
    globalEvents.emit(EVENT_TYPES.APP_ERROR, {
      message: 'A runtime error occurred in the application layer.',
      error: new Error('Simulated Application Crash'),
      resetError: () => console.log('Resetting application state...'),
    });
  };

  const triggerAuthSignIn = () => {
    globalEvents.emit(EVENT_TYPES.AUTH_SIGN_IN, {
      session: {
        user: {
          name: 'Omer Deliavcı',
          email: 'omer@example.com',
        },
      },
    });
  };

  const triggerAuthSignUp = () => {
    globalEvents.emit(EVENT_TYPES.AUTH_SIGN_UP, {
      session: {
        user: {
          email: 'newuser@tvizzie.app',
        },
      },
    });
  };

  const triggerAuthSignOut = () => {
    globalEvents.emit(EVENT_TYPES.AUTH_SIGN_OUT, {
      previousSession: {
        user: {
          name: 'Omer Deliavcı',
        },
      },
    });
  };

  const triggerAuthFeedback = (phase) => {
    const data = {
      phase,
      flow: 'login-test',
      title: phase === 'start' ? 'Authenticating' : phase === 'success' ? 'Welcome Back' : 'Auth Failed',
      description: phase === 'start' ? 'Verifying your credentials...' : phase === 'success' ? 'You have successfully signed in.' : 'Invalid email or password.',
    };

    globalEvents.emit(EVENT_TYPES.AUTH_FEEDBACK, data);
  };

  const simulateConnectivity = (status) => {
    window.dispatchEvent(new Event(status));
  };

  const triggerNotFound = () => {
    globalEvents.emit(EVENT_TYPES.NAV_NOT_FOUND, {
      title: 'Page Not Found',
      description: "We couldn't find the page you're looking for.",
    });
  };

  const triggerAccountDeleteStart = () => {
    globalEvents.emit(EVENT_TYPES.AUTH_ACCOUNT_DELETE_START, {
      user: { name: 'Omer' },
    });
  };

  const triggerAccountDeleteEnd = (success) => {
    if (success) {
      globalEvents.emit(EVENT_TYPES.AUTH_SIGN_OUT, { reason: 'delete-account' });
    } else {
      globalEvents.emit(EVENT_TYPES.AUTH_ACCOUNT_DELETE_END, { status: 'failure' });
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] p-8 pb-32">
      <div className="mx-auto max-w-4xl space-y-12">
        <header className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-black">Nav Status Architect Test</h1>
          <p className="text-lg text-neutral-500">Comprehensive testing for all navigation status scenarios and transitions.</p>
        </header>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* API & App Errors */}
          <Section title="Error Scenarios" icon={<AlertTriangle className="text-red-500" />}>
            <div className="flex flex-wrap gap-3">
              <TestButton onClick={() => triggerApiError(true)} label="Critical API Error" tone="error" />
              <TestButton onClick={() => triggerApiError(false)} label="Minor API Error" tone="warning" />
              <TestButton onClick={triggerBatchApiErrors} label="Batch API Errors" tone="error" />
              <TestButton onClick={triggerAppError} label="Application Error" tone="error" />
            </div>
          </Section>

          {/* Auth Events */}
          <Section title="Auth Events" icon={<User className="text-blue-500" />}>
            <div className="flex flex-wrap gap-3">
              <TestButton onClick={triggerAuthSignIn} label="Sign In Success" tone="success" icon={<CheckCircle2 size={16} />} />
              <TestButton onClick={triggerAuthSignUp} label="Sign Up Success" tone="success" icon={<UserPlus size={16} />} />
              <TestButton onClick={triggerAuthSignOut} label="Sign Out" tone="info" icon={<LogOut size={16} />} />
            </div>
          </Section>

          {/* Auth Feedback Lifecycle */}
          <Section title="Auth Lifecycle (Feedback)" icon={<Search className="text-purple-500" />}>
            <div className="flex flex-wrap gap-3">
              <TestButton onClick={() => triggerAuthFeedback('start')} label="Auth Start" tone="info" />
              <TestButton onClick={() => triggerAuthFeedback('success')} label="Auth Success" tone="success" />
              <TestButton onClick={() => triggerAuthFeedback('failure')} label="Auth Failure" tone="error" />
            </div>
          </Section>

          {/* Connectivity */}
          <Section title="Connectivity" icon={<Wifi className="text-green-500" />}>
            <div className="flex flex-wrap gap-3">
              <TestButton onClick={() => simulateConnectivity('offline')} label="Simulate Offline" tone="warning" icon={<WifiOff size={16} />} />
              <TestButton onClick={() => simulateConnectivity('online')} label="Simulate Online" tone="success" icon={<Wifi size={16} />} />
            </div>
          </Section>

          {/* Navigation & Status */}
          <Section title="Navigation & Misc" icon={<XCircle className="text-neutral-500" />}>
            <div className="flex flex-wrap gap-3">
              <TestButton onClick={triggerNotFound} label="Trigger 404" tone="error" />
              <TestButton onClick={() => globalEvents.emit(EVENT_TYPES.NAV_EXPAND)} label="Expand Nav" tone="info" />
              <TestButton onClick={() => globalEvents.emit(EVENT_TYPES.NAV_COLLAPSE)} label="Collapse Nav" tone="info" />
            </div>
          </Section>

          {/* Account Management */}
          <Section title="Account Management" icon={<Trash2 className="text-red-600" />}>
            <div className="flex flex-wrap gap-3">
              <TestButton onClick={triggerAccountDeleteStart} label="Delete Start" tone="error" />
              <TestButton onClick={() => triggerAccountDeleteEnd(false)} label="Delete Failed" tone="warning" />
              <TestButton onClick={() => triggerAccountDeleteEnd(true)} label="Delete Success" tone="error" />
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center gap-3 border-b border-neutral-100 bg-neutral-50/50 px-6 py-4">
        {icon}
        <h2 className="text-lg font-semibold text-neutral-800">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function TestButton({ onClick, label, tone = 'info', icon }) {
  const tones = {
    info: 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100',
    success: 'bg-green-50 text-green-700 border-green-100 hover:bg-green-100',
    warning: 'bg-orange-50 text-orange-700 border-orange-100 hover:bg-orange-100',
    error: 'bg-red-50 text-red-700 border-red-100 hover:bg-red-100',
  };

  return (
    <Button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all active:scale-95 ${tones[tone]}`}
    >
      {icon}
      {label}
    </Button>
  );
}
