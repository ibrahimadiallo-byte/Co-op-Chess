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
  gameStarted: boolean
  teamsReady: Record<TeamColor, boolean>
  firstMoveMade: boolean
}

const TEAM_CLOCK_SECONDS = 30 * 60
const DECIDER_CLOCK_SECONDS = 2 * 60

const INITIAL_MATCH_STATE: MatchState = {
  activeTeam: 'white',
  deciderSecondsLeft: DECIDER_CLOCK_SECONDS,
  result: null,
  gameStarted: false,
  teamsReady: { white: false, black: false },
  firstMoveMade: false,
  teams: {
    white: {
      color: 'white',
      name: 'Flushing',
      players: [
        { id: 'white-1', name: 'Greg' },
        { id: 'white-2', name: 'An' },
        { id: 'white-3', name: 'Stef' },
      ],
      deciderIndex: 0,
      lockedOutPlayerIds: [],
      teamSecondsLeft: TEAM_CLOCK_SECONDS,
    },
    black: {
      color: 'black',
      name: 'Jackson Heights',
      players: [
        { id: 'black-1', name: 'Dave' },
        { id: 'black-2', name: 'Afiya' },
        { id: 'black-3', name: 'JP' },
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
    if (match.result || game.isGameOver() || !match.gameStarted || !match.firstMoveMade) return

    const timer = window.setInterval(() => {
      setMatch((current) => tickMatchClocks(current))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [game, match.result, match.gameStarted, match.firstMoveMade])

  function handlePieceDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
    if (!match.gameStarted || match.result || game.isGameOver()) return false
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
    setMatch((current) => {
      const isFirstMove = !current.firstMoveMade
      const nextState = advanceTurnAfterMove(current, game)
      return isFirstMove ? { ...nextState, firstMoveMade: true } : nextState
    })
    return true
  }

  function reset() {
    game.reset()
    setPosition(game.fen())
    setMatch(cloneInitialMatchState())
  }

  function setTeamReady(teamColor: TeamColor) {
    setMatch((current) => {
      // Lock in ready state once game has started
      if (current.gameStarted) return current
      const newTeamsReady = { ...current.teamsReady, [teamColor]: !current.teamsReady[teamColor] }
      const bothReady = newTeamsReady.white && newTeamsReady.black
      return {
        ...current,
        teamsReady: newTeamsReady,
        gameStarted: bothReady,
      }
    })
  }

  function setTeamName(teamColor: TeamColor, name: string) {
    setMatch((current) => {
      if (current.gameStarted) return current
      return {
        ...current,
        teams: {
          ...current.teams,
          [teamColor]: {
            ...current.teams[teamColor],
            name: name.slice(0, 30),
          },
        },
      }
    })
  }

  function setPlayerName(teamColor: TeamColor, playerId: string, name: string) {
    setMatch((current) => {
      if (current.gameStarted) return current
      return {
        ...current,
        teams: {
          ...current.teams,
          [teamColor]: {
            ...current.teams[teamColor],
            players: current.teams[teamColor].players.map((p) =>
              p.id === playerId ? { ...p, name: name.slice(0, 25) } : p
            ),
          },
        },
      }
    })
  }

  const bothTeamsReady = match.teamsReady.white && match.teamsReady.black
  const waitingForFirstMove = match.gameStarted && !match.firstMoveMade

  return (
    <div className="min-h-screen bg-[var(--pursuit-stardust)] text-[var(--pursuit-carbon)]">
      <div className="mx-auto flex max-w-6xl gap-6 p-6">
        <aside className="w-72 shrink-0 rounded-2xl border border-[var(--pursuit-carbon)]/10 bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-headline text-lg font-semibold uppercase">Teams</h2>
          <div className="space-y-5">
            {TEAM_ORDER.map((teamColor) => (
              <TeamPanel
                key={teamColor}
                team={match.teams[teamColor]}
                isActive={match.activeTeam === teamColor && !match.result}
                isReady={match.teamsReady[teamColor]}
                onToggleReady={() => setTeamReady(teamColor)}
                gameStarted={match.gameStarted}
                onTeamNameChange={(name) => setTeamName(teamColor, name)}
                onPlayerNameChange={(playerId, name) => setPlayerName(teamColor, playerId, name)}
              />
            ))}
          </div>
        </aside>

        <main className="flex flex-1 flex-col items-center gap-4 relative">
          <header className="w-full">
            <h1 className="font-headline text-2xl font-semibold uppercase text-[var(--pursuit-purple)]">
              Co-op Chess
            </h1>
            <p className="font-subheadline text-sm text-[var(--pursuit-carbon)]/70">{describeStatus(game, match)}</p>
          </header>

          <section className="w-full max-w-[560px] rounded-xl border border-[var(--pursuit-carbon)]/10 bg-white p-4 text-sm shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-subheadline font-medium">{activeTeam.name} to move</p>
                <p className="text-[var(--pursuit-carbon)]/70">
                  Current decider:{' '}
                  <span className="font-medium text-[var(--pursuit-carbon)]">{activeDecider.name}</span>
                </p>
              </div>
              <div className="flex gap-4">
                <Clock label="Team" seconds={activeTeam.teamSecondsLeft} warning={!waitingForFirstMove && activeTeam.teamSecondsLeft <= 10} />
                <Clock
                  label={waitingForFirstMove ? 'Waiting' : 'Decider'}
                  seconds={match.deciderSecondsLeft}
                  waiting={waitingForFirstMove}
                  warning={!waitingForFirstMove && match.deciderSecondsLeft <= 10}
                />
              </div>
            </div>
          </section>

          <div className={`w-full max-w-[560px] relative ${!bothTeamsReady ? 'pointer-events-none' : ''}`}>
            <Chessboard
              options={{
                position,
                onPieceDrop: handlePieceDrop,
                animationDurationInMs: 200,
              }}
            />
            {!bothTeamsReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-lg">
                <div className="text-center">
                  <p className="font-subheadline text-lg font-semibold text-[var(--pursuit-carbon)]">Game Lobby</p>
                  <p className="mt-1 text-sm text-[var(--pursuit-carbon)]/70">Both teams must ready up</p>
                </div>
              </div>
            )}
            {waitingForFirstMove && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[2px] rounded-lg pointer-events-none">
                <div className="rounded-xl border border-[var(--pursuit-carbon)]/10 bg-white px-6 py-4 text-center shadow-lg">
                  <p className="font-subheadline text-lg font-semibold text-[var(--pursuit-purple)]">Game Started!</p>
                  <p className="mt-1 text-sm text-[var(--pursuit-carbon)]/80">Waiting for first move...</p>
                  <p className="mt-2 text-xs text-[var(--pursuit-carbon)]/60">Timers will start when White moves</p>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={reset}
            className="font-technical rounded-lg border border-[var(--pursuit-carbon)] bg-white px-4 py-2 text-sm font-medium hover:bg-[var(--pursuit-yellow)]"
          >
            Reset board
          </button>
        </main>
      </div>
    </div>
  )
}

const TEAM_ORDER: TeamColor[] = ['white', 'black']

function TeamPanel({
  team,
  isActive,
  isReady,
  onToggleReady,
  gameStarted,
  onTeamNameChange,
  onPlayerNameChange,
}: {
  team: TeamState
  isActive: boolean
  isReady: boolean
  onToggleReady: () => void
  gameStarted: boolean
  onTeamNameChange: (name: string) => void
  onPlayerNameChange: (playerId: string, name: string) => void
}) {
  const currentDecider = getCurrentDecider(team)

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          {!gameStarted ? (
            <input
              type="text"
              value={team.name}
              onChange={(e) => onTeamNameChange(e.target.value)}
              className="w-full border-b border-[var(--pursuit-carbon)]/25 bg-transparent font-subheadline font-semibold outline-none focus:border-[var(--pursuit-purple)]"
              maxLength={30}
            />
          ) : (
            <h3 className="font-semibold">{team.name}</h3>
          )}
          <p className="font-technical text-xs uppercase tracking-wide text-[var(--pursuit-carbon)]/65">
            {isActive ? 'On move' : 'Waiting'} · {formatClock(team.teamSecondsLeft)}
          </p>
        </div>
      </div>
      {!gameStarted && (
        <button
          type="button"
          onClick={onToggleReady}
          className={`mb-3 w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            isReady
              ? 'border border-[var(--pursuit-purple)] bg-[var(--pursuit-purple)] text-white hover:bg-[var(--pursuit-purple)]/90'
              : 'border border-[var(--pursuit-carbon)]/20 bg-[var(--pursuit-stardust)] text-[var(--pursuit-carbon)] hover:bg-[var(--pursuit-yellow)]'
          }`}
        >
          {isReady ? '✓ Ready' : 'Start Match'}
        </button>
      )}
      <ol className="space-y-2">
        {team.players.map((player, index) => {
          const isDecider = player.id === currentDecider.id
          const isLockedOut = team.lockedOutPlayerIds.includes(player.id)

          return (
            <li
              key={player.id}
              className={`rounded-lg border px-3 py-2 text-sm ${
                isActive && isDecider
                  ? 'border-[var(--pursuit-purple)] bg-[var(--pursuit-purple)] text-white'
                  : 'border-[var(--pursuit-carbon)]/10 bg-[var(--pursuit-stardust)] text-[var(--pursuit-carbon)]'
              } ${isLockedOut ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                {!gameStarted ? (
                  <input
                    type="text"
                    value={player.name}
                    onChange={(e) => onPlayerNameChange(player.id, e.target.value)}
                    className="w-full border-b border-[var(--pursuit-carbon)]/25 bg-transparent text-sm outline-none focus:border-[var(--pursuit-purple)]"
                    maxLength={25}
                  />
                ) : (
                  <span>
                    {index + 1}. {player.name}
                  </span>
                )}
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

function Clock({
  label,
  seconds,
  waiting,
  warning,
}: {
  label: string
  seconds: number
  waiting?: boolean
  warning?: boolean
}) {
  return (
    <div className="text-right">
      <p
        className={`font-technical text-xs uppercase tracking-wide ${
          waiting ? 'font-medium text-[var(--pursuit-purple)]' : 'text-[var(--pursuit-carbon)]/65'
        }`}
      >
        {label}
      </p>
      <p
        className={`font-technical text-lg font-semibold ${
          warning
            ? 'text-red-600'
            : waiting
              ? 'text-[var(--pursuit-purple)]'
              : 'text-[var(--pursuit-carbon)]'
        }`}
      >
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
    gameStarted: false,
    teamsReady: { white: false, black: false },
    firstMoveMade: false,
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
