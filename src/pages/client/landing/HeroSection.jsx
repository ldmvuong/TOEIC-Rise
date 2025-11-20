import { SiGooglegemini } from "react-icons/si";
import useScrollReveal from "../../../hooks/useScrollReveal";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const [ref, isVisible] = useScrollReveal();
  const navigate = useNavigate();

  return (
    <section
      ref={ref}
      className={`flex min-h-[90vh] items-center bg-gradient-to-br from-white via-blue-50 to-slate-100 py-20 transition-all duration-1000 ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
      }`}
    >
      <div className="mx-auto grid w-full items-center gap-12 px-6 lg:grid-cols-2 lg:px-8 xl:container">
        <div className="space-y-8">
          <div
            className={`transition-all duration-1000 delay-200 ${
              isVisible ? "translate-x-0 opacity-100" : "-translate-x-10 opacity-0"
            }`}
          >
            <h1 className="text-5xl font-bold leading-tight text-slate-900 lg:text-7xl">
              Master Your
              <span className="block bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">
                TOEIC Score
              </span>
            </h1>
          </div>
          <p
            className={`text-xl text-slate-600 transition-all duration-1000 delay-400 lg:text-2xl ${
              isVisible ? "translate-x-0 opacity-100" : "-translate-x-10 opacity-0"
            }`}
          >
            Boost your English proficiency with AI-powered practice, personalized learning paths, and comprehensive
            TOEIC preparation — completely free.
          </p>
          <div
            className={`flex flex-col gap-4 transition-all duration-1000 delay-600 sm:flex-row ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
            }`}
          >
            <button
              onClick={() => navigate('/online-tests')}
              className="transform rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:from-blue-600 hover:to-indigo-700"
            >
              Take Practice Test
            </button>
            <button
              onClick={() => navigate('/exam-structure')}
              className="rounded-lg border-2 border-blue-500 px-8 py-4 text-lg font-semibold text-blue-600 transition-all duration-300 hover:bg-blue-50"
            >
              TOEIC Exam Overview
            </button>
          </div>
        </div>

        <div
          className={`relative transition-all duration-1000 delay-800 ${
            isVisible ? "translate-x-0 opacity-100" : "translate-x-10 opacity-0"
          }`}
        >
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-r from-blue-200 to-indigo-300 opacity-30" />
          <div className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-gradient-to-r from-blue-100 to-sky-300 opacity-30" />

          <div className="relative rounded-2xl bg-white p-8 shadow-2xl ring-1 ring-slate-200">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-indigo-600">
                  <SiGooglegemini className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">AI-Powered Learning</h3>
                  <p className="text-slate-500">Personalized study plans</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-600">
                    <span>Listening Progress</span>
                    <span className="text-sky-400">85%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200">
                    <div className="h-2 w-4/5 rounded-full bg-gradient-to-r from-sky-400 to-blue-600" />
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-600">
                    <span>Reading Progress</span>
                    <span className="text-sky-400">92%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200">
                    <div className="h-2 w-11/12 rounded-full bg-gradient-to-r from-sky-400 to-blue-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

