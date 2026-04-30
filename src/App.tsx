import { useEffect, useMemo, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard, type PieceDropHandlerArgs } from 'react-chessboard'

type TeamColor = 'white' | 'black'

type Player = {
  id: string
  name: string
}

type TeamState = {
  color: TeamColor
  name: string
  players: Player[]
  deciderIndex: number
  lockedOutPlayerIds: string[]
  teamSecondsLeft: number
}

type MatchState = {
  activeTeam: TeamColor
  deciderSecondsLeft: number
  teams: Record<TeamColor, TeamState>
  result: string | null
}

const TEAM_CLOCK_SECONDS = 30 * 60
const DECIDER_CLOCK_SECONDS = 2 * 60

const INITIAL_MATCH_STATE: MatchState = {
  activeTeam: 'white',
  deciderSecondsLeft: DECIDER_CLOCK_SECONDS,
  result: null,
  teams: {
    white: {
      color: 'white',
      name: 'Pursuit White',
      players: [
        { id: 'white-1', name: 'White Player 1' },
        { id: 'white-2', name: 'White Player 2' },
        { id: 'white-3', name: 'White Player 3' },
      ],
      deciderIndex: 0,
      lockedOutPlayerIds: [],
      teamSecondsLeft: TEAM_CLOCK_SECONDS,
    },
    black: {
      color: 'black',
      name: 'Pursuit Black',
      players: [
        { id: 'black-1', name: 'Black Player 1' },
        { id: 'black-2', name: 'Black Player 2' },
        { id: 'black-3', name: 'Black Player 3' },
      ],
      deciderIndex: 0,
      lockedOutPlayerIds: [],
      teamSecondsLeft: TEAM_CLOCK_SECONDS,
    },
  },
}

function App() {
  const game = useMemo(() => new Chess(), [])
  const [position, setPosition] = useState(game.fen())
  const [match, setMatch] = useState<MatchState>(INITIAL_MATCH_STATE)
  const activeTeam = match.teams[match.activeTeam]
  const activeDecider = getCurrentDecider(activeTeam)

  useEffect(() => {
    if (match.result || game.isGameOver()) return

    const timer = window.setInterval(() => {
      setMatch((current) => tickMatchClocks(current))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [game, match.result])

  function handlePieceDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
    if (match.result || game.isGameOver()) return false
    if (!targetSquare) return false

    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      })
      if (!move) return false
    } catch {
      return false
    }

    setPosition(game.fen())
    setMatch((current) => advanceTurnAfterMove(current, game))
    return true
  }

  function reset() {
    game.reset()
    setPosition(game.fen())
    setMatch(cloneInitialMatchState())
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex max-w-6xl gap-6 p-6">
        <aside className="w-72 shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Teams</h2>
          <div className="space-y-5">
            {TEAM_ORDER.map((teamColor) => (
              <TeamPanel
                key={teamColor}
                team={match.teams[teamColor]}
                isActive={match.activeTeam === teamColor && !match.result}
              />
            ))}
          </div>
        </aside>

        <main className="flex flex-1 flex-col items-center gap-4">
          <header className="w-full">
            <h1 className="text-2xl font-semibold">Co-op Chess</h1>
            <p className="text-sm text-slate-500">{describeStatus(game, match)}</p>
          </header>

          <section className="w-full max-w-[560px] rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{activeTeam.name} to move</p>
                <p className="text-slate-500">
                  Current decider: <span className="font-medium text-slate-800">{activeDecider.name}</span>
                </p>
              </div>
              <div className="flex gap-4">
                <Clock label="Team" seconds={activeTeam.teamSecondsLeft} />
                <Clock label="Decider" seconds={match.deciderSecondsLeft} />
              </div>
            </div>
          </section>

          <div className="w-full max-w-[560px]">
            <Chessboard
              options={{
                position,
                onPieceDrop: handlePieceDrop,
                animationDurationInMs: 200,
              }}
            />
          </div>

          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100"
          >
            Reset board
          </button>
        </main>
      </div>
    </div>
  )
}

const TEAM_ORDER: TeamColor[] = ['white', 'black']

