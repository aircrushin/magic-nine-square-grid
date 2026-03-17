"use client";

import { useState } from "react";

// Grid Layout
//   1 | 2 | 3
//   --+---+--
//   4 | 5 | 6
//   --+---+--
//   7 | 8 | 9

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

// Numbers eliminated AFTER each round completes
const ROUND_ELIMINATIONS: Record<number, number[]> = {
  1: [2],
  2: [4, 8],
  3: [1, 3, 5, 7, 9],
};

// Lookahead: can we reach a non-eliminated cell from pos in exactly stepsLeft steps?
// Intermediate steps CAN land on eliminated cells (pass-through).
// Only the FINAL position must be non-eliminated.
function canReachValid(pos: number, stepsLeft: number, eliminated: number[]): boolean {
  if (stepsLeft === 0) return !eliminated.includes(pos);
  return ADJ[pos].some((next) => canReachValid(next, stepsLeft - 1, eliminated));
}

// Returns adjacent cells that lead to at least one valid final position
function getValidMoves(pos: number, stepsLeft: number, eliminated: number[]): number[] {
  if (stepsLeft === 0) return [];
  return ADJ[pos].filter((next) => canReachValid(next, stepsLeft - 1, eliminated));
}

type Phase = "intro" | "select" | "moving" | "roundEnd" | "reveal";
type Locale = "zh" | "en";

interface GameState {
  phase: Phase;
  position: number; // current cell 1-9, 0 = not started
  startNum: number; // the number chosen initially
  round: number; // 1 | 2 | 3
  stepsLeft: number; // steps remaining in current round
  totalSteps: number; // total steps for current round (for progress bar)
  eliminated: number[]; // cumulative eliminated numbers
  newlyEliminated: number[]; // just eliminated this round (for flash animation)
  moveHistory: number[]; // path taken (for trail)
}

const INIT_STATE: GameState = {
  phase: "intro",
  position: 0,
  startNum: 0,
  round: 0,
  stepsLeft: 0,
  totalSteps: 0,
  eliminated: [],
  newlyEliminated: [],
  moveHistory: [],
};

