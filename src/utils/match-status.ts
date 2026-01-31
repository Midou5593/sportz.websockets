import { MATCH_STATUS } from '../validation/matches';


type MatchStatus = typeof MATCH_STATUS[keyof typeof MATCH_STATUS];

type MatchLike = {
    startTime: Date | string;
    endTime: Date | string;
    status: MatchStatus;
};

type UpdateStatusFn = (status: MatchStatus) => Promise<void>;

export function getMatchStatus(startTime:Date | string, endTime:Date | string, now = new Date()) : MatchStatus | null {
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

export async function syncMatchStatus(match:MatchLike, updateStatus:UpdateStatusFn) {
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