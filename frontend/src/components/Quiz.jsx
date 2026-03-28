import { useEffect, useMemo, useState } from "react";

const API_URL = "https://onequestion-ai-it-quiz.onrender.com";

function Quiz() {
  const [question, setQuestion] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingNext, setIsFetchingNext] = useState(false);
  const [error, setError] = useState("");

  async function fetchQuestion({ preserveSelection = false } = {}) {
    setError("");
    setIsLoading(!preserveSelection);
    setIsFetchingNext(preserveSelection);

    try {
      const response = await fetch(`${API_URL}/api/question`);

      if (!response.ok) {
        throw new Error("Could not load a question.");
      }

      const data = await response.json();
      setQuestion(data);
      setSelectedOption(null);
      setSubmitted(false);
    } catch (fetchError) {
      setError(fetchError.message || "Could not load a question.");
    } finally {
      setIsLoading(false);
      setIsFetchingNext(false);
    }
  }

  useEffect(() => {
    fetchQuestion();
  }, []);

  const isCorrect = useMemo(() => {
    if (!question || selectedOption === null) {
      return false;
    }

    return selectedOption === question.correctAnswer;
  }, [question, selectedOption]);

  function handleSubmit() {
    if (selectedOption === null || submitted || !question) {
      return;
    }

    setSubmitted(true);
    setQuestionCount((count) => count + 1);

    if (selectedOption === question.correctAnswer) {
      setScore((currentScore) => currentScore + 1);
    }
  }

  function handleNextQuestion() {
    fetchQuestion({ preserveSelection: true });
  }

  function getOptionClasses(index) {
    const baseClasses =
      "group relative w-full rounded-2xl border px-4 py-3 text-left text-sm font-medium transition duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-cyan-400/70 sm:text-base";

    if (!submitted) {
      return `${baseClasses} border-slate-700/80 bg-slate-900/70 text-slate-200 hover:scale-[1.01] hover:border-cyan-400/60 hover:bg-slate-800/90 active:scale-[0.99] ${
        selectedOption === index ? "border-cyan-400 bg-cyan-500/10 shadow-glow" : ""
      }`;
    }

    if (index === question.correctAnswer) {
      return `${baseClasses} border-emerald-400/80 bg-emerald-500/15 text-emerald-100 shadow-[0_0_22px_rgba(16,185,129,0.35)]`;
    }

    if (index === selectedOption) {
      return `${baseClasses} border-rose-400/80 bg-rose-500/15 text-rose-100`;
    }

    return `${baseClasses} cursor-not-allowed border-slate-700/60 bg-slate-900/50 text-slate-500`;
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 font-body text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.16),_transparent_36%),radial-gradient(circle_at_bottom,_rgba(249,115,22,0.14),_transparent_28%)]" />
      <div className="absolute left-10 top-16 h-28 w-28 animate-float rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="absolute bottom-16 right-10 h-36 w-36 animate-float rounded-full bg-orange-500/10 blur-3xl [animation-delay:1s]" />

      <section className="relative z-10 w-full max-w-xl animate-fade-in rounded-[28px] border border-white/10 bg-slate-900/75 p-6 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300/80">
              OneQuestion
            </p>
            <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              AI IT Quiz
            </h1>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Score</p>
            <p className="text-lg font-semibold text-white">
              {score}
              <span className="text-sm text-slate-400"> / {questionCount}</span>
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="h-5 w-28 rounded-full bg-slate-800" />
            <div className="space-y-2">
              <div className="h-6 w-full rounded-full bg-slate-800" />
              <div className="h-6 w-11/12 rounded-full bg-slate-800" />
            </div>
            <div className="space-y-3 pt-3">
              {[0, 1, 2, 3].map((key) => (
                <div key={key} className="h-14 rounded-2xl bg-slate-800/80" />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-rose-100">
            <p className="font-semibold">Unable to load question</p>
            <p className="mt-1 text-sm text-rose-100/80">{error}</p>
            <button
              type="button"
              onClick={() => fetchQuestion()}
              className="mt-4 rounded-xl bg-rose-400 px-4 py-2 font-semibold text-slate-950 transition hover:scale-[1.02] hover:bg-rose-300 active:scale-[0.98]"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between gap-3">
              <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
                {question?.topic || "IT"}
              </span>
              <span className={`text-xs ${question?.source === "fallback" ? "text-amber-300" : "text-slate-400"}`}>
                {question?.source === "fallback" ? "Fallback question" : "Instant from queue"}
              </span>
            </div>

            {question?.source === "fallback" && question?.fallbackReason && (
              <div className="mb-5 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                <p className="font-semibold">Gemini is not being used right now.</p>
                <p className="mt-1 text-amber-100/80">{question.fallbackReason}</p>
              </div>
            )}

            <h2 className="mb-5 text-xl font-bold leading-relaxed text-white sm:text-2xl">
              {question?.question}
            </h2>

            <div className="space-y-3">
              {question?.options.map((option, index) => (
                <button
                  key={`${question.id}-${index}`}
                  type="button"
                  onClick={() => !submitted && setSelectedOption(index)}
                  disabled={submitted}
                  className={getOptionClasses(index)}
                >
                  <span className="mr-3 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-bold text-slate-300">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span>{option}</span>
                </button>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={selectedOption === null || submitted}
                className="flex-1 rounded-2xl bg-gradient-to-r from-cyan-400 to-sky-500 px-5 py-3 font-semibold text-slate-950 transition duration-200 hover:scale-[1.02] hover:shadow-glow active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              >
                Submit
              </button>
              <button
                type="button"
                onClick={handleNextQuestion}
                disabled={isFetchingNext}
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white transition duration-200 hover:scale-[1.02] hover:bg-white/10 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isFetchingNext ? "Loading..." : "Next Question"}
              </button>
            </div>

            {submitted && question && (
              <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/60 p-4 animate-fade-in">
                <p className={`text-sm font-semibold ${isCorrect ? "text-emerald-300" : "text-rose-300"}`}>
                  {isCorrect ? "Correct answer" : `Incorrect. Correct option: ${String.fromCharCode(65 + question.correctAnswer)}`}
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-300">{question.explanation}</p>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}

export default Quiz;
