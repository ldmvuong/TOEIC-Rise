import { useEffect, useMemo, useState } from "react";
import useScrollReveal from "../../../hooks/useScrollReveal";
import { targetScores } from "./constants";

const ProgressSection = () => {
  const [ref, isVisible] = useScrollReveal();
  const [scores, setScores] = useState({
    listening: 0,
    reading: 0,
    total: 0,
  });

  const progressConfig = useMemo(
    () => [
      {
        label: "Listening",
        value: scores.listening,
        max: 495,
        barClass: "from-sky-400 to-blue-600",
        textClass: "text-sky-500",
      },
      {
        label: "Reading",
        value: scores.reading,
        max: 495,
        barClass: "from-blue-400 to-blue-600",
        textClass: "text-blue-400",
      },
    ],
    [scores]
  );

  useEffect(() => {
    if (!isVisible) return undefined;

    const duration = 2000;
    const steps = 60;
    const stepDuration = duration / steps;
    let currentStep = 0;

    const timer = window.setInterval(() => {
      currentStep += 1;
      const progress = Math.min(currentStep / steps, 1);

      setScores({
        listening: Math.floor(targetScores.listening * progress),
        reading: Math.floor(targetScores.reading * progress),
        total: Math.floor(targetScores.total * progress),
      });

      if (currentStep >= steps) {
        window.clearInterval(timer);
        setScores(targetScores);
      }
    }, stepDuration);

    return () => window.clearInterval(timer);
  }, [isVisible]);

  return (
    <section
      id="progress"
      ref={ref}
      className="bg-gradient-to-br from-blue-50 via-white to-blue-100 py-20"
    >
      <div className="mx-auto grid items-center gap-16 px-6 lg:grid-cols-2 lg:px-8 xl:container">
        <div
          className={`space-y-8 transition-all duration-1000 ${
            isVisible ? "translate-x-0 opacity-100" : "-translate-x-10 opacity-0"
          }`}
        >
          <div>
            <h2 className="mb-6 text-4xl font-bold lg:text-5xl">Track Your Journey to Success</h2>
            <p className="text-xl text-slate-600">
              Monitor your progress with detailed analytics, identify strengths and weaknesses, and celebrate every
              milestone on your path to TOEIC mastery.
            </p>
          </div>
          <div className="rounded-2xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 text-xl font-bold text-white">
                ✓
              </div>
              <div>
                <h4 className="mb-2 text-lg font-semibold text-slate-900">Sarah M.</h4>
                <p className="text-slate-600 italic">
                  “Toeic Rise helped me improve my score from 650 to 850 in just 3 months! The AI-powered
                  recommendations were spot on.”
                </p>
                <div className="mt-3 flex items-center gap-1 text-amber-400">
                  {[...Array(5)].map((_, index) => (
                    <span key={index}>⭐</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className={`space-y-6 rounded-2xl bg-white p-8 shadow-xl ring-1 ring-slate-200 transition-all duration-1000 delay-300 ${
            isVisible ? "translate-x-0 opacity-100" : "translate-x-10 opacity-0"
          }`}
        >
          <h3 className="text-center text-2xl font-bold">Your Progress Dashboard</h3>
          <div className="space-y-6">
            {progressConfig.map(({ label, value, max, barClass, textClass }) => (
              <div key={label} className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-medium">{label}</span>
                  <span className={`text-2xl font-bold ${textClass}`}>{value}</span>
                </div>
                <div className="h-3 rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${barClass} transition-all duration-1000`}
                    style={{ width: `${(value / max) * 100}%` }}
                  />
                </div>
              </div>
            ))}

            <div className="border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold">Total Score</span>
                <span className="bg-gradient-to-r from-sky-500 to-indigo-600 bg-clip-text text-3xl font-bold text-transparent">
                  {scores.total}
                </span>
              </div>
              <div className="mt-3 h-4 rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600 transition-all duration-1000"
                  style={{ width: `${(scores.total / 990) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProgressSection;

