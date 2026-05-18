import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Tour } from "antd";

const STORAGE_KEY_PREFIX = "toeicrise_tour_v2_";

const tourConfig = {
  "/": [
    {
      title: "Welcome to TOEIC RISE 🚀",
      description:
        "A comprehensive TOEIC practice platform that helps you optimize your study time and reach your target score more easily. Click 'Next' to take a quick tour and get familiar with the most useful features!",
      target: null,
    },
    {
      title: "Main Navigation",
      description:
        "This toolbar gives you quick access to every feature. You can switch between Learning Paths, Online Tests, Flashcards, and your learning Statistics.",
      target: () =>
        document.querySelector("header nav") ||
        document.querySelector("header") ||
        document.querySelector("nav"),
    },
    {
      title: "Quick Search & Shortcuts",
      description:
        "On some pages, you can use the search bar to quickly find tests, articles, or vocabulary. Everything is designed to save you as much time as possible.",
      target: () =>
        document.querySelector(".ant-input-search") ||
        document.querySelector(".search-bar"),
    },
    {
      title: "Account & Progress Management",
      description:
        "This area contains your profile and account options. Click here to view your profile, edit your information, track your overall progress, or sign out. Stay signed in so your learning data is not lost!",
      target: () =>
        document.querySelector(".ant-dropdown-trigger img") ||
        document.querySelector("#user-menu-btn") ||
        document.querySelector("header .flex.items-center.gap-4") ||
        document.querySelector("#login-btn"),
    },
  ],
  "/online-tests": [
    {
      title: "Online TOEIC Practice Tests 📝",
      description:
        "Welcome to the test library! Here you can find hundreds of tests that closely follow the real TOEIC format (ETS, Hacker, and more). It is an ideal place to evaluate your level and get used to exam pressure.",
      target: null,
    },
    {
      title: "Search & Test Filters",
      description:
        "Do not feel overwhelmed by the number of tests. Use the search bar or filters by test type and publication year to find exactly what you need. Click a test you are interested in to view its details.",
      target: () =>
        document.querySelector(".ant-input-search") ||
        document.querySelector(".ant-select") ||
        document.querySelector(".test-filters"),
    },
    {
      title: "Start Practicing",
      description:
        "When you are ready, click 'Details' or 'Start Test' on a test card. The test interface provides a countdown timer and an Answer Sheet just like a real exam. Tip: Try to complete one full test every week!",
      target: () =>
        document.querySelector(".ant-card") ||
        document.querySelector(".test-card") ||
        document.querySelector(".start-test-btn"),
    },
  ],
  "/learning-paths": [
    {
      title: "Personalized Learning Paths 🛤️",
      description:
        "Not sure where to start? Learning Paths are here to help. Lessons are organized from basic to advanced levels, with vocabulary, grammar, and test-taking skills included.",
      target: null,
    },
    {
      title: "Explore Learning Paths",
      description:
        "Paths are grouped by score goals, such as TOEIC 500+ or 700+. Choose a path that matches your current level, then click 'Join' or 'View Details' to begin. Complete each lesson to unlock the next one!",
      target: () =>
        document.querySelector(".ant-card") ||
        document.querySelector(".path-item") ||
        document.querySelector(".learning-path-list"),
    },
  ],
  "/flashcards": [
    {
      title: "Flashcard Vocabulary Library 🗂️",
      description:
        "Vocabulary practice is more engaging with Flashcards. The system uses Spaced Repetition to remind you to review words at the right time, helping you remember them longer.",
      target: null,
    },
    {
      title: "Multiple Practice Modes",
      description:
        "For each Flashcard set, you can flip cards, take a Quiz, or play Match. Choose the set you want to review, click 'Practice', and explore the modes. Small tip: Reviewing for 15 minutes every day works better than cramming.",
      target: () =>
        document.querySelector(".ant-card") ||
        document.querySelector(".flashcard-item") ||
        document.querySelector(".practice-actions"),
    },
  ],
  "/statistics": [
    {
      title: "Analytics & Statistics 📊",
      description:
        "Your personal dashboard gives you a complete view of your effort. The system analyzes test scores and correct or incorrect answers by skill (Listening/Reading), helping you identify strengths and areas to improve.",
      target: null,
    },
  ],
  "/exam-structure": [
    {
      title: "Master the Test Structure 🔍",
      description:
        "This section breaks down the 7 parts of a standard TOEIC test in detail. Read the tips carefully and learn to recognize common question types so you can avoid common traps.",
      target: null,
    },
  ],
  "/dictation": [
    {
      title: "Dictation Practice 🎧",
      description:
        "Dictation is a powerful way to improve your Listening score. By listening and typing each word accurately, you become more familiar with native pronunciation, linking sounds, and intonation.",
      target: null,
    },
    {
      title: "Practice Controls",
      description:
        "Use the Play/Pause buttons to listen to the audio. Type what you hear into the input area. If it is too difficult, you can slow down the playback speed. Click 'Check' to review correct and incorrect answers and learn new words right away.",
      target: () =>
        document.querySelector(".ant-input") ||
        document.querySelector(".audio-controls") ||
        document.querySelector(".dictation-input-area"),
    },
  ],
  "/profile": [
    {
      title: "Your Profile 👤",
      description:
        "Your profile page lets you update your avatar, change your password, and manage account information. Do not forget to check your activity history to see how much progress you have made!",
      target: null,
    },
  ],
  "/blog": [
    {
      title: "Sharing Corner & Resources 📰",
      description:
        "Welcome to the Blog! This is where you can find study experiences, test-taking strategies, and useful TOEIC resources to help you prepare more effectively.",
      target: null,
    },
    {
      title: "Filter by Category 📑",
      description:
        "Use the category list to easily find articles by topics you care about, such as Grammar, Vocabulary, or TOEIC Tips. Click a category to view all related posts.",
      target: () =>
        document.querySelector(".lg\\:col-span-4 .ant-card") ||
        Array.from(document.querySelectorAll(".ant-card")).find((c) =>
          c.textContent.includes("Browse categories"),
        ),
    },
    {
      title: "Search Articles 🔍",
      description:
        "Looking for a specific topic? Enter a keyword in this search bar so the system can quickly filter the most relevant articles.",
      target: () =>
        document.querySelector("input[placeholder*='Search articles']") ||
        document.querySelector(".ant-input-wrapper") ||
        document.querySelector(".lg\\:w-\\[420px\\]"),
    },
    {
      title: "Interactive Table of Contents 📖",
      description:
        "When reading a long article, use the Table of Contents on the side, if available, to jump directly to the section you care about without endless scrolling.",
      target: () =>
        document.querySelector("nav[aria-label='Table of contents']") ||
        Array.from(document.querySelectorAll(".ant-card")).find((c) =>
          c.textContent.includes("Table of contents"),
        ),
    },
    {
      title: "Related Articles 🔗",
      description:
        "After reading, you can explore more Related Articles at the end of the post to expand your knowledge and discover other helpful content.",
      target: () =>
        Array.from(document.querySelectorAll(".ant-card")).find((c) =>
          c.textContent.includes("Related Articles"),
        ),
    },
  ],
  "/blogs": [
    {
      title: "Sharing Corner & Resources 📰",
      description:
        "Welcome to the Blog! This is where you can find study experiences, test-taking strategies, and useful TOEIC resources to help you prepare more effectively.",
      target: null,
    },
    {
      title: "Filter by Category 📑",
      description:
        "Use the category list to easily find articles by topics you care about, such as Grammar, Vocabulary, or TOEIC Tips. Click a category to view all related posts.",
      target: () =>
        document.querySelector(".lg\\:col-span-4 .ant-card") ||
        Array.from(document.querySelectorAll(".ant-card")).find((c) =>
          c.textContent.includes("Browse categories"),
        ),
    },
    {
      title: "Search Articles 🔍",
      description:
        "Looking for a specific topic? Enter a keyword in this search bar so the system can quickly filter the most relevant articles.",
      target: () =>
        document.querySelector("input[placeholder*='Search articles']") ||
        document.querySelector(".ant-input-wrapper") ||
        document.querySelector(".lg\\:w-\\[420px\\]"),
    },
    {
      title: "Interactive Table of Contents 📖",
      description:
        "When reading a long article, use the Table of Contents on the side, if available, to jump directly to the section you care about without endless scrolling.",
      target: () =>
        document.querySelector("nav[aria-label='Table of contents']") ||
        Array.from(document.querySelectorAll(".ant-card")).find((c) =>
          c.textContent.includes("Table of contents"),
        ),
    },
    {
      title: "Related Articles 🔗",
      description:
        "After reading, you can explore more Related Articles at the end of the post to expand your knowledge and discover other helpful content.",
      target: () =>
        Array.from(document.querySelectorAll(".ant-card")).find((c) =>
          c.textContent.includes("Related Articles"),
        ),
    },
  ],
};

