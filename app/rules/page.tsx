import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "规则介绍 | Magic Nine Square",
  description: "命运九宫规则介绍：移动、淘汰、挑战扰动与奖励结算。",
};

const basicRules = [
  "棋盘为 1~9 的九宫格，每次只能移动到上下左右相邻格。",
  "游戏共 3 轮，每轮有固定步数，必须走满该轮步数。",
  "被淘汰数字在“最后一步”不能作为落点，但中间步可以穿过。",
];

const rounds = [
  "第 1 轮：步数 = 起始数字 + 1。",
  "第 2 轮：固定 2 步。",
  "第 3 轮：经典固定 3 步；挑战模式可能被扰动为 2/3/4 步。",
];

const modes = [
  "经典模式：目标是终局落在 6，成功后有额外奖励。",
  "挑战模式：目标是终局避开 6，成功奖励更高，并受倒计时影响。",
];

const modifiers = [
  "传送门（Warp）：落在指定格会立即传送到另一格。",
  "封锁（Lock）：第 2 或第 3 轮中，某一格不能作为停留点。",
  "变速（Flip）：第 3 轮总步数被改写。",
];

const rewards = [
  "经典：完成基础 +8；若终点为 6 额外 +4。",
  "挑战：避开 6 基础 +30；命中 6 则该局为 0。",
  "挑战额外：剩余时间越多、连胜越高，加成越高。",
];

export default function RulesPage() {
  return (
    <main className="min-h-screen bg-[#070b08] text-green-300 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2 border border-green-900/50 bg-black/25 p-5">
          <p className="text-[11px] tracking-[0.24em] text-green-700 uppercase">Magic Nine Square</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-[0.16em] text-glow-green">规则介绍</h1>
          <p className="text-sm text-green-600">先看规则，再开局会更稳。</p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          <article className="border border-green-900/40 bg-black/20 p-4">
            <h2 className="text-sm tracking-[0.16em] text-green-400 uppercase">游戏目标</h2>
            <ul className="mt-3 space-y-1.5 text-sm text-green-200/90 leading-6">
              {modes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="border border-green-900/40 bg-black/20 p-4">
            <h2 className="text-sm tracking-[0.16em] text-green-400 uppercase">基础规则</h2>
            <ul className="mt-3 space-y-1.5 text-sm text-green-200/90 leading-6">
              {basicRules.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </section>

        <section className="border border-green-900/40 bg-black/20 p-5">
          <h2 className="text-sm tracking-[0.16em] text-green-400 uppercase">轮次与步数</h2>
          <ul className="mt-3 space-y-2 text-sm text-green-200/90 leading-6">
            {rounds.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <article className="border border-cyan-900/40 bg-cyan-950/10 p-4">
            <h2 className="text-sm tracking-[0.16em] text-cyan-300 uppercase">挑战扰动</h2>
            <ul className="mt-3 space-y-1.5 text-sm text-cyan-200/90 leading-6">
              {modifiers.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="border border-amber-900/40 bg-amber-950/10 p-4">
            <h2 className="text-sm tracking-[0.16em] text-amber-300 uppercase">金币结算</h2>
            <ul className="mt-3 space-y-1.5 text-sm text-amber-100/90 leading-6">
              {rewards.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </section>

        <section className="border border-green-900/40 bg-black/20 p-5 text-sm text-green-200/90 leading-7">
          <h2 className="text-sm tracking-[0.16em] text-green-400 uppercase">策略建议</h2>
          <p className="mt-3">
            第 1 轮优先观察后续可达路径，尽量避免把自己逼到“最后一步只能踩淘汰格”的死路。挑战模式里，先记住扰动信息，再决定
            每轮终点位置，能显著提高避开 6 的成功率。
          </p>
        </section>

        <div>
          <Link href="/" className="btn-retro block text-center py-3 px-4 w-full">
            返回游戏
          </Link>
        </div>
      </div>
    </main>
  );
}
