import React from "react";

function colorForScore(score) {
  if (score >= 75) return "#6ee7b7";
  if (score >= 50) return "#f5b85b";
  return "#f2607a";
}

export default function ScoreGauge({ score = 0, size = 132 }) {
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score)) / 100;
  const dashOffset = circumference * (1 - progress);
  const color = colorForScore(score);

  return (
    <div className="gauge-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#2a343c"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{
            transition: "stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.3s ease",
          }}
        />
      </svg>
      <div className="gauge-score">
        <span className="num" style={{ color }}>
          {Math.round(score)}
        </span>
        <span className="denom">/ 100 CRO SCORE</span>
      </div>
    </div>
  );
}