export default function WelcomeGuideModal() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    let basePath = pathname;
    if (pathname !== "/" && pathname.split("/").length > 1) {
      basePath = "/" + pathname.split("/")[1];
    }

    const currentSteps = tourConfig[basePath];

    if (currentSteps && currentSteps.length > 0) {
      setSteps(currentSteps);
      try {
        const seen =
          localStorage.getItem(STORAGE_KEY_PREFIX + basePath) === "1";
        if (!seen) {
          setCurrentStep(0);
          const t = window.setTimeout(() => setOpen(true), 500);
          return () => window.clearTimeout(t);
        }
      } catch {
        /* ignore */
      }
    } else {
      setSteps([]);
      setOpen(false);
    }
  }, [pathname]);

  useEffect(() => {
    const handleOpenTour = () => {
      if (steps.length > 0) {
        setCurrentStep(0);
        setOpen(true);
      }
    };
    window.addEventListener("open-tour", handleOpenTour);
    return () => window.removeEventListener("open-tour", handleOpenTour);
  }, [steps]);

  const handleClose = () => {
    setOpen(false);
    let basePath = pathname;
    if (pathname !== "/" && pathname.split("/").length > 1) {
      basePath = "/" + pathname.split("/")[1];
    }
    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + basePath, "1");
    } catch {
      /* ignore */
    }
  };

  if (steps.length === 0) return null;

  return (
    <Tour
      open={open}
      onClose={handleClose}
      steps={steps}
      current={currentStep}
      onChange={setCurrentStep}
    />
  );
}
