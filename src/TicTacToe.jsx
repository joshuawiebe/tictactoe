import React, { useState, useEffect, useRef } from "react";
import "./tic-tac-toe.css";

export default function App() {
  // States
  const [gameMode, setGameMode] = useState("menu"); // 'menu', 'friend', 'bot', 'difficulty', 'settings'
  const [difficulty, setDifficulty] = useState("easy");
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [showTurnIndicator, setShowTurnIndicator] = useState(false);
  const [scores, setScores] = useState({ red: 0, blue: 0 });
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [settings, setSettings] = useState({ sound: true, darkMode: false });
  const [botThinking, setBotThinking] = useState(false);

  // refs for hold-to-return timers
  const holdTimerRef = useRef(null);
  const progressIntervalRef = useRef(null);

  /* ---------------------------
     Helper functions & AI
     --------------------------- */
  const calculateWinner = (squares) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return null;
  };

  const minimax = (squares, depth, isMaximizing, alpha = -Infinity, beta = Infinity) => {
    const winnerLocal = calculateWinner(squares);
    if (winnerLocal === "O") return 10 - depth;
    if (winnerLocal === "X") return depth - 10;
    if (squares.every((s) => s !== null)) return 0;

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (squares[i] === null) {
          squares[i] = "O";
          const val = minimax(squares, depth + 1, false, alpha, beta);
          squares[i] = null;
          maxEval = Math.max(maxEval, val);
          alpha = Math.max(alpha, val);
          if (beta <= alpha) break;
        }
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (let i = 0; i < 9; i++) {
        if (squares[i] === null) {
          squares[i] = "X";
          const val = minimax(squares, depth + 1, true, alpha, beta);
          squares[i] = null;
          minEval = Math.min(minEval, val);
          beta = Math.min(beta, val);
          if (beta <= alpha) break;
        }
      }
      return minEval;
    }
  };

  const getBestMove = (squares) => {
    let bestMove = null;
    let bestValue = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (squares[i] === null) {
        squares[i] = "O";
        const moveValue = minimax(squares, 0, false);
        squares[i] = null;
        if (moveValue > bestValue) {
          bestValue = moveValue;
          bestMove = i;
        }
      }
    }
    return bestMove;
  };

  const makeRandomMove = (squares) => {
    const available = squares.map((s, idx) => (s === null ? idx : null)).filter((v) => v !== null);
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
  };

  const getBotMove = (squares) => {
    if (difficulty === "easy") return makeRandomMove(squares);
    if (difficulty === "medium") return Math.random() < 0.7 ? getBestMove(squares) : makeRandomMove(squares);
    return getBestMove(squares);
  };

  /* ---------------------------
     Derived states (must be before effects)
     --------------------------- */
  const winner = calculateWinner(board);
  const isDraw = !winner && board.every((square) => square !== null);

  /* ---------------------------
     User actions
     --------------------------- */
  const handleClick = (i) => {
    const squares = board.slice();
    if (calculateWinner(squares) || squares[i] || botThinking) return;
    squares[i] = isXNext ? "X" : "O";
    setBoard(squares);
    setIsXNext((v) => !v);
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setBotThinking(false);
  };

  const backToMenu = () => {
    setGameMode("menu");
    setScores({ red: 0, blue: 0 });
    resetGame();
  };

  /* ---------------------------
     Hold-to-return (beam) handlers
     --------------------------- */
  const handleHoldStart = (e) => {
    e.preventDefault();
    setIsHolding(true);
    setHoldProgress(0);

    progressIntervalRef.current = setInterval(() => {
      setHoldProgress((prev) => {
        const next = prev + 1.5;
        return next > 100 ? 100 : next;
      });
    }, 30);

    holdTimerRef.current = setTimeout(() => {
      backToMenu();
    }, 2000);
  };

  const handleHoldEnd = (e) => {
    e && e.preventDefault();
    setIsHolding(false);
    setHoldProgress(0);
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  /* ---------------------------
     Bot move effect (thinking animation)
     --------------------------- */
  useEffect(() => {
    if (gameMode === "bot" && !isXNext && !winner && !isDraw) {
      setBotThinking(true);
      const delay = difficulty === "hard" ? 1800 : difficulty === "medium" ? 1500 : 1200;
      const timer = setTimeout(() => {
        const squares = board.slice();
        const botMove = getBotMove(squares);
        if (botMove !== null) {
          squares[botMove] = "O";
          setBoard(squares);
          setIsXNext(true);
        }
        setBotThinking(false);
      }, Math.max(1200, delay));
      return () => {
        clearTimeout(timer);
        setBotThinking(false);
      };
    } else {
      setBotThinking(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, isXNext, gameMode, difficulty, winner, isDraw]);

  /* ---------------------------
     Turn indicator effect
     --------------------------- */
  useEffect(() => {
    if ((gameMode === "friend" || gameMode === "bot") && !winner && !botThinking) {
      setShowTurnIndicator(true);
      const t = setTimeout(() => setShowTurnIndicator(false), 2000);
      return () => clearTimeout(t);
    }
  }, [isXNext, gameMode, botThinking, board, winner]);

  /* ---------------------------
     End-of-game scoring & auto-restart for draws
     --------------------------- */
  useEffect(() => {
    const localWinner = winner;
    const localDraw = isDraw;

    if (localWinner) {
      setBotThinking(false);
      setTimeout(() => {
        setScores((prev) => ({
          ...prev,
          [localWinner === "X" ? "red" : "blue"]: prev[localWinner === "X" ? "red" : "blue"] + 1
        }));
      }, 600); // slight delay for animation
    } else if (localDraw) {
      setBotThinking(false);
      setTimeout(() => resetGame(), 1400);
    }
  }, [winner, isDraw]);

  /* ---------------------------
     UI helpers - get background class
     --------------------------- */
  const getBackgroundClass = () => {
    if (winner === "X") return "bg-red";
    if (winner === "O") return "bg-blue";
    if (isDraw) return "bg-gray";
    if (gameMode === "menu" || gameMode === "difficulty" || gameMode === "settings") return "bg-menu";
    return isXNext ? "bg-red" : "bg-blue";
  };

  /* ---------------------------
     Small presentational components
     --------------------------- */
  const XIcon = ({ className = "", size = 48, shrinking = false }) => (
    <svg className={`icon ${className} ${shrinking ? "shrink" : ""}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );

  const OIcon = ({ className = "", size = 48, shrinking = false }) => (
    <svg className={`icon ${className} ${shrinking ? "shrink" : ""}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <circle cx="12" cy="12" r="9" />
    </svg>
  );

  const ThinkingDots = () => (
    <div className="thinking-dots">
      <span className="dot" style={{ animationDelay: "0s" }}></span>
      <span className="dot" style={{ animationDelay: "0.12s" }}></span>
      <span className="dot" style={{ animationDelay: "0.24s" }}></span>
    </div>
  );

  const Square = ({ value, onClick }) => (
    <button
      className={`square ${value === "X" ? "square-x" : value === "O" ? "square-o" : ""} ${botThinking ? "thinking" : ""}`}
      onClick={onClick}
      disabled={winner || isDraw || botThinking}
      aria-label={`square-${value ?? "empty"}`}
    >
      {value === "X" && <XIcon className="x-icon" size={40} shrinking={isDraw} />}
      {value === "O" && <OIcon className="o-icon" size={40} shrinking={isDraw} />}
    </button>
  );

  const TurnIndicator = ({ isTop }) => {
    const isPlayerTurn = (isTop && !isXNext) || (!isTop && isXNext);
    const isBotTurn = gameMode === "bot" && !isTop && !isXNext;
    const shouldShow = (showTurnIndicator && isPlayerTurn && !winner && !isDraw) || (isBotTurn && botThinking);

    return (
      <div className={`turn-indicator ${isTop ? "top" : "bottom"} ${shouldShow ? "visible" : ""}`}>
        <div className="turn-card">
          {isBotTurn && botThinking ? (
            <div className="bot-thinking">
              <span className="small">Bot is thinking</span>
              <ThinkingDots />
            </div>
          ) : (
            <p className="small">It's your turn</p>
          )}
        </div>
      </div>
    );
  };

  const HoldToReturnButton = () => (
    <div className="hold-return">
      <button
        onMouseDown={handleHoldStart}
        onMouseUp={handleHoldEnd}
        onMouseLeave={handleHoldEnd}
        onTouchStart={handleHoldStart}
        onTouchEnd={handleHoldEnd}
        className="hold-button"
        aria-label="hold-to-return"
      >
        <svg className="arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <path d="M10 19l-7-7 7-7" />
        </svg>

        <div
          className="hold-beam"
          style={{
            height: `${holdProgress}%`,
            opacity: isHolding ? 1 : 0,
            boxShadow: isHolding ? "0 0 8px rgba(255,255,255,0.8), 0 0 16px rgba(255,255,255,0.4)" : "none"
          }}
        />
      </button>
    </div>
  );

  const ScoreBoard = () => (
    <div className="scoreboard">
      <div className="score-card">
        <div className="score-value red">{scores.red}</div>
        <div className="score-sep" />
        <div className="score-value blue">{scores.blue}</div>
      </div>
    </div>
  );

  /* ---------------------------
     Menu / Difficulty / Settings views
     --------------------------- */
  if (gameMode === "settings") {
    return (
      <div className={`app-container ${getBackgroundClass()} ${settings.darkMode ? "dark" : ""}`}>
        <div className="center-card card">
          <h2 className="title">Settings</h2>

          <div className="settings-list">
            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-icon">🔊</span>
                <span className="setting-label">Sound</span>
              </div>
              <button
                className={`toggle ${settings.sound ? "on" : ""}`}
                onClick={() => setSettings((p) => ({ ...p, sound: !p.sound }))}
              >
                <span className="toggle-dot" />
              </button>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-icon">🌙</span>
                <span className="setting-label">Dark Mode</span>
              </div>
              <button
                className={`toggle ${settings.darkMode ? "on" : ""}`}
                onClick={() => setSettings((p) => ({ ...p, darkMode: !p.darkMode }))}
              >
                <span className="toggle-dot" />
              </button>
            </div>
          </div>

          <button className="btn back-btn" onClick={() => setGameMode("menu")}>← Back</button>
        </div>
      </div>
    );
  }

  if (gameMode === "difficulty") {
    return (
      <div className={`app-container ${getBackgroundClass()} ${settings.darkMode ? "dark" : ""}`}>
        <div className="center-card card">
          <h2 className="title">Choose Difficulty</h2>

          <div className="options-list">
            {[
              { level: "easy", label: "Easy", desc: "Random moves" },
              { level: "medium", label: "Medium", desc: "Mixed strategy" },
              { level: "hard", label: "Hard", desc: "Unbeatable" }
            ].map(({ level, label, desc }) => (
              <button
                key={level}
                onClick={() => { setDifficulty(level); setGameMode("bot"); resetGame(); }}
                className={`option ${difficulty === level ? "active" : ""}`}
              >
                <div>
                  <div className="opt-title">{label}</div>
                  <div className="opt-desc">{desc}</div>
                </div>
              </button>
            ))}
          </div>

          <button className="btn back-btn" onClick={() => setGameMode("menu")}>← Back</button>
        </div>
      </div>
    );
  }

  if (gameMode === "menu") {
    return (
      <div className={`app-container ${getBackgroundClass()} ${settings.darkMode ? "dark" : ""}`}>
        <button className="settings-button" onClick={() => setGameMode("settings")}>⚙️</button>

        <div className="center-card card">
          <h1 className="main-title">Tic Tac Toe</h1>

          <div className="menu-actions">
            <button className="btn big" onClick={() => { setGameMode("friend"); resetGame(); }}>Play with Friend</button>
            <button className="btn big" onClick={() => setGameMode("difficulty")}>Play with Bot</button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------------------
     Main game screen
     --------------------------- */
  return (
    <div className={`app-container ${getBackgroundClass()} ${settings.darkMode ? "dark" : ""}`}>
      <TurnIndicator isTop={true} />
      <TurnIndicator isTop={false} />

      {!winner && <HoldToReturnButton />}

      <div className={`board-wrap ${winner ? "blurred" : ""}`}>
        <ScoreBoard />
      </div>

      <div className={`board-area ${winner && !isDraw ? "game-over" : ""}`}>
        <div className="board card-inner">
          {board.map((sq, i) => (
            <Square key={i} value={sq} onClick={() => handleClick(i)} />
          ))}
        </div>
      </div>

      {winner && (
        <div className="modal-overlay">
          <div className="modal card">
            <div className="winner-icon">
              {winner === "X" ? <XIcon className="x-large" size={72} /> : <OIcon className="o-large" size={72} />}
            </div>
            <h2 className={`winner-title ${winner === "X" ? "red" : "blue"}`}>{winner === "X" ? "Red" : "Blue"} Wins!</h2>

            <div className="modal-actions">
              <button className="btn primary" onClick={resetGame}>Play Again</button>
              <button className="btn" onClick={backToMenu}>Return to Home</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}