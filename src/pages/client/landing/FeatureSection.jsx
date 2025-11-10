import useScrollReveal from "../../../hooks/useScrollReveal";
import { featureCards } from "./constants";

const FeatureSection = () => {
  const [ref, isVisible] = useScrollReveal();

  return (
    <section id="practice" ref={ref} className="bg-white py-20">
      <div className="mx-auto px-6 lg:px-8 xl:container">
        <div
          className={`mb-16 text-center transition-all duration-1000 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          <h2 className="mb-6 text-4xl font-bold text-gray-900 lg:text-5xl">Everything You Need to Succeed</h2>
          <p className="mx-auto max-w-3xl text-xl text-gray-600">
            Comprehensive TOEIC preparation tools designed to help you achieve your target score.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {featureCards.map((feature, index) => (
            <div
              key={feature.title}
              className={`transform rounded-2xl bg-white p-8 shadow-lg transition-all duration-500 hover:-translate-y-2 hover:shadow-xl ${
                isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div
                className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r ${feature.color} text-2xl`}
              >
                {feature.icon}
              </div>
              <h3 className="mb-4 text-center text-2xl font-bold text-gray-900">{feature.title}</h3>
              <p className="text-center text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureSection;

