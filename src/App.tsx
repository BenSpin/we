import React, { useEffect, useMemo, useRef, useState } from "react";
import type { JSX } from "react";
import confetti, { type Options as ConfettiOptions, type Shape } from "canvas-confetti";

/**
 * Wedding RSVP — Google Sheets (Apps Script)
 * - Initial YES => "throw everywhere" dual-volley.
 * - After YES => one button: random shoot burst.
 * - If NO is selected => dark theme so snow shows up better.
 * - Full-screen canvas (DPR aware), buttons remain clickable post-submit.
 */

// === Endpoints ===
const ENDPOINT_URL =
  "https://script.google.com/macros/s/AKfycbzlYikEiuwwHP-JnVJo7mIjVhhPFvdISkPD-Q3vVgEO2-RqY25jIP4qHw1hO8iACS5i/exec" as const;
const GITHUB_ENDPOINT = "" as const;

// === Security knobs ===
const TOKEN_REQUIRED = false as const;
const MIN_FILL_SECONDS = 3 as const;

// === UI ===
const HERO_IMAGE_URL =
  "https://images.unsplash.com/photo-1629744418692-345355518e78?auto=format&fit=crop&q=80&w=1470" as const;

// === Transport options (EXACT strings) ===
const PICKUP_ZONES = [
  "Hyatt Place Waikiki Beach",
  "Hilton Garden Inn Waikiki Beach",
  "Waimanalo Beach Cottages",
  "Kaneohe Paradise Bay Resort",
  "I'll do my own ride"
] as const;

const HOME_TIMES = ["9:30 pm", "11 pm", "Midnight"] as const;

type PickupZone = (typeof PICKUP_ZONES)[number] | "";
type HomeTime = (typeof HOME_TIMES)[number] | "";

// === Types ===
type Attending = "yes" | "no" | "";

interface Address {
  line1: string;
  line2: string;
  city: string;
  region: string;
  postal: string;
  country: string;
}

interface Payload {
  timestamp_iso: string;
  attending: Attending;
  respondent_name: string;

  email: string;
  party_names: string[];
  share_address: boolean;
  address: Address | null;
  notes: string | null;

  // NEW transport fields
  pickup_zone: PickupZone;
  transport_home_time: HomeTime;

  token: string | null;
  user_agent: string;
  fill_seconds: number;
}

function useQueryParam(name: string) {
  return useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get(name) ?? "";
  }, [name]);
}

