import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { FileText, Edit, Mic, ClipboardList, ChevronRight, Calendar } from 'lucide-react';
import { getAssignmentsForStudent, getAssignment, getSubmissionsByStudent } from '../lib/assignments';
import { getCurrentUser } from '../lib/auth';
import { useLanguage } from '../contexts/LanguageContext';

const TYPE_ICONS: Record<string, typeof FileText> = {
  writing: FileText,
  speaking: Mic,
  handwriting: ClipboardList,
  quiz: Edit,
};

interface HomeworkSectionProps {
  onStartAssignment: (assignmentId: string, type: string, courseId?: string) => void;
}

export function HomeworkSection({ onStartAssignment }: HomeworkSectionProps) {
  const { t } = useLanguage();
  const [assignments, setAssignments] = useState<ReturnType<typeof getAssignmentsForStudent>>([]);

  useEffect(() => {
    const user = getCurrentUser();
    if (user?.id) {
      setAssignments(getAssignmentsForStudent(user.id));
    }
  }, []);

  const user = getCurrentUser();
  const mySubmissions = user ? getSubmissionsByStudent(user.id) : [];

  const assignedWithDetails = assignments
    .map((a) => {
      const assignment = getAssignment(a.assignmentId);
      if (!assignment || assignment.status !== 'published') return null;
      const submitted = mySubmissions.some((s) => s.assignmentId === a.assignmentId);
      return { ...a, assignment, submitted };
    })
    .filter(Boolean) as Array<{
    assignmentId: string;
    studentId: string;
    assignedAt: string;
    dueDate?: string;
    assignment: NonNullable<ReturnType<typeof getAssignment>>;
    submitted: boolean;
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
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-2xl p-5 border-2 border-gray-200 shadow-lg hover:border-indigo-200 transition-colors"
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
                  {item.submitted ? (
                    <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                      {t('homework.submitted')}
                    </span>
                  ) : (
                    <button
                      onClick={() =>
                        onStartAssignment(
                          item.assignmentId,
                          item.assignment.type,
                          item.assignment.courseId
                        )
                      }
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                    >
                      {t('homework.start')}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
