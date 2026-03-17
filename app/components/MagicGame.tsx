'use client';

import { useState } from 'react';

// ─── Grid Layout ───────────────────────────────────────────────────────────────
//   1 │ 2 │ 3
//   ──┼───┼──
//   4 │ 5 │ 6
//   ──┼───┼──
//   7 │ 8 │ 9
// ──────────────────────────────────────────────────────────────────────────────

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

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'intro' | 'select' | 'moving' | 'roundEnd' | 'reveal';

interface GameState {
  phase: Phase;
  position: number;     // current cell 1-9, 0 = not started
  startNum: number;     // the number chosen initially
  round: number;        // 1 | 2 | 3
  stepsLeft: number;    // steps remaining in current round
  totalSteps: number;   // total steps for current round (for progress bar)
  eliminated: number[];      // cumulative eliminated numbers
  newlyEliminated: number[]; // just eliminated this round (for flash animation)
  moveHistory: number[];     // path taken (for trail)
}

const INIT_STATE: GameState = {
  phase: 'intro',
  position: 0,
  startNum: 0,
  round: 0,
  stepsLeft: 0,
  totalSteps: 0,
  eliminated: [],
  newlyEliminated: [],
  moveHistory: [],
};

// ─── Cell Component ───────────────────────────────────────────────────────────

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
    'relative flex items-center justify-center w-[72px] h-[72px] sm:w-[88px] sm:h-[88px] text-3xl sm:text-4xl font-bold select-none transition-all duration-200 border border-green-900/30';

  if (isCurrent) {
    base +=
      ' bg-green-500/15 text-green-400 border-green-400/80 cursor-default cell-current';
  } else if (isPassThrough) {
    // Can move here as intermediate (pass-through eliminated cell)
    base +=
      ' bg-orange-500/5 text-orange-400/60 border border-dashed border-orange-500/30 cursor-pointer hover:bg-orange-500/10';
  } else if (isValidMove && !isLastStep) {
    // Normal valid intermediate move
    base +=
      ' bg-amber-500/10 text-amber-300 border-amber-400/50 cursor-pointer hover:bg-amber-500/20 hover:border-amber-400 text-glow-amber';
  } else if (isValidMove && isLastStep) {
    // Last step — can stop here
    base +=
      ' bg-amber-400/15 text-amber-300 border-2 border-amber-400 cursor-pointer hover:bg-amber-400/25 text-glow-amber';
  } else if (isNewlyEliminated) {
    base += ' text-red-400/40 border-red-900/20 cell-newly-eliminated';
  } else if (isEliminated) {
    base += ' text-red-500/25 border-red-900/15';
  } else if (isSelectable) {
    base +=
      ' text-green-300 cursor-pointer hover:bg-green-500/10 hover:border-green-400/50 hover:text-green-400';
  } else if (isInHistory) {
    base += ' text-green-700/60 border-green-900/30';
  } else {
    base += ' text-green-400/35';
  }

  const canClick =
    isSelectable || isValidMove || isPassThrough;

  return (
    <div
      className={base}
      onClick={canClick ? onClick : undefined}
      tabIndex={canClick ? 0 : undefined}
      onKeyDown={
        canClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') onClick();
            }
          : undefined
      }
    >
      <span className={isEliminated ? 'line-through decoration-red-500/50 decoration-2' : ''}>
        {num}
      </span>

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

// ─── Main Component ────────────────────────────────────────────────────────────

