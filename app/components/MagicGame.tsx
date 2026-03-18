"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const ADJ: Record<number, number[]> = {
  1: [2, 4],
  2: [1, 3, 5],
  3: [2, 6],
  4: [1, 5, 7],
  5: [2, 4, 6, 8],
  6: [3, 5, 9],
  7: [4, 8],
  8: [5, 7, 9],
  9: [6, 8],
};

const CLASSIC_ELIMINATIONS: Record<number, number[]> = {
  1: [2],
  2: [4, 8],
  3: [1, 3, 5, 7, 9],
};

const CHALLENGE_ELIMINATIONS: Record<number, number[]> = {
  1: [2],
  2: [4],
  3: [8],
};

const CHALLENGE_TIME_MS = 45000;
const WALLET_KEY = "magic9_wallet_v1";

type Phase = "intro" | "select" | "moving" | "roundEnd" | "result";
type GameMode = "classic" | "challenge";
type Locale = "zh" | "en";
type EndReason = "arrive6" | "avoid6" | "invalid" | "timeout";
type ChallengeModifierKind = "warp" | "lock" | "flip";

interface ChallengeModifier {
  kind: ChallengeModifierKind;
  warpFrom?: number;
  warpTo?: number;
  lockCell?: number;
  round?: 2 | 3;
  flipSteps?: 2 | 3 | 4;
}

interface RoundReward {
  base: number;
  bonus: number;
  penalty: number;
  total: number;
}

interface RunResult {
  mode: GameMode;
  finalCell: number;
  endReason: EndReason;
  reward: RoundReward;
}

interface WalletState {
  coins: number;
  streak: number;
  bestStreak: number;
  totalRuns: number;
}

interface GameState {
  phase: Phase;
  mode: GameMode | null;
  position: number;
  startNum: number;
  round: number;
  stepsLeft: number;
  totalSteps: number;
  eliminated: number[];
  newlyEliminated: number[];
  moveHistory: number[];
  runSeed: number;
  timeLeftMs?: number;
  comboMultiplier: number;
  challengeModifier: ChallengeModifier | null;
  result: RunResult | null;
}

interface MoveRules {
  eliminated: number[];
  lockedCell?: number;
  warp?: { from: number; to: number };
}

const INIT_WALLET: WalletState = {
  coins: 0,
  streak: 0,
  bestStreak: 0,
  totalRuns: 0,
};

const INIT_STATE: GameState = {
  phase: "intro",
  mode: null,
  position: 0,
  startNum: 0,
  round: 0,
  stepsLeft: 0,
  totalSteps: 0,
  eliminated: [],
  newlyEliminated: [],
  moveHistory: [],
  runSeed: 0,
  timeLeftMs: undefined,
  comboMultiplier: 1,
  challengeModifier: null,
  result: null,
};

