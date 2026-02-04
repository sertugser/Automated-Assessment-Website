import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Headphones, PlayCircle, PauseCircle, RotateCcw, CheckCircle2, BookOpen, Sparkles, ArrowLeft, List, Lock } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { generateListeningQuestions } from '../lib/ai-services';
import type { ListeningQuestion } from '../lib/ai-services';
import { createSubmission } from '../lib/assignments';
import { getCurrentUser } from '../lib/auth';
import { saveActivity, getActivitiesByType } from '../lib/user-progress';
import type { CEFRLevel } from '../lib/auth';

type Level = CEFRLevel;

interface ListeningExercise {
  id: string;
  title: string;
  text: string;
  questionCount: number;
}

interface ListeningAIAnalysis {
  summary: string;
  strengths: string[];
  improvements: string[];
  strategyTips: string[];
}

const EXERCISES_BY_LEVEL: Record<Level, ListeningExercise[]> = {
  A1: [
    {
      id: 'a1-1',
      title: 'My Name and My Pet',
      text: "Hello. I am Tom. I am ten years old. I have a dog. The dog is brown and his name is Max. I like my dog very much. I play with my dog every day after school. We run in the garden. Sometimes we go to the park. Max likes to play with a ball. I give him food and water every morning. My mum says Max is a good dog. I am happy with my pet.",
      questionCount: 10,
    },
    {
      id: 'a1-2',
      title: 'At School',
      text: "I am Anna. I go to school from Monday to Friday. My school is big and I like it. I have a teacher. Her name is Mrs Green. She is very nice. I like English. We read and write in class. I have a friend. His name is Leo. We sit together. We play at break time. After school I go home. I do my homework. Then I have dinner with my family.",
      questionCount: 10,
    },
    {
      id: 'a1-3',
      title: 'My Family',
      text: "This is my family. I have a mum and a dad. My mum works at home. My dad goes to work by car. I have a brother. His name is Jack. He is older than me. I have a sister. Her name is Emma. She is younger than me. We live in a small house. The house has a garden. We have a cat. The cat is black and white. We all like our cat. We eat dinner together every day.",
      questionCount: 10,
    },
    {
      id: 'a1-4',
      title: 'The Weather',
      text: "Today it is sunny. I like sunny days. I go to the park in the morning. I play with my ball. I meet my friends there. We run and play. Then I go home for lunch. Tomorrow it will be rainy. I will not go to the park. I will stay at home. I will read a book. Maybe I will watch TV too. My mum will make hot chocolate. I like rainy days at home.",
      questionCount: 10,
    },
  ],
  A2: [
    {
      id: 'a2-1',
      title: "Sarah's Week",
      text: "Hi! My name is Sarah. I work in a shop in the town centre. I start at nine in the morning and I finish at five in the afternoon. I go to work by bus every day. The bus stop is near my house. On Saturday I usually go to the market. I buy fruit, vegetables and bread there. Sometimes I meet my sister at the market. On Sunday I stay at home. I read a book or I watch TV. I also clean my flat and cook for the week. I like my routine.",
      questionCount: 10,
    },
    {
      id: 'a2-2',
      title: 'At the Caf?',
      text: "Yesterday I went to a caf? with my friend. We wanted to talk and relax. We had coffee and cake. The caf? was nice and quiet. We sat by the window. We talked for two hours. We talked about work and about our holidays. Then we went for a walk in the park. The weather was good. I went home at six. I had a very nice afternoon.",
      questionCount: 10,
    },
    {
      id: 'a2-3',
      title: 'Shopping',
      text: "I need to buy some things today. I need milk, eggs and bread. I also want to buy a new shirt for work. The supermarket is near my house. I usually walk there. It takes about ten minutes. I like to go in the morning when it is quiet. The clothes shop is in the town centre. I go there by bus. The bus is cheap and fast. I will go to the supermarket first and then to the town centre.",
      questionCount: 10,
    },
    {
      id: 'a2-4',
      title: 'Weekend Plans',
      text: "Next weekend I am going to visit my grandparents. They live in a small town about two hours away. I will take the train on Saturday morning. I will stay until Sunday evening. My grandmother will cook my favourite food. She always makes a big lunch. I am very excited. I have not seen them for three months. I will tell them about my new job and my new flat.",
      questionCount: 10,
    },
  ],
  B1: [
    {
      id: 'b1-1',
      title: 'A Problem at the Airport',
      text: "Last month I flew to Madrid for a meeting. I arrived at the airport two hours early because I was worried about traffic. When I got there, I saw on the screen that my flight was delayed by three hours because of a technical problem with the plane. I was tired and a bit angry. I went to a caf?, had a coffee and read my emails. Then I met another passenger who was also going to Madrid. We talked for a while and in the end we sat together on the plane. The delay was long but the flight was fine.",
      questionCount: 10,
    },
    {
      id: 'b1-2',
      title: 'A Lost Bag',
      text: "Last week I was on a train to London. When I got off, I left my bag on the seat. The bag had my laptop and my keys inside. I was very worried. I went to the lost property office at the station. A woman there was very helpful. She took my name and phone number. Two days later she called me. They had found my bag. I went back to the station and collected it. Everything was still inside. I was very relieved.",
      questionCount: 10,
    },
    {
      id: 'b1-3',
      title: 'A Good Book',
      text: "I love reading. Last month I read a book about a man who travels around the world. The book was long but very interesting. The man visited twenty countries. He had many adventures. Sometimes he was in danger but he always found a solution. I could not stop reading. I finished the book in three days. I have already bought the next book by the same writer. I will start it tonight.",
      questionCount: 10,
    },
    {
      id: 'b1-4',
      title: 'Moving House',
      text: "Next month I am moving to a new flat. The new flat is bigger and it has a garden. I am happy but I am also a bit sad. I have lived in my current flat for five years. I have many good memories here. My friends live nearby. In the new area I will not know anyone at first. But the new flat is near my office so I will not need to use the car. I will save time and money. I think it is the right decision.",
      questionCount: 10,
    },
  ],
  B2: [
    {
      id: 'b2-1',
      title: 'Working from Home: Pros and Cons',
      text: "Over the past few years, remote work has become widespread, and many companies have adopted hybrid or fully remote models. Employees often report that they appreciate the flexibility and the lack of a daily commute. However, working from home also has drawbacks. It can be difficult to separate work from personal life, and some people end up working longer hours than they did in the office. In addition, isolation can affect well-being. Experts suggest that employers should offer clear guidelines, regular video calls, and opportunities for team building so that remote workers feel connected and supported.",
      questionCount: 10,
    },
    {
      id: 'b2-2',
      title: 'Healthy Lifestyle',
      text: "More and more people are trying to lead a healthier life. This includes eating a balanced diet, doing regular exercise, and getting enough sleep. Nevertheless, busy schedules often make it hard to stick to these habits. Some people find it useful to plan their meals in advance or to exercise at the same time every day. Others join a gym or a sports club so that they feel more motivated. Research shows that even small changes can make a significant difference to both physical and mental health over time.",
      questionCount: 10,
    },
    {
      id: 'b2-3',
      title: 'Travel and Culture',
      text: "Travelling to another country can be a great way to learn about different cultures and to improve your language skills. Before you go, it is worth reading about the local customs and perhaps learning a few basic phrases in the language. When you are there, try to talk to local people and to try local food. You might also visit museums, markets, or places that are not in the guidebooks. Many people find that they return home with a better understanding of the world and of themselves.",
      questionCount: 10,
    },
    {
      id: 'b2-4',
      title: 'Social Media',
      text: "Social media has changed the way we communicate and share information. On the one hand, it allows us to stay in touch with friends and family who live far away, and it can be a useful tool for work and learning. On the other hand, spending too much time online can lead to stress, comparison with others, and less time for face-to-face contact. It is important to set limits and to be aware of how social media affects your mood. Many experts recommend turning off notifications or having screen-free time before bed.",
      questionCount: 10,
    },
  ],
  C1: [
    {
      id: 'c1-1',
      title: 'Climate Change: Mitigation and Adaptation',
      text: "Climate change presents unprecedented challenges for governments, businesses, and communities across the globe. Scientists agree that two types of response are necessary: mitigation and adaptation. Mitigation involves reducing greenhouse gas emissions, for example by shifting to renewable energy and improving energy efficiency. Adaptation, on the other hand, refers to adjusting to the impacts that are already occurring or are expected, such as rising sea levels, more frequent droughts, and extreme weather events. Vulnerable regions, including many developing countries, often have fewer resources to adapt, which raises questions of fairness and international cooperation. Policymakers are therefore under pressure to combine emission cuts with support for adaptation, while also ensuring that the transition to a low-carbon economy does not leave certain groups behind.",
      questionCount: 10,
    },
    {
      id: 'c1-2',
      title: 'Education and Technology',
      text: "The integration of technology into education has accelerated in recent years, particularly with the rise of online learning platforms and digital tools. While this has created new opportunities for access and flexibility, it has also highlighted existing inequalities. Students without reliable internet or suitable devices may fall behind. Furthermore, there is ongoing debate about the effectiveness of screen-based learning compared to traditional classroom interaction. Educators are increasingly expected to combine both approaches and to develop digital literacy among students, while also addressing concerns about screen time and the need for critical thinking in an age of abundant information.",
      questionCount: 10,
    },
    {
      id: 'c1-3',
      title: 'Cities and Sustainability',
      text: `Urbanisation continues to shape the way we live, with more than half of the world's population now living in cities. This trend brings both opportunities and challenges. Cities can be engines of economic growth and innovation, but they also face problems such as congestion, pollution, and unequal access to housing and services. Sustainable urban planning aims to address these issues through better public transport, green spaces, and energy-efficient buildings. Success depends on cooperation between local authorities, businesses, and citizens, as well as on long-term investment in infrastructure that can cope with a growing population.`,
      questionCount: 10,
    },
    {
      id: 'c1-4',
      title: 'Technology and Privacy',
      text: `The amount of personal data collected by companies and governments has grown enormously, raising serious questions about privacy and consent. While data can be used to improve services and to personalise user experiences, it can also be used for surveillance, targeted advertising, or discrimination. Laws such as the GDPR in Europe have tried to strengthen individuals' rights and to impose obligations on those who collect and process data. Nevertheless, technology evolves quickly and regulations often struggle to keep up. Many argue that a balance must be found between innovation and the protection of fundamental rights, and that users should be better informed about how their data is used.`,
      questionCount: 10,
    },
  ],
  C2: [
    {
      id: 'c2-1',
      title: 'Ethics, Accountability, and Artificial Intelligence',
      text: `The rapid proliferation of artificial intelligence has triggered intense debate about ethical boundaries, accountability, and the role of regulation. Although automation can bring significant benefits in efficiency and innovation, it also raises serious concerns. These include algorithmic bias, which can reinforce existing inequalities; threats to privacy and data protection; and the potential misuse of AI in surveillance, disinformation, or decision-making that affects people's lives. In response, a growing number of stakeholders?from researchers and industry leaders to civil society groups?are calling for robust regulatory frameworks that can keep pace with technological change. Such frameworks, they argue, should not only address current risks but also remain flexible enough to adapt to future developments, while at the same time safeguarding fundamental rights and ensuring that those who develop or deploy AI systems can be held accountable when things go wrong.`,
      questionCount: 10,
    },
    {
      id: 'c2-2',
      title: 'Globalisation and the Economy',
      text: "Globalisation has led to an unprecedented interconnectedness of markets, labour, and capital across national borders. Proponents argue that it has lifted millions out of poverty and has allowed for the efficient allocation of resources. Critics, however, point to rising inequality within and between countries, the erosion of local industries, and the vulnerability of supply chains to shocks?as evidenced by recent disruptions. Moreover, the environmental footprint of global trade, including emissions from transport and the exploitation of natural resources, has come under scrutiny. Policymakers are thus faced with the challenge of fostering economic growth while mitigating negative social and environmental effects, and of ensuring that the benefits of globalisation are more widely distributed.",
      questionCount: 10,
    },
    {
      id: 'c2-3',
      title: 'Science, Evidence, and Public Policy',
      text: "The relationship between scientific evidence and public policy has long been a subject of debate. In an ideal scenario, policy decisions would be informed by the best available research and would be revised as new evidence emerges. In practice, however, political considerations, economic interests, and public opinion often influence?and sometimes distort?the way evidence is interpreted and used. Furthermore, the communication of science to the public is not straightforward: findings can be oversimplified, taken out of context, or deliberately misrepresented. Strengthening the role of independent scientific advice and improving science literacy among both policymakers and the public are frequently cited as necessary steps if policy is to respond effectively to complex challenges such as climate change or public health crises.",
      questionCount: 10,
    },
    {
      id: 'c2-4',
      title: 'Democracy and Digital Media',
      text: "The spread of digital media has transformed how citizens access information and participate in democratic debate. While it has the potential to increase transparency and to give a voice to previously marginalised groups, it has also created new vulnerabilities. Misinformation and disinformation can spread rapidly, and echo chambers can reinforce polarisation. The role of traditional media as gatekeepers has been weakened, and the business models of many platforms depend on engagement rather than on accuracy. Consequently, there are growing calls for greater accountability of tech companies, for stronger regulation of political advertising, and for initiatives to promote media literacy so that citizens can critically evaluate the information they encounter.",
      questionCount: 10,
    },
  ],
};
const LEVEL_ORDER: Level[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const WORDS_PER_SECOND = 2.5; // English TTS at 1.0 rate

function splitSentences(text: string): string[] {
  if (!text.trim()) return [];
  const parts = text.match(/[^.!?]+[.!?]+/g);
  if (!parts?.length) return [text.trim()];
  return parts.map((s) => s.trim()).filter(Boolean);
}

function getTimeInfo(sentences: string[], rate: number) {
  if (sentences.length === 0) return { totalDuration: 0, cumulativeStart: [] as number[], cumulativeEnd: [] as number[] };
  const wps = WORDS_PER_SECOND * Math.max(0.25, Math.min(2, rate));
  const durations = sentences.map((s) => (s.trim().split(/\s+/).filter(Boolean).length || 1) / wps);
  const cumulativeStart: number[] = [0];
  for (let i = 0; i < durations.length; i++) cumulativeStart.push(cumulativeStart[i] + durations[i]);
  const totalDuration = cumulativeStart[cumulativeStart.length - 1] ?? 0;
  const cumulativeEnd = cumulativeStart.slice(1);
  return { totalDuration, cumulativeStart, cumulativeEnd };
}

interface ListeningSectionProps {
  cefrLevel?: CEFRLevel | null;
  onActivitySaved?: () => void;
  assignmentId?: string | null;
  initialActivityId?: string | null;
}

export function ListeningSection({ cefrLevel, onActivitySaved, assignmentId, initialActivityId }: ListeningSectionProps) {
  const { t } = useLanguage();
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<Level>(cefrLevel && LEVEL_ORDER.includes(cefrLevel) ? cefrLevel : 'B1');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [aiQuestions, setAiQuestions] = useState<ListeningQuestion[] | null>(null);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [questionsRetryToken, setQuestionsRetryToken] = useState(0);
  const [questionTips, setQuestionTips] = useState<Record<string, string>>({});
  const [loadingTips, setLoadingTips] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<ListeningAIAnalysis | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const exercisesForLevel = EXERCISES_BY_LEVEL[selectedLevel];
  const userHasFixedLevel = !!cefrLevel && LEVEL_ORDER.includes(cefrLevel);
  const userLevelIndex = userHasFixedLevel ? LEVEL_ORDER.indexOf(cefrLevel as Level) : -1;
  const exercise = selectedExerciseId
    ? exercisesForLevel.find((e) => e.id === selectedExerciseId) ?? null
    : null;

  const questions = aiQuestions ?? [];

  const sentences = useMemo(
    () => (exercise ? splitSentences(exercise.text) : []),
    [exercise?.id, exercise?.text]
  );

  const timeInfo = useMemo(() => getTimeInfo(sentences, 1), [sentences]);

  const playbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playbackStartTimeRef = useRef(0);
  const playbackSentenceIndexRef = useRef(0);
  const isRestoringRef = useRef(false);
  const restoredExerciseIdRef = useRef<string | null>(null);

  const clearPlaybackInterval = () => {
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }
  };

  useEffect(() => {
    if (isRestoringRef.current) return;
    setSelectedExerciseId(null);
    setAiQuestions(null);
    setQuestionsError(null);
  }, [selectedLevel]);

  // Load initial activity from Recent Activity
  useEffect(() => {
    if (initialActivityId) {
      isRestoringRef.current = true;
      const activities = getActivitiesByType('listening');
      const activity = activities.find((a) => a.id === initialActivityId);
      if (activity) {
        // Restore the listening exercise state
        setQuestionsError(null);
        if (activity.listeningQuestions) {
          setAiQuestions(activity.listeningQuestions);
        }
        if (activity.listeningUserAnswers) {
          setAnswers(activity.listeningUserAnswers);
        }
        if ((activity as any).listeningAIAnalysis) {
          setAiAnalysis((activity as any).listeningAIAnalysis);
          setAnalysisError(null);
          setLoadingAnalysis(false);
        } else {
          setAiAnalysis(null);
        }
        setSubmitted(true);
        
        // Try to find and select the exercise based on the title
        const exerciseTitle = activity.courseTitle;
        if (exerciseTitle) {
          const allExercises = Object.values(EXERCISES_BY_LEVEL).flat();
          const foundExercise = allExercises.find(ex => ex.title === exerciseTitle);
          if (foundExercise) {
            // Set level and exercise
            const exerciseLevel = Object.entries(EXERCISES_BY_LEVEL).find(([_, exercises]) => 
              exercises.some(e => e.id === foundExercise.id)
            )?.[0] as Level;
            if (exerciseLevel) {
              restoredExerciseIdRef.current = foundExercise.id;
              setSelectedLevel(exerciseLevel);
              setSelectedExerciseId(foundExercise.id);
            }
          }
        }
      }
      setTimeout(() => {
        isRestoringRef.current = false;
      }, 0);
    } else {
      // Clear state when initialActivityId is null (user navigated away and came back)
      // Only clear if we're not in the middle of restoring
      if (!isRestoringRef.current) {
        setAnswers({});
        setSubmitted(false);
        setAiAnalysis(null);
        setAnalysisError(null);
        setSelectedExerciseId(null);
        restoredExerciseIdRef.current = null;
      }
    }
  }, [initialActivityId]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  // Reset playback and answers whenever level or exercise changes (so previous exercise answers never persist)
  useEffect(() => {
    if (isRestoringRef.current) return;
    if (restoredExerciseIdRef.current && restoredExerciseIdRef.current === selectedExerciseId) return;
    setCurrentSentenceIndex(0);
    setCurrentPlaybackTime(0);
    setAnswers({});
    setSubmitted(false);
    clearPlaybackInterval();
    window.speechSynthesis?.cancel();
    setIsPlaying(false);
  }, [selectedLevel, selectedExerciseId]);

  useEffect(() => {
    if (isRestoringRef.current) return;
    if (restoredExerciseIdRef.current && restoredExerciseIdRef.current === exercise?.id && submitted && (aiQuestions?.length ?? 0) > 0) {
      return;
    }
    restoredExerciseIdRef.current = null;
    if (!exercise) {
      setAiQuestions(null);
      setQuestionsError(null);
      return;
    }
    let active = true;
    setLoadingQuestions(true);
    setQuestionsError(null);
    generateListeningQuestions(exercise.text, selectedLevel, exercise.questionCount, exercise.title)
      .then((qs) => {
        if (!active) return;
        setAiQuestions(qs);
        setAnswers({});
        setSubmitted(false);
      })
      .catch((error) => {
        console.error('Failed to generate listening questions:', error);
        if (!active) return;
        setAiQuestions([]);
        setQuestionsError('AI questions could not be generated. Please check your API key or try again.');
      })
      .finally(() => {
        if (!active) return;
        setLoadingQuestions(false);
      });
    return () => {
      active = false;
    };
  }, [exercise?.id, selectedLevel, questionsRetryToken]);

  // Extra safeguard: clear answers when the displayed exercise id changes (e.g. direct prop/context change)
  const exerciseIdRef = useRef<string | null>(null);
  useEffect(() => {
    const nextId = exercise?.id ?? null;
    if (exerciseIdRef.current !== nextId) {
      exerciseIdRef.current = nextId;
      if (nextId != null) {
        if (!isRestoringRef.current && restoredExerciseIdRef.current !== nextId) {
          setAnswers({});
          setSubmitted(false);
        }
      }
      if (restoredExerciseIdRef.current && restoredExerciseIdRef.current !== nextId) {
        restoredExerciseIdRef.current = null;
      }
    }
  }, [exercise?.id]);

  useEffect(() => {
    return () => {
      clearPlaybackInterval();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const getBestEnglishVoice = (): SpeechSynthesisVoice | null => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    const en = voices.filter((v) => v.lang.startsWith('en'));
    if (en.length === 0) return null;
    const enUS = en.filter((v) => v.lang.startsWith('en-US'));
    const preferred = (list: SpeechSynthesisVoice[]) =>
      list.find((v) => /Google|Microsoft|Samantha|Daniel|Karen|Zira|David|Kate|Moira|Alex|Premium|Natural/i.test(v.name));
    return preferred(enUS) ?? preferred(en) ?? enUS[0] ?? en[0];
  };

  const speakSentence = (index: number, playOnlyOne = false) => {
    if (typeof window === 'undefined' || !window.speechSynthesis || !sentences[index]) return;
    playbackSentenceIndexRef.current = index;
    playbackStartTimeRef.current = Date.now();
    const utter = new SpeechSynthesisUtterance(sentences[index]);
    utter.lang = 'en-US';
    utter.volume = 1;
    const voice = getBestEnglishVoice();
    if (voice) utter.voice = voice;
    utter.rate = 1;
    const endTime = timeInfo.cumulativeEnd[index] ?? timeInfo.totalDuration;
    utter.onend = () => {
      setCurrentPlaybackTime(endTime);
      if (playOnlyOne) {
        clearPlaybackInterval();
        setIsPlaying(false);
        return;
      }
      if (index + 1 < sentences.length) {
        setCurrentSentenceIndex(index + 1);
        speakSentence(index + 1);
      } else {
        clearPlaybackInterval();
        setIsPlaying(false);
      }
    };
    utter.onerror = () => {
      clearPlaybackInterval();
      setIsPlaying(false);
    };
    window.speechSynthesis.speak(utter);
  };

  const speak = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis || !exercise) return;
    window.speechSynthesis.cancel();
    clearPlaybackInterval();
    setIsPlaying(true);
    const baseTime = timeInfo.cumulativeStart[currentSentenceIndex] ?? 0;
    playbackSentenceIndexRef.current = currentSentenceIndex;
    playbackStartTimeRef.current = Date.now() - (currentPlaybackTime - baseTime) * 1000;
    speakSentence(currentSentenceIndex);
    playbackIntervalRef.current = setInterval(() => {
      const idx = playbackSentenceIndexRef.current;
      const startTime = playbackStartTimeRef.current;
      const baseTime = timeInfo.cumulativeStart[idx] ?? 0;
      const endTime = timeInfo.cumulativeEnd[idx] ?? timeInfo.totalDuration;
      const elapsed = (Date.now() - startTime) / 1000;
      const t = Math.min(baseTime + elapsed, endTime);
      setCurrentPlaybackTime(t);
    }, 200);
  };

  const pause = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    clearPlaybackInterval();
    setIsPlaying(false);
  };

  const reset = () => {
    window.speechSynthesis?.cancel();
    clearPlaybackInterval();
    setIsPlaying(false);
    setCurrentSentenceIndex(0);
    setCurrentPlaybackTime(0);
    setAnswers({});
    setSubmitted(false);
  };

  const seekToTime = (seconds: number) => {
    clearPlaybackInterval();
    const t = Math.max(0, Math.min(timeInfo.totalDuration, seconds));
    setCurrentPlaybackTime(t);
    let idx = sentences.length > 0 ? sentences.length - 1 : 0;
    for (let i = 0; i < timeInfo.cumulativeEnd.length; i++) {
      if (t < timeInfo.cumulativeEnd[i]) {
        idx = i;
        break;
      }
      idx = i;
    }
    setCurrentSentenceIndex(idx);
  };

  const score = useMemo(() => {
    if (!exercise) return { correctCount: 0, total: 0 };
    const total = questions.length;
    const correctCount = questions.reduce((acc, q) => acc + (answers[q.id] === q.correct ? 1 : 0), 0);
    return { correctCount, total };
  }, [exercise, answers, questions]);

  const generateAITipsForIncorrectAnswers = async () => {
    const incorrectQuestions = questions.filter(q => answers[q.id] !== q.correct);
    if (incorrectQuestions.length === 0) return;

    setLoadingTips(true);
    const GROQ_API_KEY = (import.meta.env.VITE_GROQ_API_KEY || '').trim().replace(/^["']|["']$/g, '');
    
    if (!GROQ_API_KEY) {
      // Fallback to predefined tips if no API key
      const fallbackTips: Record<string, string> = {};
      const templates = [
        "Focus on key verbs and action words in the audio.",
        "Listen for specific details like times, places, or names.",
        "Pay attention to prepositions - they indicate location.",
        "The answer is often at the beginning or end.",
        "Listen for transition words like 'but' or 'however'.",
        "Focus on who is doing the action.",
        "Similar-sounding options can be tricky.",
        "The speaker often rephrases the answer.",
        "Listen for contrasts - 'not', 'don't', or 'never'.",
        "Keywords from the question often appear in audio."
      ];
      incorrectQuestions.forEach((q, i) => {
        fallbackTips[q.id] = templates[i % templates.length];
      });
      setQuestionTips(fallbackTips);
      setLoadingTips(false);
      return;
    }

    // Generate AI tips for each incorrect question
    for (const q of incorrectQuestions) {
      try {
        const prompt = `You are an expert English listening teacher. A student answered incorrectly.

Question: "${q.question}"
Student's wrong answer: "${answers[q.id]}"
Correct answer: "${q.correct}"
Context: "${exercise?.text.substring(0, 200)}..."

Provide ONE very short tip (max 12 words) to help them understand their mistake. Focus on listening strategies.

Return ONLY the tip text, nothing else.`;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: 'Expert English teacher. Return only the tip text, no quotes.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.8,
            max_tokens: 50,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const tip = data.choices[0].message.content.trim().replace(/^["']|["']$/g, '');
          setQuestionTips(prev => ({ ...prev, [q.id]: tip }));
        } else {
          // Fallback for this specific question
          setQuestionTips(prev => ({ ...prev, [q.id]: 'Listen carefully for keywords related to this question.' }));
        }
      } catch (error) {
        console.error('Error generating tip:', error);
        setQuestionTips(prev => ({ ...prev, [q.id]: 'Listen to the audio again and focus on context.' }));
      }
    }
    setLoadingTips(false);
  };

  const generateOverallListeningAnalysis = async (
    exerciseForAnalysis: ListeningExercise | null,
    levelForAnalysis: Level,
    questionsForAnalysis: ListeningQuestion[],
    answersForAnalysis: Record<string, string>,
    percent: number
  ): Promise<ListeningAIAnalysis | null> => {
    if (!exerciseForAnalysis || questionsForAnalysis.length === 0) return null;

    const GROQ_API_KEY = (import.meta.env.VITE_GROQ_API_KEY || '').trim().replace(/^["']|["']$/g, '');
    if (!GROQ_API_KEY) {
      setAnalysisError('AI analysis is not available because the Groq API key is missing.');
      return null;
    }

    try {
      setLoadingAnalysis(true);
      setAnalysisError(null);

      const incorrect = questionsForAnalysis
        .filter((q) => answersForAnalysis[q.id] !== q.correct)
        .map((q) => ({
          question: q.question,
          correctAnswer: q.correct,
          userAnswer: answersForAnalysis[q.id] ?? '',
        }));

      const correct = questionsForAnalysis
        .filter((q) => answersForAnalysis[q.id] === q.correct)
        .map((q) => ({
          question: q.question,
          answer: q.correct,
        }));

      const systemPrompt =
        'You are an expert English listening teacher. You analyse a student\'s listening exercise and return JSON only.';

      const userPrompt = `A student has just completed a listening comprehension exercise.

Transcript title: ${exerciseForAnalysis.title}
Approximate CEFR level: ${levelForAnalysis}
Transcript (excerpt, first 400 characters):
"""${exerciseForAnalysis.text.slice(0, 400)}..."""

Total questions: ${questionsForAnalysis.length}
Correct answers: ${questionsForAnalysis.reduce((acc, q) => acc + (answersForAnalysis[q.id] === q.correct ? 1 : 0), 0)}
Overall score (percent): ${percent}%

Correct questions:
${JSON.stringify(correct, null, 2)}

Incorrect questions (if any):
${JSON.stringify(incorrect, null, 2)}

Based on this information, analyse the student's listening performance.

Return ONLY a compact JSON object (no markdown, no explanation text around it) with this exact shape:
{
  "summary": "1–3 sentences of friendly feedback about this performance.",
  "strengths": ["short bullet about a strength", "..."],
  "improvements": ["short bullet about an area to improve", "..."],
  "strategyTips": ["very short, practical listening strategy tip", "..."]
}

Rules:
- Each array should have between 2 and 4 items if possible.
- Sentences should be clear and B1–B2 friendly.
- Strategy tips must focus on listening skills (not grammar drills).`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 300,
        }),
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = await response.json();
      let content: string = data.choices?.[0]?.message?.content ?? '';
      content = content.trim();

      // Strip possible code fences if the model accidentally adds them
      if (content.startsWith('```')) {
        const firstNewline = content.indexOf('\n');
        const lastFence = content.lastIndexOf('```');
        if (firstNewline !== -1 && lastFence !== -1 && lastFence > firstNewline) {
          content = content.slice(firstNewline + 1, lastFence).trim();
        }
      }

      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch {
        // Try to recover by finding first and last braces
        const start = content.indexOf('{');
        const end = content.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
          parsed = JSON.parse(content.slice(start, end + 1));
        } else {
          throw new Error('Could not parse AI analysis JSON');
        }
      }

      const normalizeArray = (value: unknown): string[] => {
        if (Array.isArray(value)) {
          return value.map((v) => String(v)).filter((v) => v.trim().length > 0);
        }
        if (typeof value === 'string' && value.trim()) {
          return [value.trim()];
        }
        return [];
      };

      const normalized: ListeningAIAnalysis = {
        summary: typeof parsed.summary === 'string' && parsed.summary.trim()
          ? parsed.summary.trim()
          : 'Here is a quick overview of your listening performance based on this exercise.',
        strengths: normalizeArray(parsed.strengths),
        improvements: normalizeArray(parsed.improvements),
        strategyTips: normalizeArray(parsed.strategyTips),
      };

      setAiAnalysis(normalized);
      return normalized;
    } catch (error) {
      console.error('Error generating overall listening analysis:', error);
      setAnalysisError('AI analysis could not be generated. Please try again later.');
      return null;
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handleCheckAnswers = async () => {
    if (submitted) return;
    setSubmitted(true);
    const percent = score.total > 0 ? Math.round((score.correctCount / score.total) * 100) : 0;

    const analysis = await generateOverallListeningAnalysis(
      exercise,
      selectedLevel,
      questions,
      answers,
      percent
    );

    saveActivity({
      type: 'listening',
      score: percent,
      courseTitle: exercise?.title || 'Listening Exercise',
      assignmentId: assignmentId || undefined,
      listeningQuestions: questions.map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options,
        correct: q.correct,
      })),
      listeningUserAnswers: answers,
      listeningAIAnalysis: analysis || undefined,
    });

    if (assignmentId) {
      const user = getCurrentUser();
      if (user) {
        createSubmission({
          assignmentId,
          studentId: user.id,
          studentName: user.name,
          status: 'completed',
          content: exercise ? `Completed listening exercise: ${exercise.title}` : 'Completed listening exercise',
          aiScore: percent,
        });
      }
    }
    onActivitySaved?.();
    
    // Generate AI tips for incorrect answers
    generateAITipsForIncorrectAnswers();
    // Generate overall AI analysis for this listening exercise
    generateOverallListeningAnalysis();
  };

  const hasTTS = typeof window !== 'undefined' && 'speechSynthesis' in window;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-4xl font-bold text-gray-900">{t('nav.listening')}</h1>
      </motion.div>

      {/* Level selector - card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5 mb-6"
      >
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <span className="text-sm font-semibold text-gray-700 shrink-0">Level (CEFR):</span>
          <div className="flex flex-wrap gap-2">
            {LEVEL_ORDER.map((lvl) => {
              const lvlIndex = LEVEL_ORDER.indexOf(lvl);
              const isLocked = userHasFixedLevel && lvlIndex > userLevelIndex;
              const isActive = selectedLevel === lvl;
              return (
                <button
                  key={lvl}
                  type="button"
                  disabled={isLocked}
                  onClick={() => {
                    if (isLocked) return;
                    setSelectedLevel(lvl);
                  }}
                  className={`relative min-w-[44px] px-3 py-2 rounded-lg border font-semibold text-sm transition-colors ${
                    isActive
                      ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm'
                      : isLocked
                        ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 hover:border-gray-300'
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    {lvl}
                    {isLocked && (
                      <Lock className="w-3 h-3 text-gray-400" aria-hidden="true" />
                    )}
                  </span>
                  {cefrLevel === lvl && (
                    <span
                      className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 text-amber-400"
                      title="Your level"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-0 sm:mt-0 sm:ml-auto max-w-md">
            {cefrLevel ? (
              <>
                <Sparkles className="w-3.5 h-3.5 inline mr-0.5 text-amber-500 align-middle" />
                {/* Hint text: other levels are locked */}
                {t('listening.recommendedHint').replace('{level}', cefrLevel)}
              </>
            ) : (
              t('listening.anyLevelHint')
            )}
          </p>
        </div>
      </motion.div>

      {!exercise ? (
        /* List of listenings for this level */
        <>
          <div className="flex items-center gap-2 mb-4">
            <List className="w-5 h-5 text-indigo-600 shrink-0" />
            <h2 className="text-lg font-semibold text-gray-800">
              {selectedLevel} — {exercisesForLevel.length} listening{exercisesForLevel.length !== 1 ? 's' : ''}
            </h2>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {exercisesForLevel.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => setSelectedExerciseId(ex.id)}
                className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm text-left hover:border-indigo-400 hover:shadow-md hover:bg-indigo-50/30 transition-all group flex flex-col min-h-[120px]"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600 shrink-0 group-hover:bg-indigo-200 transition-colors">
                    <Headphones className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 leading-tight pt-0.5">{ex.title}</h3>
                </div>
                <p className="text-sm text-gray-500 mt-auto">{ex.questionCount} questions</p>
              </button>
            ))}
          </motion.div>
        </>
      ) : (
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg"
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedExerciseId(null)}
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors mb-2"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('common.backToList')}
              </button>
              <div className="flex items-center gap-3 w-full">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100">
                  <Headphones className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-gray-900">{exercise.title}</h2>
                  <p className="text-sm text-gray-600">
                    {hasTTS
                      ? 'Press Play to hear the passage (browser voice). If nothing plays, read the transcript in the panel on the right and answer the questions.'
                      : 'Your browser does not support audio. Read the transcript in the panel on the right and answer the questions (reading practice).'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {hasTTS && (
                  <>
                    <button
                      type="button"
                      onClick={isPlaying ? pause : speak}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:shadow-lg transition-all"
                    >
                      {isPlaying ? <PauseCircle className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
                      {isPlaying ? 'Duraklat' : 'Oynat'}
                    </button>
                    <button
                      type="button"
                      onClick={reset}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                    >
                      <RotateCcw className="w-5 h-5" />
                      Sıfırla
                    </button>
                  </>
                )}
              </div>
            </div>

            {hasTTS && timeInfo.totalDuration > 0 && (
              <div className="mt-4 rounded-xl bg-gray-50 border border-gray-100 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-semibold text-gray-700 shrink-0 w-14">
                    {Math.floor(currentPlaybackTime / 60)}:{(Math.floor(currentPlaybackTime % 60)).toString().padStart(2, '0')}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, timeInfo.totalDuration)}
                    step={0.5}
                    value={currentPlaybackTime}
                    onChange={(e) => {
                      window.speechSynthesis?.cancel();
                      setIsPlaying(false);
                      seekToTime(Number(e.target.value));
                    }}
                    className="flex-1 min-w-[120px] max-w-md accent-indigo-600"
                  />
                  <span className="text-sm font-semibold text-gray-700 shrink-0 w-14">
                    {Math.floor(timeInfo.totalDuration / 60)}:{(Math.floor(timeInfo.totalDuration % 60)).toString().padStart(2, '0')}
                  </span>
                </div>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg"
          >
            <div className="flex items-center justify-between gap-4 mb-4">
              <h3 className="text-lg font-bold text-gray-900">Questions</h3>
              {loadingQuestions && (
                <span className="text-xs text-gray-500">AI questions are loading...</span>
              )}
              {submitted && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 text-green-700 border border-green-200 text-sm font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  Score: {score.correctCount}/{score.total}
                </div>
              )}
            </div>
            {questionsError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex flex-wrap items-center justify-between gap-3">
                <span>{questionsError}</span>
                <button
                  type="button"
                  onClick={() => setQuestionsRetryToken((prev) => prev + 1)}
                  className="px-3 py-2 rounded-lg border border-rose-200 bg-white text-rose-800 font-semibold hover:bg-rose-100 transition-colors"
                >
                  Try again
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((q, idx) => (
                  <div key={q.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
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
                            className={`text-left px-4 py-3 rounded-xl border transition-colors ${
                              isCorrect
                                ? 'border-green-500 bg-green-50 text-green-800'
                                : isWrongSelected
                                  ? 'border-red-500 bg-red-50 text-red-800'
                                  : isSelected
                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
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
            )}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setAnswers({});
                  setSubmitted(false);
                  setAiAnalysis(null);
                  setAnalysisError(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              >
                {t('common.clearAnswers')}
              </button>
              <button
                type="button"
                onClick={handleCheckAnswers}
                disabled={questions.length === 0 || questions.some((q) => !answers[q.id])}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('common.checkAnswers')}
              </button>
            </div>
          </motion.div>

        </div>

        <div className="space-y-6">
          {submitted && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                Transcript
              </h3>
              <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{exercise.text}</p>
              <p className="text-xs text-gray-500 mt-3">You can read this if audio doesn't play, then answer the questions.</p>
            </motion.div>
          )}

          {/* Results & Analysis - Only show after submission */}
          {submitted && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border-2 border-indigo-200 shadow-lg"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  Results & Analysis
                </h3>
                <div className="text-center">
                  <div className="text-3xl font-bold text-indigo-600">
                    {score.total > 0 ? Math.round((score.correctCount / score.total) * 100) : 0}%
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">Overall Score</div>
                </div>
              </div>

              {/* Performance Breakdown */}
              <div className="mb-5">
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                  <h4 className="font-bold text-gray-800 mb-3 text-sm">Performance Breakdown</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="text-2xl font-bold text-green-600">{score.correctCount}</div>
                      <div className="text-xs text-gray-600 mt-1">Correct</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="text-2xl font-bold text-red-600">{score.total - score.correctCount}</div>
                      <div className="text-xs text-gray-600 mt-1">Incorrect</div>
                    </div>
                    <div className="text-center p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                      <div className="text-2xl font-bold text-indigo-600">{score.total}</div>
                      <div className="text-xs text-gray-600 mt-1">Total</div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-gray-600">Accuracy Rate</span>
                      <span className="text-xs font-bold text-indigo-600">
                        {score.total > 0 ? Math.round((score.correctCount / score.total) * 100) : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${score.total > 0 ? (score.correctCount / score.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="mb-5">
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <h4 className="font-bold text-gray-800 mb-2 text-sm flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    AI Summary & Feedback
                  </h4>
                  <div className="text-sm text-gray-700 leading-relaxed">
                    <p className="mb-2">
                      You answered <span className="font-bold text-indigo-600">{score.correctCount}</span> out of <span className="font-bold">{score.total}</span> questions correctly.
                    </p>
                    {loadingAnalysis && (
                      <div className="mt-3 text-xs text-gray-500 italic flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                        <span>AI is analysing your listening performance...</span>
                      </div>
                    )}
                    {analysisError && !loadingAnalysis && (
                      <div className="mt-3 text-xs text-red-600">
                        {analysisError}
                      </div>
                    )}
                    {aiAnalysis && !loadingAnalysis && !analysisError && (
                      <div className="mt-3 space-y-3">
                        <p className="text-sm text-gray-700">{aiAnalysis.summary}</p>
                        {aiAnalysis.strengths.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold text-green-700 mb-1">Strengths</div>
                            <ul className="list-disc list-inside text-xs text-gray-700 space-y-0.5">
                              {aiAnalysis.strengths.map((item, idx) => (
                                <li key={idx}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {aiAnalysis.improvements.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold text-amber-700 mb-1">Areas to improve</div>
                            <ul className="list-disc list-inside text-xs text-gray-700 space-y-0.5">
                              {aiAnalysis.improvements.map((item, idx) => (
                                <li key={idx}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {aiAnalysis.strategyTips.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold text-indigo-700 mb-1">Listening strategy tips</div>
                            <ul className="list-disc list-inside text-xs text-gray-700 space-y-0.5">
                              {aiAnalysis.strategyTips.map((item, idx) => (
                                <li key={idx}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                    {!aiAnalysis && !loadingAnalysis && !analysisError && (
                      <>
                        {score.correctCount === score.total && (
                          <div className="mt-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                            <p className="font-semibold text-green-700">Perfect Score!</p>
                            <p className="text-xs text-green-600 mt-1">Outstanding work! You've mastered this listening exercise completely.</p>
                          </div>
                        )}
                        {score.correctCount < score.total && score.correctCount >= score.total * 0.8 && (
                          <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                            <p className="font-semibold text-blue-700">Excellent Work!</p>
                            <p className="text-xs text-blue-600 mt-1">You're doing great! Review the incorrect answers to achieve perfection.</p>
                          </div>
                        )}
                        {score.correctCount < score.total * 0.8 && score.correctCount >= score.total * 0.6 && (
                          <div className="mt-3 p-3 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border border-yellow-200">
                            <p className="font-semibold text-yellow-700">Good Effort!</p>
                            <p className="text-xs text-yellow-600 mt-1">You're making progress! Focus on the areas below to improve your score.</p>
                          </div>
                        )}
                        {score.correctCount < score.total * 0.6 && (
                          <div className="mt-3 p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
                            <p className="font-semibold text-orange-700">Keep Practicing!</p>
                            <p className="text-xs text-orange-600 mt-1">Don't give up! Review the transcript and try similar exercises to improve your listening skills.</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Correct Answers - Detailed removed as requested */}
            </motion.div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
