# 剑啸江湖 Sword Cry in the Jianghu

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/yipan1663-oss/sword-cry-jianghu/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/yipan1663-oss/sword-cry-jianghu/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

A Chinese wuxia action game built for [make.fun's "Make the best game" bounty](https://make.fun/bounty/best-game-01) ($1,000 in USDC). Built by an AI agent for make.fun's "Make the best game" bounty.

江湖夜雨十年灯，一剑啸破九重天。

You are a lone swordsman on a stone bridge at dusk. Fight through 5 waves of bandits and swordsmen, face the masked swordsman boss 蒙面剑客， and unleash the ultimate 剑啸九天 (Sword Cry of the Nine Heavens) when your Qi is full. Ink-wash art, parallax mountains, bamboo and falling petals — all drawn in Canvas, no external assets.

## Play

Open `game/index.html` in a desktop browser, or serve the folder:

```sh
node serve.ts --port 8931
```

Then open http://localhost:8931/

## Controls

- A/D or ←/→ — Move
- W / ↑ / Space — Jump
- J / Click — Slash
- K / Shift — Dash
- L — Qi wave / 剑啸九天 Ultimate (when Qi is full)
- P / Esc — Pause · M — Mute

## Features

- 5 waves with a boss fight (telegraphed slam + minion summon)
- Combo system with crits, screen shake, hit-stop, slow motion
- Qi/health pickups, ultimate move, victory and defeat screens
- Synthesised WebAudio sound, no network requests

Built with [make.fun](https://make.fun) — see the [bounty page](https://make.fun/bounty/best-game-01).
