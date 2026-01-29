import { motion } from 'motion/react';
import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { 
  Mic,
  MicOff,
  Play,
  Square,
  Volume2,
  Award,
  Clock,
  CheckCircle,
  Star,
  Sparkles,
  ChevronRight,
  Pause,
  Upload,
  Trash,
} from 'lucide-react';
import { analyzeSpeaking, type AIFeedback, generatePersonalizedTips } from '../lib/ai-services';
import { saveActivity, getSpeakingStats, getActivitiesByType, getUserStats } from '../lib/user-progress';
import { getCurrentUser } from '../lib/auth';
import { toast } from 'sonner';

// Speaking topics aligned with Writing prompts (aynı tarz konular, konuşmaya göre sürelerle)
const speakingTopics = [
  {
    id: 1,
    title: 'My Best Friend',
    description: 'Talk about your best friend and why they are special',
    difficulty: 'Beginner',
    duration: '2 min',
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    completed: true,
    score: 85,
  },
  {
    id: 2,
    title: 'A Memorable Day',
    description: 'Describe a day you will never forget',
    difficulty: 'Beginner',
    duration: '3 min',
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50',
    completed: true,
    score: 90,
  },
  {
    id: 3,
    title: 'My Dream Job',
    description: 'Explain your ideal career and why you want it',
    difficulty: 'Intermediate',
    duration: '3 min',
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50',
    completed: false,
    score: null,
  },
  {
    id: 4,
    title: 'Technology and Society',
    description: 'Talk about how technology affects our daily lives',
    difficulty: 'Intermediate',
    duration: '4 min',
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-50',
    completed: false,
    score: null,
  },
  {
    id: 5,
    title: 'Argumentative Topic',
    description: 'Give your opinion: should social media be regulated?',
    difficulty: 'Advanced',
    duration: '5 min',
    color: 'from-pink-500 to-pink-600',
    bgColor: 'bg-pink-50',
    completed: false,
    score: null,
  },
  {
    id: 6,
    title: 'Critical Issue',
    description: 'Discuss a current global issue and possible solutions',
    difficulty: 'Advanced',
    duration: '5 min',
    color: 'from-indigo-500 to-indigo-600',
    bgColor: 'bg-indigo-50',
    completed: false,
    score: null,
  },
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

interface SpeakingSectionProps {
  initialActivityId?: string | null;
}

export function SpeakingSection({ initialActivityId }: SpeakingSectionProps) {
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
  const [currentAudioBlob, setCurrentAudioBlob] = useState<Blob | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null);
  const [uploadedAudioName, setUploadedAudioName] = useState<string | null>(null);
  const [preAnalysisText, setPreAnalysisText] = useState<string>('');

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

  // Dashboard'dan belirli bir speaking kaydıyla gelindiyse, o kaydı yükle
  useEffect(() => {
    if (!initialActivityId) return;

    const speakingActivities = getActivitiesByType('speaking');
    const activity = speakingActivities.find((a) => a.id === initialActivityId) as any;
    if (!activity) return;

    const transcript: string = activity.speakingTranscript || '';
    const savedFeedback: AIFeedback | null = activity.speakingFeedback || null;

    if (transcript) {
      setPreAnalysisText(`Spoken transcript:\n${transcript.trim()}`);
    }

    if (savedFeedback) {
      setFeedback(savedFeedback);
      setShowFeedback(true);
    } else {
      setFeedback(null);
      setShowFeedback(false);
    }
  }, [initialActivityId]);

  // Yardımcı: alt kategorilerden genel speaking skorunu hesapla
  const getSpeakingOverallScore = (fb: AIFeedback): number => {
    const scores: number[] = [];
    if (fb.fluency?.score != null) scores.push(fb.fluency.score);
    if (fb.pronunciation?.score != null) scores.push(fb.pronunciation.score);
    if (fb.grammar?.score != null) scores.push(fb.grammar.score);
    if (fb.vocabulary?.score != null) scores.push(fb.vocabulary.score);
    if (!scores.length) return fb.overallScore;
    return Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
  };

  // Tam sayfa yenilemede son speaking analizini geri yüklemek için sessionStorage bayrağı kullan
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        sessionStorage.setItem('assessai_speaking_reload', '1');
      } catch {
        // ignore
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    let shouldRestore = false;
    try {
      shouldRestore = sessionStorage.getItem('assessai_speaking_reload') === '1';
    } catch {
      shouldRestore = false;
    }

    if (!shouldRestore) return;

    const speakingActivities = getActivitiesByType('speaking');
    if (!speakingActivities.length) return;

    const latest = [...speakingActivities].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0] as any;

    const transcript: string = latest.speakingTranscript || '';
    const savedFeedback: AIFeedback | null = latest.speakingFeedback || null;

    if (transcript && !preAnalysisText) {
      setPreAnalysisText(`Spoken transcript:\n${transcript.trim()}`);
    }

    if (savedFeedback && !feedback) {
      setFeedback(savedFeedback);
      setShowFeedback(true);
    }

    // Bayrağı sadece bir kere kullan
    try {
      sessionStorage.removeItem('assessai_speaking_reload');
    } catch {
      // ignore
    }
  }, [preAnalysisText, feedback]);

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

  const activeTopic = speakingTopics.find((t) => t.id === selectedTopic ?? undefined);

  const handleStartRecording = async (topicId?: number | null) => {
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

        // Kaydı sakla, analiz butonuna basılınca kullanılacak
        setCurrentAudioBlob(audioBlob);
        toast.success('Recording saved. Press "Analyze" to get feedback.');
      };

      mediaRecorder.start();
      if (topicId != null) {
        setSelectedTopic(topicId);
      }
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
      toast.success('Recording started');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Could not access microphone. Please check permissions.');
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

  const handleUploadFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isAudio = file.type.startsWith('audio/');

    if (!isAudio) {
      toast.error('Please upload an audio file.');
      event.target.value = '';
      return;
    }

    if (uploadedAudioUrl) {
      URL.revokeObjectURL(uploadedAudioUrl);
    }
    const url = URL.createObjectURL(file);
    setUploadedAudioUrl(url);
    setUploadedAudioName(file.name);
    setCurrentAudioBlob(file);
    toast.success('Audio file loaded. Press \"Analyze\" to get feedback.');

    // Reset input so same file can be re-selected later if needed
    event.target.value = '';
  };

  const handleClearPreAnalysis = () => {
    // Metni temizle
    setPreAnalysisText('');

    // Herhangi bir aktif kayıt / timer varsa durdur
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    audioChunksRef.current = [];
    setIsRecording(false);
    setIsPaused(false);

    // Yüklenmiş sesi temizle
    if (uploadedAudioUrl) {
      URL.revokeObjectURL(uploadedAudioUrl);
    }
    setUploadedAudioUrl(null);
    setUploadedAudioName(null);
    setCurrentAudioBlob(null);
    // Analiz/feedback durumunu sıfırla
    setIsAnalyzing(false);
    setFeedback(null);
    setShowFeedback(false);

    toast.success('Speaking area cleared. You can record or upload a new audio.');
  };

  const handleLoadRecentRecording = (activityId: string) => {
    const speakingActivities = getActivitiesByType('speaking');
    const activity = speakingActivities.find(a => a.id === activityId);
    if (!activity) return;

    const transcript = (activity as any).speakingTranscript || '';
    const savedFeedback = (activity as any).speakingFeedback || null;

    if (!transcript) {
      toast.info('This older recording does not have a saved transcript. New recordings will be viewable here.');
    }

    setPreAnalysisText(
      transcript ? `Spoken transcript:\n${transcript}` : preAnalysisText
    );

    if (savedFeedback) {
      setFeedback(savedFeedback);
      setShowFeedback(true);
    } else {
      setFeedback(null);
      setShowFeedback(false);
    }

    // Audio blob yeniden yüklenmiyor; sadece transcript ve analiz sonucu gösteriliyor
    setCurrentAudioBlob(null);
  };

  const handleAnalyze = async () => {
    // Öncelik: devam eden veya pause edilmiş kaydın elindeki chunk'ları kullan
    let blobToAnalyze: Blob | null = null;

    if (audioChunksRef.current.length > 0) {
      blobToAnalyze = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    } else if (currentAudioBlob) {
      blobToAnalyze = currentAudioBlob;
    }

    if (!blobToAnalyze) {
      toast.error('No recording or uploaded audio to analyze.');
      return;
    }

    setCurrentAudioBlob(blobToAnalyze);
    setIsAnalyzing(true);
    setShowFeedback(false);

    try {
      const { feedback: aiFeedback, transcript } = await analyzeSpeaking(blobToAnalyze);

      const computedOverall = getSpeakingOverallScore(aiFeedback);
      const normalizedFeedback: AIFeedback = {
        ...aiFeedback,
        overallScore: computedOverall,
      };

      setFeedback(normalizedFeedback);
      setShowFeedback(true);

      if (transcript && transcript.trim()) {
        setPreAnalysisText(`Spoken transcript:\n${transcript.trim()}`);
      }

      const selectedTopicData = speakingTopics.find(t => t.id === selectedTopic);
      saveActivity({
        type: 'speaking',
        score: computedOverall,
        courseTitle: selectedTopicData?.title || 'Speaking Practice',
        speakingTranscript: transcript,
        speakingFeedback: normalizedFeedback,
      });

      toast.success(`Analysis complete! Score: ${computedOverall}%`);
    } catch (error) {
      console.error('Error analyzing speaking:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(
        `Failed to analyze: ${errorMessage}. Please check your API keys (Gemini required for audio transcription) and try again.`
      );
    } finally {
      setIsAnalyzing(false);
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
        {/* Main speaking area – yapı olarak Writing sayfasına benzer */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg"
          >
            <div className="flex items-start justify-between mb-4 gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Your Speaking</h2>
                {activeTopic ? (
                  <p className="text-sm text-indigo-600 mt-1 flex items-center gap-1">
                    <Mic className="w-4 h-4" />
                    Selected topic:&nbsp;
                    <span className="font-semibold">{activeTopic.title}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedTopic(null)}
                      className="ml-2 text-xs text-gray-500 hover:text-gray-700 underline"
                    >
                      Clear selection
                    </button>
                  </p>
                ) : (
                  <p className="text-sm text-gray-600 mt-1">
                    Choose a speaking topic below and then start recording your answer.
                  </p>
                )}
              </div>
            </div>

            {/* Topic suggestions as chips – Writing sayfasındaki yapı ile benzer */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  Speaking topics
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {speakingTopics.map((topic) => (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => setSelectedTopic(topic.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all flex items-center gap-2 ${
                      selectedTopic === topic.id
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <span>{topic.title}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        topic.difficulty === 'Beginner'
                          ? 'bg-green-100 text-green-700'
                          : topic.difficulty === 'Intermediate'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {topic.difficulty}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Summary of selected topic */}
            {activeTopic && (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{activeTopic.title}</div>
                  <div className="text-xs text-gray-600">{activeTopic.description}</div>
                </div>
                <div className="flex flex-col items-end text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{activeTopic.duration}</span>
                  </div>
                  {typeof activeTopic.score === 'number' && (
                    <div className="mt-1 flex items-center gap-1 text-green-600 font-semibold">
                      <CheckCircle className="w-3 h-3" />
                      <span>{activeTopic.score}%</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recording + upload controls inside main speaking card */}
            <div className="mt-6 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleStartRecording()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold shadow-sm transition-colors"
                  disabled={isRecording}
                >
                  <Mic className="w-4 h-4" />
                  {isRecording ? 'Recording...' : 'Start Recording'}
                </button>

                <button
                  type="button"
                  onClick={handleAnalyze}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold hover:shadow-lg transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  Analyze
                </button>
                <button
                  type="button"
                  onClick={handleTogglePause}
                  disabled={!isRecording}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  {isPaused ? 'Resume' : 'Pause'}
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Upload audio
                </button>

                <button
                  type="button"
                  onClick={handleClearPreAnalysis}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold transition-colors"
                >
                  <Trash className="w-4 h-4" />
                  Clear
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={handleUploadFile}
                />
              </div>

              <div className="flex flex-col gap-3">
                {uploadedAudioUrl && (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                    <div className="flex items-center gap-2 text-xs text-gray-700">
                      <Volume2 className="w-4 h-4" />
                      <span className="font-semibold truncate max-w-[180px]">
                        {uploadedAudioName || 'Uploaded audio'}
                      </span>
                    </div>
                    <audio controls src={uploadedAudioUrl} className="w-48" />
                  </div>
                )}

                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      Speaking notes (auto transcript)
                    </span>
                    <span className="text-xs text-gray-500">
                      {preAnalysisText.trim().split(/\s+/).filter(Boolean).length} words
                    </span>
                  </div>
                  <div
                    className="w-full min-h-[96px] p-3 text-sm border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-800 whitespace-pre-wrap break-words"
                  >
                    {preAnalysisText
                      ? preAnalysisText
                      : 'After recording, the speech-to-text transcript of your answer will appear here.'}
                  </div>
                </div>

                {showFeedback && feedback && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4 border-2 border-indigo-200"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        AI Speaking Feedback
                      </h3>
                      <span className="text-lg font-bold text-indigo-700">
                        {getSpeakingOverallScore(feedback)}%
                      </span>
                    </div>

                    {/* 1. Fluency */}
                    {feedback.fluency && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-gray-800">Fluency</span>
                          <span className="font-bold text-gray-900">{feedback.fluency.score}%</span>
                        </div>
                        <p className="text-xs text-gray-600">
                          {feedback.fluency.wordsPerMinute} WPM •{' '}
                          {feedback.fluency.pauseAnalysis ||
                            'We analyzed your pauses and speaking speed for natural flow.'}
                        </p>
                      </div>
                    )}

                    {/* 2. Pronunciation */}
                    {feedback.pronunciation && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-gray-800">Pronunciation</span>
                          <span className="font-bold text-gray-900">
                            {feedback.pronunciation.score}%
                          </span>
                        </div>
                        {feedback.pronunciation.errors.length > 0 ? (
                          <ul className="text-xs text-gray-700 space-y-1">
                            {feedback.pronunciation.errors.slice(0, 2).map((err, idx) => (
                              <li
                                key={idx}
                                className="bg-red-50 border border-red-200 rounded px-2 py-1 flex flex-col gap-1"
                              >
                                <div>
                                  <span className="font-semibold">{err.word}</span>: expected "
                                  {err.expected}", heard "{err.actual}"
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    window.open(
                                      `https://youglish.com/pronounce/${encodeURIComponent(
                                        err.word
                                      )}/english`,
                                      '_blank',
                                      'noopener,noreferrer'
                                    )
                                  }
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900"
                                >
                                  <Play className="w-3 h-3" />
                                  Watch pronunciation video
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-gray-600">
                            Your pronunciation was generally clear for this recording.
                          </p>
                        )}
                      </div>
                    )}

                    {/* 3. Grammar & Vocabulary */}
                    {feedback.grammar && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1 text-xs">
                          <span className="font-semibold text-gray-800">Grammar</span>
                          <span className="font-bold text-gray-900">
                            {feedback.grammar.score}%
                          </span>
                        </div>
                        {feedback.grammar.errors.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                            {feedback.grammar.errors.slice(0, 2).map((error, idx) => (
                              <div
                                key={idx}
                                className="bg-red-50 border border-red-200 rounded-lg p-3"
                              >
                                <div className="font-semibold text-red-700 text-xs">
                                  {error.type}
                                </div>
                                <div className="text-xs text-red-600">{error.message}</div>
                                <div className="text-xs text-gray-700 mt-1">
                                  <strong>Suggestion:</strong> {error.suggestion}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-600 mt-1">
                            No major grammar issues found in this recording.
                          </p>
                        )}
                      </div>
                    )}

                    {feedback.vocabulary && (
                      <div className="mb-3 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-gray-800">Vocabulary</span>
                          <span className="font-bold text-gray-900">
                            {feedback.vocabulary.score}%
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">
                          {feedback.vocabulary.levelAnalysis}
                        </p>
                        {feedback.vocabulary.suggestions.length > 0 && (
                          <p className="text-xs text-gray-600">
                            Try alternatives like: {feedback.vocabulary.suggestions[0]}
                            {feedback.vocabulary.suggestions[1]
                              ? `, ${feedback.vocabulary.suggestions[1]}`
                              : ''}
                            .
                          </p>
                        )}
                      </div>
                    )}

                    {/* Strengths & Improvements */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                      {feedback.strengths.length > 0 && (
                        <div className="text-xs">
                          <div className="flex items-center gap-1 mb-1 text-green-700 font-semibold">
                            <CheckCircle className="w-3 h-3" />
                            Strengths
                          </div>
                          <ul className="space-y-0.5 text-gray-700">
                            {feedback.strengths.slice(0, 2).map((s, idx) => (
                              <li key={idx}>• {s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {feedback.improvements.length > 0 && (
                        <div className="text-xs">
                          <div className="flex items-center gap-1 mb-1 text-yellow-700 font-semibold">
                            <Star className="w-3 h-3" />
                            Next steps
                          </div>
                          <ul className="space-y-0.5 text-gray-700">
                            {feedback.improvements.slice(0, 2).map((imp, idx) => (
                              <li key={idx}>• {imp}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Sidebar – son kayıtlar ve ipuçları */}
        <div className="space-y-6">
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
                  <button
                    key={recording.id}
                    type="button"
                    onClick={() => handleLoadRecentRecording(recording.id)}
                    className="w-full text-left p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
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
                  </button>
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
