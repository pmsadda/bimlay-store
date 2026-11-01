"use client";

import { useEffect, useState } from "react";

export default function FlashTimer({ endTime }: { endTime: string }) {
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  useEffect(() => {
    const targetTime = new Date(endTime).getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = targetTime - now;

      if (difference <= 0) {
        clearInterval(interval);
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isExpired: true });
      } else {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ hours, minutes, seconds, isExpired: false });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime]);

  if (timeLeft.isExpired) {
    return <span style={{ color: "red", fontWeight: "bold" }}>Flash Sale Ended</span>;
  }

  return (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", background: "#fee2e2", padding: "0.5rem 1rem", borderRadius: "6px", color: "#991b1b", width: "fit-content" }}>
      <span style={{ fontSize: "0.85rem", fontWeight: "600" }}>Limited Time Deal:</span>
      <div style={{ fontFamily: "monospace", fontWeight: "bold" }}>
        {String(timeLeft.hours).padStart(2, "0")}h : {String(timeLeft.minutes).padStart(2, "0")}m : {String(timeLeft.seconds).padStart(2, "0")}s
      </div>
    </div>
  );
}