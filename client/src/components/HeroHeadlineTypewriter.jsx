import { useEffect, useRef, useState } from "react";

const CHAR_MS = 48;
const PAUSE_AFTER_L1_MS = 200;
const PAUSE_AFTER_L2_MS = 260;
const SUB_CHAR_MS = 28;

export default function HeroHeadlineTypewriter({
  titleLine1,
  titleLine2,
  subtitle,
  onTypingComplete,
}) {
  const L1 = titleLine1 ?? "";
  const L2 = titleLine2 ?? "";
  const SUB = subtitle ?? "";

  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [sub, setSub] = useState("");
  const [phase, setPhase] = useState("l1");
  const [subStarted, setSubStarted] = useState(false);
  const onTypingCompleteRef = useRef(onTypingComplete);
  onTypingCompleteRef.current = onTypingComplete;

  useEffect(() => {
    let cancelled = false;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    setLine1("");
    setLine2("");
    setSub("");
    setPhase("l1");
    setSubStarted(false);

    const run = async () => {
      const reduceMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (!L1.length && !L2.length && !SUB.length) {
        setPhase("done");
        onTypingCompleteRef.current?.();
        return;
      }

      if (reduceMotion) {
        setLine1(L1);
        setLine2(L2);
        setSub(SUB);
        setPhase("done");
        setSubStarted(true);
        onTypingCompleteRef.current?.();
        return;
      }

      for (let i = 1; i <= L1.length; i++) {
        if (cancelled) return;
        setLine1(L1.slice(0, i));
        await sleep(CHAR_MS);
      }
      setPhase("l2");
      await sleep(PAUSE_AFTER_L1_MS);
      if (cancelled) return;

      for (let i = 1; i <= L2.length; i++) {
        if (cancelled) return;
        setLine2(L2.slice(0, i));
        await sleep(CHAR_MS);
      }
      setPhase("sub");
      await sleep(PAUSE_AFTER_L2_MS);
      if (cancelled) return;

      setSubStarted(true);
      for (let i = 1; i <= SUB.length; i++) {
        if (cancelled) return;
        setSub(SUB.slice(0, i));
        await sleep(SUB_CHAR_MS);
      }
      setPhase("done");
      onTypingCompleteRef.current?.();
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [L1, L2, SUB]);

  const showCursorL1 = phase === "l1" && line1.length < L1.length;
  const showCursorL2 = phase === "l2" && line2.length < L2.length;
  const showCursorSub = phase === "sub" && sub.length < SUB.length;

  return (
    <>
      <h1
        className="home-hero-title-calligraphy home-hero-title-calligraphy--type"
        aria-label={`${L1} ${L2}`.trim()}
      >
        <span className="home-hero-title-calligraphy__line1">
          {line1}
          {showCursorL1 ? (
            <span className="home-hero-type-cursor" aria-hidden>
              |
            </span>
          ) : null}
        </span>
        <span className="home-hero-title-calligraphy__line2">
          {line2}
          {showCursorL2 ? (
            <span className="home-hero-type-cursor" aria-hidden>
              |
            </span>
          ) : null}
        </span>
      </h1>
      <p
        className={`home-hero-sub${subStarted ? " home-hero-sub--typing-started" : ""}`}
      >
        <span className="home-hero-sub__gradient">
          {sub}
          {showCursorSub ? (
            <span className="home-hero-type-cursor home-hero-type-cursor--sub" aria-hidden>
              |
            </span>
          ) : null}
        </span>
      </p>
    </>
  );
}
