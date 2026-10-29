import type {
  Policy,
  StudentRequest,
  TieBreakCriterion,
  TieBreakInfo,
} from "./types.js";

export function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed;
  return function (): number {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getLotteryValue(seed: string, requestId: string): number {
  const seedNum = hashString(`${seed}:${requestId}`);
  const prng = mulberry32(seedNum);
  return prng();
}

export interface ScoredCandidate {
  request: StudentRequest;
  score: number;
  creditCharge: number;
}

export function sortAndResolveTies(
  candidates: ScoredCandidate[],
  policy: Policy,
  seed: string
): {
  sorted: ScoredCandidate[];
  tieBreakInfo: TieBreakInfo;
} {
  const epsilon = policy.epsilon;

  // 1. Primary sort by score descending
  const primarySorted = [...candidates].sort((a, b) => b.score - a.score);

  // 2. Identify contiguous groups of equal scores (within epsilon)
  const groups: ScoredCandidate[][] = [];
  let currentGroup: ScoredCandidate[] = [];

  for (const cand of primarySorted) {
    if (currentGroup.length === 0) {
      currentGroup.push(cand);
    } else {
      const baseScore = currentGroup[0].score;
      if (Math.abs(baseScore - cand.score) < epsilon) {
        currentGroup.push(cand);
      } else {
        groups.push(currentGroup);
        currentGroup = [cand];
      }
    }
  }
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  const tiedIdsSet = new Set<string>();
  let tieRuleUsed: string | null = null;

  // 3. For each contiguous group with > 1 item, apply tieBreakOrder
  for (const group of groups) {
    if (group.length > 1) {
      for (const item of group) {
        tiedIdsSet.add(item.request.requestId);
      }

      group.sort((a, b) => {
        for (const rule of policy.tieBreakOrder) {
          if (rule === "fewestSessionsThisMonth") {
            const delta = a.request.sessionsThisMonth - b.request.sessionsThisMonth;
            if (delta !== 0) {
              if (!tieRuleUsed) tieRuleUsed = rule;
              return delta;
            }
          } else if (rule === "earliestRequest") {
            const timeA = new Date(a.request.requestedAt).getTime();
            const timeB = new Date(b.request.requestedAt).getTime();
            if (timeA !== timeB) {
              if (!tieRuleUsed) tieRuleUsed = rule;
              return timeA - timeB;
            }
          } else if (rule === "seededLottery") {
            const lotA = getLotteryValue(seed, a.request.requestId);
            const lotB = getLotteryValue(seed, b.request.requestId);
            if (lotA !== lotB) {
              if (!tieRuleUsed) tieRuleUsed = rule;
              return lotA - lotB; // smaller float ranks higher
            }
          }
        }
        return a.request.requestId.localeCompare(b.request.requestId);
      });
    }
  }

  const sorted = groups.flat();
  const tiedRequestIds = Array.from(tiedIdsSet);
  const used = tiedRequestIds.length > 0;

  return {
    sorted,
    tieBreakInfo: {
      used,
      order: policy.tieBreakOrder,
      seed: used ? seed : null,
      tiedRequestIds,
      decidedBy: used ? (tieRuleUsed ?? policy.tieBreakOrder[0] ?? null) : null,
    },
  };
}
