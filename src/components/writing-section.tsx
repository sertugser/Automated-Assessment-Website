import { motion } from 'motion/react';
import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import {
  Edit, Send, Sparkles, Award, Clock, CheckCircle,
  Star, FileText, ChevronRight, Lightbulb, BookOpen, Upload, Loader2
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// Optional external OCR API endpoint (for higher quality OCR/handwriting)
const OCR_API_URL = (import.meta.env.VITE_OCR_API_URL || '').trim();
import {
  analyzeWriting,
  analyzeWritingWithGroq,
  type AIFeedback,
  type SimpleWritingAnalysis,
  generatePersonalizedTips,
} from '../lib/ai-services';
import { saveActivity, getWritingStats, getActivitiesByType, getUserStats, getActivities } from '../lib/user-progress';
import { getCurrentUser } from '../lib/auth';
import { createSubmission, getAssignment } from '../lib/assignments';
import { toast } from 'sonner';

interface WritingSectionProps {
  initialActivityId?: string | null;
  assignmentId?: string | null;
}

const writingPrompts = [
  {
    id: 1,
    title: 'My Best Friend',
    description: 'Write about your best friend and why they are special',
    difficulty: 'Beginner',
    wordCount: '100-150',
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    completed: true,
    score: 85
  },
  {
    id: 2,
    title: 'A Memorable Day',
    description: 'Describe a day you will never forget',
    difficulty: 'Beginner',
    wordCount: '150-200',
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50',
    completed: true,
    score: 90
  },
  {
    id: 3,
    title: 'My Dream Job',
    description: 'Write about your ideal career and why',
    difficulty: 'Intermediate',
    wordCount: '200-250',
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50',
    completed: false,
    score: null
  },
  {
    id: 4,
    title: 'Technology and Society',
    description: 'Discuss how technology affects our daily lives',
    difficulty: 'Intermediate',
    wordCount: '250-300',
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-50',
    completed: false,
    score: null
  },
  {
    id: 5,
    title: 'Argumentative Essay',
    description: 'Should social media be regulated? Present your argument',
    difficulty: 'Advanced',
    wordCount: '300-400',
    color: 'from-pink-500 to-pink-600',
    bgColor: 'bg-pink-50',
    completed: false,
    score: null
  },
  {
    id: 6,
    title: 'Critical Analysis',
    description: 'Analyze a current global issue and propose solutions',
    difficulty: 'Advanced',
    wordCount: '400-500',
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

export function WritingSection({ initialActivityId, assignmentId }: WritingSectionProps) {
  const [selectedPrompt, setSelectedPrompt] = useState<number | null>(null);
  const [essayText, setEssayText] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState<AIFeedback | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [writingStats, setWritingStats] = useState(getWritingStats());
  const [recentEssays, setRecentEssays] = useState<Array<{
    id: string;
    title: string;
    date: string;
    words: number;
    score: number;
  }>>([]);
  const [writingTips, setWritingTips] = useState<string[]>([]);
  const [loadingTips, setLoadingTips] = useState(true);
  const [visibleTopicIds, setVisibleTopicIds] = useState<number[]>(
    () => writingPrompts.slice(0, 4).map((p) => p.id)
  );
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: number;
    type: string;
  } | null>(null);
  const [geminiResult, setGeminiResult] = useState<SimpleWritingAnalysis | null>(null);
  const [showGeminiResult, setShowGeminiResult] = useState(false);
  const [showCorrectedInEditor, setShowCorrectedInEditor] = useState(false);
  const [originalEssayText, setOriginalEssayText] = useState<string | null>(null);
  const [analysisSourceText, setAnalysisSourceText] = useState<string>('');
  const [showAllGrammarErrors, setShowAllGrammarErrors] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const updateStats = () => {
      setWritingStats(getWritingStats());
      
      // Update recent essays
      const writingActivities = getActivitiesByType('writing');
      const recent = writingActivities
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3)
        .map(activity => ({
          id: activity.id,
          title: activity.courseTitle || 'Writing Practice',
          date: activity.date,
          words: activity.wordCount || 150, // Use actual word count or estimate
          score: activity.score,
        }));
      setRecentEssays(recent);
    };

    updateStats();
    const interval = setInterval(updateStats, 2000);
    window.addEventListener('storage', updateStats);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', updateStats);
    };
  }, []);

  // Yardımcı: alt kategorilerden genel writing skorunu hesapla
  const getWritingOverallScore = (fb: AIFeedback): number => {
    const scores: number[] = [];
    if (fb.grammar?.score != null) scores.push(fb.grammar.score);
    if (fb.vocabulary?.score != null) scores.push(fb.vocabulary.score);
    if (fb.coherence?.score != null) scores.push(fb.coherence.score);
    if (!scores.length) return fb.overallScore;
    return Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
  };

  // Dashboard'dan belirli bir writing kaydıyla gelindiyse, o kaydı yükle
  useEffect(() => {
    if (!initialActivityId) return;

    const writingActivities = getActivitiesByType('writing');
    const activity = writingActivities.find((a) => a.id === initialActivityId);
    if (!activity) return;

    const text = (activity as any).essayText || '';
    const savedSimple = (activity as any).writingSimpleAnalysis || null;
    const savedFeedback = (activity as any).writingDetailedFeedback || null;

    if (!text) return;

    setSelectedPrompt(null);

    if (savedFeedback) {
      setFeedback(savedFeedback);
      setShowFeedback(true);
    } else {
      setFeedback(null);
      setShowFeedback(false);
    }

    if (savedSimple) {
      setGeminiResult(savedSimple);
      setShowGeminiResult(true);
    } else {
      setGeminiResult(null);
      setShowGeminiResult(false);
    }

    setShowCorrectedInEditor(false);
    setOriginalEssayText(null);
    setAnalysisSourceText(text);
    handleTextChange(text);
  }, [initialActivityId]);

  // When coming from homework assignment, load assignment instructions
  useEffect(() => {
    if (!assignmentId) return;
    const assignment = getAssignment(assignmentId);
    if (assignment && !essayText.trim()) {
      const prompt = assignment.instructions || assignment.description || '';
      if (prompt) handleTextChange(prompt);
      setSelectedPrompt(null); // Use assignment, not a regular prompt
    }
  }, [assignmentId]);

  useEffect(() => {
    const loadTips = async () => {
      setLoadingTips(true);
      try {
        const stats = getUserStats();
        const wStats = getWritingStats();
        const user = getCurrentUser();
        const tips = await generatePersonalizedTips('writing', {
          averageScore: stats.averageScore,
          totalActivities: stats.totalActivities,
          cefrLevel: user?.cefrLevel ?? undefined,
          totalEssays: wStats.totalEssays,
          totalWords: wStats.totalWords,
        });
        setWritingTips(tips);
      } catch (error) {
        console.error('Error loading tips:', error);
        setWritingTips([
          'Start with an outline',
          'Use varied sentence structures',
          'Check grammar and spelling',
          'Support ideas with examples'
        ]);
      } finally {
        setLoadingTips(false);
      }
    };

    loadTips();
  }, []);

  // Calculate total words from all writing activities (estimate 150 words per essay)
  const totalWords = writingStats.totalWords;

  const handleTextChange = (text: string) => {
    setEssayText(text);
    setWordCount(text.trim().split(/\s+/).filter(word => word.length > 0).length);
  };

  const isOnlyPromptSuggestions = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return false;

    const descriptions = writingPrompts.map((p) => p.description.trim());
    const paragraphs = trimmed.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

    return paragraphs.length > 0 && paragraphs.every((p) => descriptions.includes(p));
  };

  const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const renderTextWithHighlights = (
    text: string,
    highlights: Array<{ needle: string; className: string }>
  ) => {
    const source = text ?? '';
    if (!source.trim() || !highlights?.length) return <span>{source}</span>;

    // Find non-overlapping ranges in order (best-effort)
    const ranges: Array<{ start: number; end: number; className: string }> = [];
    let cursor = 0;

    for (const h of highlights) {
      const needle = (h.needle || '').trim();
      if (!needle) continue;

      const regex = new RegExp(escapeRegExp(needle), 'i');
      const slice = source.slice(cursor);
      const match = slice.match(regex);
      if (!match) continue;

      const start = cursor + (match.index ?? 0);
      const end = start + needle.length;

      const overlaps = ranges.some((r) => !(end <= r.start || start >= r.end));
      if (overlaps) continue;

      ranges.push({ start, end, className: h.className });
      cursor = end;
    }

    if (ranges.length === 0) return <span>{source}</span>;
    ranges.sort((a, b) => a.start - b.start);

    const parts: Array<{ t: string; className?: string }> = [];
    let i = 0;
    for (const r of ranges) {
      if (i < r.start) parts.push({ t: source.slice(i, r.start) });
      parts.push({ t: source.slice(r.start, r.end), className: r.className });
      i = r.end;
    }
    if (i < source.length) parts.push({ t: source.slice(i) });

    return (
      <>
        {parts.map((p, idx) => (
          <span key={idx} className={p.className}>
            {p.t}
          </span>
        ))}
      </>
    );
  };

  const tryExternalOcr = async (file: File, source: 'pdf' | 'image'): Promise<string | null> => {
    if (!OCR_API_URL) return null;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('source', source);

      const response = await fetch(OCR_API_URL, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        console.warn('External OCR API returned non-OK status:', response.status);
        return null;
      }

      const data = await response.json();
      const text = typeof data.text === 'string' ? data.text.trim() : '';
      return text || null;
    } catch (error) {
      console.error('Error calling external OCR API:', error);
      return null;
    }
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Dosya bilgisini kaydet
    setUploadedFile({
      name: file.name,
      size: file.size,
      type: file.type,
    });

    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'txt') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = (e.target?.result as string) || '';
        handleTextChange(text);
      };
      reader.onerror = () => {
        toast.error('Failed to read the file. Please try again with a valid .txt file.');
        setUploadedFile(null);
      };
      reader.readAsText(file);
      toast.success(`Loaded text from ${file.name}`);
    } else if (extension === 'pdf') {
      setIsExtractingText(true);
      const loadingToast = toast.loading(`Analiz ediliyor: ${file.name}...`, {
        duration: Infinity, // Toast'u manuel kapatana kadar açık tut
      });
      
      try {
        // 1) Önce harici OCR API'yi dene (varsa)
        const externalText = await tryExternalOcr(file, 'pdf');
        if (externalText) {
          handleTextChange(externalText);
          toast.dismiss(loadingToast);
          toast.success(`Metin başarıyla çıkarıldı: ${file.name}`);
          return;
        }

        // 2) Harici OCR başarısızsa veya ayarlı değilse, lokal PDF.js ile dene
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
          fullText += pageText + '\n\n';
        }

        if (fullText.trim()) {
          handleTextChange(fullText.trim());
          toast.dismiss(loadingToast);
          toast.success(`PDF'den metin çıkarıldı: ${file.name} (${pdf.numPages} sayfa)`);
        } else {
          toast.dismiss(loadingToast);
          toast.warning('PDF\'de metin bulunamadı. PDF taranmış görüntü içeriyor olabilir.');
          setUploadedFile(null);
        }
      } catch (error) {
        console.error('PDF extraction error:', error);
        toast.dismiss(loadingToast);
        toast.error(`PDF analizi başarısız: ${file.name}. Lütfen farklı bir dosya deneyin.`);
        setUploadedFile(null);
      } finally {
        setIsExtractingText(false);
      }
    } else if (extension === 'png' || extension === 'jpg' || extension === 'jpeg') {
      setIsExtractingText(true);
      const loadingToast = toast.loading(`Analiz ediliyor: ${file.name}...`, {
        duration: Infinity,
      });
      
      try {
        // 1) Önce harici OCR API'yi dene (varsa)
        const externalText = await tryExternalOcr(file, 'image');
        if (externalText) {
          handleTextChange(externalText);
          toast.dismiss(loadingToast);
          toast.success(`Metin başarıyla çıkarıldı: ${file.name}`);
          return;
        } else {
          // 2) Harici OCR başarısızsa, lokal Tesseract + ön-işleme ile dene
          // Load image and upscale + preprocess on a canvas for better OCR
          const bitmap = await createImageBitmap(file);
          const maxWidth = 1600;
          const scale = Math.min(maxWidth / bitmap.width, 2);
          const canvas = document.createElement('canvas');
          canvas.width = bitmap.width * (scale > 1 ? scale : 1);
          canvas.height = bitmap.height * (scale > 1 ? scale : 1);
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            throw new Error('Failed to get canvas context for OCR preprocessing');
          }

          // Basic preprocessing: grayscale + slight contrast boost
          ctx.filter = 'grayscale(100%) contrast(120%)';
          ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

          const worker = await createWorker('eng');
          await worker.setParameters({
            tessedit_pageseg_mode: '3', // Fully automatic page segmentation
            user_defined_dpi: '300',
          } as any);

          const { data: { text } } = await worker.recognize(canvas);
          await worker.terminate();

          if (text.trim()) {
            handleTextChange(text.trim());
            toast.dismiss(loadingToast);
            toast.success(`Resimden metin çıkarıldı: ${file.name}`);
          } else {
            toast.dismiss(loadingToast);
            toast.warning(`Resimde metin bulunamadı: ${file.name}. Lütfen daha net bir resim deneyin.`);
            setUploadedFile(null);
          }
        }
      } catch (error) {
        console.error('OCR error:', error);
        toast.dismiss(loadingToast);
        toast.error(`Resim analizi başarısız: ${file.name}. Lütfen daha net bir resim veya .txt dosyası deneyin.`);
        setUploadedFile(null);
      } finally {
        setIsExtractingText(false);
      }
    } else {
      toast.error('Unsupported file type. Please upload a .txt, image, or PDF file.');
    }
  };

  const handleSubmit = async () => {
    if (wordCount < 50) {
      toast.error('Please write at least 50 words');
      return;
    }

    setIsAnalyzing(true);
    setShowFeedback(false);
    setGeminiResult(null);
    setShowGeminiResult(false);
    setShowCorrectedInEditor(false);
    setOriginalEssayText(null);
    setAnalysisSourceText(essayText);
    setShowAllGrammarErrors(false);
    
    try {
      // Run existing detailed analysis (Groq/Gemini backup) and new Groq correction in parallel
      const [rawFeedback, rawSimple] = await Promise.all([
        analyzeWriting(essayText),
        analyzeWritingWithGroq(essayText),
      ]);

      // Eğer simple analiz fallback ile dönmüşse (hata yok, düzeltme yok, skor 75 ve metin değişmemiş),
      // skoru detaylı analizle hizala.
      let simpleGemini: SimpleWritingAnalysis = rawSimple;
      let aiFeedback: AIFeedback = rawFeedback;

      const simpleLooksFallback =
        !simpleGemini ||
        (simpleGemini.errors.length === 0 &&
          simpleGemini.corrected_text.trim() === essayText.trim() &&
          simpleGemini.score === 75);

      if (simpleLooksFallback) {
        simpleGemini = {
          ...simpleGemini,
          corrected_text: simpleGemini.corrected_text || essayText,
          score: rawFeedback.overallScore,
        };
      }

      // Skorların tutarlı görünmesi için detaylı analiz skorunu da simple analiz skoru ile hizala
      aiFeedback = {
        ...aiFeedback,
        overallScore: simpleGemini.score,
      };

      const computedOverall = getWritingOverallScore(aiFeedback);
      const normalizedFeedback: AIFeedback = {
        ...aiFeedback,
        overallScore: computedOverall,
      };

      setFeedback(normalizedFeedback);
      setGeminiResult(simpleGemini);
      setShowFeedback(true);
      setShowGeminiResult(true);
      
      // Save writing activity to progress tracking
      const selectedPromptData = writingPrompts.find(p => p.id === selectedPrompt);
      const courseTitle = selectedPromptData?.title || 'Writing Practice';
      saveActivity({
        type: 'writing',
        score: computedOverall,
        courseTitle,
        wordCount: wordCount,
        essayText: essayText,
        correctedText: simpleGemini.corrected_text,
        writingSimpleAnalysis: simpleGemini,
        writingDetailedFeedback: normalizedFeedback,
      });

      // If this was an instructor assignment, create submission for instructor review
      if (assignmentId) {
        const assignment = getAssignment(assignmentId);
        const user = getCurrentUser();
        if (assignment && user) {
          createSubmission({
            assignmentId,
            studentId: user.id,
            studentName: user.name,
            status: 'completed',
            content: essayText,
            aiScore: computedOverall,
            aiFeedback: normalizedFeedback,
          });
        }
      }

      // After successful submit, update topic suggestions dynamically
      if (selectedPrompt != null) {
        const usedPromptId = selectedPrompt;
        setVisibleTopicIds((current) => {
          const withoutUsed = current.filter((id) => id !== usedPromptId);

          // candidate ids that are not currently visible and not the one just used
          const allIds = writingPrompts.map((p) => p.id);
          const candidateIds = allIds.filter(
            (id) => id !== usedPromptId && !withoutUsed.includes(id)
          );

          let replacementId: number | null = null;

          if (candidateIds.length > 0) {
            replacementId = candidateIds[Math.floor(Math.random() * candidateIds.length)];
          } else {
            // fallback: pick any other topic different from the used one
            const fallbackIds = allIds.filter((id) => id !== usedPromptId);
            if (fallbackIds.length > 0) {
              replacementId = fallbackIds[Math.floor(Math.random() * fallbackIds.length)];
            }
          }

          if (replacementId != null) {
            return [...withoutUsed, replacementId];
          }

          return withoutUsed;
        });
      }
      
      toast.success(`Analysis complete! Score: ${computedOverall}%`);
    } catch (error) {
      console.error('Error analyzing writing:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to analyze: ${errorMessage}. Please check your API keys and try again.`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectPrompt = (promptId: number) => {
    setSelectedPrompt(promptId);
    const prompt = writingPrompts.find((p) => p.id === promptId);
    if (!prompt) return;

    const trimmed = essayText.trim();
    if (!trimmed || isOnlyPromptSuggestions(essayText)) {
      // Eğer metin boşsa veya sadece önceki suggestion'lardan oluşuyorsa
      // yeni seçilen konunun açıklaması ile alan tamamen değiştirilsin
      handleTextChange(prompt.description);
    } else {
      // Kullanıcı zaten kendi yazısını yazdıysa, önceki davranış: sona ekle
      handleTextChange(`${essayText.trimEnd()}\n\n${prompt.description}`);
    }

    // Update topic suggestions dynamically:
    // remove selected topic from visible list and replace it with a different one
    setVisibleTopicIds((current) => {
      const withoutSelected = current.filter((id) => id !== promptId);

      // candidate ids that are not currently visible and not the selected one
      const allIds = writingPrompts.map((p) => p.id);
      const candidateIds = allIds.filter(
        (id) => id !== promptId && !withoutSelected.includes(id)
      );

      let replacementId: number | null = null;

      if (candidateIds.length > 0) {
        replacementId = candidateIds[Math.floor(Math.random() * candidateIds.length)];
      } else {
        // fallback: pick any other topic different from the selected one
        const fallbackIds = allIds.filter((id) => id !== promptId);
        if (fallbackIds.length > 0) {
          replacementId = fallbackIds[Math.floor(Math.random() * fallbackIds.length)];
        }
      }

      if (replacementId != null) {
        return [...withoutSelected, replacementId];
      }

      return withoutSelected;
    });
  };

  const handleLoadRecentEssay = (activityId: string) => {
    const writingActivities = getActivitiesByType('writing');
    const activity = writingActivities.find((a) => a.id === activityId);
    if (!activity) return;

    const text = (activity as any).essayText || '';
    const savedSimple = (activity as any).writingSimpleAnalysis || null;
    const savedFeedback = (activity as any).writingDetailedFeedback || null;

    if (!text) {
      toast.info('This older essay does not have its text saved. New essays will be viewable here.');
      return;
    }

    setSelectedPrompt(null);
    // Restore analysis results if present (no need to re-run analysis)
    if (savedFeedback) {
      setFeedback(savedFeedback);
      setShowFeedback(true);
    } else {
      setFeedback(null);
      setShowFeedback(false);
    }

    if (savedSimple) {
      setGeminiResult(savedSimple);
      setShowGeminiResult(true);
    } else {
      setGeminiResult(null);
      setShowGeminiResult(false);
    }

    setShowCorrectedInEditor(false);
    setOriginalEssayText(null);
    setAnalysisSourceText(text);
    handleTextChange(text);
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Writing Practice</h1>
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
              <FileText className="w-5 h-5" />
            </div>
            <Sparkles className="w-4 h-4 opacity-60" />
          </div>
          <div className="text-2xl font-bold mb-0.5">{writingStats.totalEssays}</div>
          <div className="text-blue-100 text-xs">Essays Written</div>
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
          <div className="text-2xl font-bold mb-0.5">{writingStats.avgScore}%</div>
          <div className="text-green-100 text-xs">Avg. Score</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 text-white shadow-xl"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Edit className="w-5 h-5" />
            </div>
            <BookOpen className="w-4 h-4 opacity-60" />
          </div>
          <div className="text-2xl font-bold mb-0.5">{totalWords.toLocaleString()}</div>
          <div className="text-purple-100 text-xs">Total Words</div>
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
          <div className="text-2xl font-bold mb-0.5">{writingStats.avgScore}%</div>
          <div className="text-orange-100 text-xs">Grammar Accuracy</div>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Writing Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Writing Editor with prompt suggestions and upload */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg"
          >
            <div className="flex items-start justify-between mb-4 gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Your Writing</h2>
                {selectedPrompt && (
                  <p className="text-sm text-indigo-600 mt-1 flex items-center gap-1">
                    <Edit className="w-4 h-4" />
                    Using topic:&nbsp;
                    <span className="font-semibold">
                      {writingPrompts.find((p) => p.id === selectedPrompt)?.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedPrompt(null)}
                      className="ml-2 text-xs text-gray-500 hover:text-gray-700 underline"
                    >
                      Clear prompt
                    </button>
                  </p>
                )}
                {!selectedPrompt && (
                  <p className="text-sm text-gray-600 mt-1">
                    Start typing freely or choose one of the prompts below as a starting point.
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <label className={`cursor-pointer ${isExtractingText ? 'pointer-events-none opacity-70' : ''}`}>
                  <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl px-5 py-2.5 shadow-sm flex flex-col items-end gap-1 hover:shadow-md transition-shadow">
                    <div className="inline-flex items-center gap-2 text-sm sm:text-base font-semibold">
                      {isExtractingText ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      <span>{isExtractingText ? 'Extracting text...' : 'Upload text / image'}</span>
                    </div>
                    <span className="text-[12px] text-indigo-50/90">
                      Supports <span className="font-semibold">.txt, .pdf</span> and images
                      <span className="hidden sm:inline"> (.png, .jpg, .jpeg)</span>
                    </span>
                  </div>
                  <input
                    type="file"
                    accept=".txt,.md,.rtf,.docx,.pdf,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isExtractingText}
                  />
                </label>
                {/* Uploaded file info */}
                {uploadedFile && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-indigo-200 rounded-lg px-3 py-2 shadow-sm flex items-center gap-2 max-w-xs"
                  >
                    <FileText className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-900 truncate">
                        {uploadedFile.name}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {(uploadedFile.size / 1024).toFixed(1)} KB
                        {isExtractingText && (
                          <span className="ml-2 text-indigo-600 font-medium">
                            • Analiz ediliyor...
                          </span>
                        )}
                      </div>
                    </div>
                    {!isExtractingText && (
                      <button
                        type="button"
                        onClick={() => setUploadedFile(null)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="Remove file"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </motion.div>
                )}
              </div>
            </div>

            {/* Prompt suggestions as chips */}
            <div className="mb-4">
              {/*
                Kullanıcı metin yazmaya başladıysa ve alan sadece suggestion'lardan oluşmuyorsa,
                topic butonları kilitlenir (tıklanamaz) ve görsel olarak pasif görünür.
              */}
              {(() => {
                return null;
              })()}
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-500" />
                  Topic suggestions
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {writingPrompts
                  .filter((prompt) => visibleTopicIds.includes(prompt.id))
                  .map((prompt) => (
                  (() => {
                    const suggestionsLocked =
                      essayText.trim().length > 0 && !isOnlyPromptSuggestions(essayText);
                    return (
                      <button
                        key={prompt.id}
                        type="button"
                        disabled={suggestionsLocked}
                        onClick={() => {
                          if (suggestionsLocked) return;
                          handleSelectPrompt(prompt.id);
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all flex items-center gap-2 ${
                          suggestionsLocked
                            ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
                            : selectedPrompt === prompt.id
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                    >
                        <span>{prompt.title}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            prompt.difficulty === 'Beginner'
                              ? 'bg-green-100 text-green-700'
                              : prompt.difficulty === 'Intermediate'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {prompt.difficulty}
                        </span>
                      </button>
                    );
                  })()
                ))}
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Your Essay</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">
                    {wordCount} words
                    {selectedPrompt && (
                      <>
                        {' '}
                        / {writingPrompts.find((p) => p.id === selectedPrompt)?.wordCount} suggested
                      </>
                    )}
                  </span>
                  {showGeminiResult && geminiResult && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!geminiResult) return;
                        if (showCorrectedInEditor) {
                          // Geri dön: orijinal metni geri yükle
                          if (originalEssayText !== null) {
                            handleTextChange(originalEssayText);
                          }
                          setShowCorrectedInEditor(false);
                          setOriginalEssayText(null);
                        } else {
                          // İlk kez düzeltilmiş metni göster
                          setOriginalEssayText(essayText);
                          handleTextChange(geminiResult.corrected_text || essayText);
                          setShowCorrectedInEditor(true);
                        }
                      }}
                      className="px-3 py-1 rounded-full text-xs font-semibold border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                    >
                      {showCorrectedInEditor ? 'Orijinal metni gör' : 'Düzeltilmiş metni gör'}
                    </button>
                  )}
                </div>
              </div>
              <div className="relative">
                <textarea
                  ref={editorRef}
                  value={essayText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  onScroll={() => {
                    if (overlayRef.current && editorRef.current) {
                      overlayRef.current.scrollTop = editorRef.current.scrollTop;
                    }
                  }}
                  onFocus={() => {
                    if (isOnlyPromptSuggestions(essayText)) {
                      handleTextChange('');
                    }
                  }}
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="off"
                  placeholder="Start writing your essay here or paste text from a file..."
                  className={`w-full h-96 p-4 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none resize-none ${
                    showFeedback && showGeminiResult && geminiResult ? 'text-transparent caret-black' : ''
                  }`}
                />

                {showFeedback && showGeminiResult && geminiResult && (
                  <div
                    ref={overlayRef}
                    className="pointer-events-none absolute inset-0 p-4 rounded-xl whitespace-pre-wrap overflow-y-scroll scrollbar-visible text-gray-900"
                  >
                    {renderTextWithHighlights(
                      showCorrectedInEditor ? essayText : (analysisSourceText || essayText),
                      (geminiResult.errors || []).flatMap((e) => {
                        // Original view: highlight wrong parts in red
                        if (!showCorrectedInEditor) {
                          return [{ needle: e.original, className: 'text-red-600 font-semibold' }];
                        }
                        // Corrected view: highlight the corrected replacement in green
                        return [{ needle: e.replacement, className: 'text-green-600 font-semibold' }];
                      })
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Hata Analizi (textarea altı) kaldırıldı – detaylar sağdaki AI Feedback içinde */}

            <div className="flex gap-3">
              <button
                onClick={handleSubmit}
                disabled={wordCount < 50 || isAnalyzing}
                className={`flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2 ${
                  (wordCount < 50 || isAnalyzing) && 'opacity-50 cursor-not-allowed'
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <Sparkles className="w-5 h-5 animate-spin" />
                    Analiz Ediliyor...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit for Feedback
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setEssayText('');
                  setWordCount(0);
                  setUploadedFile(null);
                  // Analiz/feedback state'lerini de sıfırla (Clear analizden sonra da çalışsın)
                  setIsAnalyzing(false);
                  setFeedback(null);
                  setShowFeedback(false);
                  setGeminiResult(null);
                  setShowGeminiResult(false);
                  setShowAllGrammarErrors(false);
                  setShowCorrectedInEditor(false);
                  setOriginalEssayText(null);
                  setAnalysisSourceText('');
                  setIsExtractingText(false);
                }}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-semibold transition-all"
              >
                Clear
              </button>
            </div>

          </motion.div>

          {/* AI Feedback kutusu sol kolona alındı (Tips/Includes ile yer değiştirdi) */}
          {showFeedback && feedback ? (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border-2 border-indigo-200 shadow-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  AI Feedback
                </h3>
                <div className="text-3xl font-bold text-indigo-600">
                  {getWritingOverallScore(feedback)}%
                </div>
              </div>

              {/* Grammar */}
              {feedback.grammar && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-700">Grammar</span>
                    <span className="font-bold text-gray-900">{feedback.grammar.score}%</span>
                  </div>
                  {feedback.grammar.errors.length > 0 && (
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500">
                        Toplam hata: <span className="font-semibold text-gray-700">{feedback.grammar.errors.length}</span>
                      </span>
                      {feedback.grammar.errors.length > 2 && (
                        <button
                          type="button"
                          onClick={() => setShowAllGrammarErrors((v) => !v)}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                        >
                          {showAllGrammarErrors ? 'Daha az göster' : 'Daha fazla gör'}
                        </button>
                      )}
                    </div>
                  )}
                  {feedback.grammar.errors.length > 0 && (
                    <div
                      className={`mt-2 overflow-y-scroll scrollbar-visible pr-1 ${
                        showAllGrammarErrors ? 'max-h-[70vh]' : 'max-h-[50vh]'
                      }`}
                    >
                      <div className="grid grid-cols-2 gap-3">
                        {(showAllGrammarErrors ? feedback.grammar.errors : feedback.grammar.errors.slice(0, 2)).map((error, idx) => (
                          <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <div className="font-semibold text-red-700 text-sm">{error.type}</div>
                            <div className="text-sm text-red-600">{error.message}</div>
                            <div className="text-sm text-gray-700 mt-1">
                              <strong>Suggestion:</strong> {error.suggestion}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Vocabulary */}
              {feedback.vocabulary && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-700">Vocabulary</span>
                    <span className="font-bold text-gray-900">{feedback.vocabulary.score}%</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">{feedback.vocabulary.levelAnalysis}</div>
                  {feedback.vocabulary.suggestions.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="font-semibold text-blue-700 text-sm mb-1">Suggestions:</div>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {feedback.vocabulary.suggestions.map((suggestion, idx) => (
                          <li key={idx}>• {suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Coherence */}
              {feedback.coherence && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-700">Coherence</span>
                    <span className="font-bold text-gray-900">{feedback.coherence.score}%</span>
                  </div>
                  <div className="text-sm text-gray-700 bg-green-50 border border-green-200 rounded-lg p-3">
                    {feedback.coherence.feedback}
                  </div>
                </div>
              )}

              {/* Strengths */}
              {feedback.strengths.length > 0 && (
                <div className="mb-4">
                  <div className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Strengths
                  </div>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {feedback.strengths.map((strength, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Star className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Improvements */}
              {feedback.improvements.length > 0 && (
                <div>
                  <div className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-yellow-600" />
                    Areas for Improvement
                  </div>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {feedback.improvements.map((improvement, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                        <span>{improvement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-6 border-2 border-dashed border-gray-200 shadow-sm flex flex-col items-start gap-2"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                <h3 className="text-lg font-semibold text-gray-900">AI Feedback</h3>
              </div>
              <p className="text-sm text-gray-600">
                Submit your writing to see detailed grammar, vocabulary, and coherence feedback here.
              </p>
            </motion.div>
          )}
        </div>

        {/* Sidebar – Tips + Includes (AI Feedback ile yer değiştirdi) */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-6 border-2 border-yellow-200 shadow-lg"
          >
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-yellow-600" />
              <h3 className="text-lg font-bold text-gray-900">AI-Powered Writing Tips</h3>
            </div>
            {loadingTips ? (
              <div className="text-center py-4 text-gray-500 text-sm">Loading personalized tips...</div>
            ) : (
              <ul className="space-y-2 text-sm text-gray-700">
                {writingTips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border-2 border-indigo-200 shadow-lg"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">AI Feedback Includes</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-200 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-indigo-700" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-gray-900">Grammar Check</div>
                  <div className="text-xs text-gray-600">Detailed error analysis</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-200 rounded-lg">
                  <Star className="w-4 h-4 text-purple-700" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-gray-900">Vocabulary</div>
                  <div className="text-xs text-gray-600">Word choice suggestions</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-pink-200 rounded-lg">
                  <Award className="w-4 h-4 text-pink-700" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-gray-900">Structure</div>
                  <div className="text-xs text-gray-600">Organization tips</div>
                </div>
              </div>
            </div>

            {/* Recent Essays moved here (back to previous desired layout) */}
            <div className="mt-5 pt-4 border-t border-indigo-200/70">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-gray-900">Recent Essays</h4>
                <span className="text-[11px] text-gray-500">Click to load</span>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-visible pr-1">
                {recentEssays.length > 0 ? (
                  recentEssays.map((essay) => (
                    <div
                      key={essay.id}
                      onClick={() => handleLoadRecentEssay(essay.id)}
                      className="p-2 bg-white/80 rounded-xl hover:bg-white transition-colors cursor-pointer border border-indigo-100"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-semibold text-xs text-gray-900 truncate">{essay.title}</div>
                        <div className="text-[10px] text-gray-500">{formatActivityDate(essay.date)}</div>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1 text-gray-600">
                          <FileText className="w-3 h-3" />
                          <span>{essay.words} words</span>
                        </div>
                        <div className="font-bold text-green-600">{essay.score}%</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-2 text-gray-500 text-xs">No essays yet.</div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Alt bilgi kutuları sol kolona taşındı */}
    </div>
  );
}