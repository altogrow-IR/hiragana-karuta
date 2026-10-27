import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";

type Mode = "easy" | "normal";
type Phase = "start" | "playing" | "clear";

interface CardDef {
  kana: string;
  word: string;
  emoji: string;
}

interface SaveData {
  bestEasy: number | null;
  bestNormal: number | null;
  clearsEasy: number;
  clearsNormal: number;
}

const SAVE_KEY = "hiragana-karuta-save-v1";
const CARD_COUNT: Record<Mode, number> = { easy: 6, normal: 12 };

// ひらがな・単語・絵文字が正しく対応する札だけを使う
const CARDS: CardDef[] = [
  { kana: "あ", word: "あめ", emoji: "🍬" },
  { kana: "い", word: "いぬ", emoji: "🐶" },
  { kana: "う", word: "うさぎ", emoji: "🐰" },
  { kana: "え", word: "えんぴつ", emoji: "✏️" },
  { kana: "お", word: "おにぎり", emoji: "🍙" },
  { kana: "か", word: "かえる", emoji: "🐸" },
  { kana: "き", word: "きつね", emoji: "🦊" },
  { kana: "く", word: "くま", emoji: "🐻" },
  { kana: "け", word: "けーき", emoji: "🍰" },
  { kana: "こ", word: "こあら", emoji: "🐨" },
  { kana: "さ", word: "さくら", emoji: "🌸" },
  { kana: "し", word: "しか", emoji: "🦌" },
  { kana: "す", word: "すいか", emoji: "🍉" },
  { kana: "た", word: "たこ", emoji: "🐙" },
  { kana: "ち", word: "ちょう", emoji: "🦋" },
  { kana: "つ", word: "つき", emoji: "🌙" },
  { kana: "て", word: "てぶくろ", emoji: "🧤" },
  { kana: "と", word: "とり", emoji: "🐦" },
  { kana: "な", word: "なす", emoji: "🍆" },
  { kana: "に", word: "にじ", emoji: "🌈" },
  { kana: "ぬ", word: "ぬいぐるみ", emoji: "🧸" },
  { kana: "ね", word: "ねこ", emoji: "🐱" },
  { kana: "は", word: "はな", emoji: "🌷" },
  { kana: "ひ", word: "ひまわり", emoji: "🌻" },
  { kana: "ふ", word: "ふね", emoji: "🚢" },
  { kana: "へ", word: "へび", emoji: "🐍" },
  { kana: "ほ", word: "ほし", emoji: "⭐" },
  { kana: "ま", word: "まめ", emoji: "🫘" },
  { kana: "み", word: "みかん", emoji: "🍊" },
  { kana: "む", word: "むし", emoji: "🐛" },
  { kana: "め", word: "めがね", emoji: "👓" },
  { kana: "も", word: "もも", emoji: "🍑" },
  { kana: "や", word: "やま", emoji: "⛰️" },
  { kana: "ゆ", word: "ゆき", emoji: "⛄" },
  { kana: "よ", word: "よっと", emoji: "⛵" },
  { kana: "ら", word: "らいおん", emoji: "🦁" },
  { kana: "り", word: "りんご", emoji: "🍎" },
  { kana: "れ", word: "れもん", emoji: "🍋" },
  { kana: "ろ", word: "ろうそく", emoji: "🕯️" },
  { kana: "わ", word: "わに", emoji: "🐊" },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<SaveData>;
      return {
        bestEasy: typeof p.bestEasy === "number" ? p.bestEasy : null,
        bestNormal: typeof p.bestNormal === "number" ? p.bestNormal : null,
        clearsEasy: typeof p.clearsEasy === "number" ? p.clearsEasy : 0,
        clearsNormal: typeof p.clearsNormal === "number" ? p.clearsNormal : 0,
      };
    }
  } catch {
    // ignore
  }
  return { bestEasy: null, bestNormal: null, clearsEasy: 0, clearsNormal: 0 };
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  if (m <= 0) return `${s}びょう`;
  return `${m}ふん ${s}びょう`;
}

function speak(text: string) {
  try {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const uttr = new SpeechSynthesisUtterance(text);
    uttr.lang = "ja-JP";
    uttr.rate = 0.85;
    window.speechSynthesis.speak(uttr);
  } catch {
    // 読み上げが使えない環境ではテキスト表示だけで遊べる
  }
}