function TeamPanel({ team, isActive }: { team: TeamState; isActive: boolean }) {
  const currentDecider = getCurrentDecider(team)

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">{team.name}</h3>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {isActive ? 'On move' : 'Waiting'} · {formatClock(team.teamSecondsLeft)}
          </p>
        </div>
      </div>
      <ol className="space-y-2">
        {team.players.map((player, index) => {
          const isDecider = player.id === currentDecider.id
          const isLockedOut = team.lockedOutPlayerIds.includes(player.id)

          return (
            <li
              key={player.id}
              className={`rounded-lg border px-3 py-2 text-sm ${
                isActive && isDecider
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                  : 'border-slate-200 bg-slate-50 text-slate-700'
              } ${isLockedOut ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span>
                  {index + 1}. {player.name}
                </span>
                {isActive && isDecider ? <span className="text-xs font-medium">Decider</span> : null}
                {isActive && isLockedOut ? <span className="text-xs font-medium">Skipped</span> : null}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function Clock({ label, seconds }: { label: string; seconds: number }) {
  return (
    <div className="text-right">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`font-mono text-lg font-semibold ${seconds <= 10 ? 'text-red-600' : 'text-slate-900'}`}>
        {formatClock(seconds)}
      </p>
    </div>
  )
}

function tickMatchClocks(match: MatchState): MatchState {
  if (match.result) return match

  const activeTeam = match.teams[match.activeTeam]
  const nextTeamSecondsLeft = Math.max(activeTeam.teamSecondsLeft - 1, 0)

  if (nextTeamSecondsLeft === 0) {
    const winner = match.activeTeam === 'white' ? 'Black' : 'White'
    return {
      ...match,
      result: `${winner} wins on time`,
      teams: {
        ...match.teams,
        [match.activeTeam]: {
          ...activeTeam,
          teamSecondsLeft: 0,
        },
      },
    }
  }

  const nextDeciderSecondsLeft = match.deciderSecondsLeft - 1
  const teamWithTickedClock = {
    ...activeTeam,
    teamSecondsLeft: nextTeamSecondsLeft,
  }

  if (nextDeciderSecondsLeft > 0) {
    return {
      ...match,
      deciderSecondsLeft: nextDeciderSecondsLeft,
      teams: {
        ...match.teams,
        [match.activeTeam]: teamWithTickedClock,
      },
    }
  }

  return passSeatToNextDecider({
    ...match,
    deciderSecondsLeft: DECIDER_CLOCK_SECONDS,
    teams: {
      ...match.teams,
      [match.activeTeam]: teamWithTickedClock,
    },
  })
}

function passSeatToNextDecider(match: MatchState): MatchState {
  const team = match.teams[match.activeTeam]
  const skippedPlayer = getCurrentDecider(team)
  const nextDeciderIndex = getNextPlayerIndex(team)
  const nextLockedOutPlayerIds = [...team.lockedOutPlayerIds, skippedPlayer.id]
  const hasFullTeamSkipped = nextLockedOutPlayerIds.length >= team.players.length

  return {
    ...match,
    teams: {
      ...match.teams,
      [match.activeTeam]: {
        ...team,
        deciderIndex: nextDeciderIndex,
        lockedOutPlayerIds: hasFullTeamSkipped ? [] : nextLockedOutPlayerIds,
      },
    },
  }
}

function advanceTurnAfterMove(match: MatchState, game: Chess): MatchState {
  const movingTeam = match.teams[match.activeTeam]
  const nextActiveTeam = game.turn() === 'w' ? 'white' : 'black'

  return {
    ...match,
    activeTeam: nextActiveTeam,
    deciderSecondsLeft: DECIDER_CLOCK_SECONDS,
    result: describeGameResult(game),
    teams: {
      ...match.teams,
      [match.activeTeam]: {
        ...movingTeam,
        deciderIndex: getNextPlayerIndex(movingTeam),
        lockedOutPlayerIds: [],
      },
      [nextActiveTeam]: {
        ...match.teams[nextActiveTeam],
        lockedOutPlayerIds: [],
      },
    },
  }
}

function getNextPlayerIndex(team: TeamState): number {
  return (team.deciderIndex + 1) % team.players.length
}

function getCurrentDecider(team: TeamState): Player {
  return team.players[team.deciderIndex]
}

function describeStatus(game: Chess, match: MatchState): string {
  if (match.result) return match.result
  if (game.isCheckmate()) return `Checkmate — ${game.turn() === 'w' ? 'Black' : 'White'} wins`
  if (game.isStalemate()) return 'Stalemate'
  if (game.isDraw()) return 'Draw'
  const side = game.turn() === 'w' ? 'White' : 'Black'
  return game.inCheck() ? `${side} to move (in check)` : `${side} to move`
}

function describeGameResult(game: Chess): string | null {
  if (game.isCheckmate()) return `Checkmate — ${game.turn() === 'w' ? 'Black' : 'White'} wins`
  if (game.isStalemate()) return 'Stalemate'
  if (game.isDraw()) return 'Draw'
  return null
}

function formatClock(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

function cloneInitialMatchState(): MatchState {
  return {
    ...INITIAL_MATCH_STATE,
    teams: {
      white: {
        ...INITIAL_MATCH_STATE.teams.white,
        players: [...INITIAL_MATCH_STATE.teams.white.players],
        lockedOutPlayerIds: [],
      },
      black: {
        ...INITIAL_MATCH_STATE.teams.black,
        players: [...INITIAL_MATCH_STATE.teams.black.players],
        lockedOutPlayerIds: [],
      },
    },
  }
}

export default App
