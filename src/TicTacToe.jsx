import React, { useState, useEffect, useRef } from "react";
import "./tic-tac-toe.css";

export default function App() {
  // Local storage keys
  const LS_SCORES = "ttt_scores";
  const LS_SETTINGS = "ttt_settings";
  const LS_BOARD = "ttt_board";
  const LS_IS_X_NEXT = "ttt_is_x_next";

  // States
  const [gameMode, setGameMode] = useState("menu"); // 'menu', 'friend', 'bot', 'difficulty', 'settings'
  const [difficulty, setDifficulty] = useState("easy");
  const [board, setBoard] = useState(() => {
    try {
      const val = localStorage.getItem(LS_BOARD);
      return val ? JSON.parse(val) : Array(9).fill(null);
    } catch { return Array(9).fill(null); }
  });
  const [isXNext, setIsXNext] = useState(() => {
    try {
      const val = localStorage.getItem(LS_IS_X_NEXT);
      return val ? JSON.parse(val) : true;
    } catch { return true; }
  });
  const [showTurnIndicator, setShowTurnIndicator] = useState(false);
  const [scores, setScores] = useState(() => {
    try {
      const val = localStorage.getItem(LS_SCORES);
      return val ? JSON.parse(val) : { red: 0, blue: 0 };
    } catch { return { red: 0, blue: 0 }; }
  });
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [settings, setSettings] = useState(() => {
    try {
      const val = localStorage.getItem(LS_SETTINGS);
      return val ? JSON.parse(val) : { sound: true, darkMode: false };
    } catch { return { sound: true, darkMode: false }; }
  });
  const [botThinking, setBotThinking] = useState(false);

  // refs for hold-to-return timers
  const holdTimerRef = useRef(null);
  const progressIntervalRef = useRef(null);

  // Save scores, settings, board, isXNext to localStorage on change
  useEffect(() => {
    localStorage.setItem(LS_SCORES, JSON.stringify(scores));
  }, [scores]);
  useEffect(() => {
    localStorage.setItem(LS_SETTINGS, JSON.stringify(settings));
  }, [settings]);
  useEffect(() => {
    localStorage.setItem(LS_BOARD, JSON.stringify(board));
  }, [board]);
  useEffect(() => {
    localStorage.setItem(LS_IS_X_NEXT, JSON.stringify(isXNext));
  }, [isXNext]);

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

  // Bot move effect (thinking animation)
  // Track which square AI just set for animation
  const [aiMoveIndex, setAiMoveIndex] = useState(null);

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
          setAiMoveIndex(botMove);
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

  // Clear AI move animation after a short time
  useEffect(() => {
    if (aiMoveIndex !== null) {
      const t = setTimeout(() => setAiMoveIndex(null), 700);
      return () => clearTimeout(t);
    }
  }, [aiMoveIndex]);

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

  // Unified SVG icon style: viewBox 0 0 24 24, strokeWidth 2.2, currentColor, centered
  const XIcon = ({ className = "", size = 24, color = "currentColor", strokeWidth = 2.2, shrinking = false }) => (
    <svg
      className={`icon ${className} ${shrinking ? "shrink" : ""}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block" }}
    >
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );

  const OIcon = ({ className = "", size = 24, color = "currentColor", strokeWidth = 2.2, shrinking = false }) => (
    <svg
      className={`icon ${className} ${shrinking ? "shrink" : ""}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      aria-hidden="true"
      focusable="false"
      style={{ display: "block" }}
    >
      <circle cx="12" cy="12" r="7" />
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
      {value === "X" && <XIcon className="x-icon" size={40} color="var(--red-500)" strokeWidth={4} shrinking={isDraw} />}
      {value === "O" && <OIcon className="o-icon" size={40} color="var(--blue-500)" strokeWidth={4} shrinking={isDraw} />}
    </button>
  );

  // Face-to-face turn indicator: modern, animated, color-accented, clear message
  const TurnIndicator = ({ isTop }) => {
    const isPlayerTurn = (isTop && !isXNext) || (!isTop && isXNext);
    const isBotTurn = gameMode === "bot" && !isTop && !isXNext;
    const shouldShow = (showTurnIndicator && isPlayerTurn && !winner && !isDraw) || (isBotTurn && botThinking);
    const isActive = shouldShow;
    const color = isBotTurn ? "var(--blue-500)" : (isTop ? (isXNext ? "var(--blue-500)" : "var(--red-500)") : (isXNext ? "var(--red-500)" : "var(--blue-500)"));
    return (
      <div className={`turn-indicator ${isTop ? "top" : "bottom"} ${isActive ? "visible" : ""}`}
        style={{justifyContent: isTop ? "flex-start" : "flex-end", alignItems: isTop ? "flex-start" : "flex-end"}}
      >
        <div className="turn-card" style={{boxShadow: isActive ? `0 0 24px 4px ${color}33` : undefined, borderColor: color, background: isActive ? `${color}22` : undefined}}>
          {isBotTurn && botThinking ? (
            <>
              <div className="magic-glow" style={{background: "repeating-linear-gradient(90deg, #60a5fa 0%, #a78bfa 20%, #f472b6 40%, #facc15 60%, #34d399 80%, #60a5fa 100%)", filter: "blur(8px)", opacity: 0.7, animation: "magicGlow 1.2s infinite alternate, flicker 0.7s infinite alternate"}} />
              <div className="magic-dots">
                <span className="magic-dot" style={{background: "#a78bfa"}} />
                <span className="magic-dot" style={{background: "#f472b6"}} />
                <span className="magic-dot" style={{background: "#facc15"}} />
                <span className="magic-dot" style={{background: "#34d399"}} />
                <span className="magic-dot" style={{background: "#60a5fa"}} />
              </div>
              <span style={{marginLeft: 18, fontWeight: 700, fontSize: '1.08em', color: color, letterSpacing: 0.5}}>AI is thinking...</span>
            </>
          ) : (
            <span className="turn-message" style={{fontWeight: 700, fontSize: '1.18em', color, letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 10, animation: isActive ? 'turnPulse 1.2s infinite alternate' : undefined}}>
              {isTop === isXNext ? <OIcon size={32} color={color} strokeWidth={2.2} /> : <XIcon size={32} color={color} strokeWidth={2.2} />}
              <span>It's your turn!</span>
            </span>
          )}
        </div>
      </div>
    );
  };


  // Unified ArrowIcon (left arrow)
  const ArrowIcon = ({ size = 24, color = "currentColor", strokeWidth = 2.2, direction = "left" }) => {
    // direction: "left", "right", "up", "down"
    let rotate = 0;
    if (direction === "up") rotate = -90;
    if (direction === "down") rotate = 90;
    if (direction === "right") rotate = 180;
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        style={{ display: "block", transform: `rotate(${rotate}deg)` }}
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
    );
  };

  // Modern hold-to-return button bottom left with circular progress and home icon
  const HomeIcon = ({ size = 24, color = "currentColor", strokeWidth = 2.2 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M3 11.5L12 4l9 7.5" />
      <rect x="7" y="12" width="10" height="7" rx="2" />
    </svg>
  );

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
        style={{ position: "relative" }}
      >
        <span className="hold-btn-content">
          <HomeIcon size={28} color="var(--blue-500)" strokeWidth={2.2} />
          <span className="hold-btn-label">Home</span>
        </span>
        <svg className="hold-circle" width="44" height="44" viewBox="0 0 44 44">
          <circle
            cx="22"
            cy="22"
            r="18"
            fill="none"
            stroke="var(--blue-500)"
            strokeWidth="3.5"
            strokeDasharray={Math.PI * 2 * 18}
            strokeDashoffset={isHolding ? Math.PI * 2 * 18 * (1 - holdProgress / 100) : Math.PI * 2 * 18}
            style={{ transition: isHolding ? "stroke-dashoffset 0.18s linear" : "stroke-dashoffset 0.32s cubic-bezier(.4,2,.6,1)" }}
          />
        </svg>
      </button>
    </div>
  );

  // Face-to-face scoreboard: slanted, aligned to edges, readable from both sides
  const ScoreBoard = () => (
    <>
      <div className="scoreboard scoreboard-top">
        <div className="score-card" style={{transform: "skewY(-12deg)"}}>
          <span className="score-label" style={{color: "var(--red-500)", fontWeight: 700, fontSize: 16, letterSpacing: 1}}>X</span>
          <span className="score-value red">{scores.red}</span>
        </div>
      </div>
      <div className="scoreboard scoreboard-bottom">
        <div className="score-card" style={{transform: "skewY(12deg) rotate(180deg)"}}>
          <span className="score-label" style={{color: "var(--blue-500)", fontWeight: 700, fontSize: 16, letterSpacing: 1}}>O</span>
          <span className="score-value blue">{scores.blue}</span>
        </div>
      </div>
    </>
  );

  /* ---------------------------
     Menu / Difficulty / Settings views
     --------------------------- */

  // Modern gear icon for Settings (inspired by Flaticon #3019014)
  const SettingsIcon = ({ size = 24, color = "currentColor", strokeWidth = 2.2 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="3.2" />
      <g>
        <path d="M12 2.5v2.2" />
        <path d="M12 19.3v2.2" />
        <path d="M4.22 4.22l1.56 1.56" />
        <path d="M18.22 18.22l1.56 1.56" />
        <path d="M2.5 12h2.2" />
        <path d="M19.3 12h2.2" />
        <path d="M4.22 19.78l1.56-1.56" />
        <path d="M18.22 5.78l1.56-1.56" />
      </g>
      <circle cx="12" cy="12" r="7.2" />
    </svg>
  );

  // Modern, bold, symmetrical left arrow for BackIcon
  const BackIcon = ({ size = 32, color = "var(--blue-500)", strokeWidth = 2.2, show = false }) => (
    <span className={`back-arrow-anim${show ? " show" : ""}`} style={{ display: "inline-block", verticalAlign: "middle" }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        style={{ display: "block" }}
      >
        <polyline points="16 5 8 12 16 19" />
      </svg>
    </span>
  );

  if (gameMode === "settings") {
    return (
      <div className={`app-container ${getBackgroundClass()} ${settings.darkMode ? "dark" : ""}`}>
        <div className="center-card card">
          <h2 className="title">Settings</h2>

          <div className="settings-list">
            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12h22" /><path d="M12 1v22" /></svg></span>
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
                <span className="setting-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8" /></svg></span>
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

          <button
            className="btn back-btn back-anim-btn"
            onClick={() => setGameMode("menu")}
            onMouseEnter={e => e.currentTarget.classList.add("show-arrow")}
            onMouseLeave={e => e.currentTarget.classList.remove("show-arrow")}
            onFocus={e => e.currentTarget.classList.add("show-arrow")}
            onBlur={e => e.currentTarget.classList.remove("show-arrow")}
          >
            <BackIcon size={32} color="var(--blue-500)" strokeWidth={2.2} show={true} />
            <span className="back-btn-label">Back</span>
          </button>
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

          <button
            className="btn back-btn back-anim-btn"
            onClick={() => setGameMode("menu")}
            onMouseEnter={e => e.currentTarget.classList.add("show-arrow")}
            onMouseLeave={e => e.currentTarget.classList.remove("show-arrow")}
            onFocus={e => e.currentTarget.classList.add("show-arrow")}
            onBlur={e => e.currentTarget.classList.remove("show-arrow")}
          >
            <BackIcon size={32} color="var(--blue-500)" strokeWidth={2.2} show={true} />
            <span className="back-btn-label">Back</span>
          </button>
        </div>
      </div>
    );
  }

  if (gameMode === "menu") {
    return (
      <div className={`app-container ${getBackgroundClass()} ${settings.darkMode ? "dark" : ""}`}>
  <button className="settings-button large" onClick={() => setGameMode("settings")}> <SettingsIcon size={40} color="var(--blue-500)" strokeWidth={2.2} /> </button>

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

      <ScoreBoard />
      <div className={`board-wrap ${winner ? "blurred" : ""}`}></div>

      <div className={`board-area ${winner && !isDraw ? "game-over" : ""}`}>
        <div className={`board card-inner${botThinking ? " magic-ai" : ""}`}> 
          {board.map((sq, i) => (
            <div key={i} style={{position: "relative"}}>
              <Square
                value={sq}
                onClick={() => handleClick(i)}
                className={aiMoveIndex === i ? "ai-wobble" : ""}
              />
              {aiMoveIndex === i && <div className="ai-wave" />}
            </div>
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