"use client";

import { useState } from "react";
import type { PasskeyListItem } from "@supabase/supabase-js";
import { ACTION_TONE_CLASS } from "@omerdlw/base-framework/tokens";
import { cn } from "@omerdlw/base-framework/utils";
import {
  deletePasskey,
  registerPasskey,
  renamePasskey,
  useAuth,
} from "@/features/auth";
import { Button, Icon, Input } from "@/ui";
import {
  INPUT_CLASS,
  ROW_BUTTON_CLASS,
  useSecurityTask,
  useSubmitClass,
} from "./shared";

function PasskeysSkeleton() {
  return (
    <div className="flex flex-col gap-2.5">
      {[0, 1].map((index) => (
        <div
          className="flex h-10 w-full items-center justify-between rounded-[16px] bg-white/[0.06] p-1 pl-4 ring-1 ring-inset ring-white/[0.04]"
          key={index}
        >
          <div className="h-3.5 w-28 rounded-full bg-white/10" />
          <div className="h-8 w-20 rounded-[12px] bg-white/[0.07]" />
        </div>
      ))}
    </div>
  );
}

export function PasskeysPanel({
  loading,
  passkeys,
  reload,
}: {
  loading: boolean;
  passkeys: PasskeyListItem[];
  reload: () => Promise<void>;
}) {
  const { client } = useAuth();
  const submitClass = useSubmitClass();
  const run = useSecurityTask(reload);
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(
    null,
  );

  if (loading && passkeys.length === 0) return <PasskeysSkeleton />;

  return (
    <div className="flex flex-col gap-2.5">
      {passkeys.length === 0 ? (
        <div className="flex min-h-24 w-full items-center justify-center rounded-[16px] bg-white/[0.06] p-4 text-center">
          <span className="text-xs text-white/50">No passkeys registered</span>
        </div>
      ) : (
        passkeys.map((passkey) => {
          const name = passkey.friendly_name || "Passkey";
          if (editing?.id === passkey.id) {
            return (
              <div className="flex w-full flex-col gap-2.5" key={passkey.id}>
                <Input
                  autoFocus
                  className={INPUT_CLASS}
                  onChange={(event) =>
                    setEditing({ id: passkey.id, name: event.target.value })
                  }
                  placeholder="Passkey name"
                  value={editing.name}
                />
                <div className="flex w-full gap-2.5">
                  <Button
                    className={submitClass}
                    disabled={pending || !editing.name.trim() || !client}
                    loading={pending}
                    onClick={() =>
                      client &&
                      run(
                        async () => {
                          await renamePasskey(
                            client,
                            passkey.id,
                            editing.name.trim(),
                          );
                          setEditing(null);
                        },
                        setPending,
                        "Passkey renamed",
                        "Couldn't rename this passkey",
                      )
                    }
                  >
                    Save
                  </Button>
                  <Button
                    className="center size-10 shrink-0 cursor-pointer rounded-[16px] bg-white/[0.06] text-xs text-white/70 ring-1 ring-inset ring-white/[0.04] hover:bg-white/10 hover:text-white"
                    disabled={pending}
                    onClick={() => setEditing(null)}
                  >
                    <Icon icon="solar:close-bold" />
                  </Button>
                </div>
              </div>
            );
          }
          return (
            <div
              className="flex h-10 w-full items-center justify-between rounded-[16px] bg-white/[0.06] p-1 pl-4 text-white ring-1 ring-inset ring-white/[0.04]"
              key={passkey.id}
            >
              <span className="truncate text-sm font-medium">{name}</span>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  className={cn(
                    ROW_BUTTON_CLASS,
                    "text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-50",
                  )}
                  disabled={pending}
                  onClick={() => setEditing({ id: passkey.id, name })}
                >
                  Rename
                </Button>
                <Button
                  className={cn(
                    ROW_BUTTON_CLASS,
                    "text-white/70 hover:bg-white/10 disabled:opacity-50",
                    ACTION_TONE_CLASS,
                  )}
                  disabled={pending || !client}
                  onClick={() =>
                    client &&
                    run(
                      () => deletePasskey(client, passkey.id),
                      setPending,
                      "Passkey removed",
                      "Couldn't remove this passkey",
                    )
                  }
                >
                  Remove
                </Button>
              </div>
            </div>
          );
        })
      )}
      <Button
        className={submitClass}
        disabled={pending || !client}
        loading={pending}
        onClick={() =>
          client &&
          run(
            () => registerPasskey(client),
            setPending,
            "Passkey added",
            "Couldn't add a passkey",
          )
        }
      >
        <Icon icon="solar:key-bold" size={16} />
        <span>Add passkey</span>
      </Button>
    </div>
  );
}
