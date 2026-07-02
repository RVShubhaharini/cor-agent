import React, { useEffect, useState } from "react";

const STEPS = [
  { label: "Scraping landing page with Chrome", desc: "Running headless browser session" },
  { label: "Extracting core elements", desc: "Parsing H1s, price tags, reviews rating & image tags" },
  { label: "Running rule-based heuristic checks", desc: "Testing viewport, alt tags, and forms density" },
  { label: "Analyzing conversion blocks with Llama 3.3", desc: "Running professional CRO assessment" },
  { label: "Building report dashboard", desc: "Assembling subscores & copywriting options" }
];

export default function Loader() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 1400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="stepped-loader-container">
      <div className="loader-ring-outer">
        <div className="loader-ring" />
      </div>
      <h3 className="loader-title">Running CRO Conversion Audit</h3>
      
      <div className="loader-steps-list">
        {STEPS.map((step, idx) => {
          let statusClass = "pending";
          let icon = "○";
          if (idx < activeStep) {
            statusClass = "completed";
            icon = "✓";
          } else if (idx === activeStep) {
            statusClass = "active";
            icon = "●";
          }
          return (
            <div key={idx} className={`loader-step-row ${statusClass}`}>
              <span className="step-icon">{icon}</span>
              <div className="step-content">
                <span className="step-label">{step.label}</span>
                <span className="step-desc">{step.desc}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
