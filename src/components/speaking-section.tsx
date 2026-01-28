import { motion } from 'motion/react';
import { useState, useRef, useEffect } from 'react';
import { 
  Mic, MicOff, Play, Square, Volume2, Award, Clock, 
  CheckCircle, Star, Sparkles, ChevronRight, Pause
} from 'lucide-react';
import { analyzeSpeaking, type AIFeedback, generatePersonalizedTips } from '../lib/ai-services';
import { saveActivity, getSpeakingStats, getActivitiesByType, getUserStats } from '../lib/user-progress';
import { getCurrentUser } from '../lib/auth';
import { toast } from 'sonner';

const speakingTopics = [
  {
    id: 1,
    title: 'Self Introduction',
    description: 'Introduce yourself in English',
    difficulty: 'Beginner',
    duration: '2 min',
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    completed: true,
    score: 88
  },
  {
    id: 2,
    title: 'Daily Routine',
    description: 'Describe your typical day',
    difficulty: 'Beginner',
    duration: '3 min',
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50',
    completed: true,
    score: 92
  },
  {
    id: 3,
    title: 'Favorite Hobby',
    description: 'Talk about your hobbies',
    difficulty: 'Intermediate',
    duration: '3 min',
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50',
    completed: false,
    score: null
  },
  {
    id: 4,
    title: 'Travel Experience',
    description: 'Share a memorable trip',
    difficulty: 'Intermediate',
    duration: '4 min',
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-50',
    completed: false,
    score: null
  },
  {
    id: 5,
    title: 'Job Interview',
    description: 'Practice professional conversation',
    difficulty: 'Advanced',
    duration: '5 min',
    color: 'from-pink-500 to-pink-600',
    bgColor: 'bg-pink-50',
    completed: false,
    score: null
  },
  {
    id: 6,
    title: 'Debate Topic',
    description: 'Argue for or against a topic',
    difficulty: 'Advanced',
    duration: '5 min',
    color: 'from-indigo-500 to-indigo-600',
    bgColor: 'bg-indigo-50',
    completed: false,
    score: null
  }
];

// Helper function to format date
const formatActivityDate = (dateString: string): string => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  today.setHours(0, 0, 0, 0);
  yesterday.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  
  if (date.getTime() === today.getTime()) {
    return 'Today';
  } else if (date.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  } else {
    const daysDiff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    return `${daysDiff} days ago`;
  }
};

// Helper function to format duration (estimate 2 minutes per recording)
const formatDuration = (): string => {
  return '2:00'; // Default estimate
};

