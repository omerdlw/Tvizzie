"use client";

import { useEffect, useState, useTransition, type JSX } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import { cn, report, toUserMessage } from "@omerdlw/base-framework/utils";
import { Button, Icon, Loader } from "@/ui";
import { deleteDiaryEntryAction } from "../../server/browse-actions";

export function DiaryDeleteButton({
  id,
  title,
}: {
  id: string;
  title: string;
}): JSX.Element {
  const router = useRouter();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [busy, startTransition] = useTransition();

  useEffect(() => {
    if (!confirming) return;
    const timer = window.setTimeout(() => setConfirming(false), 3000);
    return () => window.clearTimeout(timer);
  }, [confirming]);

  const onClick = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      try {
        const result = await deleteDiaryEntryAction(id);
        if (!result.success) throw new Error(result.error);
        router.refresh();
      } catch (error) {
        report("DiaryDeleteButton", error);
        toast(
          toUserMessage(error, { fallback: "Could not remove this entry" }),
        );
      }
      setConfirming(false);
    });
  };

  return (
    <Button
      aria-label={
        confirming
          ? `Confirm removing ${title}`
          : `Remove ${title} from the diary`
      }
      className={cn(
        "center size-8 cursor-pointer rounded-full disabled:cursor-wait",
        confirming
          ? "bg-red-600 text-white"
          : "text-white/40 hover:bg-white/10 hover:text-white",
      )}
      disabled={busy}
      loader={<Loader size={20} />}
      loading={busy}
      onClick={onClick}
    >
      <Icon
        icon={
          confirming ? "solar:check-read-linear" : "solar:trash-bin-trash-bold"
        }
        size={14}
      />
    </Button>
  );
}
