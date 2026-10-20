import type { NotificationMotion } from "@omerdlw/base-framework/modules/notification";
import { motion, tween } from "./tokens";

const { durations: time, easings: ease } = motion;

const enter = tween(time.reveal, ease.fade);

// A toast is a title card: it comes up on light where it is shown, holds, and
// goes down there. It never slides in over the page.
export const notificationMotion: NotificationMotion = {
  transition: enter,
  toast: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: enter },
    exit: { opacity: 0, transition: tween(time.light, ease.fade) },
  },
};
