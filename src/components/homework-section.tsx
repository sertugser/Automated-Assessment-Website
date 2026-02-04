import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { FileText, Edit, Mic, Headphones, ChevronRight, Calendar, PlayCircle, Volume2 } from 'lucide-react';
import { getAssignmentsForStudent, getAssignment, getSubmissionsByStudent, type Submission } from '../lib/assignments';
import { getCurrentUser } from '../lib/auth';
import { useLanguage } from '../contexts/LanguageContext';

const TYPE_ICONS: Record<string, typeof FileText> = {
  writing: FileText,
  speaking: Mic,
  listening: Headphones,
  quiz: Edit,
};

interface HomeworkSectionProps {
  onStartAssignment: (assignmentId: string, type: string, courseId?: string) => void;
  initialAssignmentId?: string | null;
}

export function HomeworkSection({ onStartAssignment, initialAssignmentId }: HomeworkSectionProps) {
  const { t } = useLanguage();
  const [assignments, setAssignments] = useState<ReturnType<typeof getAssignmentsForStudent>>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [expandedAssignmentId, setExpandedAssignmentId] = useState<string | null>(null);
  const [highlightedAssignmentId, setHighlightedAssignmentId] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const load = () => {
      const user = getCurrentUser();
      if (user?.id) {
        setAssignments(getAssignmentsForStudent(user.id));
        setSubmissions(getSubmissionsByStudent(user.id));
      }
    };
    load();
    const interval = setInterval(load, 2000);
    window.addEventListener('storage', load);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', load);
    };
  }, []);

  useEffect(() => {
    if (initialAssignmentId) {
      setExpandedAssignmentId(initialAssignmentId);
      setHighlightedAssignmentId(initialAssignmentId);
      const timeout = setTimeout(() => setHighlightedAssignmentId(null), 2500);
      const target = cardRefs.current[initialAssignmentId];
      if (target) {
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 0);
      }
      return () => clearTimeout(timeout);
    }
  }, [initialAssignmentId]);

  const mySubmissions = submissions;

  const assignedWithDetails = assignments
    .map((a) => {
      const assignment = getAssignment(a.assignmentId);
      if (!assignment || assignment.status !== 'published') return null;
      const submission = mySubmissions
        .filter((s) => s.assignmentId === a.assignmentId)
        .sort((left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime())[0];
      const submitted = !!submission;
      const reviewed = !!submission?.instructorFeedback || typeof submission?.instructorScore === 'number';
      return { ...a, assignment, submitted, submission, reviewed };
    })
    .filter(Boolean) as Array<{
    assignmentId: string;
    studentId: string;
    assignedAt: string;
    dueDate?: string;
    assignment: NonNullable<ReturnType<typeof getAssignment>>;
    submitted: boolean;
    reviewed: boolean;
    submission?: Submission;
  }>;

  if (assignedWithDetails.length === 0) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold text-gray-900 mb-8"
        >
          {t('nav.homework')}
        </motion.h1>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-indigo-50 to-blue-100 rounded-xl border border-indigo-200 p-12 text-center shadow-lg"
        >
          <FileText className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
          <p className="text-gray-600">{t('homework.noAssignments')}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl font-bold text-gray-900 mb-2"
      >
        {t('nav.homework')}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-gray-500 mb-8"
      >
        {t('homework.assignedBy')}
      </motion.p>
      <div className="space-y-4">
        {assignedWithDetails.map((item, i) => {
          const Icon = TYPE_ICONS[item.assignment.type] || FileText;
          return (
            <motion.div
              key={`${item.assignmentId}-${item.studentId}`}
              ref={(el) => {
                cardRefs.current[item.assignmentId] = el;
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => {
                if (!item.submitted && !item.reviewed) return;
                setExpandedAssignmentId((prev) =>
                  prev === item.assignmentId ? null : item.assignmentId
                );
              }}
              className={`bg-white rounded-2xl p-5 border-2 shadow-lg transition-colors ${
                highlightedAssignmentId === item.assignmentId
                  ? 'border-indigo-400 ring-2 ring-indigo-200 bg-indigo-50/40'
                  : 'border-gray-200 hover:border-indigo-200'
              } ${(item.submitted || item.reviewed) ? 'cursor-pointer' : ''}`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shrink-0">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900">{item.assignment.title}</h3>
                    <p className="text-sm text-gray-500 truncate">{item.assignment.description}</p>
                    {item.assignment.instructions && (
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{item.assignment.instructions}</p>
                    )}
                    {item.dueDate && (
                      <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" />
                        {t('homework.due')}: {new Date(item.dueDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {item.reviewed ? (
                    <>
                      <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium">
                        {t('homework.reviewed')}
                      </span>
                      <button
                        onClick={() =>
                          setExpandedAssignmentId((prev) =>
                            prev === item.assignmentId ? null : item.assignmentId
                          )
                        }
                        onMouseDown={(e) => e.stopPropagation()}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        {expandedAssignmentId === item.assignmentId ? t('homework.hideFeedback') : t('homework.viewFeedback')}
                      </button>
                    </>
                  ) : item.submitted ? (
                    <>
                      <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                        {t('homework.submitted')}
                      </span>
                      <button
                        onClick={() =>
                          setExpandedAssignmentId((prev) =>
                            prev === item.assignmentId ? null : item.assignmentId
                          )
                        }
                        onMouseDown={(e) => e.stopPropagation()}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700"
                      >
                        {expandedAssignmentId === item.assignmentId ? t('homework.hideSubmission') : t('homework.viewSubmission')}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() =>
                        onStartAssignment(
                          item.assignmentId,
                          item.assignment.type,
                          item.assignment.courseId
                        )
                      }
                      onMouseDown={(e) => e.stopPropagation()}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                    >
                      {t('homework.start')}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              {(item.submitted || item.reviewed) && expandedAssignmentId === item.assignmentId && (
                <div className="mt-4 border-t border-gray-100 pt-4 space-y-4">
                  {/* Student's Submission */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">{t('homework.yourSubmission')}</h4>
                    {item.assignment.type === 'writing' && item.submission?.content && (
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.submission.content}</p>
                      </div>
                    )}
                    {item.assignment.type === 'speaking' && item.submission?.audioUrl && (
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <audio controls className="w-full">
                          <source src={item.submission.audioUrl} type="audio/webm" />
                          <source src={item.submission.audioUrl} type="audio/mpeg" />
                          Your browser does not support the audio element.
                        </audio>
                        {item.submission.ocrText && (
                          <p className="text-xs text-gray-600 mt-2 italic">{t('homework.transcript')}: {item.submission.ocrText}</p>
                        )}
                      </div>
                    )}
                    {item.assignment.type === 'listening' && item.submission && (
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <p className="text-sm text-gray-600">{t('homework.listeningCompleted')}</p>
                        {item.submission.aiScore !== undefined && (
                          <p className="text-xs text-gray-500 mt-1">
                            {t('homework.aiScore')}: {item.submission.aiScore}%
                          </p>
                        )}
                      </div>
                    )}
                    {item.assignment.type === 'quiz' && item.submission && (
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <p className="text-sm text-gray-600">{t('homework.quizCompleted')}</p>
                        {item.submission.aiScore !== undefined && (
                          <p className="text-xs text-gray-500 mt-1">
                            {t('homework.aiScore')}: {item.submission.aiScore}%
                          </p>
                        )}
                      </div>
                    )}
                    {item.submission?.submittedAt && (
                      <p className="text-xs text-gray-500 mt-2">
                        {t('homework.submittedAt')}: {new Date(item.submission.submittedAt).toLocaleString()}
                      </p>
                    )}
                  </div>

                  {/* Instructor Feedback (only if reviewed) */}
                  {item.reviewed && (
                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">{t('homework.instructorFeedback')}</h4>
                      {typeof item.submission?.instructorScore === 'number' ? (
                        <div className="mb-3">
                          <p className="text-sm text-gray-700">
                            <span className="font-semibold text-gray-900">{t('homework.instructorScore')}:</span>{' '}
                            <span className="font-bold text-emerald-600">{item.submission.instructorScore}%</span>
                          </p>
                        </div>
                      ) : null}
                      {item.submission?.instructorFeedback ? (
                        <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200 mb-2">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.submission.instructorFeedback}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600 mb-2">{t('homework.noFeedbackYet')}</p>
                      )}
                      {item.submission?.reviewedAt && (
                        <p className="text-xs text-gray-500">
                          {t('homework.reviewedAt')}: {new Date(item.submission.reviewedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
