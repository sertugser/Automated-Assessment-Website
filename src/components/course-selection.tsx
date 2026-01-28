import { BookOpen, MessageSquare, Ear, Mic, FileText, Award, GraduateCap, Languages, Briefcase } from 'lucide-react';
import { motion } from 'motion/react';

interface CourseSelectionProps {
  onCourseSelect: (courseId: string) => void;
}

const courses = [
  {
    id: 'grammar-basics',
    title: 'English Grammar',
    description: 'Master essential grammar rules and structures',
    icon: BookOpen,
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    questions: 15,
    duration: 20,
    difficulty: 'Beginner'
  },
  {
    id: 'vocabulary',
    title: 'Vocabulary Building',
    description: 'Expand your English vocabulary with common words',
    icon: Languages,
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50',
    questions: 20,
    duration: 15,
    difficulty: 'Beginner'
  },
  {
    id: 'reading-comprehension',
    title: 'Reading Comprehension',
    description: 'Improve reading skills and text understanding',
    icon: FileText,
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50',
    questions: 10,
    duration: 25,
    difficulty: 'Intermediate'
  },
  {
    id: 'listening',
    title: 'Listening Skills',
    description: 'Enhance listening and comprehension abilities',
    icon: Ear,
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-50',
    questions: 12,
    duration: 20,
    difficulty: 'Intermediate'
  },
  {
    id: 'speaking',
    title: 'Speaking Practice',
    description: 'Build confidence in English conversations',
    icon: Mic,
    color: 'from-pink-500 to-pink-600',
    bgColor: 'bg-pink-50',
    questions: 10,
    duration: 15,
    difficulty: 'Intermediate'
  },
  {
    id: 'writing',
    title: 'Writing Skills',
    description: 'Develop clear and effective writing abilities',
    icon: MessageSquare,
    color: 'from-indigo-500 to-indigo-600',
    bgColor: 'bg-indigo-50',
    questions: 12,
    duration: 30,
    difficulty: 'Advanced'
  },
  {
    id: 'business-english',
    title: 'Business English',
    description: 'Professional English for workplace success',
    icon: Briefcase,
    color: 'from-teal-500 to-teal-600',
    bgColor: 'bg-teal-50',
    questions: 15,
    duration: 25,
    difficulty: 'Advanced'
  },
  {
    id: 'ielts-prep',
    title: 'IELTS Preparation',
    description: 'Prepare for IELTS exam with practice tests',
    icon: Award,
    color: 'from-rose-500 to-rose-600',
    bgColor: 'bg-rose-50',
    questions: 20,
    duration: 35,
    difficulty: 'Advanced'
  }
];

export function CourseSelection({ onCourseSelect }: CourseSelectionProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Choose Your English Learning Path
        </h1>
        <p className="text-xl text-gray-600">
          Select a topic to start your assessment and get instant AI feedback
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {courses.map((course, index) => (
          <motion.div
            key={course.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onCourseSelect(course.id)}
            className="group cursor-pointer"
          >
            <div className={`${course.bgColor} rounded-2xl p-6 h-full border-2 border-transparent hover:border-gray-300 transition-all hover:shadow-xl`}>
              <div className={`w-14 h-14 bg-gradient-to-br ${course.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <course.icon className="w-7 h-7 text-white" />
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {course.title}
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                {course.description}
              </p>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center justify-between">
                  <span>Questions:</span>
                  <span className="font-semibold text-gray-900">{course.questions}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Duration:</span>
                  <span className="font-semibold text-gray-900">{course.duration} min</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Level:</span>
                  <span className={`font-semibold ${
                    course.difficulty === 'Beginner' ? 'text-green-600' :
                    course.difficulty === 'Intermediate' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {course.difficulty}
                  </span>
                </div>
              </div>

              <button className={`w-full mt-6 bg-gradient-to-r ${course.color} text-white py-3 rounded-lg font-semibold group-hover:shadow-lg transition-all`}>
                Start Assessment
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}