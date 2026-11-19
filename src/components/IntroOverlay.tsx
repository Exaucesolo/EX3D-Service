"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

export default function IntroOverlay() {
  const [visible, setVisible] = useState(true);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const autoAttemptedRef = useRef(false);

  const playIntroSound = useCallback(async () => {
    try {
      if (!window.AudioContext) return;

      const context = audioContextRef.current ?? new window.AudioContext();
      audioContextRef.current = context;
      if (context.state !== "running") {
        const resumed = await Promise.race([
          context.resume().then(() => context.state === "running"),
          new Promise<boolean>((resolve) => window.setTimeout(() => resolve(false), 350)),
        ]);
        if (!resumed) {
          setAudioBlocked(true);
          return;
        }
      }
      if (context.state !== "running") {
        setAudioBlocked(true);
        return;
      }

      setAudioBlocked(false);
      const master = context.createGain();
      master.gain.value = 0.035;
      master.connect(context.destination);
      const startAt = context.currentTime;
      const notes = [
        { frequency: 523.25, offset: 0, duration: 0.8 },
        { frequency: 659.25, offset: 0.2, duration: 0.9 },
        { frequency: 783.99, offset: 0.45, duration: 1.15 },
      ];

      for (const note of notes) {
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        const noteStart = startAt + note.offset;
        const noteEnd = noteStart + note.duration;
        oscillator.type = "sine";
        oscillator.frequency.value = note.frequency;
        envelope.gain.setValueAtTime(0, noteStart);
        envelope.gain.linearRampToValueAtTime(1, noteStart + 0.08);
        envelope.gain.exponentialRampToValueAtTime(0.001, noteEnd);
        oscillator.connect(envelope);
        envelope.connect(master);
        oscillator.start(noteStart);
        oscillator.stop(noteEnd + 0.02);
      }

      window.setTimeout(() => {
        if (audioContextRef.current === context) {
          audioContextRef.current = null;
          void context.close().catch(() => undefined);
        }
      }, 2200);
    } catch {
      setAudioBlocked(true);
    }
  }, []);

  useEffect(() => {
    if (!autoAttemptedRef.current) {
      autoAttemptedRef.current = true;
      void playIntroSound();
    }
    const timer = window.setTimeout(() => setVisible(false), 3200);
    return () => window.clearTimeout(timer);
  }, [playIntroSound]);

  if (!visible) return null;

  return (
    <div className="intro-screen" onAnimationEnd={() => setVisible(false)}>
      <div className="intro-image-wrap">
        <Image
          className="intro-image"
          src="/Logo intro.jpg"
          alt="EX3D Service, studio et créations"
          fill
          priority
          sizes="100vw"
        />
      </div>
      {audioBlocked && (
        <button className="intro-audio-button" type="button" onClick={() => void playIntroSound()}>
          Activer le son
        </button>
      )}
    </div>
  );
}