export default function App() {
  const [phase, setPhase] = useState<Phase>("start");
  const [mode, setMode] = useState<Mode>("easy");
  const [save, setSave] = useState<SaveData>(() => loadSave());

  // 今回のゲーム
  const [board, setBoard] = useState<CardDef[]>([]); // 並んだ取り札（表示順）
  const [queue, setQueue] = useState<CardDef[]>([]); // 出題順
  const [qIndex, setQIndex] = useState(0); // いま何問目か
  const [taken, setTaken] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState("");
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [busy, setBusy] = useState(false); // 正解直後の待ち時間

  const [elapsed, setElapsed] = useState(0);
  const startAtRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const current: CardDef | null = queue[qIndex] ?? null;
  const totalClears = save.clearsEasy + save.clearsNormal;
  const bestForMode = mode === "easy" ? save.bestEasy : save.bestNormal;

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopTimer();
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      try {
        window.speechSynthesis?.cancel();
      } catch {
        // ignore
      }
    };
  }, [stopTimer]);

  const startGame = (m: Mode) => {
    const picked = shuffle(CARDS).slice(0, CARD_COUNT[m]);
    setMode(m);
    setBoard(shuffle(picked));
    setQueue(shuffle(picked));
    setQIndex(0);
    setTaken(new Set());
    setFeedback("");
    setIsNewRecord(false);
    setBusy(false);
    setElapsed(0);
    setPhase("playing");
    startAtRef.current = Date.now();
    stopTimer();
    timerRef.current = window.setInterval(() => {
      if (startAtRef.current !== null) {
        setElapsed((Date.now() - startAtRef.current) / 1000);
      }
    }, 100);
  };

  const finishGame = useCallback(
    (seconds: number) => {
      stopTimer();
      setPhase("clear");
      const bestKey = mode === "easy" ? "bestEasy" : "bestNormal";
      const clearsKey = mode === "easy" ? "clearsEasy" : "clearsNormal";
      const prevBest = save[bestKey];
      const isBetter = prevBest === null || seconds < prevBest;
      setIsNewRecord(isBetter);
      const next: SaveData = {
        ...save,
        [bestKey]: isBetter ? Math.round(seconds * 10) / 10 : prevBest,
        [clearsKey]: save[clearsKey] + 1,
      };
      setSave(next);
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
    },
    [mode, save, stopTimer],
  );

  const handleTap = (card: CardDef) => {
    if (phase !== "playing" || busy || !current) return;
    if (taken.has(card.kana)) return;
    if (card.kana === current.kana) {
      const nextTaken = new Set(taken);
      nextTaken.add(card.kana);
      setTaken(nextTaken);
      setFeedback(`やったね！ ${card.emoji} ${card.word} だね！`);
      speak(`${card.word}。せいかい！`);
      setBusy(true);
      timeoutRef.current = window.setTimeout(() => {
        setBusy(false);
        setFeedback("");
        if (nextTaken.size >= queue.length) {
          const seconds =
            startAtRef.current !== null
              ? (Date.now() - startAtRef.current) / 1000
              : elapsed;
          setElapsed(seconds);
          finishGame(seconds);
        } else {
          setQIndex((i) => i + 1);
        }
      }, 900);
    } else {
      setFeedback("ちがうよ、もういっかい さがしてね");
    }
  };

  const speakCurrent = () => {
    if (!current) return;
    speak(`${current.word}の ${current.kana}。${current.word}は どこかな？`);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🌈 ひらがなカルタ</h1>
        <p className="subtitle">よみふだを きいて、あう ふだを タップしてね</p>
      </header>

      {phase === "start" && (
        <main className="panel">
          <p className="howto">
            よみふだの ことばに あう「とりふだ」を さがす あそびです。
            <br />
            まちがえても だいじょうぶ。ぜんぶ とれたら クリア！
          </p>
          <div className="sample" aria-hidden="true">
            <span>🍬 あめ</span>
            <span>🐶 いぬ</span>
            <span>🐰 うさぎ</span>
          </div>
          <p className="label">モードを えらんでね</p>
          <div className="mode-row">
            <button
              type="button"
              className={`mode-btn ${mode === "easy" ? "selected" : ""}`}
              onClick={() => setMode("easy")}
            >
              かんたん
              <small>ふだ 6まい</small>
            </button>
            <button
              type="button"
              className={`mode-btn ${mode === "normal" ? "selected" : ""}`}
              onClick={() => setMode("normal")}
            >
              ふつう
              <small>ふだ 12まい</small>
            </button>
          </div>
          <button type="button" className="big-btn" onClick={() => startGame(mode)}>
            ▶ スタート
          </button>
          <div className="records">
            <p>クリアした かず： {totalClears}かい</p>
            <p>
              ベストタイム（かんたん）：
              {save.bestEasy !== null ? formatTime(save.bestEasy) : "まだ ないよ"}
            </p>
            <p>
              ベストタイム（ふつう）：
              {save.bestNormal !== null ? formatTime(save.bestNormal) : "まだ ないよ"}
            </p>
          </div>
        </main>
      )}

      {phase === "playing" && current && (
        <main>
          <section className="read-card" aria-live="polite">
            <div className="read-kana" aria-hidden="true">
              {current.kana}
            </div>
            <div className="read-text">
              <p className="read-phrase">
                {current.word}の <strong>{current.kana}</strong>！
              </p>
              <p className="read-hint">
                {current.emoji} {current.word}は どこかな？
              </p>
            </div>
            <button type="button" className="speak-btn" onClick={speakCurrent}>
              🔊 よんで
            </button>
          </section>

          <div className="status-row">
            <span>
              とった ふだ： {taken.size} / {queue.length}まい
            </span>
            <span>⏱ {formatTime(elapsed)}</span>
          </div>
          <div className="progress" aria-hidden="true">
            <div
              className="progress-bar"
              style={{ width: `${queue.length ? (taken.size / queue.length) * 100 : 0}%` }}
            />
          </div>

          <p className={`feedback ${feedback.startsWith("やった") ? "ok" : ""}`} aria-live="polite">
            {feedback || " "}
          </p>

          <section className={`board board-${mode}`} aria-label="とりふだ">
            {board.map((card) => {
              const isTaken = taken.has(card.kana);
              return (
                <button
                  key={card.kana}
                  type="button"
                  className={`card ${isTaken ? "taken" : ""}`}
                  onClick={() => handleTap(card)}
                  disabled={isTaken}
                  aria-label={isTaken ? `${card.word} とった` : card.word}
                >
                  <span className="card-emoji">{card.emoji}</span>
                  <span className="card-word">{card.word}</span>
                  <span className="card-kana">{card.kana}</span>
                  {isTaken && <span className="card-check">✅ とった！</span>}
                </button>
              );
            })}
          </section>

          <button
            type="button"
            className="sub-btn"
            onClick={() => {
              stopTimer();
              setPhase("start");
            }}
          >
            やめる
          </button>
        </main>
      )}

      {phase === "clear" && (
        <main className="panel clear-panel">
          <p className="clear-emoji" aria-hidden="true">
            🎉🌈🎉
          </p>
          <h2>クリア！ おめでとう！</h2>
          <p>
            モード： {mode === "easy" ? "かんたん" : "ふつう"}（ふだ {queue.length}まい）
          </p>
          <p>かかった じかん： {formatTime(elapsed)}</p>
          <p>せいかいした かず： {queue.length}まい ぜんぶ！</p>
          {isNewRecord && <p className="new-record">🏆 ベストタイム こうしん！</p>}
          <p>
            このモードの ベストタイム：
            {bestForMode !== null ? formatTime(bestForMode) : formatTime(elapsed)}
          </p>
          <p>クリアした かず： {totalClears}かい</p>
          <button type="button" className="big-btn" onClick={() => startGame(mode)}>
            もういっかい あそぶ
          </button>
          <button type="button" className="sub-btn" onClick={() => setPhase("start")}>
            モードを えらびなおす
          </button>
        </main>
      )}

      <footer className="footer">
        <p>ひらがなカルタ ／ ふだは ぜんぶで {CARDS.length}しゅるい あるよ</p>
      </footer>
    </div>
  );
}
