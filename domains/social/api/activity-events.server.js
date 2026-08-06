'use server';

import { deleteActivityEvents, processActivityEvent } from '../server/activity/event-processor.server';
import { normalizeValue } from '@/shared/utils';

export async function postActivityEventServer({ actorUserId, eventType, payload = {} }) {
  try {
    const normEventType = normalizeValue(eventType);
    const result = await processActivityEvent({
      actorUserId,
      eventType: normEventType,
      payload,
    });
    return { success: true, delivered: result?.delivered === true, reason: result?.reason || null };
  } catch (error) {
    return { success: false, error: error.message || 'Activity event failed' };
  }
}

export async function deleteActivityEventsServer({ action, actorUserId, listId, subjectId, subjectType }) {
  try {
    const result = await deleteActivityEvents({
      action: normalizeValue(action),
      actorUserId,
      listId: normalizeValue(listId),
      subjectId: normalizeValue(subjectId),
      subjectType: normalizeValue(subjectType),
    });
    return { success: true, deleted: result?.deleted === true, reason: result?.reason || null };
  } catch (error) {
    return { success: false, error: error.message || 'Activity deletion failed' };
  }
}
