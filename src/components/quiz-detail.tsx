import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, XCircle, Clock, Calendar, BookOpen, Filter } from 'lucide-react';
import { getActivities, type UserActivity } from '../lib/user-progress';
import { useLanguage } from '../contexts/LanguageContext';

interface QuizDetailProps {
  quizId: string;
  onBack: () => void;
}

export function QuizDetail({ quizId, onBack }: QuizDetailProps) {
  const { t } = useLanguage();
  const [quiz, setQuiz] = useState<UserActivity | null>(null);
  const [showOnlyWrong, setShowOnlyWrong] = useState(false);

  useEffect(() => {
    const activities = getActivities();
    const foundQuiz = activities.find(a => a.id === quizId && a.type === 'quiz');
    setQuiz(foundQuiz || null);
  }, [quizId]);

  if (!quiz) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Quiz not found</h2>
          <p className="text-gray-600 mb-4">The quiz you're looking for doesn't exist.</p>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const questions = quiz.quizQuestions || [];
  const userAnswers = quiz.quizUserAnswers || [];
  const readingPassage = quiz.quizReadingPassage || '';
  const feedback = quiz.quizFeedback;

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };


  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {quiz.courseTitle || quiz.courseId || 'Quiz'}
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(quiz.date)}</span>
            </div>
            {quiz.duration && quiz.duration > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{formatTime(quiz.duration)}</span>
              </div>
            )}
            <div className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full font-semibold">
              Score: {quiz.score}%
            </div>
          </div>
        </div>
      </div>

      {/* Reading Passage (if exists) */}
      {readingPassage && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6 mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-bold text-purple-900">Reading Passage</h3>
          </div>
          <div className="bg-gray-50 rounded-lg p-6 max-h-96 overflow-y-auto">
            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{readingPassage}</p>
          </div>
        </motion.div>
      )}

      {/* Controls + All Questions Overview */}
      {questions.length > 0 && (
        <div className="space-y-4 mb-6">
          {/* Filter Bar */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Questions Overview</h3>
            <button
              type="button"
              onClick={() => setShowOnlyWrong(prev => !prev)}
              className={`inline-flex items-center gap-3 px-6 py-4 rounded-xl text-lg font-bold border-2 transition-all shadow-md hover:shadow-lg
                ${showOnlyWrong
                  ? 'bg-red-50 text-red-800 border-red-300 hover:bg-red-100'
                  : 'bg-red-50 text-red-800 border-red-300 hover:bg-red-100'}
              `}
            >
              <Filter className={`w-5 h-5 text-red-600`} />
              {showOnlyWrong ? 'Show All Questions' : 'Show Only Wrong Questions'}
            </button>
          </div>

          {questions.map((q, index) => {
            const userAns = userAnswers[index];
            const isCorrect = userAns !== null && userAns === q.correctAnswer;
            const answered = userAns !== null;

            if (showOnlyWrong && (!answered || isCorrect)) {
              return null;
            }
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-200 hover:border-indigo-300 transition-all"
              >
                {/* Question Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                      isCorrect ? 'bg-green-100 text-green-800' : answered ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {q.question}
                    </h3>
                  </div>
                  {answered && (
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
                      isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {isCorrect ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Correct
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4" />
                          Incorrect
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Options */}
                <div className="space-y-2 mb-4">
                  {q.options.map((option, optIndex) => {
                    const isSelected = userAns === optIndex;
                    const isCorrectAnswer = optIndex === q.correctAnswer;
                    
                    return (
                      <div
                        key={optIndex}
                        className={`
                          p-3 rounded-lg border-2 transition-all
                          ${isCorrectAnswer ? 'border-green-500 bg-green-50' : ''}
                          ${isSelected && !isCorrectAnswer ? 'border-red-500 bg-red-50' : ''}
                          ${isSelected && isCorrectAnswer ? 'border-green-500 bg-green-50' : ''}
                          ${!isSelected && !isCorrectAnswer ? 'border-gray-200 bg-gray-50' : ''}
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`font-medium ${
                            isCorrectAnswer ? 'text-green-900' : 
                            isSelected && !isCorrectAnswer ? 'text-red-900' : 
                            'text-gray-700'
                          }`}>
                            {option}
                          </span>
                          {isCorrectAnswer && (
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 ml-2" />
                          )}
                          {isSelected && !isCorrectAnswer && (
                            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 ml-2" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                {q.explanation && (
                  <div className={`
                    rounded-lg p-4 border-2 mt-4
                    ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}
                  `}>
                    <div className="flex items-start gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isCorrect ? 'bg-green-500' : 'bg-red-500'
                      }`}>
                        {isCorrect ? (
                          <CheckCircle className="w-5 h-5 text-white" />
                        ) : (
                          <XCircle className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900 mb-1">
                          {isCorrect ? 'Correct!' : 'Explanation'}
                        </p>
                        <p className="text-sm text-gray-700">{q.explanation}</p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* AI Feedback */}
      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl shadow-lg p-8 border-2 border-indigo-200"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-4">AI Performance Analysis</h3>
          <div className="space-y-3">
            {feedback.strongAreas && (
              <div className="bg-white p-4 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div>
                    <p className="font-semibold text-gray-900">Strong Areas</p>
                    <p className="text-gray-600 text-sm">{feedback.strongAreas}</p>
                  </div>
                </div>
              </div>
            )}
            {feedback.areasForImprovement && (
              <div className="bg-white p-4 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                  <div>
                    <p className="font-semibold text-gray-900">Areas for Improvement</p>
                    <p className="text-gray-600 text-sm">{feedback.areasForImprovement}</p>
                  </div>
                </div>
              </div>
            )}
            {feedback.recommendation && (
              <div className="bg-white p-4 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <p className="font-semibold text-gray-900">Recommendation</p>
                    <p className="text-gray-600 text-sm">{feedback.recommendation}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
