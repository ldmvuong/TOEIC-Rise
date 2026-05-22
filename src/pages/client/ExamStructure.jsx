import { useMemo, useState } from "react";

const examSections = [
  {
    id: "listening",
    skill: "Listening",
    questions: 100,
    duration: "45 minutes",
    score: "5–495",
    color: "blue",
    accent: "from-sky-500 to-blue-600",
    softBg: "bg-sky-50",
    softText: "text-sky-700",
    border: "border-sky-200",
    description:
      "Measures how well you understand spoken English in everyday, academic, and workplace situations.",
    parts: [
      {
        part: "Part 1",
        name: "Photographs",
        questions: 6,
        description:
          "Choose the statement that best describes what you see in a picture.",
      },
      {
        part: "Part 2",
        name: "Question–Response",
        questions: 25,
        description:
          "Listen to a question or statement and choose the most appropriate response.",
      },
      {
        part: "Part 3",
        name: "Conversations",
        questions: 39,
        description:
          "Listen to short conversations between speakers and answer related questions.",
      },
      {
        part: "Part 4",
        name: "Short Talks",
        questions: 30,
        description:
          "Listen to announcements, reports, messages, or talks and answer questions.",
      },
    ],
  },
  {
    id: "reading",
    skill: "Reading",
    questions: 100,
    duration: "75 minutes",
    score: "5–495",
    color: "purple",
    accent: "from-violet-500 to-purple-600",
    softBg: "bg-violet-50",
    softText: "text-violet-700",
    border: "border-violet-200",
    description:
      "Evaluates your ability to understand written English used in emails, notices, articles, messages, and workplace documents.",
    parts: [
      {
        part: "Part 5",
        name: "Incomplete Sentences",
        questions: 30,
        description:
          "Choose the best word or phrase to complete each sentence.",
      },
      {
        part: "Part 6",
        name: "Text Completion",
        questions: 16,
        description:
          "Complete short texts by selecting the most suitable words, phrases, or sentences.",
      },
      {
        part: "Part 7",
        name: "Reading Comprehension",
        questions: 54,
        description:
          "Read single and multiple passages, then answer comprehension questions.",
      },
    ],
  },
  {
    id: "speaking",
    skill: "Speaking",
    questions: 11,
    duration: "About 20 minutes",
    score: "0–200",
    color: "green",
    accent: "from-emerald-500 to-green-600",
    softBg: "bg-emerald-50",
    softText: "text-emerald-700",
    border: "border-emerald-200",
    description:
      "Assesses how clearly and effectively you speak English in familiar and workplace-related situations.",
    parts: [
      {
        part: "Part 1",
        name: "Read a Text Aloud",
        questions: 2,
        description:
          "Read a short text aloud. Your pronunciation, intonation, and stress are evaluated.",
      },
      {
        part: "Part 2",
        name: "Describe a Picture",
        questions: 2,
        description:
          "Describe what is happening in a picture using clear and connected speech.",
      },
      {
        part: "Part 3",
        name: "Respond to Questions",
        questions: 3,
        description:
          "Answer questions about familiar topics using appropriate vocabulary and grammar.",
      },
      {
        part: "Part 4",
        name: "Respond Using Information Provided",
        questions: 3,
        description:
          "Use given information, such as a schedule or table, to answer questions accurately.",
      },
      {
        part: "Part 5",
        name: "Express an Opinion",
        questions: 1,
        description:
          "Give your opinion on a topic and support it with reasons or examples.",
      },
    ],
  },
  {
    id: "writing",
    skill: "Writing",
    questions: 8,
    duration: "About 60 minutes",
    score: "0–200",
    color: "orange",
    accent: "from-amber-500 to-orange-600",
    softBg: "bg-amber-50",
    softText: "text-amber-700",
    border: "border-amber-200",
    description:
      "Tests how well you write clear, accurate, and organized English for practical communication.",
    parts: [
      {
        part: "Part 1",
        name: "Write a Sentence Based on a Picture",
        questions: 5,
        description:
          "Write one sentence about a picture using the required words or phrases.",
      },
      {
        part: "Part 2",
        name: "Respond to a Written Request",
        questions: 2,
        description:
          "Write email responses that are clear, polite, and relevant to the request.",
      },
      {
        part: "Part 3",
        name: "Write an Opinion Essay",
        questions: 1,
        description:
          "Write an essay that presents your opinion and supports it with reasons and examples.",
      },
    ],
  },
];