export default function WeddingRSVP(): JSX.Element {
  const urlToken = useQueryParam("t");
  const resetFlag = useQueryParam("reset");

  // Form state
  const [attending, setAttending] = useState<Attending>("");
  const [primaryName, setPrimaryName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [partyNames, setPartyNames] = useState<string[]>([""]);
  const [shareAddress, setShareAddress] = useState<boolean>(false);
  const [addr, setAddr] = useState<Address>({
    line1: "",
    line2: "",
    city: "",
    region: "",
    postal: "",
    country: "",
  });
  const [notes, setNotes] = useState<string>("");

  // NEW transport fields
  const [pickupZone, setPickupZone] = useState<PickupZone>("");
  const [homeTime, setHomeTime] = useState<HomeTime>("");

  // UX state
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [ok, setOk] = useState<boolean | null>(null);
  const [msg, setMsg] = useState<string>("");
  const [locked, setLocked] = useState<boolean>(false);

  const startedAtRef = useRef<number>(Date.now());

  // Confetti canvas & instance
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const confettiInstance = useRef<ReturnType<typeof confetti.create> | null>(null);

  // Reset lock via ?reset=1
  useEffect(() => {
    if (resetFlag === "1") {
      sessionStorage.removeItem("rsvp_submitted");
      setLocked(false);
    } else if (sessionStorage.getItem("rsvp_submitted") === "1") {
      setLocked(true);
    }
  }, [resetFlag]);

  // Create a full-screen, DPR-aware canvas and confetti instance
  useEffect(() => {
    const cvs = confettiCanvasRef.current;
    if (!cvs) return;

    const resizeCanvas = () => {
      const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
      cvs.width = Math.floor(window.innerWidth * dpr);
      cvs.height = Math.floor(window.innerHeight * dpr);
      cvs.style.width = "100vw";
      cvs.style.height = "100vh";
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    confettiInstance.current = confetti.create(cvs, { resize: true, useWorker: true });

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      confettiInstance.current = null;
    };
  }, []);

  const getC = () => confettiInstance.current ?? confetti;

  // === Confetti effects ===

  // INITIAL YES: "throw everywhere" dual-volley
  const throwEverywhere = () => {
    const c = getC();
    const duration = 15 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 } as const;

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function () {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);

      const particleCount = 100 * (timeLeft / duration);

      c(
        Object.assign({}, defaults, {
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        })
      );
      c(
        Object.assign({}, defaults, {
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        })
      );
    }, 200);
  };

  // AFTER YES: heart burst
    const randomShoot = () => {
    const c = getC();

    const defaults: ConfettiOptions = {
      spread: 360,
      ticks: 100,
      gravity: 0,
      decay: 0.94,
      startVelocity: 30,
      colors: ["#FFC0CB", "#FF69B4", "#FF1493", "#C71585"],
      origin: { y: 0.6 },
    };

    c({ ...defaults, particleCount: 50, scalar: 1 });
    c({ ...defaults, particleCount: 25, scalar: 1.2 });
    c({ ...defaults, particleCount: 10, scalar: 1.4 });
  };



  // NO: gentle snow/drizzle (white particles look best on dark theme)
  const gentleDrizzle = () => {
    const c = getC();
    const duration = 12 * 1000;
    const animationEnd = Date.now() + duration;
    let skew = 1;

    function rand(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    (function frame() {
      const timeLeft = animationEnd - Date.now();
      const ticks = Math.max(220, 520 * (timeLeft / duration));
      skew = Math.max(0.75, skew - 0.0012);

      c({
        particleCount: 2,
        startVelocity: 0,
        ticks,
        origin: { x: Math.random(), y: Math.random() * skew - 0.2 },
        colors: ["#ffffff"],
        shapes: ["circle"],
        gravity: rand(0.45, 0.65),
        scalar: rand(0.5, 1.2),
        drift: rand(-0.5, 0.5),
      });

      if (timeLeft > 0) requestAnimationFrame(frame);
    })();
  };

  // Helpers
  const addPartyMember = () => setPartyNames((p) => [...p, ""]);
  const removePartyMember = (i: number) => setPartyNames((p) => p.filter((_, idx) => idx !== i));
  const updatePartyMember = (i: number, v: string) =>
    setPartyNames((p) => p.map((x, idx) => (idx === i ? v : x)));

  const validate = (): string | null => {
    if (TOKEN_REQUIRED && !urlToken)
      return "This RSVP link is missing its token. Please use the link you received.";
    const dt = (Date.now() - startedAtRef.current) / 1000;
    if (dt < MIN_FILL_SECONDS) return "That was a bit fast—please review and submit again.";
    if (!primaryName.trim()) return "Please enter your name.";
    if (!attending) return "Please select if you're attending.";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return "Please enter a valid email (or leave it blank).";
    if (shareAddress && !addr.line1.trim())
      return "Please provide at least Address line 1 if sharing your address.";

    // Transport fields are only relevant if attending === "yes"
    if (attending === "yes") {
      if (!pickupZone) return "Please select a preferred pickup zone.";
      if (!homeTime) return "Please select a preferred time for transport home.";
    }

    return null;
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (locked) return;

    const err = validate();
    if (err) {
      setOk(false);
      setMsg(err);
      return;
    }

    setSubmitting(true);
    setOk(null);
    setMsg("");

    const payload: Payload = {
      timestamp_iso: new Date().toISOString(),
      attending,
      respondent_name: primaryName.trim(),
      email: email.trim(),
      party_names: partyNames.map((n) => n.trim()).filter(Boolean),
      share_address: shareAddress,
      address: shareAddress ? addr : null,
      notes: notes.trim() || null,

      // NEW fields (send empty strings when not attending)
      pickup_zone: attending === "yes" ? pickupZone : "",
      transport_home_time: attending === "yes" ? homeTime : "",

      token: urlToken || null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      fill_seconds: Math.round((Date.now() - startedAtRef.current) / 1000),
    };

    try {
      if (ENDPOINT_URL) {
        await fetch(ENDPOINT_URL, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload),
        });
      }
      if (GITHUB_ENDPOINT) {
        await fetch(GITHUB_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      setOk(true);
      setMsg(
        attending === "yes"
          ? "🎉 Yay! You’re in , we can’t wait to celebrate with you."
          : "💛 Bummer, we’ll miss you, and thanks for letting us know."
      );
      setLocked(true);
      sessionStorage.setItem("rsvp_submitted", "1");

      if (attending === "yes") {
        throwEverywhere();
      } else {
        gentleDrizzle();
      }
    } catch (error) {
      console.error(error);
      setOk(false);
      setMsg("We couldn't submit right now. Please try again or contact us directly.");
    } finally {
      setSubmitting(false);
    }
  };

  const canCelebrate = locked && attending === "yes";
  const canConsole = locked && attending === "no";

  // === Theme (dark when attending = no) ===
  const dark = attending === "no";
  const pageBg = dark ? "bg-neutral-950 text-neutral-100" : "bg-neutral-50 text-neutral-900";
  const cardBg = dark ? "bg-neutral-900 ring-white/10" : "bg-white ring-black/5";
  const inputBg = dark ? "bg-neutral-950 border-white/15 text-neutral-100" : "bg-white border-black/15 text-neutral-900";
  const helperText = dark ? "text-neutral-300" : "text-neutral-500";
  const footerText = dark ? "text-neutral-500" : "text-neutral-400";

  return (
    <div className={`min-h-screen relative ${pageBg}`}>
      {/* Confetti canvas overlay */}
      <canvas ref={confettiCanvasRef} className="fixed inset-0 pointer-events-none z-[9999]" />

      {/* Dev-only reset */}
      {import.meta.env.DEV && (
        <button
          type="button"
          onClick={() => {
            sessionStorage.removeItem("rsvp_submitted");
            location.reload();
          }}
          className="fixed right-3 top-3 z-[10000] rounded-lg bg-black/80 px-3 py-1.5 text-xs text-white"
        >
          Reset (dev)
        </button>
      )}

      {/* Hero */}
      <div className="relative isolate">
        <img src={HERO_IMAGE_URL} alt="Couple" className="h-72 w-full object-cover" />
        <div className={`absolute inset-0 ${dark ? "bg-black/55" : "bg-black/30"}`} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white drop-shadow">
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">RSVP</h1>
            <p className="mt-2 text-lg">We’re so excited to celebrate with you!</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className={`rounded-2xl p-6 shadow-sm ring-1 ${cardBg}`}>
          <form onSubmit={handleSubmit}>
            {TOKEN_REQUIRED && !urlToken && (
              <div className="mb-4 rounded-xl bg-yellow-50 p-3 text-sm text-yellow-800">
                This RSVP link is missing its token. Please use the unique link you received.
              </div>
            )}

            <div className="grid gap-6">
              <div>
                <label className="block text-sm font-medium">Are you attending?</label>
                <div className="mt-2 flex gap-4">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="attending"
                      value="yes"
                      checked={attending === "yes"}
                      onChange={() => setAttending("yes")}
                      className="size-4"
                      disabled={locked || submitting}
                    />
                    <span>Yes</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="attending"
                      value="no"
                      checked={attending === "no"}
                      onChange={() => setAttending("no")}
                      className="size-4"
                      disabled={locked || submitting}
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium">Your name</label>
                <input
                  className={`mt-2 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 ${inputBg}`}
                  placeholder="Full name"
                  value={primaryName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrimaryName(e.target.value)}
                  disabled={locked || submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Best email (optional)</label>
                <input
                  className={`mt-2 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 ${inputBg}`}
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  disabled={locked || submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Names of people in your party</label>
                <p className={`mt-1 text-xs ${helperText}`}>Add each name attending from your household/invite.</p>
                <div className="mt-3 grid gap-2">
                  {partyNames.map((n, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        className={`w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 ${inputBg}`}
                        placeholder={`Guest ${i + 1} full name`}
                        value={n}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updatePartyMember(i, e.target.value)}
                        disabled={locked || submitting}
                      />
                      {partyNames.length > 1 && (
                        <button
                          type="button"
                          className={`rounded-xl border px-3 py-2 text-sm ${dark ? "border-white/15" : "border-black/15"}`}
                          onClick={() => removePartyMember(i)}
                          disabled={locked || submitting}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className={`mt-1 w-fit rounded-xl border px-3 py-2 text-sm ${dark ? "border-white/15" : "border-black/15"}`}
                    onClick={addPartyMember}
                    disabled={locked || submitting}
                  >
                    + Add another
                  </button>
                </div>
              </div>

              {/* NEW: Transport fields (shown only if attending === yes) */}
              {attending === "yes" && (
                <div className="grid gap-4">
                  <div>
                    <label className="block text-sm font-medium">Preferred pickup zone</label>
                    <select
                      className={`mt-2 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 ${inputBg}`}
                      value={pickupZone}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        setPickupZone(e.target.value as PickupZone)
                      }
                      disabled={locked || submitting}
                    >
                      <option value="">Select a pickup zone…</option>
                      {PICKUP_ZONES.map((z) => (
                        <option key={z} value={z}>
                          {z}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium">Preferred time for transport home</label>
                    <select
                      className={`mt-2 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 ${inputBg}`}
                      value={homeTime}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        setHomeTime(e.target.value as HomeTime)
                      }
                      disabled={locked || submitting}
                    >
                      <option value="">Select a departure time…</option>
                      {HOME_TIMES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <p className={`mt-1 text-xs ${helperText}`}>
                      You're not locked in. This is just to help us figure out some general timing :) 
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={shareAddress}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setShareAddress(e.target.checked)}
                    disabled={locked || submitting}
                  />
                  <span>Share your current mailing address (for thank you cards)?</span>
                </label>
                {shareAddress && (
                  <div className="mt-3 grid gap-2">
                    <input
                      className={`w-full rounded-xl border px-3 py-2 ${inputBg}`}
                      placeholder="Address line 1"
                      value={addr.line1}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddr({ ...addr, line1: e.target.value })}
                      disabled={locked || submitting}
                    />
                    <input
                      className={`w-full rounded-xl border px-3 py-2 ${inputBg}`}
                      placeholder="Address line 2 (optional)"
                      value={addr.line2}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddr({ ...addr, line2: e.target.value })}
                      disabled={locked || submitting}
                    />
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      <input
                        className={`rounded-xl border px-3 py-2 ${inputBg}`}
                        placeholder="City"
                        value={addr.city}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddr({ ...addr, city: e.target.value })}
                        disabled={locked || submitting}
                      />
                      <input
                        className={`rounded-xl border px-3 py-2 ${inputBg}`}
                        placeholder="State/Region"
                        value={addr.region}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddr({ ...addr, region: e.target.value })}
                        disabled={locked || submitting}
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      <input
                        className={`rounded-xl border px-3 py-2 ${inputBg}`}
                        placeholder="Postal code"
                        value={addr.postal}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddr({ ...addr, postal: e.target.value })}
                        disabled={locked || submitting}
                      />
                      <input
                        className={`rounded-xl border px-3 py-2 ${inputBg}`}
                        placeholder="Country"
                        value={addr.country}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddr({ ...addr, country: e.target.value })}
                        disabled={locked || submitting}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium">Notes (dietary needs, accessibility, etc.)</label>
                <textarea
                  className={`mt-2 min-h-24 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 ${inputBg}`}
                  placeholder="Anything we should know?"
                  value={notes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                  disabled={locked || submitting}
                />
              </div>

              {ok !== null && (
                <div
                  className={`rounded-xl p-3 text-sm ${
                    ok
                      ? dark
                        ? "bg-emerald-950 text-emerald-200"
                        : "bg-green-50 text-green-700"
                      : dark
                      ? "bg-rose-950 text-rose-200"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {msg}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className={`text-xs ${helperText}`}>
                  We’ll only use this info for wedding planning. Only spam we like is musubi!
                </p>

                {!locked ? (
                  <button
                    type="submit"
                    disabled={submitting || (TOKEN_REQUIRED && !urlToken) || locked}
                    className={`rounded-2xl px-5 py-2 text-white shadow-sm transition disabled:opacity-60 ${
                      dark ? "bg-white/15" : "bg-black"
                    }`}
                  >
                    {submitting ? "Submitting..." : "Send RSVP"}
                  </button>
                ) : (
                  <div className="flex gap-2">
                    {canCelebrate && (
                      <button
                        type="button"
                        onClick={randomShoot}
                        className="rounded-2xl bg-emerald-700 px-4 py-2 text-white shadow-sm"
                        title="Random confetti burst"
                      >
                        🎉 Celebrate again
                      </button>
                    )}
                    {canConsole && (
                      <button
                        type="button"
                        onClick={gentleDrizzle}
                        className="rounded-2xl bg-rose-600 px-4 py-2 text-white shadow-sm"
                        title="A little snow"
                      >
                        💛 Let it snow
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className={`pb-10 text-center text-xs ${footerText}`}>
        @ Ben and Hina INC . I made this page! Hi Guys :)
      </div>
    </div>
  );
}