const COPY = {
  zh: {
    langZh: "中文",
    langEn: "English",
    systemReady: "── 系统就绪 ──",
    titleMain: "魔术",
    titleSub: "九宫",
    titleThird: "格",
    divider: "────────────────────",
    ruleTitle: "// 规则 //",
    rules: [
      "选择任意起始格 [1-9]",
      "第 1 轮：走 N+1 步",
      "第 2 轮：再走 2 步",
      "第 3 轮：再走 3 步",
      "每一轮都会淘汰一些数字",
    ],
    ruleQuestion: "你最终会停在哪个数字？",
    begin: "[ 开始 ]",
    selectStep: "步骤 01 / 03",
    selectTitle: "选择你的数字",
    selectHint: "把任意格子作为起点",
    tapHint: "▼ 点击任意格子开始 ▼",
    roundLabel: (round: number) => `第 ${round} 轮 / 3`,
    stepsLeft: (steps: number) => `剩余 ${steps} 步`,
    roundOneDesc: (startNum: number, totalSteps: number) =>
      `起点 [${startNum}] — 总步数: ${totalSteps} (${startNum}+1)`,
    legendCurrent: "■ 当前位置",
    legendValidMove: "■ 可走位置",
    legendPassThrough: "■ 可穿过",
    legendEliminated: "■ 已淘汰",
    finalStepWarn: (eliminated: number[]) => `⚠ 最后一步，不能停在 [${eliminated.join(", ")}]`,
    eliminatedCanPass: (eliminated: number[]) => `已淘汰: [${eliminated.join(", ")}] — 可穿过`,
    roundComplete: (round: number) => `第 ${round} 轮结束`,
    eliminationEvent: "淘汰事件",
    outLabel: "已淘汰",
    positionLabel: (position: number) => `当前位置: [${position}]`,
    allEliminatedLabel: (eliminated: number[]) => `全部淘汰: [${eliminated.join(", ")}]`,
    nextRound1: "下一轮: 不能停在 [2]",
    nextRound2: "下一轮: 不能停在 [2, 4, 8]",
    continueToRound: (round: number) => `[ 继续 → 第 ${round} 轮 ]`,
    calculating: "── 正在计算 ──",
    youAreOn: "你现在在",
    startedArrived: (startNum: number) => `起点 [${startNum}] — 终点 [6]`,
    magicComplete: "魔术完成",
    hideSecret: "[ 隐藏原理 ]",
    revealSecret: "[ 查看原理 ]",
    mathTitle: "// 数学原理",
    mathLines: [
      "第 1 轮：从 n 出发走 n+1 步",
      "奇偶性会把你限制到奇数格",
      "奇数格为: 1, 3, 5, 7, 9",
      "从任意奇数格再走 2 步仍是奇数格",
      "淘汰 2, 4, 8 之后只剩 6",
      "从任意奇数格走 3 步只能到 6",
    ],
    alwaysHere: "所有路径都会到这里。一定如此。",
    playAgain: "[ 再玩一次 ]",
    phaseLabels: {
      intro: "引导",
      select: "选择",
      moving: "移动",
      roundEnd: "轮次结束",
      reveal: "揭晓",
    } as Record<Phase, string>,
    pos: "位置",
  },
  en: {
    langZh: "中文",
    langEn: "English",
    systemReady: "── SYSTEM READY ──",
    titleMain: "MAGIC",
    titleSub: "NINE",
    titleThird: "SQUARE",
    divider: "────────────────────",
    ruleTitle: "// RULES //",
    rules: [
      "PICK ANY STARTING CELL [1-9]",
      "ROUND 1: WALK N+1 STEPS",
      "ROUND 2: WALK 2 MORE STEPS",
      "ROUND 3: WALK 3 MORE STEPS",
      "NUMBERS GET ELIMINATED EACH ROUND",
    ],
    ruleQuestion: "WHERE WILL YOU END UP?",
    begin: "[ BEGIN ]",
    selectStep: "STEP 01 / 03",
    selectTitle: "SELECT YOUR NUMBER",
    selectHint: "THINK OF ANY CELL AS YOUR START",
    tapHint: "▼ TAP ANY CELL TO BEGIN ▼",
    roundLabel: (round: number) => `ROUND ${round} / 3`,
    stepsLeft: (steps: number) => `${steps} ${steps === 1 ? "STEP" : "STEPS"} LEFT`,
    roundOneDesc: (startNum: number, totalSteps: number) =>
      `STARTED AT [${startNum}] — TOTAL STEPS: ${totalSteps} (${startNum}+1)`,
    legendCurrent: "■ CURRENT",
    legendValidMove: "■ VALID MOVE",
    legendPassThrough: "■ PASS-THROUGH",
    legendEliminated: "■ ELIMINATED",
    finalStepWarn: (eliminated: number[]) => `⚠ FINAL STEP — CANNOT STOP ON [${eliminated.join(", ")}]`,
    eliminatedCanPass: (eliminated: number[]) => `ELIMINATED: [${eliminated.join(", ")}] — CAN PASS THROUGH`,
    roundComplete: (round: number) => `ROUND ${round} COMPLETE`,
    eliminationEvent: "ELIMINATION EVENT",
    outLabel: "OUT",
    positionLabel: (position: number) => `POSITION: [${position}]`,
    allEliminatedLabel: (eliminated: number[]) => `ALL ELIMINATED: [${eliminated.join(", ")}]`,
    nextRound1: "NEXT: CANNOT STOP ON [2]",
    nextRound2: "NEXT: CANNOT STOP ON [2, 4, 8]",
    continueToRound: (round: number) => `[ CONTINUE → ROUND ${round} ]`,
    calculating: "── CALCULATING ──",
    youAreOn: "YOU ARE ON",
    startedArrived: (startNum: number) => `STARTED AT [${startNum}] — ARRIVED AT [6]`,
    magicComplete: "MAGIC COMPLETE",
    hideSecret: "[ HIDE SECRET ]",
    revealSecret: "[ REVEAL THE SECRET ]",
    mathTitle: "// THE MATHEMATICS",
    mathLines: [
      "ROUND 1: n + (n+1) STEPS FROM CELL n",
      "PARITY FORCES YOU ONTO AN ODD CELL",
      "ODD CELLS: 1, 3, 5, 7, 9",
      "FROM ANY ODD CELL, 2 MORE STEPS → ODD",
      "ELIMINATING 2, 4, 8 LEAVES ONLY 6",
      "FROM ANY ODD CELL, 3 STEPS → ONLY 6",
    ],
    alwaysHere: "EVERY PATH LEADS HERE. ALWAYS.",
    playAgain: "[ PLAY AGAIN ]",
    phaseLabels: {
      intro: "intro",
      select: "select",
      moving: "moving",
      roundEnd: "roundEnd",
      reveal: "reveal",
    } as Record<Phase, string>,
    pos: "POS",
  },
} as const;