export default function MagicGame() {
  const [gs, setGs] = useState<GameState>(INIT_STATE);
  const [showSecret, setShowSecret] = useState(false);

  const startGame = () => {
    setGs({ ...INIT_STATE, phase: 'select' });
    setShowSecret(false);
  };

  const selectStart = (n: number) => {
    if (gs.phase !== 'select') return;
    setGs({
      phase: 'moving',
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
    if (gs.phase !== 'moving') return;
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
        phase: gs.round === 3 ? 'reveal' : 'roundEnd',
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
    if (gs.phase !== 'roundEnd') return;
    const round = gs.round + 1;
    const steps = round === 2 ? 2 : 3;
    setGs({
      ...gs,
      phase: 'moving',
      round,
      stepsLeft: steps,
      totalSteps: steps,
      newlyEliminated: [],
    });
  };

  // Compute valid moves (with lookahead)
  const validMoves =
    gs.phase === 'moving'
      ? getValidMoves(gs.position, gs.stepsLeft, gs.eliminated)
      : [];

  const isLastStep = gs.stepsLeft === 1;
  const stepsCompleted = gs.totalSteps - gs.stepsLeft;
  const progress = gs.totalSteps > 0 ? Math.round((stepsCompleted / gs.totalSteps) * 100) : 0;

  // Grid renderer
  const renderGrid = (interactive: boolean) => (
    <div className="grid-container border border-green-800/40 w-fit">
      <div className="grid grid-cols-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
          const isCurrent = gs.position === n && gs.phase !== 'select';
          const isElim = gs.eliminated.includes(n);
          const isNewElim = gs.newlyEliminated.includes(n);
          const isSelectable = gs.phase === 'select';
          const isValid = interactive && validMoves.includes(n);
          const isPassThru = interactive && isValid && isElim;
          const isInHistory =
            !isCurrent && gs.moveHistory.includes(n) && !isElim;

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

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#080808] font-mono text-green-400 flex flex-col items-center justify-center p-4 relative overflow-hidden">

      {/* Fixed corner labels */}
      <div className="fixed top-3 left-4 text-green-900/70 text-[10px] tracking-[0.3em] select-none uppercase">
        MAGIC.SYS
      </div>
      <div className="fixed top-3 right-4 text-green-900/70 text-[10px] tracking-[0.3em] select-none uppercase">
        v1.0
      </div>
      <div className="fixed bottom-3 left-4 text-green-900/70 text-[10px] tracking-[0.3em] select-none uppercase">
        {gs.phase}
      </div>
      <div className="fixed bottom-3 right-4 text-green-900/70 text-[10px] tracking-[0.3em] select-none uppercase">
        {gs.position ? `POS:${gs.position}` : 'POS:--'}
      </div>

      {/* Main content card */}
      <div className="relative z-10 flex flex-col items-center gap-5 w-full max-w-[360px]">

        {/* ══════════════════════════════════════════════════════════════════════
            INTRO PHASE
        ══════════════════════════════════════════════════════════════════════ */}
        {gs.phase === 'intro' && (
          <>
            <div className="text-center w-full">
              <p className="text-[10px] text-green-800 tracking-[0.5em] mb-4 uppercase">
                ── SYSTEM READY ──
              </p>
              <h1
                className="text-5xl font-bold tracking-widest leading-[1.15] text-green-400 text-glow-green"
              >
                MAGIC<br />
                <span className="text-4xl tracking-[0.2em]">NINE</span><br />
                SQUARE
              </h1>
              <div className="mt-3 text-[10px] text-green-800 tracking-[0.4em]">
                ────────────────────
              </div>
            </div>

            {/* Mini demo grid */}
            <div className="grid grid-cols-3 border border-green-900/40 w-fit opacity-60">
              {[1,2,3,4,5,6,7,8,9].map((n) => (
                <div
                  key={n}
                  className={`w-10 h-10 flex items-center justify-center text-sm border border-green-900/20 ${
                    n === 6 ? 'text-green-400 bg-green-500/10' : 'text-green-800'
                  }`}
                >
                  {n}
                </div>
              ))}
            </div>

            <div className="w-full border border-green-900/40 p-4 space-y-1.5 text-sm text-green-700">
              <p className="text-[10px] text-green-800 tracking-widest mb-2">{'// RULES //'}</p>
              <p>&gt;&nbsp;PICK ANY STARTING CELL [1-9]</p>
              <p>&gt;&nbsp;ROUND 1: WALK N+1 STEPS</p>
              <p>&gt;&nbsp;ROUND 2: WALK 2 MORE STEPS</p>
              <p>&gt;&nbsp;ROUND 3: WALK 3 MORE STEPS</p>
              <p>&gt;&nbsp;NUMBERS GET ELIMINATED EACH ROUND</p>
              <p className="text-green-800 pt-1">&gt;&nbsp;WHERE WILL YOU END UP?</p>
            </div>

            <button
              onClick={startGame}
              className="btn-retro w-full py-4 text-lg cursor-blink"
            >
              [ BEGIN ]
            </button>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            SELECT PHASE
        ══════════════════════════════════════════════════════════════════════ */}
        {gs.phase === 'select' && (
          <>
            <div className="text-center w-full">
              <p className="text-[10px] text-green-800 tracking-[0.4em] mb-1 uppercase">
                STEP 01 / 03
              </p>
              <h2 className="text-xl tracking-[0.2em] text-green-400">
                SELECT YOUR NUMBER
              </h2>
              <p className="text-xs text-green-700 mt-1">
                THINK OF ANY CELL AS YOUR START
              </p>
            </div>

            {renderGrid(false)}

            <p className="text-[11px] text-green-700 tracking-widest animate-pulse text-center">
              ▼&nbsp;TAP ANY CELL TO BEGIN&nbsp;▼
            </p>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            MOVING PHASE
        ══════════════════════════════════════════════════════════════════════ */}
        {gs.phase === 'moving' && (
          <>
            {/* Status header */}
            <div className="w-full space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-green-700 tracking-widest">
                  ROUND {gs.round} / 3
                </span>
                <span
                  className={`text-sm font-bold tracking-widest ${
                    isLastStep ? 'text-amber-300 text-glow-amber' : 'text-amber-500'
                  }`}
                >
                  {gs.stepsLeft}&nbsp;{gs.stepsLeft === 1 ? 'STEP' : 'STEPS'}&nbsp;LEFT
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-[2px] bg-green-900/40">
                <div
                  className="h-[2px] bg-green-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Round description */}
              {gs.round === 1 && (
                <p className="text-[10px] text-green-800">
                  STARTED AT [{gs.startNum}] — TOTAL STEPS: {gs.totalSteps} ({gs.startNum}+1)
                </p>
              )}
            </div>

            {renderGrid(true)}

            {/* Legend + hints */}
            <div className="w-full space-y-2 text-[11px]">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span className="text-green-400">■ CURRENT</span>
                <span className="text-amber-300">■ VALID MOVE</span>
                {gs.eliminated.some((e) => validMoves.includes(e)) && (
                  <span className="text-orange-400/70">■ PASS-THROUGH</span>
                )}
                {gs.eliminated.length > 0 && (
                  <span className="text-red-500/50">■ ELIMINATED</span>
                )}
              </div>

              {isLastStep && gs.eliminated.length > 0 && (
                <div className="border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-amber-400/80">
                  ⚠ FINAL STEP — CANNOT STOP ON [{gs.eliminated.join(', ')}]
                </div>
              )}

              {!isLastStep && gs.eliminated.length > 0 && (
                <p className="text-green-800">
                  ELIMINATED: [{gs.eliminated.join(', ')}] — CAN PASS THROUGH
                </p>
              )}
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            ROUND END PHASE
        ══════════════════════════════════════════════════════════════════════ */}
        {gs.phase === 'roundEnd' && (
          <>
            <div className="w-full text-center border-y border-green-900/30 py-4 space-y-1">
              <p className="text-[10px] text-green-800 tracking-[0.4em]">
                ROUND {gs.round} COMPLETE
              </p>
              <p className="text-sm text-green-600 tracking-widest">
                ELIMINATION EVENT
              </p>
              <div className="mt-2">
                <span
                  className="text-2xl font-bold text-red-400 text-glow-red"
                >
                  [{gs.newlyEliminated.join(', ')}]
                </span>
                <span className="text-sm text-red-500/70 ml-2">
                  {gs.newlyEliminated.length > 1 ? 'ARE' : 'IS'} OUT
                </span>
              </div>
            </div>

            {renderGrid(false)}

            <div className="w-full border border-green-900/30 p-3 text-[11px] text-green-800 space-y-1">
              <p>POSITION: [{gs.position}]</p>
              <p>ALL ELIMINATED: [{gs.eliminated.join(', ')}]</p>
              {gs.round === 1 && (
                <p className="text-amber-800/70 pt-1">
                  NEXT: CANNOT STOP ON [2]
                </p>
              )}
              {gs.round === 2 && (
                <p className="text-amber-800/70 pt-1">
                  NEXT: CANNOT STOP ON [2, 4, 8]
                </p>
              )}
            </div>

            <button
              onClick={nextRound}
              className="btn-retro w-full py-4 text-base"
            >
              [ CONTINUE → ROUND {gs.round + 1} ]
            </button>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            REVEAL PHASE
        ══════════════════════════════════════════════════════════════════════ */}
        {gs.phase === 'reveal' && (
          <>
            <div className="text-center space-y-3 reveal-in w-full">
              <p className="text-[10px] text-green-800 tracking-[0.5em] animate-pulse">
                ── CALCULATING ──
              </p>

              {/* The big 6 */}
              <div className="text-[7rem] font-bold leading-none text-green-400 text-glow-reveal">
                6
              </div>

              <div className="space-y-1">
                <p className="text-lg tracking-[0.25em] text-green-400">
                  YOU ARE ON
                </p>
                <p className="text-xs text-green-700 tracking-widest">
                  STARTED AT [{gs.startNum}] — ARRIVED AT [6]
                </p>
              </div>

              <div className="border-t border-green-900/30 pt-3">
                <p className="text-base tracking-[0.2em] text-green-500">
                  MAGIC COMPLETE
                </p>
              </div>
            </div>

            {renderGrid(false)}

            {/* Secret explanation toggle */}
            <button
              className="text-[11px] text-green-800 hover:text-green-600 tracking-widest transition-colors underline underline-offset-2 decoration-green-900"
              onClick={() => setShowSecret((s) => !s)}
            >
              {showSecret ? '[ HIDE SECRET ]' : '[ REVEAL THE SECRET ]'}
            </button>

            {showSecret && (
              <div className="w-full border border-green-900/40 bg-green-950/20 p-4 text-[11px] text-green-700 space-y-2 reveal-in">
                <p className="text-green-600 tracking-widest">{'// THE MATHEMATICS'}</p>
                <p>&gt;&nbsp;ROUND 1: n + (n+1) STEPS FROM CELL n</p>
                <p>&gt;&nbsp;PARITY FORCES YOU ONTO AN ODD CELL</p>
                <p>&gt;&nbsp;ODD CELLS: 1, 3, 5, 7, 9</p>
                <p>&gt;&nbsp;FROM ANY ODD CELL, 2 MORE STEPS → ODD</p>
                <p>&gt;&nbsp;ELIMINATING 2, 4, 8 LEAVES ONLY 6</p>
                <p>&gt;&nbsp;FROM ANY ODD CELL, 3 STEPS → ONLY 6</p>
                <p className="text-green-800 pt-1">
                  &gt;&nbsp;EVERY PATH LEADS HERE. ALWAYS.
                </p>
              </div>
            )}

            <button
              onClick={startGame}
              className="btn-retro w-full py-4 text-base"
            >
              [ PLAY AGAIN ]
            </button>
          </>
        )}
      </div>
    </div>
  );
}