const COPY = {
  zh: {
    langZh: "中文",
    langEn: "English",
    titleMain: "命运九宫",
    titleSub: "选路径，拿金币，挑战不落在 6",
    modeClassic: "经典模式",
    modeChallenge: "挑战模式",
    classicDesc: "终局锁定 6，享受最终揭晓的压场时刻",
    challengeDesc: "扰动规则生效，目标是成功避开 6",
    startClassic: "进入经典",
    startChallenge: "进入挑战",
    rewardBoard: "奖励规则",
    rewardClassic: "经典：完成 +8，终局到 6 额外 +4",
    rewardChallenge: "挑战：避开 6 基础 +30，命中 6 奖励 0",
    rewardBonus: "挑战还有时间加成 + 连胜加成",
    viewRules: "规则介绍",
    viewRulesDesc: "查看完整玩法与结算说明",
    selectTitle: "选择你的起点",
    selectHint: "任意数字都可以开局",
    tapHint: "点击任意格子开始",
    hudCoins: "金币",
    hudStreak: "连胜",
    hudMode: "模式",
    roundLabel: (round: number) => `第 ${round} 轮 / 3`,
    stepsLeft: (steps: number) => `剩余 ${steps} 步`,
    timerLeft: (seconds: number) => `剩余 ${seconds}s`,
    roundOneDesc: (startNum: number, totalSteps: number) => `起点 [${startNum}]，本轮总步数 ${totalSteps}`,
    ruleClassic: "经典规则：每轮都会淘汰一些数字",
    ruleChallenge: "挑战规则：本局启用扰动，请尽量避开 6",
    modifierLabel: "本局扰动",
    modifierWarp: (from: number, to: number) => `传送门：落在 [${from}] 会瞬移到 [${to}]`,
    modifierLock: (round: number, cell: number) => `封锁：第 ${round} 轮无法停在 [${cell}]`,
    modifierFlip: (steps: number) => `变速：第 3 轮步数改为 ${steps} 步`,
    warpTriggered: (from: number, to: number) => `传送触发：${from} → ${to}`,
    lockHint: (cell: number) => `当前轮封锁格：不能停在 [${cell}]`,
    finalStepWarn: (eliminated: number[]) => `最后一步不能停在 [${eliminated.join(", ")}]`,
    eliminatedHint: (eliminated: number[]) => `已淘汰 [${eliminated.join(", ")}]（中间可穿过）`,
    roundComplete: (round: number) => `第 ${round} 轮完成`,
    eliminationEvent: "淘汰事件",
    continueToRound: (round: number) => `继续第 ${round} 轮`,
    noMove: "当前无合法移动",
    forceSettle: "立即结算",
    classicResultTitle: "命运锁定 6",
    classicResultSub: "你到达了终点 6，仪式完成",
    challengeWinTitle: "成功避开 6",
    challengeWinSub: "漂亮，这局拿到高额金币",
    challengeFailTitle: "被 6 捕获",
    challengeFailSub: "再来一局，打破它",
    timeoutTitle: "时间耗尽",
    timeoutSub: "挑战超时，本局无额外奖励",
    resultAt: (cell: number) => `最终落点 [${cell}]`,
    earned: "本局金币",
    breakdown: (base: number, bonus: number, penalty: number) =>
      `基础 ${base} / 加成 ${bonus} / 扣减 ${penalty}`,
    playAgain: "同模式再来一局",
    backMenu: "返回模式选择",
    phaseLabels: {
      intro: "主菜单",
      select: "选起点",
      moving: "行走中",
      roundEnd: "轮次结算",
      result: "终局",
    } as Record<Phase, string>,
    pos: "位置",
  },
  en: {
    langZh: "中文",
    langEn: "English",
    titleMain: "DESTINY GRID",
    titleSub: "Pick a path, earn coins, avoid 6 in challenge mode",
    modeClassic: "Classic",
    modeChallenge: "Challenge",
    classicDesc: "Guaranteed final cell 6 with a dramatic reveal",
    challengeDesc: "Modifier rules active, your goal is to avoid 6",
    startClassic: "Play Classic",
    startChallenge: "Play Challenge",
    rewardBoard: "Reward Rules",
    rewardClassic: "Classic: +8 for completion, +4 extra on cell 6",
    rewardChallenge: "Challenge: +30 if not 6, 0 if ending on 6",
    rewardBonus: "Challenge also grants time and streak bonuses",
    viewRules: "Rules Guide",
    viewRulesDesc: "Read full gameplay and scoring details",
    selectTitle: "Choose Your Start",
    selectHint: "Any cell can be your opening",
    tapHint: "Tap any cell to begin",
    hudCoins: "COINS",
    hudStreak: "STREAK",
    hudMode: "MODE",
    roundLabel: (round: number) => `ROUND ${round} / 3`,
    stepsLeft: (steps: number) => `${steps} ${steps === 1 ? "STEP" : "STEPS"} LEFT`,
    timerLeft: (seconds: number) => `${seconds}s LEFT`,
    roundOneDesc: (startNum: number, totalSteps: number) => `Started [${startNum}] with ${totalSteps} steps`,
    ruleClassic: "Classic rule: each round eliminates some cells",
    ruleChallenge: "Challenge rule: modifier active, try not to land on 6",
    modifierLabel: "Modifier",
    modifierWarp: (from: number, to: number) => `Warp gate: [${from}] teleports to [${to}]`,
    modifierLock: (round: number, cell: number) => `Lock: round ${round} cannot stop at [${cell}]`,
    modifierFlip: (steps: number) => `Flip: round 3 step count becomes ${steps}`,
    warpTriggered: (from: number, to: number) => `Warp triggered: ${from} -> ${to}`,
    lockHint: (cell: number) => `Locked cell this round: [${cell}]`,
    finalStepWarn: (eliminated: number[]) => `Final step cannot stop on [${eliminated.join(", ")}]`,
    eliminatedHint: (eliminated: number[]) => `Eliminated [${eliminated.join(", ")}] (pass-through allowed)`,
    roundComplete: (round: number) => `ROUND ${round} COMPLETE`,
    eliminationEvent: "Elimination",
    continueToRound: (round: number) => `Continue to round ${round}`,
    noMove: "No legal move remains",
    forceSettle: "Settle Now",
    classicResultTitle: "DESTINY LOCKED ON 6",
    classicResultSub: "You reached 6. The ritual is complete.",
    challengeWinTitle: "6 AVOIDED",
    challengeWinSub: "Clean run. High coin payout.",
    challengeFailTitle: "CAUGHT BY 6",
    challengeFailSub: "Run it again and break the chain.",
    timeoutTitle: "TIME OUT",
    timeoutSub: "Challenge timer depleted. No extra payout.",
    resultAt: (cell: number) => `Final cell [${cell}]`,
    earned: "COINS EARNED",
    breakdown: (base: number, bonus: number, penalty: number) =>
      `Base ${base} / Bonus ${bonus} / Penalty ${penalty}`,
    playAgain: "Replay Same Mode",
    backMenu: "Back To Modes",
    phaseLabels: {
      intro: "menu",
      select: "select",
      moving: "moving",
      roundEnd: "roundEnd",
      result: "result",
    } as Record<Phase, string>,
    pos: "POS",
  },
} as const;