interface CellProps {
  num: number;
  isCurrent: boolean;
  isValidMove: boolean;
  isPassThrough: boolean; // eliminated but reachable as intermediate
  isEliminated: boolean;
  isNewlyEliminated: boolean;
  isSelectable: boolean;
  isInHistory: boolean;
  isLastStep: boolean;
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
  onClick,
}: CellProps) {
  let base =
    "relative flex items-center justify-center w-[72px] h-[72px] sm:w-[88px] sm:h-[88px] text-3xl sm:text-4xl font-bold select-none transition-all duration-200 border border-green-900/30";

  if (isCurrent) {
    base += " bg-green-500/15 text-green-400 border-green-400/80 cursor-default cell-current";
  } else if (isPassThrough) {
    // Can move here as intermediate (pass-through eliminated cell)
    base +=
      " bg-orange-500/5 text-orange-400/60 border border-dashed border-orange-500/30 cursor-pointer hover:bg-orange-500/10";
  } else if (isValidMove && !isLastStep) {
    // Normal valid intermediate move
    base +=
      " bg-amber-500/10 text-amber-300 border-amber-400/50 cursor-pointer hover:bg-amber-500/20 hover:border-amber-400 text-glow-amber";
  } else if (isValidMove && isLastStep) {
    // Last step - can stop here
    base +=
      " bg-amber-400/15 text-amber-300 border-2 border-amber-400 cursor-pointer hover:bg-amber-400/25 text-glow-amber";
  } else if (isNewlyEliminated) {
    base += " text-red-400/40 border-red-900/20 cell-newly-eliminated";
  } else if (isEliminated) {
    base += " text-red-500/25 border-red-900/15";
  } else if (isSelectable) {
    base +=
      " text-green-300 cursor-pointer hover:bg-green-500/10 hover:border-green-400/50 hover:text-green-400";
  } else if (isInHistory) {
    base += " text-green-700/60 border-green-900/30";
  } else {
    base += " text-green-400/35";
  }

  const canClick = isSelectable || isValidMove || isPassThrough;

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

      {/* Pulsing border on current cell */}
      {isCurrent && (
        <span className="absolute inset-0 border-2 border-green-400/70 animate-pulse pointer-events-none" />
      )}

      {/* Flash on newly eliminated */}
      {isNewlyEliminated && (
        <span className="absolute inset-0 bg-red-500/25 pointer-events-none cell-newly-eliminated" />
      )}

      {/* Dot indicator for last visited */}
      {isInHistory && !isCurrent && !isEliminated && (
        <span className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-green-800/60" />
      )}
    </div>
  );
}

