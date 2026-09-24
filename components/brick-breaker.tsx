"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"

const WIDTH = 640
const HEIGHT = 460
const PADDLE_W = 96
const PADDLE_H = 12
const BALL_R = 7
const BRICK_ROWS = 5
const BRICK_COLS = 9
const BRICK_H = 20
const BRICK_GAP = 6
const BRICK_TOP = 48
const BRICK_SIDE = 16

type GameState = "idle" | "playing" | "won" | "lost"

interface Brick {
  x: number
  y: number
  w: number
  alive: boolean
  hue: number
}

export function BrickBreaker() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number>(0)
  const stateRef = useRef<GameState>("idle")

  const paddleX = useRef((WIDTH - PADDLE_W) / 2)
  const ball = useRef({ x: WIDTH / 2, y: HEIGHT - 40, dx: 4, dy: -4 })
  const bricks = useRef<Brick[]>([])

  const [gameState, setGameState] = useState<GameState>("idle")
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const scoreRef = useRef(0)
  const livesRef = useRef(3)

  const setState = (s: GameState) => {
    stateRef.current = s
    setGameState(s)
  }

  const buildBricks = useCallback(() => {
    const usableW = WIDTH - BRICK_SIDE * 2 - BRICK_GAP * (BRICK_COLS - 1)
    const brickW = usableW / BRICK_COLS
    const arr: Brick[] = []
    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        arr.push({
          x: BRICK_SIDE + c * (brickW + BRICK_GAP),
          y: BRICK_TOP + r * (BRICK_H + BRICK_GAP),
          w: brickW,
          alive: true,
          hue: 4 + r * 6,
        })
      }
    }
    bricks.current = arr
  }, [])

  const resetBall = useCallback(() => {
    ball.current = {
      x: WIDTH / 2,
      y: HEIGHT - 40,
      dx: Math.random() > 0.5 ? 4 : -4,
      dy: -4,
    }
    paddleX.current = (WIDTH - PADDLE_W) / 2
  }, [])

  const startGame = useCallback(() => {
    scoreRef.current = 0
    livesRef.current = 3
    setScore(0)
    setLives(3)
    buildBricks()
    resetBall()
    setState("playing")
  }, [buildBricks, resetBall])

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, WIDTH, HEIGHT)

    // background
    ctx.fillStyle = "#0f0f10"
    ctx.fillRect(0, 0, WIDTH, HEIGHT)

    // bricks
    for (const b of bricks.current) {
      if (!b.alive) continue
      ctx.fillStyle = `hsl(${b.hue}, 72%, 52%)`
      ctx.fillRect(b.x, b.y, b.w, BRICK_H)
      ctx.fillStyle = "rgba(255,255,255,0.12)"
      ctx.fillRect(b.x, b.y, b.w, 3)
    }

    // paddle
    ctx.fillStyle = "#e5e7eb"
    ctx.beginPath()
    ctx.roundRect(paddleX.current, HEIGHT - 24, PADDLE_W, PADDLE_H, 6)
    ctx.fill()

    // ball
    ctx.fillStyle = "#f87171"
    ctx.beginPath()
    ctx.arc(ball.current.x, ball.current.y, BALL_R, 0, Math.PI * 2)
    ctx.fill()
  }, [])

  const step = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    if (stateRef.current === "playing") {
      const b = ball.current
      b.x += b.dx
      b.y += b.dy

      // walls
      if (b.x - BALL_R < 0) {
        b.x = BALL_R
        b.dx *= -1
      }
      if (b.x + BALL_R > WIDTH) {
        b.x = WIDTH - BALL_R
        b.dx *= -1
      }
      if (b.y - BALL_R < 0) {
        b.y = BALL_R
        b.dy *= -1
      }

      // paddle
      const py = HEIGHT - 24
      if (
        b.dy > 0 &&
        b.y + BALL_R >= py &&
        b.y + BALL_R <= py + PADDLE_H + 6 &&
        b.x >= paddleX.current &&
        b.x <= paddleX.current + PADDLE_W
      ) {
        b.dy = -Math.abs(b.dy)
        const hit = (b.x - (paddleX.current + PADDLE_W / 2)) / (PADDLE_W / 2)
        b.dx = hit * 5
      }

      // bricks
      for (const brick of bricks.current) {
        if (!brick.alive) continue
        if (
          b.x + BALL_R > brick.x &&
          b.x - BALL_R < brick.x + brick.w &&
          b.y + BALL_R > brick.y &&
          b.y - BALL_R < brick.y + BRICK_H
        ) {
          brick.alive = false
          b.dy *= -1
          scoreRef.current += 10
          setScore(scoreRef.current)
          break
        }
      }

      // lose life
      if (b.y - BALL_R > HEIGHT) {
        livesRef.current -= 1
        setLives(livesRef.current)
        if (livesRef.current <= 0) {
          setState("lost")
        } else {
          resetBall()
        }
      }

      // win
      if (bricks.current.every((br) => !br.alive)) {
        setState("won")
      }
    }

    draw(ctx)
    rafRef.current = requestAnimationFrame(step)
  }, [draw, resetBall])

  useEffect(() => {
    buildBricks()
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext("2d")
      if (ctx) draw(ctx)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [buildBricks, draw, step])

  const movePaddle = useCallback((clientX: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scale = WIDTH / rect.width
    const x = (clientX - rect.left) * scale
    paddleX.current = Math.max(0, Math.min(WIDTH - PADDLE_W, x - PADDLE_W / 2))
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") paddleX.current = Math.max(0, paddleX.current - 32)
      if (e.key === "ArrowRight") paddleX.current = Math.min(WIDTH - PADDLE_W, paddleX.current + 32)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <div className="menu-content-transition menu-content-enter">
      <div className="corporate-section-header">
        <div className="flex items-center gap-2">BRICK BREAKER</div>
      </div>

      <div className="corporate-content p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-6 text-sm">
            <span className="font-semibold">
              Score: <span className="text-primary">{score}</span>
            </span>
            <span className="font-semibold">
              Levens: <span className="text-primary">{"❤".repeat(lives) || "—"}</span>
            </span>
          </div>
          <Button onClick={startGame} className="corporate-button">
            {gameState === "playing" ? "Herstart" : "Start spel"}
          </Button>
        </div>

        <div className="relative mx-auto w-full max-w-2xl">
          <canvas
            ref={canvasRef}
            width={WIDTH}
            height={HEIGHT}
            onMouseMove={(e) => movePaddle(e.clientX)}
            onTouchMove={(e) => {
              if (e.touches[0]) movePaddle(e.touches[0].clientX)
            }}
            className="w-full rounded-lg border border-border touch-none"
            style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
          />

          {gameState !== "playing" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-background/80 backdrop-blur-sm">
              <p className="text-2xl font-bold text-balance text-center px-4">
                {gameState === "idle" && "Klaar om te spelen?"}
                {gameState === "won" && "Gewonnen! 🎉"}
                {gameState === "lost" && "Game Over"}
              </p>
              {gameState !== "idle" && <p className="text-sm text-muted-foreground">Eindscore: {score}</p>}
              <Button onClick={startGame} className="corporate-button">
                {gameState === "idle" ? "Start spel" : "Opnieuw spelen"}
              </Button>
              <p className="max-w-xs text-center text-xs text-muted-foreground">
                Beweeg de muur met je muis of vinger. Op desktop kan je ook de pijltjestoetsen gebruiken.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
