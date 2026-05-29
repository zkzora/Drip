"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import React from "react";
import { Icon } from "@/components/ui/Icon";

type Status = "idle" | "loading" | "joined" | "already_joined" | "error";

const COPY: Record<Status, string> = {
  idle: "",
  loading: "",
  joined: "You're on the list.",
  already_joined: "You're already on the list.",
  error: "Couldn't join right now. Try again.",
};

const AnimatedGradientBackground: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let animationFrame: number;
    let width = 125;
    let directionWidth = 1;

    const gradientColors = [
      "#070612",
      "#1a0a3b",
      "#4c1d95",
      "#7c3aed",
      "#8b5cf6",
      "#c084fc",
      "#e879f9",
    ];
    const gradientStops = [20, 35, 50, 63, 75, 88, 100];

    const animateGradient = () => {
      if (width >= 145) directionWidth = -1;
      if (width <= 135) directionWidth = 1;
      width += directionWidth * 0.015;

      const stopsString = gradientStops
        .map((stop, i) => `${gradientColors[i]} ${stop}%`)
        .join(", ");

      if (containerRef.current) {
        containerRef.current.style.background =
          `radial-gradient(${width}% ${width + 20}% at 50% 20%, ${stopsString})`;
      }

      animationFrame = requestAnimationFrame(animateGradient);
    };

    animationFrame = requestAnimationFrame(animateGradient);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  return (
    <motion.div
      key="waitlist-gradient-bg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 2, ease: [0.25, 0.1, 0.25, 1] } }}
      className="absolute inset-0"
    >
      <div ref={containerRef} className="absolute inset-0" />
      {/* Top fade into page bg */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#070612] to-transparent pointer-events-none" />
      {/* Bottom fade into page bg */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#070612] to-transparent pointer-events-none" />
    </motion.div>
  );
};

export default function Waitlist() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorCopy, setErrorCopy] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const submitting = status === "loading";
  const isSuccess = status === "joined" || status === "already_joined";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
      setErrorCopy("Enter a valid email.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorCopy("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, source: "landing" }),
      });
      const data = await res.json().catch(() => ({} as any));

      if (res.ok && data?.ok) {
        if (data.status === "already_joined") {
          setStatus("already_joined");
        } else {
          setStatus("joined");
        }
        return;
      }

      if (data?.message === "invalid_email") {
        setErrorCopy("Enter a valid email.");
        setStatus("error");
        return;
      }

      setErrorCopy("Couldn't join right now. Try again.");
      setStatus("error");
    } catch {
      setErrorCopy("Couldn't join right now. Try again.");
      setStatus("error");
    }
  }

  return (
    <section className="relative overflow-hidden py-20 sm:py-28">
      {/* Full-width animated gradient background */}
      <AnimatedGradientBackground />

      {/* Content */}
      <div
        ref={sectionRef}
        className={`relative z-10 max-w-[1240px] mx-auto px-6 reveal ${visible ? "in-view" : ""}`}
      >
        <div className="max-w-[580px] mx-auto text-center">
          <h3 className="text-[28px] sm:text-[36px] font-medium tracking-[-0.02em] text-iri mb-3">
            Join the DRIP waitlist
          </h3>
          <p className="text-[14px] text-white/55 leading-[1.6] mb-8">
            Get early access to DRIP as we expand payment streams for agents,
            services, and builder payouts.
          </p>

          <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-2.5 max-w-[480px] mx-auto">
            <label className="sr-only" htmlFor="waitlist-email">Email</label>
            <div className="relative flex-1">
              <Icon
                name="mail"
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none"
              />
              <input
                ref={inputRef}
                id="waitlist-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status === "error") {
                    setStatus("idle");
                    setErrorCopy("");
                  }
                }}
                disabled={submitting || isSuccess}
                aria-invalid={status === "error"}
                aria-describedby="waitlist-status"
                className="waitlist-input w-full pl-9 pr-3.5 py-3 rounded-full bg-white/[0.08] border border-white/10 text-[13.5px] text-white placeholder:text-white/35 focus:outline-none focus:border-violet-400/40 disabled:opacity-60 disabled:cursor-not-allowed backdrop-blur-sm"
              />
            </div>
            <button
              type="submit"
              disabled={submitting || isSuccess}
              className="btn-primary rounded-full px-5 py-3 text-[13.5px] font-medium text-white flex items-center justify-center gap-2 min-w-[140px] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Icon name="loader-2" size={14} className="animate-spin" />
                  <span>Joining…</span>
                </>
              ) : isSuccess ? (
                <>
                  <Icon name="check" size={14} />
                  <span>Joined</span>
                </>
              ) : (
                <>
                  <Icon name="send" size={13} />
                  <span>Join waitlist</span>
                </>
              )}
            </button>
          </form>

          <div
            id="waitlist-status"
            role="status"
            aria-live="polite"
            className="mt-4 min-h-[18px] text-[12.5px] font-mono"
          >
            {isSuccess && (
              <span key={status} className="anim-status inline-flex items-center gap-1.5 text-emerald-300/90">
                <Icon name="check-circle-2" size={13} />
                {COPY[status]}
              </span>
            )}
            {status === "error" && (
              <span key={`err-${errorCopy}`} className="anim-status inline-flex items-center gap-1.5 text-rose-300/90">
                <Icon name="triangle-alert" size={13} />
                {errorCopy || COPY.error}
              </span>
            )}
            {status === "idle" && (
              <span className="text-white/30">No spam. Unsubscribe any time.</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