const faqData = [
  {
    question: "What does the TOEIC test measure?",
    answer:
      "TOEIC measures English communication skills used in everyday and workplace contexts. Listening and Reading assess receptive skills, while Speaking and Writing assess productive communication skills.",
  },
  {
    question: "How many questions are in TOEIC Listening and Reading?",
    answer:
      "The TOEIC Listening & Reading test has 200 multiple-choice questions in total: 100 Listening questions and 100 Reading questions.",
  },
  {
    question: "How long does the TOEIC Listening and Reading test take?",
    answer:
      "The test takes 2 hours in total. The Listening section lasts about 45 minutes, and the Reading section lasts 75 minutes.",
  },
  {
    question: "How are TOEIC Listening and Reading scored?",
    answer:
      "Listening and Reading are scored separately from 5 to 495. The combined TOEIC Listening & Reading score ranges from 10 to 990.",
  },
  {
    question: "How are TOEIC Speaking and Writing scored?",
    answer:
      "TOEIC Speaking and Writing are scored separately. Each skill has a score range from 0 to 200.",
  },
  {
    question: "Do I need to take all four TOEIC skills?",
    answer:
      "It depends on your school, company, or personal goal. Some institutions only require Listening & Reading, while others may also require Speaking and Writing to evaluate complete communication ability.",
  },
  {
    question: "Is there a pass or fail score in TOEIC?",
    answer:
      "TOEIC does not have a universal pass or fail score. Each school, company, or organization can set its own required score based on its needs.",
  },
];

const testOverview = [
  {
    test: "TOEIC Listening & Reading",
    skills: "Listening, Reading",
    format: "Multiple choice",
    questions: "200 questions",
    duration: "120 minutes",
    score: "10–990",
  },
  {
    test: "TOEIC Speaking",
    skills: "Speaking",
    format: "Computer-based speaking tasks",
    questions: "11 questions",
    duration: "About 20 minutes",
    score: "0–200",
  },
  {
    test: "TOEIC Writing",
    skills: "Writing",
    format: "Computer-based writing tasks",
    questions: "8 questions",
    duration: "About 60 minutes",
    score: "0–200",
  },
];

const totals = {
  skills: 4,
  lrQuestions: 200,
  speakingQuestions: 11,
  writingQuestions: 8,
  parts: examSections.reduce((sum, section) => sum + section.parts.length, 0),
};