export function SpeakingSection() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedTopic, setSelectedTopic] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState<AIFeedback | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [speakingStats, setSpeakingStats] = useState(getSpeakingStats());
  const [recentRecordings, setRecentRecordings] = useState<Array<{
    id: string;
    topic: string;
    date: string;
    duration: string;
    score: number;
  }>>([]);
  const [speakingTips, setSpeakingTips] = useState<string[]>([]);
  const [loadingTips, setLoadingTips] = useState(true);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const updateStats = () => {
      setSpeakingStats(getSpeakingStats());
      
      // Update recent recordings
      const speakingActivities = getActivitiesByType('speaking');
      const recent = speakingActivities
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3)
        .map(activity => ({
          id: activity.id,
          topic: activity.courseTitle || 'Speaking Practice',
          date: activity.date,
          duration: '2:00', // Estimate
          score: activity.score,
        }));
      setRecentRecordings(recent);
    };

    updateStats();
    const interval = setInterval(updateStats, 2000);
    window.addEventListener('storage', updateStats);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', updateStats);
    };
  }, []);

  useEffect(() => {
    const loadTips = async () => {
      setLoadingTips(true);
      try {
        const stats = getUserStats();
        const sStats = getSpeakingStats();
        const user = getCurrentUser();
        const tips = await generatePersonalizedTips('speaking', {
          averageScore: stats.averageScore,
          totalActivities: stats.totalActivities,
          cefrLevel: user?.cefrLevel ?? undefined,
          totalRecordings: sStats.totalRecordings,
          avgPronunciation: sStats.avgPronunciation,
        });
        setSpeakingTips(tips);
      } catch (error) {
        console.error('Error loading tips:', error);
        setSpeakingTips([
          'Speak clearly and at a moderate pace',
          'Use complete sentences',
          'Practice in a quiet environment',
          "Don't worry about mistakes!"
        ]);
      } finally {
        setLoadingTips(false);
      }
    };

    loadTips();
  }, []);

  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, isPaused]);

  const handleStartRecording = async (topicId: number) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        // Analyze with AI
        setIsAnalyzing(true);
        setShowFeedback(false);
        try {
          const aiFeedback = await analyzeSpeaking(audioBlob);
          setFeedback(aiFeedback);
          setShowFeedback(true);
          
          // Save speaking activity to progress tracking
          const selectedTopicData = speakingTopics.find(t => t.id === selectedTopic);
          saveActivity({
            type: 'speaking',
            score: aiFeedback.overallScore,
            courseTitle: selectedTopicData?.title || 'Speaking Practice',
          });
          
          toast.success(`Analysis complete! Score: ${aiFeedback.overallScore}%`);
        } catch (error) {
          console.error('Error analyzing speaking:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          toast.error(`Failed to analyze: ${errorMessage}. Please check your API keys (Gemini required for audio transcription) and try again.`);
        } finally {
          setIsAnalyzing(false);
        }
      };

      mediaRecorder.start();
      setSelectedTopic(topicId);
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
      toast.success('Recording started');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Could not access microphone. Please check permissions.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      toast.info('Recording stopped. Analyzing...');
    }
  };

  const handleTogglePause = () => {
    if (mediaRecorderRef.current) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
      }
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Speaking Practice</h1>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-xl"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Mic className="w-5 h-5" />
            </div>
            <Sparkles className="w-4 h-4 opacity-60" />
          </div>
          <div className="text-2xl font-bold mb-0.5">{speakingStats.totalRecordings}</div>
          <div className="text-blue-100 text-xs">Total Recordings</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 text-white shadow-xl"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Star className="w-5 h-5" />
            </div>
            <Award className="w-4 h-4 opacity-60" />
          </div>
          <div className="text-2xl font-bold mb-0.5">{speakingStats.avgPronunciation}%</div>
          <div className="text-green-100 text-xs">Avg. Pronunciation</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 text-white shadow-xl"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Clock className="w-5 h-5" />
            </div>
            <Volume2 className="w-4 h-4 opacity-60" />
          </div>
          <div className="text-2xl font-bold mb-0.5">{speakingStats.totalMinutes} min</div>
          <div className="text-purple-100 text-xs">Speaking Time</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-4 text-white shadow-xl"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <CheckCircle className="w-5 h-5" />
            </div>
            <Star className="w-4 h-4 opacity-60" />
          </div>
          <div className="text-2xl font-bold mb-0.5">{speakingStats.avgFluency}%</div>
          <div className="text-orange-100 text-xs">Fluency Score</div>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Speaking Topics */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Speaking Topics</h2>
              <button className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                View All
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {speakingTopics.map((topic, index) => (
                <motion.div
                  key={topic.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * index }}
                  className="bg-white rounded-2xl p-6 border-2 border-gray-200 hover:shadow-xl transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 bg-gradient-to-br ${topic.color} rounded-xl`}>
                      <Mic className="w-6 h-6 text-white" />
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      topic.difficulty === 'Beginner' ? 'bg-green-100 text-green-700' :
                      topic.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {topic.difficulty}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-2">{topic.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{topic.description}</p>

                  <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{topic.duration}</span>
                    </div>
                    {topic.completed && (
                      <div className="flex items-center gap-1 text-green-600 font-semibold">
                        <CheckCircle className="w-4 h-4" />
                        <span>{topic.score}%</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleStartRecording(topic.id)}
                    className={`w-full bg-gradient-to-r ${topic.color} text-white py-2.5 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2`}
                  >
                    <Mic className="w-4 h-4" />
                    {topic.completed ? 'Practice Again' : 'Start Recording'}
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recording Controls */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className={`rounded-2xl p-6 border-2 shadow-lg ${
              isRecording 
                ? 'bg-gradient-to-br from-red-50 to-pink-50 border-red-200' 
                : 'bg-white border-gray-200'
            }`}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">Recording Controls</h3>
            
            {!isRecording && !selectedTopic && (
              <div className="text-center py-8">
                <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <MicOff className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-gray-600">Select a topic to start recording</p>
              </div>
            )}

            {isRecording && selectedTopic && (
              <div className="space-y-4">
                <div className="flex items-center justify-center mb-6">
                  <motion.div
                    animate={{ scale: isPaused ? 1 : [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="p-6 bg-gradient-to-br from-red-500 to-pink-500 rounded-full"
                  >
                    <Mic className="w-12 h-12 text-white" />
                  </motion.div>
                </div>

                <div className="text-center">
                  <div className="text-4xl font-bold text-gray-900 mb-2">
                    {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                  </div>
                  <div className="text-sm text-gray-600">
                    {isPaused ? 'Paused' : 'Recording...'}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleTogglePause}
                    className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                    {isPaused ? 'Resume' : 'Pause'}
                  </button>
                  <button
                    onClick={handleStopRecording}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    <Square className="w-5 h-5" />
                    Stop
                  </button>
                </div>
              </div>
            )}

            {isAnalyzing && (
              <div className="text-center py-8">
                <Sparkles className="w-12 h-12 text-indigo-600 mx-auto mb-4 animate-spin" />
                <p className="text-gray-600 font-semibold">Analyzing your recording...</p>
                <p className="text-sm text-gray-500 mt-2">This may take a few seconds</p>
              </div>
            )}

            {showFeedback && feedback && !isAnalyzing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border-2 border-indigo-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    AI Feedback
                  </h4>
                  <div className="text-2xl font-bold text-indigo-600">{feedback.overallScore}%</div>
                </div>

                {feedback.pronunciation && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-700">Pronunciation</span>
                      <span className="text-sm font-bold text-gray-900">{feedback.pronunciation.score}%</span>
                    </div>
                    {feedback.pronunciation.errors.length > 0 && (
                      <div className="text-xs text-gray-600 space-y-1 mt-1">
                        {feedback.pronunciation.errors.slice(0, 2).map((error, idx) => (
                          <div key={idx} className="bg-red-50 border border-red-200 rounded p-2">
                            <strong>{error.word}:</strong> Expected {error.expected}, heard {error.actual}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {feedback.fluency && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-700">Fluency</span>
                      <span className="text-sm font-bold text-gray-900">{feedback.fluency.score}%</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      {feedback.fluency.wordsPerMinute} WPM • {feedback.fluency.pauseAnalysis}
                    </div>
                  </div>
                )}

                {feedback.strengths.length > 0 && (
                  <div className="mb-2">
                    <div className="text-xs font-semibold text-green-700 mb-1 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Strengths
                    </div>
                    <ul className="text-xs text-gray-700 space-y-0.5">
                      {feedback.strengths.slice(0, 2).map((strength, idx) => (
                        <li key={idx}>• {strength}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {feedback.improvements.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-yellow-700 mb-1 flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      Improvements
                    </div>
                    <ul className="text-xs text-gray-700 space-y-0.5">
                      {feedback.improvements.slice(0, 2).map((improvement, idx) => (
                        <li key={idx}>• {improvement}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>

          {/* Recent Recordings */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Recordings</h3>
            <div className="space-y-3">
              {recentRecordings.length > 0 ? (
                recentRecordings.map((recording) => (
                  <div
                    key={recording.id}
                    className="p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold text-sm text-gray-900">{recording.topic}</div>
                      <div className="text-xs text-gray-500">{formatActivityDate(recording.date)}</div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Clock className="w-3 h-3" />
                        <span>{recording.duration}</span>
                      </div>
                      <div className="font-bold text-green-600">{recording.score}%</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No recordings yet. Start your first speaking practice!
                </div>
              )}
            </div>
          </motion.div>

          {/* Tips */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-200 shadow-lg"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">AI-Powered Speaking Tips</h3>
            {loadingTips ? (
              <div className="text-center py-4 text-gray-500 text-sm">Loading personalized tips...</div>
            ) : (
              <ul className="space-y-2 text-sm text-gray-700">
                {speakingTips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
