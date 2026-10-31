"use client";

import { useDockActionClass } from "@omerdlw/base-framework/modules/dock";
import { ACTION_TONE_CLASS } from "@omerdlw/base-framework/tokens";
import { Button, Icon } from "@/ui";

export function AccountInboxAction({
  count,
  onOpen,
}: {
  count: number;
  onOpen: () => void;
}) {
  const actionClass = useDockActionClass();
  return (
    <div className="flex items-center gap-2">
      <Button
        aria-label={`Inbox with ${count} pending requests`}
        className={actionClass({
          className: "disabled:cursor-not-allowed disabled:opacity-50",
          variant: ACTION_TONE_CLASS,
        })}
        onClick={(event) => {
          event.stopPropagation();
          onOpen();
        }}
      >
        <Icon icon="solar:inbox-bold" size={16} />
        <span>Inbox {count}</span>
      </Button>
    </div>
  );
}
