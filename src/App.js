import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useRef, useState } from "react";
/**
 * Wedding RSVP — Google Sheets (Apps Script) + minimal bot hardening (timing)
 * - Token in URL (?t=ABC123) is optional by default; flip TOKEN_REQUIRED=true to enforce.
 * - Posts to a Google Apps Script web app (ENDPOINT_URL).
 * - No honeypot (per your request).
 */
// === Endpoints ===
const ENDPOINT_URL = "https://script.google.com/macros/s/AKfycbxLCP9gPoRJ59EvY5POIhfiZTNDQbTIq74-CwhnV-Y_hDwMYKJn5MwSUe0qCiWBF8je/exec";
// Optional: second sink if you later add Netlify/GitHub logging (leave empty to disable)
const GITHUB_ENDPOINT = "";
// === Security knobs ===
const TOKEN_REQUIRED = false; // set true to require ?t= token
const MIN_FILL_SECONDS = 3; // basic anti-bot timing
// === UI ===
const HERO_IMAGE_URL = "https://images.unsplash.com/photo-1629744418692-345355518e78?auto=format&fit=crop&q=80&w=1470";
function useQueryParam(name) {
    return useMemo(() => {
        if (typeof window === "undefined")
            return "";
        return new URLSearchParams(window.location.search).get(name) ?? "";
    }, [name]);
}
export default function WeddingRSVP() {
    const urlToken = useQueryParam("t");
    // ----- Form state (typed) -----
    const [attending, setAttending] = useState("");
    const [primaryName, setPrimaryName] = useState("");
    const [email, setEmail] = useState("");
    const [partyNames, setPartyNames] = useState([""]);
    const [wantsPlusOne, setWantsPlusOne] = useState(false);
    const [plusOneName, setPlusOneName] = useState("");
    const [shareAddress, setShareAddress] = useState(false);
    const [addr, setAddr] = useState({
        line1: "",
        line2: "",
        city: "",
        region: "",
        postal: "",
        country: "",
    });
    const [notes, setNotes] = useState("");
    // UX state
    const [submitting, setSubmitting] = useState(false);
    const [ok, setOk] = useState(null);
    const [msg, setMsg] = useState("");
    // For timing (anti-bot) keep a stable start timestamp
    const startedAtRef = useRef(Date.now());
    // ----- Helpers -----
    const addPartyMember = () => setPartyNames((p) => [...p, ""]);
    const removePartyMember = (i) => setPartyNames((p) => p.filter((_, idx) => idx !== i));
    const updatePartyMember = (i, v) => setPartyNames((p) => p.map((x, idx) => (idx === i ? v : x)));
    const validate = () => {
        if (TOKEN_REQUIRED && !urlToken)
            return "This RSVP link is missing its token. Please use the link you received.";
        const dt = (Date.now() - startedAtRef.current) / 1000;
        if (dt < MIN_FILL_SECONDS)
            return "That was a bit fast—please review and submit again.";
        if (!primaryName.trim())
            return "Please enter your name.";
        if (!attending)
            return "Please select if you're attending.";
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
            return "Please enter a valid email (or leave it blank).";
        if (wantsPlusOne && !plusOneName.trim())
            return "Please enter your plus-one's name or uncheck plus-one.";
        if (shareAddress && !addr.line1.trim())
            return "Please provide at least Address line 1 if sharing your address.";
        return null;
    };
    // ----- Submit -----
    const handleSubmit = async (e) => {
        e.preventDefault();
        const err = validate();
        if (err) {
            setOk(false);
            setMsg(err);
            return;
        }
        setSubmitting(true);
        setOk(null);
        setMsg("");
        const payload = {
            timestamp_iso: new Date().toISOString(),
            attending,
            respondent_name: primaryName.trim(),
            email: email.trim(),
            party_names: partyNames.map((n) => n.trim()).filter(Boolean),
            wants_plus_one: wantsPlusOne,
            plus_one_name: plusOneName.trim() || null,
            share_address: shareAddress,
            address: shareAddress ? addr : null,
            notes: notes.trim() || null,
            token: urlToken || null,
            user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
            fill_seconds: Math.round((Date.now() - startedAtRef.current) / 1000),
        };
        try {
            if (ENDPOINT_URL) {
                await fetch(ENDPOINT_URL, {
                    method: "POST",
                    // Avoid CORS preflight with Apps Script; we don't read the response
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
            setMsg(attending === "yes"
                ? "Thanks! We can't wait to celebrate with you."
                : "Thanks for letting us know. We'll miss you!");
            setNotes("");
        }
        catch (error) {
            console.error(error);
            setOk(false);
            setMsg("We couldn't submit right now. Please try again or contact us directly.");
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsxs("div", { className: "min-h-screen bg-neutral-50", children: [_jsxs("div", { className: "relative isolate", children: [_jsx("img", { src: HERO_IMAGE_URL, alt: "Couple", className: "h-72 w-full object-cover" }), _jsx("div", { className: "absolute inset-0 bg-black/30" }), _jsx("div", { className: "absolute inset-0 flex items-center justify-center", children: _jsxs("div", { className: "text-center text-white drop-shadow", children: [_jsx("h1", { className: "text-4xl md:text-5xl font-semibold tracking-tight", children: "RSVP" }), _jsx("p", { className: "mt-2 text-lg", children: "We\u2019re so excited to celebrate with you!" })] }) })] }), _jsx("div", { className: "mx-auto max-w-2xl px-4 py-10", children: _jsx("div", { className: "rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5", children: _jsxs("form", { onSubmit: handleSubmit, children: [TOKEN_REQUIRED && !urlToken && (_jsx("div", { className: "mb-4 rounded-xl bg-yellow-50 p-3 text-sm text-yellow-800", children: "This RSVP link is missing its token. Please use the unique link you received." })), _jsxs("div", { className: "grid gap-6", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium", children: "Are you attending?" }), _jsxs("div", { className: "mt-2 flex gap-4", children: [_jsxs("label", { className: "inline-flex items-center gap-2", children: [_jsx("input", { type: "radio", name: "attending", value: "yes", checked: attending === "yes", onChange: () => setAttending("yes"), className: "size-4" }), _jsx("span", { children: "Yes" })] }), _jsxs("label", { className: "inline-flex items-center gap-2", children: [_jsx("input", { type: "radio", name: "attending", value: "no", checked: attending === "no", onChange: () => setAttending("no"), className: "size-4" }), _jsx("span", { children: "No" })] })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium", children: "Your name" }), _jsx("input", { className: "mt-2 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2", placeholder: "Full name", value: primaryName, onChange: (e) => setPrimaryName(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium", children: "Best email (optional)" }), _jsx("input", { className: "mt-2 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2", placeholder: "name@example.com", value: email, onChange: (e) => setEmail(e.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium", children: "Names of people in your party" }), _jsx("p", { className: "mt-1 text-xs text-neutral-500", children: "Add each name attending from your household/invite." }), _jsxs("div", { className: "mt-3 grid gap-2", children: [partyNames.map((n, i) => (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { className: "w-full rounded-xl border px-3 py-2 outline-none focus:ring-2", placeholder: `Guest ${i + 1} full name`, value: n, onChange: (e) => updatePartyMember(i, e.target.value) }), partyNames.length > 1 && (_jsx("button", { type: "button", className: "rounded-xl border px-3 py-2 text-sm", onClick: () => removePartyMember(i), children: "Remove" }))] }, i))), _jsx("button", { type: "button", className: "mt-1 w-fit rounded-xl border px-3 py-2 text-sm", onClick: addPartyMember, children: "+ Add another" })] })] }), _jsxs("div", { children: [_jsxs("label", { className: "inline-flex items-center gap-2", children: [_jsx("input", { type: "checkbox", className: "size-4", checked: wantsPlusOne, onChange: (e) => setWantsPlusOne(e.target.checked) }), _jsx("span", { children: "I'm bringing a plus one" })] }), wantsPlusOne && (_jsx("div", { className: "mt-3", children: _jsx("input", { className: "w-full rounded-xl border px-3 py-2", placeholder: "Plus-one full name", value: plusOneName, onChange: (e) => setPlusOneName(e.target.value) }) }))] }), _jsxs("div", { children: [_jsxs("label", { className: "inline-flex items-center gap-2", children: [_jsx("input", { type: "checkbox", className: "size-4", checked: shareAddress, onChange: (e) => setShareAddress(e.target.checked) }), _jsx("span", { children: "Share your current mailing address (for thank you cards)?" })] }), shareAddress && (_jsxs("div", { className: "mt-3 grid gap-2", children: [_jsx("input", { className: "w-full rounded-xl border px-3 py-2", placeholder: "Address line 1", value: addr.line1, onChange: (e) => setAddr({ ...addr, line1: e.target.value }) }), _jsx("input", { className: "w-full rounded-xl border px-3 py-2", placeholder: "Address line 2 (optional)", value: addr.line2, onChange: (e) => setAddr({ ...addr, line2: e.target.value }) }), _jsxs("div", { className: "grid grid-cols-1 gap-2 md:grid-cols-2", children: [_jsx("input", { className: "rounded-xl border px-3 py-2", placeholder: "City", value: addr.city, onChange: (e) => setAddr({ ...addr, city: e.target.value }) }), _jsx("input", { className: "rounded-xl border px-3 py-2", placeholder: "State/Region", value: addr.region, onChange: (e) => setAddr({ ...addr, region: e.target.value }) })] }), _jsxs("div", { className: "grid grid-cols-1 gap-2 md:grid-cols-2", children: [_jsx("input", { className: "rounded-xl border px-3 py-2", placeholder: "Postal code", value: addr.postal, onChange: (e) => setAddr({ ...addr, postal: e.target.value }) }), _jsx("input", { className: "rounded-xl border px-3 py-2", placeholder: "Country", value: addr.country, onChange: (e) => setAddr({ ...addr, country: e.target.value }) })] })] }))] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium", children: "Notes (dietary needs, accessibility, etc.)" }), _jsx("textarea", { className: "mt-2 min-h-24 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2", placeholder: "Anything we should know?", value: notes, onChange: (e) => setNotes(e.target.value) })] }), ok !== null && (_jsx("div", { className: `rounded-xl p-3 text-sm ${ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`, children: msg })), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("p", { className: "text-xs text-neutral-500", children: "We\u2019ll only use this info for wedding planning. Only spam we like is musubi!" }), _jsx("button", { type: "submit", disabled: submitting || (TOKEN_REQUIRED && !urlToken), className: "rounded-2xl bg-black px-5 py-2 text-white shadow-sm transition disabled:opacity-60", children: submitting ? "Submitting..." : "Send RSVP" })] })] })] }) }) }), _jsx("div", { className: "pb-10 text-center text-xs text-neutral-400", children: "@ Ben and Hina INC . I made this page! Hi Guys :)" })] }));
}
