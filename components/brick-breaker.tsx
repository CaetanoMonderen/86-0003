"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"

const WIDTH = 640
const HEIGHT = 460
const PADDLE_H = 12
const BALL_R = 7
const BRICK_COLS = 9
const BRICK_H = 20
const BRICK_GAP = 6
const BRICK_TOP = 48
const BRICK_SIDE = 16
const BASE_PADDLE_W = 96

type GameState = "idle" | "playing" | "levelup" | "lost"

interface Brick {
  x: number
  y: number
  w: number
  hp: number
  maxHp: number
  hue: number
}

// Difficulty scales with the level: the ball gets faster, more rows appear,
// bricks start needing multiple hits, and the paddle shrinks.
function levelConfig(level: number) {
  const speed = 4 + (level - 1) * 0.7
  const rows = Math.min(4 + level, 8)
  const paddleW = Math.max(56, BASE_PADDLE_W - (level - 1) * 7)
  return { speed, rows, paddleW }
}

export function BrickBreaker() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number>(0)
  const stateRef = useRef<GameState>("idle")

  const levelRef = useRef(1)
  const paddleWRef = useRef(BASE_PADDLE_W)
  const paddleX = useRef((WIDTH - BASE_PADDLE_W) / 2)
  const ball = useRef({ x: WIDTH / 2, y: HEIGHT - 40, dx: 4, dy: -4 })
  const bricks = useRef<Brick[]>([])

  const [gameState, setGameState] = useState<GameState>("idle")
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [level, setLevel] = useState(1)
  const scoreRef = useRef(0)
  const livesRef = useRef(3)

  const setState = (s: GameState) => {
    stateRef.current = s
    setGameState(s)
  }

  const buildBricks = useCallback((lvl: number) => {
    const { rows } = levelConfig(lvl)
    const usableW = WIDTH - BRICK_SIDE * 2 - BRICK_GAP * (BRICK_COLS - 1)
    const brickW = usableW / BRICK_COLS
    const arr: Brick[] = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        // Tougher bricks (needing 2–3 hits) appear on the top rows as the
        // level climbs, so later levels take longer to clear.
        let hp = 1
        if (lvl >= 3 && r === 0) hp = 3
        else if (lvl >= 2 && r < 2) hp = 2
        arr.push({
          x: BRICK_SIDE + c * (brickW + BRICK_GAP),
          y: BRICK_TOP + r * (BRICK_H + BRICK_GAP),
          w: brickW,
          hp,
          maxHp: hp,
          hue: 4 + r * 6,
        })
      }
    }
    bricks.current = arr
  }, [])

  const resetBall = useCallback((lvl: number) => {
    const { speed, paddleW } = levelConfig(lvl)
    paddleWRef.current = paddleW
    ball.current = {
      x: WIDTH / 2,
      y: HEIGHT - 40,
      dx: (Math.random() > 0.5 ? 1 : -1) * speed,
      dy: -speed,
    }
    paddleX.current = (WIDTH - paddleW) / 2
  }, [])

  const startGame = useCallback(() => {
    scoreRef.current = 0
    livesRef.current = 3
    levelRef.current = 1
    setScore(0)
    setLives(3)
    setLevel(1)
    buildBricks(1)
    resetBall(1)
    setState("playing")
  }, [buildBricks, resetBall])

  const nextLevel = useCallback(() => {
    levelRef.current += 1
    setLevel(levelRef.current)
    buildBricks(levelRef.current)
    resetBall(levelRef.current)
    setState("playing")
  }, [buildBricks, resetBall])

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, WIDTH, HEIGHT)

    // background
    ctx.fillStyle = "#0f0f10"
    ctx.fillRect(0, 0, WIDTH, HEIGHT)

    // bricks — brighter = tougher (more hits remaining)
    for (const b of bricks.current) {
      if (b.hp <= 0) continue
      const light = 34 + (b.hp / b.maxHp) * 30
      ctx.fillStyle = `hsl(${b.hue}, 74%, ${light}%)`
      ctx.fillRect(b.x, b.y, b.w, BRICK_H)
      ctx.fillStyle = "rgba(255,255,255,0.12)"
      ctx.fillRect(b.x, b.y, b.w, 3)
    }

    // paddle
    ctx.fillStyle = "#e5e7eb"
    ctx.beginPath()
    ctx.roundRect(paddleX.current, HEIGHT - 24, paddleWRef.current, PADDLE_H, 6)
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
      const paddleW = paddleWRef.current
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
        b.x <= paddleX.current + paddleW
      ) {
        b.dy = -Math.abs(b.dy)
        const hit = (b.x - (paddleX.current + paddleW / 2)) / (paddleW / 2)
        const speed = Math.hypot(b.dx, b.dy)
        b.dx = hit * speed
      }

      // bricks
      for (const brick of bricks.current) {
        if (brick.hp <= 0) continue
        if (
          b.x + BALL_R > brick.x &&
          b.x - BALL_R < brick.x + brick.w &&
          b.y + BALL_R > brick.y &&
          b.y - BALL_R < brick.y + BRICK_H
        ) {
          brick.hp -= 1
          b.dy *= -1
          scoreRef.current += brick.hp > 0 ? 5 : 10
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
          resetBall(levelRef.current)
        }
      }

      // level cleared
      if (bricks.current.every((br) => br.hp <= 0)) {
        setState("levelup")
      }
    }

    draw(ctx)
    rafRef.current = requestAnimationFrame(step)
  }, [draw, resetBall])

  useEffect(() => {
    buildBricks(1)
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
    paddleX.current = Math.max(0, Math.min(WIDTH - paddleWRef.current, x - paddleWRef.current / 2))
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") paddleX.current = Math.max(0, paddleX.current - 32)
      if (e.key === "ArrowRight")
        paddleX.current = Math.min(WIDTH - paddleWRef.current, paddleX.current + 32)
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
              Level: <span className="text-primary">{level}</span>
            </span>
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
                {gameState === "levelup" && `Level ${level} voltooid!`}
                {gameState === "lost" && "Game Over"}
              </p>
              {gameState === "levelup" && (
                <p className="text-sm text-muted-foreground">
                  Volgende level is sneller en moeilijker. Score: {score}
                </p>
              )}
              {gameState === "lost" && <p className="text-sm text-muted-foreground">Eindscore: {score}</p>}

              {gameState === "levelup" ? (
                <Button onClick={nextLevel} className="corporate-button">
                  Volgende level
                </Button>
              ) : (
                <Button onClick={startGame} className="corporate-button">
                  {gameState === "idle" ? "Start spel" : "Opnieuw spelen"}
                </Button>
              )}

              {gameState === "idle" && (
                <p className="max-w-xs text-center text-xs text-muted-foreground">
                  Beweeg de muur met je muis of vinger. Op desktop kan je ook de pijltjestoetsen gebruiken. Elk
                  level wordt sneller en moeilijker.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
