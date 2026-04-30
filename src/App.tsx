import { useMemo, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard, type PieceDropHandlerArgs } from 'react-chessboard'

function App() {
  const game = useMemo(() => new Chess(), [])
  const [position, setPosition] = useState(game.fen())
  const [status, setStatus] = useState<string>('White to move')

  function handlePieceDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
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
    setStatus(describeStatus(game))
    return true
  }

  function reset() {
    game.reset()
    setPosition(game.fen())
    setStatus('White to move')
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex max-w-6xl gap-6 p-6">
        <aside className="w-72 shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Teams</h2>
          <p className="text-sm text-slate-500">
            Team roster + rotation lives here. Workstream B owns this column.
          </p>
        </aside>

        <main className="flex flex-1 flex-col items-center gap-4">
          <header className="w-full">
            <h1 className="text-2xl font-semibold">Co-op Chess</h1>
            <p className="text-sm text-slate-500">{status}</p>
          </header>

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

function describeStatus(game: Chess): string {
  if (game.isCheckmate()) return `Checkmate — ${game.turn() === 'w' ? 'Black' : 'White'} wins`
  if (game.isStalemate()) return 'Stalemate'
  if (game.isDraw()) return 'Draw'
  const side = game.turn() === 'w' ? 'White' : 'Black'
  return game.inCheck() ? `${side} to move (in check)` : `${side} to move`
}

export default App