function uniqueNumbers(list: number[]): number[] {
  return Array.from(new Set(list));
}

function mulberry32(seed: number) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pickFrom<T>(arr: T[], random: () => number): T {
  const index = Math.floor(random() * arr.length);
  return arr[index];
}

function createChallengeModifier(seed: number): ChallengeModifier {
  const random = mulberry32(seed);
  const kind = pickFrom<ChallengeModifierKind>(["warp", "lock", "flip"], random);

  if (kind === "warp") {
    const from = pickFrom([1, 2, 3, 4, 5, 7, 8, 9], random);
    const targets = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((n) => n !== from);
    return { kind, warpFrom: from, warpTo: pickFrom(targets, random) };
  }

  if (kind === "lock") {
    return {
      kind,
      round: pickFrom([2, 3], random),
      lockCell: pickFrom([1, 3, 5, 6, 7, 9], random),
    };
  }

  return {
    kind,
    flipSteps: pickFrom([2, 3, 4], random),
  };
}

function getRoundEliminations(mode: GameMode, round: number): number[] {
  return mode === "classic" ? CLASSIC_ELIMINATIONS[round] || [] : CHALLENGE_ELIMINATIONS[round] || [];
}

function getRoundSteps(mode: GameMode, round: number, startNum: number, modifier: ChallengeModifier | null): number {
  if (round === 1) return startNum + 1;
  if (round === 2) return 2;
  if (mode === "challenge" && modifier?.kind === "flip" && modifier.flipSteps) return modifier.flipSteps;
  return 3;
}

function applyWarp(cell: number, warp?: { from: number; to: number }): number {
  if (!warp) return cell;
  return cell === warp.from ? warp.to : cell;
}

function canReachValid(pos: number, stepsLeft: number, rules: MoveRules): boolean {
  const current = applyWarp(pos, rules.warp);

  if (rules.lockedCell && current === rules.lockedCell) return false;

  if (stepsLeft === 0) {
    return !rules.eliminated.includes(current);
  }

  return ADJ[current].some((next) => canReachValid(next, stepsLeft - 1, rules));
}

function getValidMoves(pos: number, stepsLeft: number, rules: MoveRules): number[] {
  if (stepsLeft === 0) return [];
  return ADJ[pos].filter((next) => canReachValid(next, stepsLeft - 1, rules));
}

function calculateReward(mode: GameMode, endReason: EndReason, timeLeftMs: number, streak: number): RoundReward {
  if (mode === "classic") {
    const base = 8;
    const bonus = endReason === "arrive6" ? 4 : 0;
    const penalty = 0;
    return { base, bonus, penalty, total: base + bonus - penalty };
  }

  if (endReason === "timeout") {
    return { base: 0, bonus: 0, penalty: 0, total: 0 };
  }

  if (endReason === "avoid6") {
    const base = 30;
    const timeBonus = Math.floor((Math.max(0, timeLeftMs) / CHALLENGE_TIME_MS) * 10);
    const streakBonus = Math.min(streak * 2, 20);
    const bonus = timeBonus + streakBonus;
    const penalty = 0;
    return { base, bonus, penalty, total: base + bonus - penalty };
  }

  return { base: 0, bonus: 0, penalty: 0, total: 0 };
}

function modifierLabel(modifier: ChallengeModifier | null, locale: Locale): string {
  if (!modifier) return "";

  if (modifier.kind === "warp" && modifier.warpFrom && modifier.warpTo) {
    return locale === "zh"
      ? `传送门：落在 [${modifier.warpFrom}] 会瞬移到 [${modifier.warpTo}]`
      : `Warp gate: [${modifier.warpFrom}] teleports to [${modifier.warpTo}]`;
  }

  if (modifier.kind === "lock" && modifier.round && modifier.lockCell) {
    return locale === "zh"
      ? `封锁：第 ${modifier.round} 轮无法停在 [${modifier.lockCell}]`
      : `Lock: round ${modifier.round} cannot stop at [${modifier.lockCell}]`;
  }

  if (modifier.kind === "flip" && modifier.flipSteps) {
    return locale === "zh"
      ? `变速：第 3 轮步数改为 ${modifier.flipSteps} 步`
      : `Flip: round 3 step count becomes ${modifier.flipSteps}`;
  }

  return "";
}

