import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Headphones, PlayCircle, PauseCircle, RotateCcw, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export function ListeningSection() {
  const { t } = useLanguage();
  const [isPlaying, setIsPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [selectedLevel, setSelectedLevel] = useState<'A2' | 'B1' | 'B2'>('B1');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const exercise = useMemo(() => {
    const bank = {
      A2: {
        title: 'Daily Routine',
        text:
          "Hi! My name is Sarah. I usually wake up at seven o'clock. I have breakfast and then I go to work by bus. In the evening, I cook dinner and watch a movie. On weekends, I meet my friends at a café.",
        questions: [
          {
            id: 'q1',
            question: 'How does Sarah go to work?',
            options: ['By car', 'By bus', 'By train', 'On foot'],
            correct: 'By bus',
          },
          {
            id: 'q2',
            question: 'What does Sarah do on weekends?',
            options: ['She travels', 'She studies', 'She meets friends', 'She works late'],
            correct: 'She meets friends',
          },
        ],
      },
      B1: {
        title: 'A Small Problem at the Airport',
        text:
          'Yesterday, I arrived at the airport early, but my flight was delayed because of bad weather. While I was waiting, I helped a tourist who could not find the right gate. In the end, we both reached the gate on time, and the plane finally took off.',
        questions: [
          {
            id: 'q1',
            question: 'Why was the flight delayed?',
            options: ['Technical issues', 'Bad weather', 'A missing pilot', 'A security check'],
            correct: 'Bad weather',
          },
          {
            id: 'q2',
            question: 'What did the speaker do while waiting?',
            options: ['Had a meeting', 'Went shopping', 'Helped a tourist', 'Changed the ticket'],
            correct: 'Helped a tourist',
          },
          {
            id: 'q3',
            question: 'What happened in the end?',
            options: ['They missed the flight', 'The airport closed', 'They reached the gate on time', 'The gate changed again'],
            correct: 'They reached the gate on time',
          },
        ],
      },
      B2: {
        title: 'Working from Home',
        text:
          'In recent years, working from home has become more common. Many employees enjoy the flexibility, but it also requires strong self-discipline. Without clear boundaries, people may work longer hours and feel more stressed. Companies can support remote workers by offering regular check-ins, clear goals, and opportunities for social connection.',
        questions: [
          {
            id: 'q1',
            question: 'What is a possible downside of working from home?',
            options: ['Less flexibility', 'Longer hours and stress', 'More commuting time', 'Fewer goals'],
            correct: 'Longer hours and stress',
          },
          {
            id: 'q2',
            question: 'What can companies do to support remote workers?',
            options: ['Avoid check-ins', 'Remove goals', 'Offer social connection opportunities', 'Increase commuting'],
            correct: 'Offer social connection opportunities',
          },
        ],
      },
    } as const;

    return bank[selectedLevel];
  }, [selectedLevel]);

  useEffect(() => {
    // stop speech when leaving / rerendering exercise
    window.speechSynthesis.cancel();
    setIsPlaying(false);
  }, [selectedLevel]);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const speak = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(exercise.text);
    utter.rate = rate;
    utter.onend = () => setIsPlaying(false);
    utter.onerror = () => setIsPlaying(false);
    setIsPlaying(true);
    window.speechSynthesis.speak(utter);
  };

  const pause = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.pause();
    setIsPlaying(false);
  };

  const reset = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setAnswers({});
    setSubmitted(false);
  };

  const score = useMemo(() => {
    const total = exercise.questions.length;
    const correctCount = exercise.questions.reduce((acc, q) => acc + (answers[q.id] === q.correct ? 1 : 0), 0);
    return { correctCount, total };
  }, [answers, exercise.questions]);

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">{t('nav.listening')}</h1>
        <p className="text-gray-600">
          Practice comprehension with an audio-style passage and quick questions.
        </p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-50">
                  <Headphones className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{exercise.title}</h2>
                  <p className="text-sm text-gray-600">
                    {('speechSynthesis' in window)
                      ? 'Press Play to listen (uses your browser voice).'
                      : 'Your browser does not support audio playback for this demo.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={isPlaying ? pause : speak}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors"
                >
                  {isPlaying ? <PauseCircle className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                >
                  <RotateCcw className="w-5 h-5" />
                  Reset
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-gray-800 mb-2">Level</label>
                <div className="flex flex-wrap gap-2">
                  {(['A2', 'B1', 'B2'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => {
                        setSelectedLevel(lvl);
                        setAnswers({});
                        setSubmitted(false);
                      }}
                      className={`px-4 py-2 rounded-xl border-2 font-semibold transition-colors ${
                        selectedLevel === lvl
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Speed</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0.7}
                    max={1.2}
                    step={0.1}
                    value={rate}
                    onChange={(e) => setRate(Number(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-sm font-semibold text-gray-700 w-12 text-right">{rate.toFixed(1)}x</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h3 className="text-lg font-bold text-gray-900">Questions</h3>
              {submitted && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 text-sm font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  Score: {score.correctCount}/{score.total}
                </div>
              )}
            </div>

            <div className="space-y-5">
              {exercise.questions.map((q, idx) => (
                <div key={q.id} className="p-4 rounded-xl border border-gray-200">
                  <div className="font-semibold text-gray-900 mb-3">
                    {idx + 1}. {q.question}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {q.options.map((opt) => {
                      const isSelected = answers[q.id] === opt;
                      const isCorrect = submitted && opt === q.correct;
                      const isWrongSelected = submitted && isSelected && opt !== q.correct;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            if (submitted) return;
                            setAnswers((prev) => ({ ...prev, [q.id]: opt }));
                          }}
                          className={`text-left px-4 py-3 rounded-xl border-2 transition-colors ${
                            isCorrect
                              ? 'border-green-500 bg-green-50 text-green-800'
                              : isWrongSelected
                                ? 'border-red-500 bg-red-50 text-red-800'
                                : isSelected
                                  ? 'border-indigo-600 bg-indigo-50 text-indigo-800'
                                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setAnswers({});
                  setSubmitted(false);
                }}
                className="px-4 py-2 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              >
                Clear answers
              </button>
              <button
                type="button"
                onClick={() => setSubmitted(true)}
                disabled={exercise.questions.some((q) => !answers[q.id])}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Check answers
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border-2 border-indigo-200 shadow-lg">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Tips</h3>
            <ul className="text-sm text-gray-700 space-y-2">
              <li>Listen once for the main idea, then again for details.</li>
              <li>Don’t translate word-by-word; focus on meaning.</li>
              <li>Try different speeds: start slow, then move to 1.0x.</li>
              <li>After answering, replay and notice what you missed.</li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Transcript</h3>
            <p className="text-sm text-gray-700 whitespace-pre-line">{exercise.text}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

