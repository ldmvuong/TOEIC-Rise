import useScrollReveal from "../../../hooks/useScrollReveal";
import { footerLinks, socialLinks } from "./constants";

const LandingFooter = () => {
  const [ref, isVisible] = useScrollReveal();

  return (
    <footer ref={ref} className="bg-slate-100 py-16 text-slate-600">
      <div className="mx-auto px-6 lg:px-8 xl:container">
        <div
          className={`grid gap-8 md:grid-cols-2 lg:grid-cols-6 transition-all duration-1000 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          <div className="lg:col-span-2">
            <h3 className="mb-4 text-2xl font-bold text-slate-900">
              <span className="bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">
                Toeic Rise
              </span>
            </h3>
            <p>
              Empowering learners worldwide with AI-driven TOEIC preparation. Master English proficiency with
              personalized learning experiences.
            </p>
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sky-500">📧</span>
                support@toeicrise.com
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sky-500">🌍</span>
                Available worldwide, 24/7
              </div>
            </div>
          </div>

          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section}>
              <h4 className="mb-4 text-lg font-semibold text-slate-900 capitalize">{section}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.name}>
                    <a href={link.href} className="transition-colors duration-300 hover:text-sky-500">
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className={`mt-12 border-t border-slate-200 pt-8 transition-all duration-1000 delay-300 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          <div className="flex flex-col items-center justify-between gap-6 text-sm md:flex-row">
            <p className="text-center md:text-left">
              © {new Date().getFullYear()} Toeic Rise. All rights reserved. Made with ❤️ for English learners worldwide.
            </p>
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  aria-label={social.name}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg shadow transition-all duration-300 hover:scale-110 hover:bg-gradient-to-r hover:from-sky-500 hover:to-indigo-600 hover:text-white"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div
          className={`mt-8 text-center transition-all duration-1000 delay-500 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm text-slate-600 shadow">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            Free forever — No credit card required
          </div>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;

