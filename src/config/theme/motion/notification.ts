import type { NotificationMotion } from "@omerdlw/base-framework/modules/notification";
import { motion, tween } from "./tokens";

const { durations: time, easings: ease } = motion;

const enter = tween(time.reveal, ease.fade);

export const notificationMotion: NotificationMotion = {
  transition: enter,
  toast: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: enter },
    exit: { opacity: 0, transition: tween(time.light, ease.fade) },
  },
};
