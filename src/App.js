import { useState } from "react";
import "./App.css";

export default function App() {
  // --- STATE ---
  const [score, setScore] = useState(0);
  const [wickets, setWickets] = useState(0);
  const [overs, setOvers] = useState(0);
  const [balls, setBalls] = useState(0); // legal balls in current over: 0..5

  const [currentOver, setCurrentOver] = useState([]); // strings like "1","4","W","WD+2"
  const [overSummary, setOverSummary] = useState([]); // array of finished overs (each is an array)

  const [history, setHistory] = useState([]); // snapshots for undo

  // UI state for extras input (WD/NB)
  const [extraPanel, setExtraPanel] = useState(null); // null | {type: "WD"|"NB"}

  // Save snapshot for undo (call BEFORE any state-changing action)
  const saveHistory = () => {
    setHistory((h) => [
      ...h,
      {
        score,
        wickets,
        overs,
        balls,
        currentOver: [...currentOver],
        overSummary: JSON.parse(JSON.stringify(overSummary)),
      },
    ]);
  };

  // Helper: add a legal delivery (counts as a legal ball)
  const addLegalDelivery = (value, runs = 0, isWicket = false) => {
    saveHistory();

    setScore((s) => s + runs);

    if (isWicket) {
      setWickets((w) => w + 1);
    }

    // --- LOGIC FIX ---
    // We check 'balls' (legal deliveries count) instead of currentOver.length.
    // 'balls' is 0-indexed, so 5 means we are currently bowling the 6th legal ball.
    if (balls === 5) {
      // This completes the over
      const finishedOver = [...currentOver, value];
      setOverSummary((os) => [...os, finishedOver]);
      
      setOvers((o) => o + 1);
      setBalls(0);
      setCurrentOver([]); // reset for next over
    } else {
      // Still within same over
      setBalls((b) => b + 1);
      setCurrentOver((prev) => [...prev, value]);
    }
  };

  // Helper: add an extra (WD or NB). 
  // Adds runs and shows in array, but DOES NOT increment 'balls'
  const addExtra = (type, extraRuns = 0) => {
    saveHistory();

    const total = 1 + Number(extraRuns || 0);
    setScore((s) => s + total);

    const label = extraRuns && Number(extraRuns) > 0 ? `${type}+${extraRuns}` : type;
    
    // Append to currentOver array only (ball count remains same)
    setCurrentOver((prev) => [...prev, label]);
  };

  // Public actions
  const addRun = (r) => addLegalDelivery(String(r), Number(r), false);
  const addWicket = () => addLegalDelivery("W", 0, true);

  // show panel to choose additional runs for extras
  const showExtraPanel = (type) => setExtraPanel({ type });

  const chooseExtra = (extraRuns) => {
    if (!extraPanel) return;
    addExtra(extraPanel.type, extraRuns);
    setExtraPanel(null);
  };

  const cancelExtra = () => setExtraPanel(null);

  const undo = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));

    setScore(last.score);
    setWickets(last.wickets);
    setOvers(last.overs);
    setBalls(last.balls);
    setCurrentOver(last.currentOver);
    setOverSummary(last.overSummary);
  };

  const resetMatch = () => {
    if(!window.confirm("Start new match?")) return;
    saveHistory();
    setScore(0);
    setWickets(0);
    setOvers(0);
    setBalls(0);
    setCurrentOver([]);
    setOverSummary([]);
  };

  // Derived values
  const totalBalls = overs * 6 + balls;
  const runRate = totalBalls > 0 ? (score / totalBalls) * 6 : 0;

  return (
    <div className="app">
      <header className="scorecard">
        <div className="scoreLarge">
          <div className="scoreNumber">{score}</div>
          <div className="scoreSlash">/</div>
          <div className="wicketsNumber">{wickets}</div>
        </div>

        <div className="meta">
          <div className="overs">Overs: <strong>{overs}.{balls}</strong></div>
          <div className="rr">CRR: <strong>{runRate.toFixed(2)}</strong></div>
          <div className="totalBalls">Balls: {totalBalls}</div>
        </div>
      </header>

      <main className="main">
        <section className="controls">
          <div className="runsGrid" role="group" aria-label="Runs">
            {[0, 1, 2, 3, 4, 6].map((r) => (
              <button key={r} className="btn run" onClick={() => addRun(r)}>{r}</button>
            ))}

            <button className="btn extra" onClick={() => showExtraPanel("WD")}>WD</button>
            <button className="btn extra" onClick={() => showExtraPanel("NB")}>NB</button>

            <button className="btn wicket" onClick={addWicket}>W</button>
          </div>

          <div className="actions">
            <button className="smallBtn" onClick={undo}>Undo</button>
            <button className="smallBtn secondary" onClick={resetMatch}>Reset</button>
          </div>
        </section>

        <aside className="oversPanel">
          <h3>Over Summary</h3>

          {/* finished overs */}
          <div className="finishedOvers">
            {overSummary.length === 0 ? (
              <div className="empty">No completed overs yet</div>
            ) : (
              overSummary.map((ov, idx) => (
                <div key={idx} className="overRow">
                  <div className="overLabel">Over {idx + 1}</div>
                  <div className="balls">
                    {ov.map((b, i) => (
                      <span key={i} className={`ball ${ballClass(b)}`}>{b}</span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* current over */}
          <div className="currentOverCard">
            <div className="overLabel">Current Over ({overs + 1})</div>
            <div className="balls">
              {currentOver.length === 0 ? (
                <div className="empty">— no balls yet —</div>
              ) : (
                currentOver.map((b, i) => (
                  <span key={i} className={`ball ${ballClass(b)}`}>{b}</span>
                ))
              )}
            </div>
          </div>
        </aside>
      </main>

      {/* Extra runs selection panel (inline) */}
      {extraPanel && (
        <div className="overlay">
          <div className="extraBox" role="dialog" aria-modal="true">
            <h4>Add {extraPanel.type} runs</h4>
            <p>Extra already gives 1 run. Choose additional runs (0–6):</p>

            <div className="extraButtons">
              {[0,1,2,3,4,5,6].map((n) => (
                <button key={n} className="btn extraSmall" onClick={() => chooseExtra(n)}>
                  {n}
                </button>
              ))}
            </div>

            <div className="extraActions">
              <button className="smallBtn" onClick={cancelExtra}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* small helper: maps ball string to CSS class */
function ballClass(b) {
  if (!b) return "";
  if (b.startsWith("WD")) return "extra";
  if (b.startsWith("NB")) return "extra";
  if (b === "W") return "wicket";
  if (b === "4") return "four";
  if (b === "6") return "six";
  if (b === "0") return "dot";
  return "";
}