interface CellProps {
  num: number;
  isCurrent: boolean;
  isValidMove: boolean;
  isPassThrough: boolean;
  isEliminated: boolean;
  isNewlyEliminated: boolean;
  isSelectable: boolean;
  isInHistory: boolean;
  isLastStep: boolean;
  isLocked: boolean;
  isWarpGate: boolean;
  onClick: () => void;
}

function Cell({
  num,
  isCurrent,
  isValidMove,
  isPassThrough,
  isEliminated,
  isNewlyEliminated,
  isSelectable,
  isInHistory,
  isLastStep,
  isLocked,
  isWarpGate,
  onClick,
}: CellProps) {
  let base =
    "relative flex items-center justify-center w-[72px] h-[72px] sm:w-[88px] sm:h-[88px] text-3xl sm:text-4xl font-bold select-none transition-all duration-200 border border-green-900/35";

  if (isCurrent) {
    base += " bg-green-500/20 text-green-300 border-green-300/80 cursor-default cell-current cell-shock";
  } else if (isPassThrough) {
    base +=
      " bg-orange-500/10 text-orange-300/80 border border-dashed border-orange-400/40 cursor-pointer hover:bg-orange-500/20";
  } else if (isValidMove && !isLastStep) {
    base +=
      " bg-amber-500/15 text-amber-200 border-amber-300/60 cursor-pointer hover:bg-amber-500/30 hover:border-amber-200 text-glow-amber";
  } else if (isValidMove && isLastStep) {
    base +=
      " bg-amber-400/20 text-amber-200 border-2 border-amber-300 cursor-pointer hover:bg-amber-400/35 text-glow-amber";
  } else if (isNewlyEliminated) {
    base += " text-red-300/55 border-red-700/30 cell-newly-eliminated";
  } else if (isEliminated) {
    base += " text-red-500/25 border-red-900/20";
  } else if (isSelectable) {
    base += " text-green-200 cursor-pointer hover:bg-green-500/12 hover:border-green-300/50 hover:text-green-300";
  } else if (isInHistory) {
    base += " text-green-700/70 border-green-900/40";
  } else {
    base += " text-green-500/35";
  }

  if (isLocked) {
    base += " ring-1 ring-red-500/60 bg-red-900/20";
  }

  if (isWarpGate && !isCurrent) {
    base += " ring-1 ring-cyan-400/55";
  }

  const canClick = (isSelectable || isValidMove || isPassThrough) && !isLocked;

  return (
    <div
      className={base}
      onClick={canClick ? onClick : undefined}
      tabIndex={canClick ? 0 : undefined}
      onKeyDown={
        canClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onClick();
            }
          : undefined
      }
    >
      <span className={isEliminated ? "line-through decoration-red-500/50 decoration-2" : ""}>{num}</span>

      {isCurrent && <span className="absolute inset-0 border-2 border-green-300/70 animate-pulse pointer-events-none" />}
      {isNewlyEliminated && <span className="absolute inset-0 bg-red-500/20 pointer-events-none cell-newly-eliminated" />}
      {isInHistory && !isCurrent && !isEliminated && (
        <span className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-green-700/60" />
      )}

      {isWarpGate && (
        <span className="absolute top-1 right-1 text-[9px] leading-none text-cyan-300/90" aria-hidden="true">
          W
        </span>
      )}

      {isLocked && (
        <span className="absolute bottom-1 left-1 text-[8px] leading-none text-red-300/90" aria-hidden="true">
          LOCK
        </span>
      )}
    </div>
  );
}

