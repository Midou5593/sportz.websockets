import { MATCH_STATUS } from '../validation/matches.js';

/**
 * Determine a match's status based on its start and end times relative to a reference time.
 *
 * @param startTime - A value accepted by the Date constructor representing the match start (e.g., timestamp or ISO string)
 * @param endTime - A value accepted by the Date constructor representing the match end (e.g., timestamp or ISO string)
 * @param now - Reference time to evaluate against; defaults to the current date/time
 * @returns `MATCH_STATUS.SCHEDULED` if `now` is before the start, `MATCH_STATUS.FINISHED` if `now` is on or after the end, `MATCH_STATUS.LIVE` if `now` is between start (inclusive) and end (exclusive), or `null` if either date is invalid
 */
export function getMatchStatus(startTime:any, endTime:any, now = new Date()) {
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return null;
    }

    if (now < start) {
        return MATCH_STATUS.SCHEDULED;
    }

    if (now >= end) {
        return MATCH_STATUS.FINISHED;
    }

    return MATCH_STATUS.LIVE;
}

/**
 * Ensure a match object's status reflects its current scheduled state and persist changes.
 *
 * @param match - Object with `startTime`, `endTime`, and `status` fields; `status` will be updated if it differs from the computed status.
 * @param updateStatus - Async function called with the new status to persist the change.
 * @returns The match object's (possibly updated) `status` value.
 */
export async function syncMatchStatus(match:any, updateStatus:any) {
    const nextStatus = getMatchStatus(match.startTime, match.endTime);
    if (!nextStatus) {
        return match.status;
    }
    if (match.status !== nextStatus) {
        await updateStatus(nextStatus);
        match.status = nextStatus;
    }
    return match.status;
}