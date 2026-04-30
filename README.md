First check Claude.md for coding principles and best practices to apply. Below is a description of this project.

# Co-op Chess

Team-vs-team cooperative chess. Two teams play one board. Each team works together to choose every move — but the individual whose turn it is on the active team has the final say. Turns are timed, so collaboration happens under pressure.

Built for **Pursuit** cohorts to play each other (one cohort vs. another) as a low-stakes, high-energy way to build community across a training program. Mixes seasoned chess players with people who've never moved a pawn.

## How it plays

1. Two teams sit down (3v3, 10v10, 30v30, up to 1000v1000 — the architecture doesn't care).
2. Each team has a fixed player order. Players take turns in rotation.
3. When it's a team's turn:
   - The whole team can discuss, suggest moves, and chime in.
   - Only the **current player** on that team can actually commit the move.
   - A countdown timer enforces the turn — discussion has to land on a decision.
4. The next player on that team rotates into the "decider" seat next time the team's turn comes around.
5. Standard chess rules from there.

The goal is the **conversation**, not the chess. Beginners get coached in real time; experienced players have to explain their thinking; everyone is invested in the outcome.

## Timer model

Two clocks run at once:

- **Team clock — 30:00 per team, total.** Standard chess-clock semantics: a team's clock counts down only while it's their turn to move (i.e., from the moment the opposing team commits a move until this team commits theirs). Hits zero → team loses on time.
- **Decider clock — 2:00 per individual, per move.** While the team clock is ticking, the current decider has up to 2 minutes to commit a move. **The team clock keeps ticking the whole time, regardless of decider handoffs.**

When the decider clock hits zero:

1. The seat passes to the **next teammate in the rotation order**, with a fresh 2:00 decider clock.
2. The previous decider **loses the ability to decide on this move** — but stays in their rotation slot for future moves. Order is fixed at game start and never changes.
3. The team clock does not pause; it keeps draining.
4. If everyone on the team cycles through and still no move, the rotation wraps back to the top of the list with another fresh 2:00 each. Eventually either someone moves, or the team's 30:00 hits zero and the team loses on time.

When a move is committed, the rotation pointer for that team advances to **the teammate after whoever actually committed the move** (not after whoever was *originally* up). Then it's the opponent's turn — their team clock starts, their first decider gets a fresh 2:00.

## MVP scope

| In | Out (for now) |
| --- | --- |
| Working chess board (legal moves, check, checkmate, stalemate) | Player identity validation (anyone at the keyboard can submit the active player's move) |
| Left-column team list with player order, current decider highlighted | Accounts, login, persistent profiles |
| Turn lock to the active team's current player | Spectator mode for non-participants |
| Per-turn countdown timer | Voting / consensus mechanics within a team |
| Configurable team size — 3v3 / 10v10 / 30v30 (data model handles arbitrary sizes) | Match history, ELO, leaderboards |
| Single live match | Multiple concurrent matches |

## Stack

MVP runs on **one laptop, in one browser**. Players physically gather around the screen and hand off the keyboard when their turn comes up. No server, no networking, no accounts — that all comes later.

- **Frontend**: React + Vite + TypeScript
- **Styling**: Tailwind. Drop in [shadcn/ui](https://ui.shadcn.com/) components when we want polished primitives (dialogs, popovers, toggles) — optional, not required up front.
- **Chess rules**: [`chess.js`](https://github.com/jhlywa/chess.js) — handles every legal-move case (castling, en passant, promotion, threefold repetition, 50-move, checkmate/stalemate). Don't reinvent any of this.
- **Board UI**: [`react-chessboard`](https://github.com/Clariity/react-chessboard) — drag-and-drop board that pairs cleanly with `chess.js`.
- **State**: plain React state (`useReducer` for the game, `useState` for UI). Reach for Zustand only if prop drilling gets ugly. The match lives entirely in memory; refreshing the page resets the game. Fine for MVP.

That's the whole stack. No backend until we need one. Future work (Google OAuth, multi-device matches, persistence) gets layered on later — keep the data model clean enough that adding a server is a small change, not a rewrite.

## Getting started

You need **Node 20+** (the repo pins it via `.nvmrc`). If you use [nvm](https://github.com/nvm-sh/nvm), `nvm use` picks it up.

```bash
git clone https://github.com/ibrahimadiallo-byte/Co-op-Chess.git coop-chess
cd coop-chess
npm install
npm run dev
```

Open the printed localhost URL (default: <http://localhost:5173>). You should see a chess board with starting position, a placeholder team sidebar on the left, and a "Reset board" button. Drag a piece to test — moves are validated by `chess.js`, and the status line under the title shows whose turn it is.

If `npm run dev` errors out, the most common causes are wrong Node version (`node --version` should print `v20.x.x` or higher) and a stale `node_modules` (delete the folder and re-run `npm install`).

### Other commands

```bash
npm run build      # type-check and produce a production bundle in dist/
npm run preview    # serve the production bundle locally
npm run lint       # run ESLint
```

## Workstreams

Independent pieces — claim one in the team chat before starting:

| # | Workstream | What it covers |
| --- | --- | --- |
| A | **Board & rules** | Skeleton wired in `src/App.tsx` (board renders, drag-to-move, check/mate/draw status). Remaining: promotion piece picker (currently auto-queens), better end-of-game banner, move history. |
| B | **Team roster & rotation** | Left-column sidebar: two teams, player order (fixed at game start, never reorders), highlight the current decider, dim the rest. Owns the rotation logic per the [Timer model](#timer-model): on a committed move, advance pointer to the teammate after whoever actually committed it (not after whoever was originally up). On a within-move skip (decider clock expired), pass the seat to the next teammate and visibly mark the skipped teammate as locked-out *for this move only* — they're back in rotation next time their slot comes around. |
| C | **Turn timers** | Two clocks: 30:00 team total (counts down only while it's that team's turn), and 2:00 per-decider (resets when a teammate takes the seat). Visual urgency states (last 10 s, last 3 s) on both. Decider-expiry: hand off to next teammate with fresh 2:00, team clock keeps draining. Team-expiry: team loses on time. Configurable seconds-per-team and seconds-per-decider via Workstream D's setup screen. |
| D | **Game setup screen** | Pre-game form: team names, player lists, team size, seconds-per-turn, who plays white. |
| E | **End-of-game flow** | Checkmate / stalemate / draw / resignation banners; "play again" / "swap colors" controls. |
| F | **Layout & polish** | Overall page layout, responsive behavior, hand-off-the-keyboard prompts between turns. |

Workstreams B, C, D can be picked up immediately and run in parallel against the existing `App.tsx`. A is mostly done; E and F come once the others are wired together.

### Project layout

```
coop-chess/
├── src/
│   ├── App.tsx        # Top-level component — currently renders the board + sidebar shell
│   ├── main.tsx       # React entry point
│   └── index.css      # Tailwind import + base styles
├── index.html
├── vite.config.ts     # Vite + Tailwind plugin
├── tsconfig.*.json
├── package.json
└── .nvmrc             # Node version pin
```

## Open design questions

Resolve before someone codes the relevant workstream — flagged so they don't get baked in by accident.

- ~~**Timer expiry behavior**~~ — **resolved.** See [Timer model](#timer-model). Two clocks: 30:00 team (loss on zero), 2:00 per-decider (hand off to next teammate, keep team clock draining).
- ~~**Decider rotation rule**~~ — **resolved.** Rotation order is fixed at game start and never changes. A skipped teammate (their 2:00 expired) is locked out only for the current move — they're back in the seat next time their slot comes around.
- **Reset / undo** — is there a "take back" affordance, or are committed moves final? Default assumption: final, no undo, to preserve the pressure.
- **Promotion choice** — who picks the promoted piece, the decider or the whole team? Default assumption: the decider, like every other move.

## Status

Hackathon project. Day 0. Goal is a playable 3v3 demo by end of hackathon, with the architecture proven out for larger team sizes.

## Origin

Built during a Pursuit hackathon to give cohorts a playful, recurring way to interact across program boundaries.