export default function MagicGame() {
  const [gs, setGs] = useState<GameState>(INIT_STATE);
  const [showSecret, setShowSecret] = useState(false);
  const [locale, setLocale] = useState<Locale>("zh");

  const t = COPY[locale];

  const startGame = () => {
    setGs({ ...INIT_STATE, phase: "select" });
    setShowSecret(false);
  };

  const selectStart = (n: number) => {
    if (gs.phase !== "select") return;
    setGs({
      phase: "moving",
      position: n,
      startNum: n,
      round: 1,
      stepsLeft: n + 1,
      totalSteps: n + 1,
      eliminated: [],
      newlyEliminated: [],
      moveHistory: [n],
    });
  };

  const moveTo = (cell: number) => {
    if (gs.phase !== "moving") return;
    const valid = getValidMoves(gs.position, gs.stepsLeft, gs.eliminated);
    if (!valid.includes(cell)) return;

    const newStepsLeft = gs.stepsLeft - 1;
    const newHistory = [...gs.moveHistory, cell];

    if (newStepsLeft === 0) {
      const newlyElim = ROUND_ELIMINATIONS[gs.round] || [];
      const newEliminated = [...gs.eliminated, ...newlyElim];
      setGs({
        ...gs,
        position: cell,
        stepsLeft: 0,
        eliminated: newEliminated,
        newlyEliminated: newlyElim,
        moveHistory: newHistory,
        phase: gs.round === 3 ? "reveal" : "roundEnd",
      });
    } else {
      setGs({
        ...gs,
        position: cell,
        stepsLeft: newStepsLeft,
        moveHistory: newHistory,
        newlyEliminated: [],
      });
    }
  };

  const nextRound = () => {
    if (gs.phase !== "roundEnd") return;
    const round = gs.round + 1;
    const steps = round === 2 ? 2 : 3;
    setGs({
      ...gs,
      phase: "moving",
      round,
      stepsLeft: steps,
      totalSteps: steps,
      newlyEliminated: [],
    });
  };

  // Compute valid moves (with lookahead)
  const validMoves = gs.phase === "moving" ? getValidMoves(gs.position, gs.stepsLeft, gs.eliminated) : [];

  const isLastStep = gs.stepsLeft === 1;
  const stepsCompleted = gs.totalSteps - gs.stepsLeft;
  const progress = gs.totalSteps > 0 ? Math.round((stepsCompleted / gs.totalSteps) * 100) : 0;

  const renderGrid = (interactive: boolean) => (
    <div className="grid-container border border-green-800/40 w-fit">
      <div className="grid grid-cols-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
          const isCurrent = gs.position === n && gs.phase !== "select";
          const isElim = gs.eliminated.includes(n);
          const isNewElim = gs.newlyEliminated.includes(n);
          const isSelectable = gs.phase === "select";
          const isValid = interactive && validMoves.includes(n);
          const isPassThru = interactive && isValid && isElim;
          const isInHistory = !isCurrent && gs.moveHistory.includes(n) && !isElim;

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

  return (
    <div className="min-h-screen bg-[#080808] font-mono text-green-400 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Language toggle */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-20 flex border border-green-800/50 text-[10px] tracking-[0.2em]">
        <button
          type="button"
          onClick={() => setLocale("zh")}
          className={`px-3 py-1 transition-colors ${
            locale === "zh" ? "bg-green-500/20 text-green-300" : "text-green-700 hover:text-green-500"
          }`}
        >
          {t.langZh}
        </button>
        <button
          type="button"
          onClick={() => setLocale("en")}
          className={`px-3 py-1 transition-colors ${
            locale === "en" ? "bg-green-500/20 text-green-300" : "text-green-700 hover:text-green-500"
          }`}
        >
          {t.langEn}
        </button>
      </div>

      {/* Fixed corner labels */}
      <div className="fixed top-3 left-4 text-green-900/70 text-[10px] tracking-[0.3em] select-none uppercase">MAGIC.SYS</div>
      <div className="fixed top-3 right-4 text-green-900/70 text-[10px] tracking-[0.3em] select-none uppercase">v1.0</div>
      <div className="fixed bottom-3 left-4 text-green-900/70 text-[10px] tracking-[0.3em] select-none uppercase">
        {t.phaseLabels[gs.phase]}
      </div>
      <div className="fixed bottom-3 right-4 text-green-900/70 text-[10px] tracking-[0.3em] select-none uppercase">
        {gs.position ? `${t.pos}:${gs.position}` : `${t.pos}:--`}
      </div>

      {/* Main content card */}
      <div className="relative z-10 flex flex-col items-center gap-5 w-full max-w-[360px]">
        {gs.phase === "intro" && (
          <>
            <div className="text-center w-full">
              <p className="text-[10px] text-green-800 tracking-[0.5em] mb-4 uppercase">{t.systemReady}</p>
              <h1 className="text-5xl font-bold tracking-widest leading-[1.15] text-green-400 text-glow-green">
                {t.titleMain}
                <br />
                <span className="text-4xl tracking-[0.2em]">{t.titleSub}</span>
                <br />
                {t.titleThird}
              </h1>
              <div className="mt-3 text-[10px] text-green-800 tracking-[0.4em]">{t.divider}</div>
            </div>

            <div className="grid grid-cols-3 border border-green-900/40 w-fit opacity-60">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <div
                  key={n}
                  className={`w-10 h-10 flex items-center justify-center text-sm border border-green-900/20 ${
                    n === 6 ? "text-green-400 bg-green-500/10" : "text-green-800"
                  }`}
                >
                  {n}
                </div>
              ))}
            </div>

            <div className="w-full border border-green-900/40 p-4 space-y-1.5 text-sm text-green-700">
              <p className="text-[10px] text-green-800 tracking-widest mb-2">{t.ruleTitle}</p>
              {t.rules.map((rule) => (
                <p key={rule}>&gt;&nbsp;{rule}</p>
              ))}
              <p className="text-green-800 pt-1">&gt;&nbsp;{t.ruleQuestion}</p>
            </div>

            <button onClick={startGame} className="btn-retro w-full py-4 text-lg cursor-blink">
              {t.begin}
            </button>
          </>
        )}

        {gs.phase === "select" && (
          <>
            <div className="text-center w-full">
              <p className="text-[10px] text-green-800 tracking-[0.4em] mb-1 uppercase">{t.selectStep}</p>
              <h2 className="text-xl tracking-[0.2em] text-green-400">{t.selectTitle}</h2>
              <p className="text-xs text-green-700 mt-1">{t.selectHint}</p>
            </div>

            {renderGrid(false)}

            <p className="text-[11px] text-green-700 tracking-widest animate-pulse text-center">{t.tapHint}</p>
          </>
        )}

        {gs.phase === "moving" && (
          <>
            <div className="w-full space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-green-700 tracking-widest">{t.roundLabel(gs.round)}</span>
                <span
                  className={`text-sm font-bold tracking-widest ${
                    isLastStep ? "text-amber-300 text-glow-amber" : "text-amber-500"
                  }`}
                >
                  {t.stepsLeft(gs.stepsLeft)}
                </span>
              </div>

              <div className="w-full h-[2px] bg-green-900/40">
                <div className="h-[2px] bg-green-500 transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>

              {gs.round === 1 && <p className="text-[10px] text-green-800">{t.roundOneDesc(gs.startNum, gs.totalSteps)}</p>}
            </div>

            {renderGrid(true)}

            <div className="w-full space-y-2 text-[11px]">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span className="text-green-400">{t.legendCurrent}</span>
                <span className="text-amber-300">{t.legendValidMove}</span>
                {gs.eliminated.some((e) => validMoves.includes(e)) && (
                  <span className="text-orange-400/70">{t.legendPassThrough}</span>
                )}
                {gs.eliminated.length > 0 && <span className="text-red-500/50">{t.legendEliminated}</span>}
              </div>

              {isLastStep && gs.eliminated.length > 0 && (
                <div className="border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-amber-400/80">
                  {t.finalStepWarn(gs.eliminated)}
                </div>
              )}

              {!isLastStep && gs.eliminated.length > 0 && (
                <p className="text-green-800">{t.eliminatedCanPass(gs.eliminated)}</p>
              )}
            </div>
          </>
        )}

        {gs.phase === "roundEnd" && (
          <>
            <div className="w-full text-center border-y border-green-900/30 py-4 space-y-1">
              <p className="text-[10px] text-green-800 tracking-[0.4em]">{t.roundComplete(gs.round)}</p>
              <p className="text-sm text-green-600 tracking-widest">{t.eliminationEvent}</p>
              <div className="mt-2">
                <span className="text-2xl font-bold text-red-400 text-glow-red">[{gs.newlyEliminated.join(", ")}]</span>
                <span className="text-sm text-red-500/70 ml-2">{t.outLabel}</span>
              </div>
            </div>

            {renderGrid(false)}

            <div className="w-full border border-green-900/30 p-3 text-[11px] text-green-800 space-y-1">
              <p>{t.positionLabel(gs.position)}</p>
              <p>{t.allEliminatedLabel(gs.eliminated)}</p>
              {gs.round === 1 && <p className="text-amber-800/70 pt-1">{t.nextRound1}</p>}
              {gs.round === 2 && <p className="text-amber-800/70 pt-1">{t.nextRound2}</p>}
            </div>

            <button onClick={nextRound} className="btn-retro w-full py-4 text-base">
              {t.continueToRound(gs.round + 1)}
            </button>
          </>
        )}

        {gs.phase === "reveal" && (
          <>
            <div className="text-center space-y-3 reveal-in w-full">
              <p className="text-[10px] text-green-800 tracking-[0.5em] animate-pulse">{t.calculating}</p>

              <div className="text-[7rem] font-bold leading-none text-green-400 text-glow-reveal">6</div>

              <div className="space-y-1">
                <p className="text-lg tracking-[0.25em] text-green-400">{t.youAreOn}</p>
                <p className="text-xs text-green-700 tracking-widest">{t.startedArrived(gs.startNum)}</p>
              </div>

              <div className="border-t border-green-900/30 pt-3">
                <p className="text-base tracking-[0.2em] text-green-500">{t.magicComplete}</p>
              </div>
            </div>

            {renderGrid(false)}

            <button
              className="text-[11px] text-green-800 hover:text-green-600 tracking-widest transition-colors underline underline-offset-2 decoration-green-900"
              onClick={() => setShowSecret((s) => !s)}
            >
              {showSecret ? t.hideSecret : t.revealSecret}
            </button>

            {showSecret && (
              <div className="w-full border border-green-900/40 bg-green-950/20 p-4 text-[11px] text-green-700 space-y-2 reveal-in">
                <p className="text-green-600 tracking-widest">{t.mathTitle}</p>
                {t.mathLines.map((line) => (
                  <p key={line}>&gt;&nbsp;{line}</p>
                ))}
                <p className="text-green-800 pt-1">&gt;&nbsp;{t.alwaysHere}</p>
              </div>
            )}

            <button onClick={startGame} className="btn-retro w-full py-4 text-base">
              {t.playAgain}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
