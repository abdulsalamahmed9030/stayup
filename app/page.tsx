
"use client";

import { useCallback, useEffect, useState } from "react";

type Pattern =
  | "diamond-grid"
  | "stripes"
  | "checkerboard"
  | "dots"
  | "diagonal"
  | "grid"
  | "cubes";

type WakeLockSentinelLike = {
  release: () => Promise<void>;
  addEventListener: (
    type: "release",
    listener: () => void
  ) => void;
};

const SETTINGS_STORAGE_KEY = "mouse-jiggler-settings-v1";

const PATTERNS: { id: Pattern; label: string }[] = [
  { id: "diamond-grid", label: "Diamond Grid" },
  { id: "stripes", label: "Stripes" },
  { id: "checkerboard", label: "Checkerboard" },
  { id: "dots", label: "Dots" },
  { id: "diagonal", label: "Diagonal" },
  { id: "grid", label: "Grid" },
  { id: "cubes", label: "Cubes" },
];

export default function MouseJiggler() {
  const [isOn, setIsOn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pattern, setPattern] = useState<Pattern>("diamond-grid");
  const [speed, setSpeed] = useState(50);

  const [vibration, setVibration] = useState(false);
  const [vibrationIntervalMinutes, setVibrationIntervalMinutes] =
    useState(2);
  const [pulseDuration, setPulseDuration] = useState(500);
  const [vibrationSupported, setVibrationSupported] =
    useState<boolean | null>(null);

  const [wakeLockSupported, setWakeLockSupported] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);

  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [runSeconds, setRunSeconds] = useState(60);
  const [restSeconds, setRestSeconds] = useState(30);
  const [sessionRunning, setSessionRunning] = useState(false);
  const [phase, setPhase] = useState<"run" | "rest">("run");
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const duration = `${5.5 - (speed / 100) * 5}s`;

  // Restore saved preferences from this browser on page load.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SETTINGS_STORAGE_KEY);

      if (saved) {
        const settings: unknown = JSON.parse(saved);

        if (settings && typeof settings === "object") {
          const value = settings as Record<string, unknown>;

          if (PATTERNS.some((item) => item.id === value.pattern)) {
            setPattern(value.pattern as Pattern);
          }
          if (typeof value.speed === "number" && value.speed >= 1 && value.speed <= 100) {
            setSpeed(value.speed);
          }
          if (typeof value.vibration === "boolean") {
            setVibration(value.vibration);
          }
          if (typeof value.vibrationIntervalMinutes === "number" && value.vibrationIntervalMinutes >= 2 && value.vibrationIntervalMinutes <= 10) {
            setVibrationIntervalMinutes(value.vibrationIntervalMinutes);
          }
          if (typeof value.pulseDuration === "number" && value.pulseDuration >= 100 && value.pulseDuration <= 1000) {
            setPulseDuration(value.pulseDuration);
          }
          if (typeof value.scheduleEnabled === "boolean") {
            setScheduleEnabled(value.scheduleEnabled);
          }
          if (typeof value.runSeconds === "number" && value.runSeconds >= 1 && value.runSeconds <= 86400) {
            setRunSeconds(value.runSeconds);
          }
          if (typeof value.restSeconds === "number" && value.restSeconds >= 1 && value.restSeconds <= 86400) {
            setRestSeconds(value.restSeconds);
          }
        }
      }
    } catch {
      // Continue with defaults if storage is unavailable or invalid.
    } finally {
      setSettingsLoaded(true);
    }
  }, []);

  // Save preferences whenever the user changes a setting.
  // The loaded guard prevents defaults from overwriting saved values on startup.
  useEffect(() => {
    if (!settingsLoaded) return;

    try {
      window.localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({
          pattern,
          speed,
          vibration,
          vibrationIntervalMinutes,
          pulseDuration,
          scheduleEnabled,
          runSeconds,
          restSeconds,
        })
      );
    } catch {
      // The app remains usable if browser storage is disabled or full.
    }
  }, [
    settingsLoaded,
    pattern,
    speed,
    vibration,
    vibrationIntervalMinutes,
    pulseDuration,
    scheduleEnabled,
    runSeconds,
    restSeconds,
  ]);

  // Detect browser capabilities.
  useEffect(() => {
    setVibrationSupported(
      typeof navigator.vibrate === "function"
    );
    setWakeLockSupported("wakeLock" in navigator);
  }, []);

  // Vibration duration and interval are independently configurable.
  useEffect(() => {
    if (
      !isOn ||
      !vibration ||
      vibrationSupported !== true
    ) {
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.vibrate === "function"
      ) {
        navigator.vibrate(0);
      }
      return;
    }

    const pulse = () => {
      navigator.vibrate(pulseDuration);
    };

    pulse();

    const effectiveInterval = Math.max(
      vibrationIntervalMinutes * 60_000,
      pulseDuration + 100
    );

    const timer = window.setInterval(
      pulse,
      effectiveInterval
    );

    return () => {
      window.clearInterval(timer);
      navigator.vibrate(0);
    };
  }, [
    isOn,
    vibration,
    vibrationIntervalMinutes,
    pulseDuration,
    vibrationSupported,
  ]);

  // Request a screen wake lock while the page is visible.
  useEffect(() => {
    if (!wakeLockSupported) {
      setWakeLockActive(false);
      return;
    }

    let disposed = false;
    let sentinel: WakeLockSentinelLike | null = null;

    const requestLock = async () => {
      if (
        disposed ||
        document.visibilityState !== "visible"
      ) {
        return;
      }

      try {
        const lock = await navigator.wakeLock.request("screen");

        if (disposed) {
          await lock.release();
          return;
        }

        sentinel = lock as unknown as WakeLockSentinelLike;
        setWakeLockActive(true);

        sentinel.addEventListener("release", () => {
          if (!disposed) setWakeLockActive(false);
        });
      } catch {
        setWakeLockActive(false);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void requestLock();
      } else {
        setWakeLockActive(false);
      }
    };

    void requestLock();

    document.addEventListener(
      "visibilitychange",
      onVisibilityChange
    );

    return () => {
      disposed = true;

      document.removeEventListener(
        "visibilitychange",
        onVisibilityChange
      );

      setWakeLockActive(false);

      if (sentinel) void sentinel.release();
    };
  }, [wakeLockSupported]);

  // Countdown for automatic run/rest sessions.
  useEffect(() => {
    if (!scheduleEnabled || !sessionRunning) return;

    const timer = window.setInterval(() => {
      setSecondsLeft((current) =>
        Math.max(0, current - 1)
      );
    }, 1000);

    return () => window.clearInterval(timer);
  }, [scheduleEnabled, sessionRunning]);

  // Transition when a run or rest countdown finishes.
  useEffect(() => {
    if (
      !scheduleEnabled ||
      !sessionRunning ||
      secondsLeft > 0
    ) {
      return;
    }

    if (phase === "run") {
      setPhase("rest");
      setIsOn(false);
      setSecondsLeft(restSeconds);
    } else {
      setPhase("run");
      setIsOn(true);
      setSecondsLeft(runSeconds);
    }
  }, [
    secondsLeft,
    scheduleEnabled,
    sessionRunning,
    phase,
    runSeconds,
    restSeconds,
  ]);

  const start = useCallback(() => {
    if (scheduleEnabled) {
      setPhase("run");
      setSecondsLeft(runSeconds);
      setSessionRunning(true);
      setIsOn(true);
    } else {
      setIsOn(true);
    }
  }, [scheduleEnabled, runSeconds]);

  const stop = useCallback(() => {
    setIsOn(false);
    setSessionRunning(false);
    setPhase("run");
    setSecondsLeft(runSeconds);

    if (
      typeof navigator !== "undefined" &&
      typeof navigator.vibrate === "function"
    ) {
      navigator.vibrate(0);
    }
  }, [runSeconds]);

  const togglePower = () => {
    if (sessionRunning || isOn) {
      stop();
    } else {
      start();
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  };

  return (
    <main className="fullscreen-app">
      <div
        className={`fullscreen-pattern pattern-${pattern} ${
          isOn ? "moving" : ""
        }`}
        style={
          { "--speed": duration } as React.CSSProperties
        }
        aria-hidden="true"
      />

      <header className="top-bar">
        <div className="top-brand">
          <span className="brand-icon">M</span>
          <div>
            <h1>Mouse Jiggler</h1>
            <p>
              {isOn
                ? "PATTERN ACTIVE"
                : "PERSONAL PATTERN STUDIO"}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="menu-button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open settings"
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      <div className="session-status">
        <span
          className={`status-dot ${isOn ? "active" : ""}`}
        />

        <span>
          {scheduleEnabled && sessionRunning
            ? phase === "run"
              ? "RUNNING CYCLE"
              : "RESTING"
            : isOn
              ? "RUNNING"
              : "STOPPED"}
        </span>

        {scheduleEnabled && sessionRunning && (
          <strong>{formatTime(secondsLeft)}</strong>
        )}
      </div>

      <div className="center-controls">
        <button
          type="button"
          className={`round-power ${
            isOn ? "round-power-on" : ""
          }`}
          onClick={togglePower}
          aria-label={isOn ? "Stop pattern" : "Start pattern"}
          aria-pressed={isOn}
        >
          <span className="power-symbol">⏻</span>
          <span className="power-label">
            {isOn ? "STOP" : "START"}
          </span>
        </button>

        <p className="center-caption">
          {isOn
            ? "Pattern is running"
            : "Tap to start your pattern"}
        </p>
      </div>

      <footer className="bottom-bar">
        <span>
          {PATTERNS.find((item) => item.id === pattern)?.label}
        </span>
        <span className="bottom-divider" />
        <span>{speed}% SPEED</span>

        <button
          type="button"
          className="bottom-settings"
          onClick={() => setMenuOpen(true)}
        >
          SETTINGS
        </button>
      </footer>

      {menuOpen && (
        <div
          className="drawer-backdrop"
          onClick={() => setMenuOpen(false)}
        >
          <aside
            className="settings-drawer"
            onClick={(event) => event.stopPropagation()}
            aria-label="Application settings"
          >
            <div className="drawer-header">
              <div>
                <h2>Settings</h2>
                <p>Settings are saved automatically on this browser</p>
              </div>

              <button
                type="button"
                className="close-button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close settings"
              >
                ×
              </button>
            </div>

            <div className="drawer-content">
              <section className="setting-section">
                <h3>Pattern style</h3>

                <div className="drawer-patterns">
                  {PATTERNS.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      className={`drawer-pattern ${
                        pattern === item.id ? "selected" : ""
                      }`}
                      onClick={() => setPattern(item.id)}
                      aria-pressed={pattern === item.id}
                    >
                      <span
                        className={`mini-pattern pattern-${item.id}`}
                      />
                      <span>{item.label}</span>

                      {pattern === item.id && (
                        <span className="selected-mark">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </section>

              <section className="setting-section">
                <div className="setting-heading">
                  <h3>Animation speed</h3>
                  <strong>{speed}%</strong>
                </div>

                <input
                  type="range"
                  min="1"
                  max="100"
                  value={speed}
                  aria-label="Animation speed"
                  onChange={(event) =>
                    setSpeed(Number(event.target.value))
                  }
                />

                <div className="range-labels">
                  <span>Slow</span>
                  <span>Fast</span>
                </div>
              </section>

              <section className="setting-section">
                <div className="setting-heading">
                  <div>
                    <h3>Vibration</h3>
                    <p className="muted">
                      {vibrationSupported === null
                        ? "Checking support..."
                        : vibrationSupported
                          ? "Phone vibration"
                          : "Not supported by this browser"}
                    </p>
                  </div>

                  <button
                    type="button"
                    className={`switch ${
                      vibration ? "switch-on" : ""
                    }`}
                    role="switch"
                    aria-label="Enable vibration"
                    aria-checked={vibration}
                    disabled={vibrationSupported !== true}
                    onClick={() =>
                      setVibration((current) => !current)
                    }
                  >
                    <span />
                  </button>
                </div>

                <div
                  className="setting-heading"
                  style={{ marginTop: "20px" }}
                >
                  <label
                    className="field-label"
                    htmlFor="vibration-interval"
                    style={{ marginTop: 0 }}
                  >
                    Vibration interval
                  </label>
                  <strong>
                    {vibrationIntervalMinutes} {vibrationIntervalMinutes === 1 ? "minute" : "minutes"}
                  </strong>
                </div>

                <input
                  id="vibration-interval"
                  type="range"
                  min="2"
                  max="10"
                  step="1"
                  value={vibrationIntervalMinutes}
                  onChange={(event) =>
                    setVibrationIntervalMinutes(Number(event.target.value))
                  }
                  aria-label="Vibration interval in minutes"
                />

                <div className="range-labels">
                  <span>2 min</span>
                  <span>10 min</span>
                </div>

                <p className="muted schedule-note">
                  Request a vibration pulse every {vibrationIntervalMinutes} {vibrationIntervalMinutes === 1 ? "minute" : "minutes"} while vibration is enabled.
                </p>

                <label
                  className="field-label"
                  htmlFor="pulse-duration"
                >
                  Pulse duration: {pulseDuration} ms
                </label>

                <input
                  id="pulse-duration"
                  type="range"
                  min="100"
                  max="1000"
                  step="50"
                  value={pulseDuration}
                  onChange={(event) =>
                    setPulseDuration(Number(event.target.value))
                  }
                />

                <div className="range-labels">
                  <span>100 ms</span>
                  <span>1000 ms</span>
                </div>

                <p className="muted schedule-note">
                  Duration controls how long each vibration
                  request lasts. Interval controls how often
                  another pulse is requested.
                </p>
              </section>

              <section className="setting-section">
                <div className="setting-heading">
                  <div>
                    <h3>Automatic schedule</h3>
                    <p className="muted">
                      Alternate between running and resting
                    </p>
                  </div>

                  <button
                    type="button"
                    className={`switch ${
                      scheduleEnabled ? "switch-on" : ""
                    }`}
                    role="switch"
                    aria-label="Enable automatic schedule"
                    aria-checked={scheduleEnabled}
                    onClick={() => {
                      if (sessionRunning) stop();

                      setScheduleEnabled(
                        (current) => !current
                      );
                    }}
                  >
                    <span />
                  </button>
                </div>

                <div className="number-fields">
                  <label>
                    Run duration (seconds)
                    <input
                      type="number"
                      min="1"
                      max="86400"
                      value={runSeconds}
                      onChange={(event) =>
                        setRunSeconds(
                          Math.max(
                            1,
                            Math.min(
                              86400,
                              Number(event.target.value) || 1
                            )
                          )
                        )
                      }
                    />
                  </label>

                  <label>
                    Rest duration (seconds)
                    <input
                      type="number"
                      min="1"
                      max="86400"
                      value={restSeconds}
                      onChange={(event) =>
                        setRestSeconds(
                          Math.max(
                            1,
                            Math.min(
                              86400,
                              Number(event.target.value) || 1
                            )
                          )
                        )
                      }
                    />
                  </label>
                </div>

                <p className="muted schedule-note">
                  Start the pattern to begin the repeating schedule.
                </p>
              </section>

              <section className="setting-section">
                <div className="setting-heading">
                  <div>
                    <h3>Keep screen awake</h3>
                    <p className="muted">
                      {wakeLockActive
                        ? "Screen wake lock is active"
                        : wakeLockSupported
                          ? "Requesting screen wake lock when this page is visible"
                          : "This browser does not support screen wake lock"}
                    </p>
                  </div>
                  <span aria-hidden="true" style={{ fontSize: "20px" }}>
                    {wakeLockActive ? "✓" : wakeLockSupported ? "◷" : "!"}
                  </span>
                </div>

                <p className="muted schedule-note">
                  The app automatically requests that your screen stay on while this page is open and visible. Your browser or device may still release the lock because of battery settings, power-saving modes, or system policies. Keep this page in the foreground.
                </p>
              </section>

              <p className="drawer-notice">
                This app animates the displayed pattern. It
                does not generate operating-system mouse input
                or override enforced screen-lock policies.
              </p>
            </div>

            <button
              type="button"
              className="done-button"
              onClick={() => setMenuOpen(false)}
            >
              DONE
            </button>
          </aside>
        </div>
      )}
    </main>
  );
}
 