export default function MagicGame() {
  const [gs, setGs] = useState<GameState>(INIT_STATE);
  const [wallet, setWallet] = useState<WalletState>(() => {
    if (typeof window === "undefined") return INIT_WALLET;

    try {
      const raw = localStorage.getItem(WALLET_KEY);
      if (!raw) return INIT_WALLET;
      const parsed = JSON.parse(raw) as Partial<WalletState>;
      return {
        coins: parsed.coins ?? 0,
        streak: parsed.streak ?? 0,
        bestStreak: parsed.bestStreak ?? 0,
        totalRuns: parsed.totalRuns ?? 0,
      };
    } catch {
      return INIT_WALLET;
    }
  });
  const [locale, setLocale] = useState<Locale>("zh");
  const [eventText, setEventText] = useState<string | null>(null);
  const [coinBurstOn, setCoinBurstOn] = useState(false);

  const t = COPY[locale];

  useEffect(() => {
    localStorage.setItem(WALLET_KEY, JSON.stringify(wallet));
  }, [wallet]);

  useEffect(() => {
    if (!eventText) return;
    const timer = window.setTimeout(() => setEventText(null), 1200);
    return () => window.clearTimeout(timer);
  }, [eventText]);

  useEffect(() => {
    if (gs.phase !== "moving" || gs.mode !== "challenge") return;

    const timer = window.setInterval(() => {
      setGs((prev) => {
        if (prev.phase !== "moving" || prev.mode !== "challenge") return prev;
        const current = prev.timeLeftMs ?? 0;
        if (current <= 0) return prev;
        return { ...prev, timeLeftMs: Math.max(0, current - 100) };
      });
    }, 100);

    return () => window.clearInterval(timer);
  }, [gs.phase, gs.mode]);

  const activeLockCell = useMemo(() => {
    if (gs.mode !== "challenge") return undefined;
    if (gs.challengeModifier?.kind !== "lock") return undefined;
    if (gs.challengeModifier.round !== gs.round) return undefined;
    return gs.challengeModifier.lockCell;
  }, [gs.mode, gs.challengeModifier, gs.round]);

  const activeWarp = useMemo(() => {
    if (gs.mode !== "challenge") return undefined;
    if (gs.challengeModifier?.kind !== "warp") return undefined;
    if (!gs.challengeModifier.warpFrom || !gs.challengeModifier.warpTo) return undefined;
    return {
      from: gs.challengeModifier.warpFrom,
      to: gs.challengeModifier.warpTo,
    };
  }, [gs.mode, gs.challengeModifier]);

  const validMoves = useMemo(() => {
    if (gs.phase !== "moving") return [];
    return getValidMoves(gs.position, gs.stepsLeft, {
      eliminated: gs.eliminated,
      lockedCell: activeLockCell,
      warp: activeWarp,
    });
  }, [gs.phase, gs.position, gs.stepsLeft, gs.eliminated, activeLockCell, activeWarp]);

  const isLastStep = gs.stepsLeft === 1;
  const stepsCompleted = gs.totalSteps - gs.stepsLeft;
  const progress = gs.totalSteps > 0 ? Math.round((stepsCompleted / gs.totalSteps) * 100) : 0;

  const updateWalletWithReward = (mode: GameMode, endReason: EndReason, reward: RoundReward) => {
    setWallet((prev) => {
      const nextStreak =
        mode === "challenge" ? (endReason === "avoid6" ? prev.streak + 1 : 0) : prev.streak;

      return {
        coins: Math.max(0, prev.coins + reward.total),
        streak: nextStreak,
        bestStreak: Math.max(prev.bestStreak, nextStreak),
        totalRuns: prev.totalRuns + 1,
      };
    });
  };

  const settleRun = (finalCell: number, endReason: EndReason, eliminated: number[], moveHistory: number[]) => {
    if (!gs.mode) return;

    const reward = calculateReward(gs.mode, endReason, gs.timeLeftMs ?? 0, wallet.streak);
    updateWalletWithReward(gs.mode, endReason, reward);

    const triggerBurst = gs.mode === "challenge" && endReason === "avoid6";
    setCoinBurstOn(triggerBurst);

    setGs((prev) => ({
      ...prev,
      phase: "result",
      position: finalCell,
      eliminated,
      moveHistory,
      result: {
        mode: gs.mode as GameMode,
        finalCell,
        endReason,
        reward,
      },
    }));
  };

  const startRun = (mode: GameMode) => {
    const runSeed = Date.now();
    const modifier = mode === "challenge" ? createChallengeModifier(runSeed) : null;

    setEventText(null);
    setCoinBurstOn(false);

    setGs({
      ...INIT_STATE,
      phase: "select",
      mode,
      runSeed,
      challengeModifier: modifier,
      timeLeftMs: mode === "challenge" ? CHALLENGE_TIME_MS : undefined,
      comboMultiplier: mode === "challenge" ? Math.min(1 + wallet.streak * 0.1, 2) : 1,
    });
  };

  const selectStart = (n: number) => {
    if (gs.phase !== "select" || !gs.mode) return;

    const initialSteps = getRoundSteps(gs.mode, 1, n, gs.challengeModifier);

    setGs((prev) => ({
      ...prev,
      phase: "moving",
      position: n,
      startNum: n,
      round: 1,
      stepsLeft: initialSteps,
      totalSteps: initialSteps,
      eliminated: [],
      newlyEliminated: [],
      moveHistory: [n],
    }));
  };

  const moveTo = (cell: number) => {
    if (gs.phase !== "moving" || !gs.mode) return;

    const valid = getValidMoves(gs.position, gs.stepsLeft, {
      eliminated: gs.eliminated,
      lockedCell: activeLockCell,
      warp: activeWarp,
    });

    if (!valid.includes(cell)) return;

    let landed = cell;
    const nextHistory = [...gs.moveHistory, cell];

    if (activeWarp && cell === activeWarp.from) {
      landed = activeWarp.to;
      nextHistory.push(landed);
      setEventText(t.warpTriggered(activeWarp.from, activeWarp.to));
    }

    const newStepsLeft = gs.stepsLeft - 1;

    if (newStepsLeft === 0) {
      const newlyEliminated = getRoundEliminations(gs.mode, gs.round);
      const allEliminated = uniqueNumbers([...gs.eliminated, ...newlyEliminated]);

      if (gs.round === 3) {
        const isTimeout = gs.mode === "challenge" && (gs.timeLeftMs ?? 0) <= 0;
        const endReason: EndReason = isTimeout
          ? "timeout"
          : gs.mode === "classic"
            ? landed === 6
              ? "arrive6"
              : "invalid"
            : landed === 6
              ? "arrive6"
              : "avoid6";

        settleRun(landed, endReason, allEliminated, nextHistory);
        return;
      }

      setGs((prev) => ({
        ...prev,
        phase: "roundEnd",
        position: landed,
        stepsLeft: 0,
        eliminated: allEliminated,
        newlyEliminated,
        moveHistory: nextHistory,
      }));

      return;
    }

    setGs((prev) => ({
      ...prev,
      position: landed,
      stepsLeft: newStepsLeft,
      moveHistory: nextHistory,
      newlyEliminated: [],
    }));
  };

  const nextRound = () => {
    if (gs.phase !== "roundEnd" || !gs.mode) return;

    const round = gs.round + 1;
    const steps = getRoundSteps(gs.mode, round, gs.startNum, gs.challengeModifier);

    setGs((prev) => ({
      ...prev,
      phase: "moving",
      round,
      stepsLeft: steps,
      totalSteps: steps,
      newlyEliminated: [],
    }));
  };

  const backToMenu = () => {
    setEventText(null);
    setCoinBurstOn(false);
    setGs(INIT_STATE);
  };

  const replaySameMode = () => {
    if (!gs.mode) return;
    startRun(gs.mode);
  };

  const timeLeftSec = Math.ceil((gs.timeLeftMs ?? 0) / 1000);
  const hasNoMoves = gs.phase === "moving" && gs.stepsLeft > 0 && validMoves.length === 0;

  const renderModifier = () => {
    if (gs.mode !== "challenge" || !gs.challengeModifier) return null;

    const label = modifierLabel(gs.challengeModifier, locale);

    return (
      <div className="w-full border border-cyan-900/40 bg-cyan-950/20 px-3 py-2 text-[11px] text-cyan-300/85 tracking-wide">
        <p className="text-cyan-200/90">{t.modifierLabel}</p>
        <p className="mt-1">{label}</p>
      </div>
    );
  };

  const renderGrid = (interactive: boolean) => (
    <div className="grid-container border border-green-800/40 w-fit">
      <div className="grid grid-cols-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
          const isCurrent = gs.position === n && gs.phase !== "select";
          const isElim = gs.eliminated.includes(n);
          const isNewElim = gs.newlyEliminated.includes(n);
          const isSelectable = gs.phase === "select";
          const isValid = interactive && validMoves.includes(n);
          const isPassThru = interactive && isValid && gs.eliminated.includes(n) && !isLastStep;
          const isInHistory = !isCurrent && gs.moveHistory.includes(n) && !isElim;
          const isLocked = activeLockCell === n && gs.phase === "moving";
          const isWarpGate = gs.challengeModifier?.kind === "warp" && gs.challengeModifier.warpFrom === n;

          return (
            <Cell
              key={n}
              num={n}
              isCurrent={isCurrent}
              isValidMove={isValid && !isPassThru}
              isPassThrough={isPassThru}
              isEliminated={isElim && !isNewElim}
              isNewlyEliminated={isNewElim}
              isSelectable={isSelectable}
              isInHistory={isInHistory}
              isLastStep={isLastStep}
              isLocked={!!isLocked}
              isWarpGate={!!isWarpGate && gs.mode === "challenge"}
              onClick={() => {
                if (isSelectable) selectStart(n);
                else if (isValid) moveTo(n);
              }}
            />
          );
        })}
      </div>
    </div>
  );

  const result = gs.result;
  const isClassicWow = !!result && result.mode === "classic" && result.endReason === "arrive6";
  const isChallengeWin = !!result && result.mode === "challenge" && result.endReason === "avoid6";
  const isTimeout = !!result && result.endReason === "timeout";

  return (
    <div className="min-h-screen bg-[#070b08] text-green-300 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(34,197,94,0.12),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(16,185,129,0.08),transparent_35%),radial-gradient(circle_at_50%_90%,rgba(251,191,36,0.06),transparent_45%)]" />

      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 border border-green-800/50 bg-black/30 px-3 py-1 text-[10px] tracking-[0.18em]">
        <span className="text-amber-300">{t.hudCoins}: {wallet.coins}</span>
        <span className="text-green-600">|</span>
        <span className={`text-green-300 ${wallet.streak > 0 ? "streak-pop" : ""}`}>{t.hudStreak}: {wallet.streak}</span>
        {gs.mode && (
          <>
            <span className="text-green-600">|</span>
            <span className="text-cyan-300">{t.hudMode}: {gs.mode === "classic" ? t.modeClassic : t.modeChallenge}</span>
          </>
        )}
      </div>

      <div className="fixed bottom-3 left-4 text-green-900/80 text-[10px] tracking-[0.3em] uppercase">
        {t.phaseLabels[gs.phase]}
      </div>
      <div className="fixed bottom-3 right-4 text-green-900/80 text-[10px] tracking-[0.3em] uppercase">
        {gs.position ? `${t.pos}:${gs.position}` : `${t.pos}:--`}
      </div>

      <div className="fixed right-4 top-3 z-20 text-[10px] border border-green-900/40 bg-black/20">
        <button
          type="button"
          onClick={() => setLocale("zh")}
          className={`px-2 py-1 ${locale === "zh" ? "text-green-300 bg-green-800/20" : "text-green-700"}`}
        >
          {t.langZh}
        </button>
        <button
          type="button"
          onClick={() => setLocale("en")}
          className={`px-2 py-1 ${locale === "en" ? "text-green-300 bg-green-800/20" : "text-green-700"}`}
        >
          {t.langEn}
        </button>
      </div>

      {eventText && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-30 px-3 py-1 text-xs text-cyan-200 border border-cyan-400/50 bg-cyan-950/60 reveal-in">
          {eventText}
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center gap-5 w-full max-w-[390px]">
        {gs.phase === "intro" && (
          <>
            <div className="text-center w-full space-y-2">
              <h1 className="text-5xl font-bold tracking-[0.22em] leading-[1.1] text-green-300 text-glow-green">{t.titleMain}</h1>
              <p className="text-xs tracking-[0.16em] text-green-600">{t.titleSub}</p>
            </div>

            <div className="w-full grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => startRun("classic")}
                className="btn-retro w-full py-4 text-base text-left px-4"
              >
                <p className="text-base tracking-[0.16em]">{t.startClassic}</p>
                <p className="text-[11px] text-green-700 mt-1 normal-case tracking-wide">{t.classicDesc}</p>
              </button>

              <button
                type="button"
                onClick={() => startRun("challenge")}
                className="btn-retro btn-retro-amber w-full py-4 text-base text-left px-4"
              >
                <p className="text-base tracking-[0.16em]">{t.startChallenge}</p>
                <p className="text-[11px] text-amber-800/80 mt-1 normal-case tracking-wide">{t.challengeDesc}</p>
              </button>
            </div>

            <div className="w-full border border-green-900/40 bg-black/20 p-4 space-y-1.5 text-[11px] text-green-700 tracking-wide">
              <p className="text-green-500 tracking-[0.18em] uppercase">{t.rewardBoard}</p>
              <p>{t.rewardClassic}</p>
              <p>{t.rewardChallenge}</p>
              <p className="text-amber-300/80">{t.rewardBonus}</p>
            </div>

            <Link href="/rules" className="btn-retro w-full py-3 px-4 text-left block">
              <p className="text-sm tracking-[0.16em]">{t.viewRules}</p>
              <p className="text-[11px] text-green-700 mt-1 normal-case tracking-wide">{t.viewRulesDesc}</p>
            </Link>
          </>
        )}

        {gs.phase === "select" && (
          <>
            <div className="text-center w-full space-y-1">
              <h2 className="text-2xl tracking-[0.18em] text-green-300">{t.selectTitle}</h2>
              <p className="text-xs text-green-700 tracking-wide">{t.selectHint}</p>
              <p className="text-[11px] text-green-700 tracking-wide">
                {gs.mode === "classic" ? t.ruleClassic : t.ruleChallenge}
              </p>
            </div>

            {renderModifier()}
            {renderGrid(false)}

            <p className="text-[11px] text-green-700 tracking-[0.2em] animate-pulse text-center">{t.tapHint}</p>
          </>
        )}

        {gs.phase === "moving" && (
          <>
            <div className="w-full space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-green-700 tracking-widest">{t.roundLabel(gs.round)}</span>
                <span
                  className={`text-sm font-bold tracking-widest ${
                    isLastStep ? "text-amber-200 text-glow-amber" : "text-amber-400"
                  }`}
                >
                  {t.stepsLeft(gs.stepsLeft)}
                </span>
              </div>

              <div className="w-full h-[2px] bg-green-900/40">
                <div className="h-[2px] bg-green-400 transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>

              {gs.round === 1 && (
                <p className="text-[10px] text-green-700 tracking-wide">{t.roundOneDesc(gs.startNum, gs.totalSteps)}</p>
              )}

              {gs.mode === "challenge" && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-cyan-300">{t.timerLeft(timeLeftSec)}</span>
                  <span className="text-amber-300/80">x{gs.comboMultiplier.toFixed(1)}</span>
                </div>
              )}
            </div>

            {renderModifier()}
            {renderGrid(true)}

            <div className="w-full space-y-2 text-[11px] tracking-wide">
              {activeLockCell && <p className="text-red-300/85">{t.lockHint(activeLockCell)}</p>}

              {isLastStep && gs.eliminated.length > 0 && (
                <div className="border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-amber-300/90">
                  {t.finalStepWarn(gs.eliminated)}
                </div>
              )}

              {!isLastStep && gs.eliminated.length > 0 && (
                <p className="text-green-700">{t.eliminatedHint(gs.eliminated)}</p>
              )}

              {hasNoMoves && (
                <div className="border border-red-800/50 bg-red-950/25 px-3 py-3 space-y-2">
                  <p className="text-red-300">{t.noMove}</p>
                  <button
                    type="button"
                    onClick={() => settleRun(gs.position, "invalid", gs.eliminated, gs.moveHistory)}
                    className="btn-retro w-full py-2 text-sm"
                  >
                    {t.forceSettle}
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {gs.phase === "roundEnd" && (
          <>
            <div className="w-full text-center border-y border-green-900/30 py-4 space-y-1">
              <p className="text-[10px] text-green-700 tracking-[0.28em]">{t.roundComplete(gs.round)}</p>
              <p className="text-sm text-green-500 tracking-[0.15em]">{t.eliminationEvent}</p>
              <div className="mt-2">
                <span className="text-2xl font-bold text-red-300 text-glow-red">[{gs.newlyEliminated.join(", ")}]</span>
              </div>
            </div>

            {renderModifier()}
            {renderGrid(false)}

            <button type="button" onClick={nextRound} className="btn-retro w-full py-4 text-base">
              {t.continueToRound(gs.round + 1)}
            </button>
          </>
        )}

        {gs.phase === "result" && result && (
          <>
            <div
              className={`text-center space-y-3 w-full border border-green-900/35 bg-black/20 p-5 reveal-in ${
                isClassicWow ? "screen-pulse" : ""
              }`}
            >
              {isClassicWow && (
                <>
                  <div className="text-[6.5rem] font-bold leading-none text-green-300 text-glow-reveal six-dominance">6</div>
                  <p className="text-lg tracking-[0.2em] text-green-300">{t.classicResultTitle}</p>
                  <p className="text-xs text-green-700 tracking-wide">{t.classicResultSub}</p>
                </>
              )}

              {isChallengeWin && (
                <>
                  <p className="text-xl tracking-[0.18em] text-amber-200">{t.challengeWinTitle}</p>
                  <p className="text-xs text-amber-100/80 tracking-wide">{t.challengeWinSub}</p>
                  <div className={`coin-burst ${coinBurstOn ? "coin-burst-active" : ""}`}>
                    <span className="coin-particle" />
                    <span className="coin-particle" />
                    <span className="coin-particle" />
                    <span className="coin-particle" />
                    <span className="coin-particle" />
                    <span className="coin-particle" />
                    <span className="coin-particle" />
                    <span className="coin-particle" />
                  </div>
                </>
              )}

              {!isClassicWow && !isChallengeWin && !isTimeout && (
                <>
                  <div className="text-[4.5rem] font-bold leading-none text-red-300">{result.finalCell}</div>
                  <p className="text-lg tracking-[0.2em] text-red-300">{t.challengeFailTitle}</p>
                  <p className="text-xs text-red-200/70 tracking-wide">{t.challengeFailSub}</p>
                </>
              )}

              {isTimeout && (
                <>
                  <div className="text-[4rem] font-bold leading-none text-red-300">0</div>
                  <p className="text-lg tracking-[0.2em] text-red-300">{t.timeoutTitle}</p>
                  <p className="text-xs text-red-200/70 tracking-wide">{t.timeoutSub}</p>
                </>
              )}

              <div className="border-t border-green-900/30 pt-3 space-y-1">
                <p className="text-xs text-green-700 tracking-wide">{t.resultAt(result.finalCell)}</p>
                <p className="text-sm text-amber-200 tracking-[0.2em]">{t.earned}: +{result.reward.total}</p>
                <p className="text-[11px] text-green-700 tracking-wide">
                  {t.breakdown(result.reward.base, result.reward.bonus, result.reward.penalty)}
                </p>
              </div>
            </div>

            {renderGrid(false)}

            <button type="button" onClick={replaySameMode} className="btn-retro w-full py-4 text-base">
              {t.playAgain}
            </button>
            <button type="button" onClick={backToMenu} className="btn-retro w-full py-3 text-sm">
              {t.backMenu}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
