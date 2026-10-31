"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDockActions } from "@omerdlw/base-framework/modules/dock";
import { useToast } from "@omerdlw/base-framework/modules/notification";
import {
  createVerificationSurfaceEntry,
  getAuthCallbackUrl,
  getAuthErrorMessage,
  requestEmailAuth,
  useAuth,
} from "@/features/auth";
import { requestJson } from "@/infrastructure/http/client";
import { Button, Input } from "@/ui";
import { INPUT_CLASS, useSubmitClass } from "./shared";

const CONFIRMATION = "DELETE";

export function DeletePanel() {
  const auth = useAuth();
  const router = useRouter();
  const toast = useToast();
  const { closeSurface, openSurface } = useDockActions();
  const submitClass = useSubmitClass();
  const [confirmation, setConfirmation] = useState("");
  const [sending, setSending] = useState(false);
  const email = auth.user?.email ?? "";
  const ready = confirmation === CONFIRMATION && Boolean(email);

  async function deleteAccount() {
    await requestJson("/api/account/me", {
      body: JSON.stringify({ confirmation: CONFIRMATION }),
      method: "DELETE",
    });
    await auth.signOut("local");
    closeSurface();
    router.replace("/?reason=account-deleted");
  }

  async function sendCode() {
    if (!ready || !auth.client) return;
    setSending(true);
    try {
      await requestEmailAuth(auth.client, {
        email,
        emailRedirectTo: getAuthCallbackUrl("/account"),
      });
      void openSurface(
        createVerificationSurfaceEntry(
          { email, onVerified: deleteAccount },
          { title: "Verify to delete" },
        ),
      );
    } catch (error) {
      toast(getAuthErrorMessage(error, "Couldn't send a verification code"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <Input
        aria-label='Type "DELETE" to confirm'
        className={INPUT_CLASS}
        disabled={sending}
        onChange={(event) => setConfirmation(event.target.value)}
        placeholder='Type "DELETE" to confirm'
        value={confirmation}
      />
      <Button
        className={submitClass}
        disabled={sending || !ready}
        loading={sending}
        onClick={sendCode}
      >
        Send verification code
      </Button>
    </div>
  );
}