const ExamStructure = () => {
  const [activeTab, setActiveTab] = useState("listening");
  const [openFaq, setOpenFaq] = useState(null);

  const currentSection = useMemo(
    () => examSections.find((section) => section.id === activeTab) ?? examSections[0],
    [activeTab]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900">
      <section className="px-4 py-10 md:py-12">
        <div className="container mx-auto max-w-6xl">
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div className="space-y-4">
              <div className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
                Complete TOEIC test format
              </div>
              <div className="space-y-3">
                <h1 className="text-4xl font-extrabold leading-tight text-slate-950 md:text-6xl">
                  TOEIC Exam Structure
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-slate-600 md:text-xl">
                  Understand how the TOEIC test is organized across Listening,
                  Reading, Speaking, and Writing. Explore the number of
                  questions, test duration, task types, and score range for each
                  skill.
                </p>
              </div>
              <div className="grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-2xl font-extrabold text-slate-950">
                    {totals.skills}
                  </div>
                  <div className="text-sm font-medium text-slate-500">Skills</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-2xl font-extrabold text-slate-950">
                    {totals.lrQuestions}
                  </div>
                  <div className="text-sm font-medium text-slate-500">
                    L&R Questions
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-2xl font-extrabold text-slate-950">
                    {totals.speakingQuestions}
                  </div>
                  <div className="text-sm font-medium text-slate-500">
                    Speaking Tasks
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-2xl font-extrabold text-slate-950">
                    {totals.writingQuestions}
                  </div>
                  <div className="text-sm font-medium text-slate-500">
                    Writing Tasks
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Current focus
                  </p>
                  <h2 className="text-2xl font-extrabold text-slate-950">
                    {currentSection.skill}
                  </h2>
                </div>
                <div
                  className={`rounded-2xl bg-gradient-to-r ${currentSection.accent} px-4 py-2 text-sm font-bold text-white shadow-lg`}
                >
                  {currentSection.score}
                </div>
              </div>
              <p className="mb-4 leading-7 text-slate-600">
                {currentSection.description}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className={`rounded-2xl ${currentSection.softBg} p-4`}>
                  <div className={`text-3xl font-extrabold ${currentSection.softText}`}>
                    {currentSection.questions}
                  </div>
                  <div className="text-sm font-semibold text-slate-600">Questions</div>
                </div>
                <div className={`rounded-2xl ${currentSection.softBg} p-4`}>
                  <div className={`text-xl font-extrabold ${currentSection.softText}`}>
                    {currentSection.duration}
                  </div>
                  <div className="text-sm font-semibold text-slate-600">Duration</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-8 md:pb-10">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {examSections.map((section) => {
              const isActive = activeTab === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveTab(section.id)}
                  className={`rounded-2xl border p-4 text-left transition-all duration-300 ${
                    isActive
                      ? `border-transparent bg-gradient-to-r ${section.accent} text-white shadow-xl`
                      : "border-slate-200 bg-white text-slate-700 shadow-sm hover:-translate-y-0.5 hover:shadow-lg"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-extrabold">{section.skill}</div>
                      <div
                        className={`mt-1 text-sm ${
                          isActive ? "text-white/85" : "text-slate-500"
                        }`}
                      >
                        {section.duration}
                      </div>
                    </div>
                    <div
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        isActive
                          ? "bg-white/20 text-white"
                          : `${section.softBg} ${section.softText}`
                      }`}
                    >
                      {section.questions} Qs
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div
                className={`mb-4 inline-flex rounded-full ${currentSection.softBg} px-4 py-2 text-sm font-bold ${currentSection.softText}`}
              >
                {currentSection.skill} overview
              </div>
              <h2 className="text-3xl font-extrabold text-slate-950">
                What this section measures
              </h2>
              <p className="mt-3 leading-7 text-slate-600">
                {currentSection.description}
              </p>
              <div className="mt-4 space-y-2.5">
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="font-semibold text-slate-600">Questions</span>
                  <span className="font-extrabold text-slate-950">
                    {currentSection.questions}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="font-semibold text-slate-600">Duration</span>
                  <span className="font-extrabold text-slate-950">
                    {currentSection.duration}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="font-semibold text-slate-600">Score range</span>
                  <span className="font-extrabold text-slate-950">
                    {currentSection.score}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              {currentSection.parts.map((part) => (
                <div
                  key={`${currentSection.id}-${part.part}`}
                  className={`rounded-2xl border ${currentSection.border} bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex h-14 min-w-14 items-center justify-center rounded-2xl ${currentSection.softBg} px-3 text-sm font-extrabold ${currentSection.softText}`}
                      >
                        {part.part}
                      </div>
                      <div>
                        <h3 className="text-xl font-extrabold text-slate-950">
                          {part.name}
                        </h3>
                        <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
                          {part.description}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                      <div className="text-2xl font-extrabold text-slate-950">
                        {part.questions}
                      </div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Questions
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-8 md:pb-10">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-5 max-w-3xl">
            <h2 className="text-3xl font-extrabold text-slate-950 md:text-4xl">
              TOEIC Test Overview
            </h2>
            <p className="mt-2 text-lg leading-7 text-slate-600">
              Compare the main TOEIC test sections by format, timing, number of
              questions, and score range.
            </p>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="hidden grid-cols-[1.35fr_1fr_1.25fr_0.85fr_0.9fr_0.7fr] gap-4 bg-slate-50 px-5 py-4 text-sm font-extrabold text-slate-600 lg:grid">
              <div>Test</div>
              <div>Skills</div>
              <div>Format</div>
              <div>Questions</div>
              <div>Duration</div>
              <div>Score</div>
            </div>
            <div className="divide-y divide-slate-100">
              {testOverview.map((item) => (
                <div
                  key={item.test}
                  className="grid gap-3 px-5 py-4 lg:grid-cols-[1.35fr_1fr_1.25fr_0.85fr_0.9fr_0.7fr] lg:items-center"
                >
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-400 lg:hidden">
                      Test
                    </div>
                    <div className="font-extrabold text-slate-950">{item.test}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-400 lg:hidden">
                      Skills
                    </div>
                    <div className="text-sm font-medium text-slate-600">
                      {item.skills}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-400 lg:hidden">
                      Format
                    </div>
                    <div className="text-sm font-medium text-slate-600">
                      {item.format}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-400 lg:hidden">
                      Questions
                    </div>
                    <div className="text-sm font-semibold text-slate-700">
                      {item.questions}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-400 lg:hidden">
                      Duration
                    </div>
                    <div className="text-sm font-semibold text-slate-700">
                      {item.duration}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-400 lg:hidden">
                      Score
                    </div>
                    <div className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm font-extrabold text-blue-700">
                      {item.score}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-10 md:py-12">
        <div className="container mx-auto max-w-5xl">
          <div className="mb-5 text-center">
            <h2 className="text-3xl font-extrabold text-slate-950 md:text-4xl">
              Frequently Asked Questions
            </h2>
            <p className="mt-2 text-lg text-slate-600">
              Quick answers about TOEIC format, timing, and scoring.
            </p>
          </div>

          <div className="space-y-4">
            {faqData.map((item, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={item.question}
                  className={`overflow-hidden rounded-2xl border bg-white transition-all ${
                    isOpen
                      ? "border-blue-300 shadow-lg shadow-blue-100/70"
                      : "border-slate-200 shadow-sm hover:border-slate-300"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="text-base font-extrabold text-slate-950 md:text-lg">
                      {item.question}
                    </span>
                    <span
                      className={`flex h-8 min-w-8 items-center justify-center rounded-full text-xl font-semibold transition-all ${
                        isOpen
                          ? "bg-blue-600 text-white rotate-45"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      +
                    </span>
                  </button>
                  {isOpen ? (
                    <div className="px-5 pb-5 leading-7 text-slate-600">
                      {item.answer}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

export default ExamStructure;
