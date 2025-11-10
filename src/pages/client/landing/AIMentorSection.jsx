import { useMemo, useState } from "react";
import { SiGooglegemini } from "react-icons/si";
import useScrollReveal from "../../../hooks/useScrollReveal";
import { aiFeatures } from "./constants";

const AIMentorSection = () => {
  const [ref, isVisible] = useScrollReveal();
  const [activeFeature, setActiveFeature] = useState(0);

  const featureList = useMemo(() => aiFeatures, []);

  return (
    <section id="ai-mentor" ref={ref} className="bg-white py-20">
      <div className="mx-auto grid items-center gap-16 px-6 lg:grid-cols-2 lg:px-8 xl:container">
        <div
          className={`text-center transition-all duration-1000 lg:text-left ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          <h2 className="mb-6 text-4xl font-bold text-gray-900 lg:text-5xl">Meet Your AI Learning Companion</h2>
          <p className="mx-auto max-w-3xl text-xl text-gray-600 lg:mx-0">
            Experience the future of language learning with our advanced AI mentor that adapts to your unique learning
            style.
          </p>
        </div>

        <div className="hidden lg:block" />
      </div>
      <div className="mx-auto grid items-center gap-16 px-6 lg:grid-cols-2 lg:px-8 xl:container">
        <div
          className={`space-y-6 transition-all duration-1000 delay-200 ${
            isVisible ? "translate-x-0 opacity-100" : "-translate-x-10 opacity-0"
          }`}
        >
          {featureList.map((feature, index) => (
            <div
              key={feature.title}
              className={`cursor-pointer rounded-2xl p-6 transition-all duration-300 ${
                activeFeature === index
                  ? "scale-105 bg-white shadow-xl ring-1 ring-slate-200"
                  : "bg-slate-100 hover:bg-white hover:shadow-lg"
              }`}
              onClick={() => setActiveFeature(index)}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-r ${feature.color} text-xl`}
                >
                  {feature.icon}
                </div>
                <div>
                  <h3 className="mb-2 text-xl font-bold text-gray-900">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div
          className={`relative transition-all duration-1000 delay-400 ${
            isVisible ? "translate-x-0 opacity-100" : "translate-x-10 opacity-0"
          }`}
        >
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-r from-blue-200 to-indigo-300 opacity-30" />
          <div className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-gradient-to-r from-blue-100 to-sky-300 opacity-30" />

          <div className="relative rounded-3xl bg-white p-8 shadow-2xl ring-1 ring-slate-200">
            <div className="mb-8 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-indigo-600">
                <SiGooglegemini className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">TOEIC Mentor AI</h3>
                <p className="text-slate-500">Your Personal Learning Assistant</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl bg-slate-100 p-6">
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-indigo-600">
                    <SiGooglegemini className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-slate-600">
                    Based on your recent performance, I recommend focusing on Part 3 listening exercises. You’ve improved
                    15% this week! 🎉
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  AI is analyzing your progress...
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-slate-100 p-4 text-center">
                  <div className="text-2xl font-bold text-sky-500">94%</div>
                  <p className="text-sm text-slate-500">Accuracy Rate</p>
                </div>
                <div className="rounded-xl bg-slate-100 p-4 text-center">
                  <div className="text-2xl font-bold text-blue-500">12</div>
                  <p className="text-sm text-slate-500">Day Streak</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AIMentorSection;

