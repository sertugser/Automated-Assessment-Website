import { useEffect, useState } from 'react';
import { CheckCircle, TrendingUp, Zap, Bot, ArrowRight, Star, X, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AIRobot } from './ai-robot';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import logo from '../assets/fbaa49f59eaf54473f226d88f4a207918ca971f2.png';

interface LandingPageProps {
  onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const [showRobot, setShowRobot] = useState(false);
  const [showModal, setShowModal] = useState<'how-it-works' | 'testimonials' | 'faq' | null>(null);
  
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowRobot(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, section: 'how-it-works' | 'testimonials' | 'faq') => {
    e.preventDefault();
    setShowModal(section);
  };

  const faqItems = [
    {
      question: 'How does the AI feedback work?',
      answer: 'Our AI analyzes your responses in real time for grammar, vocabulary, coherence, and pronunciation (for speaking). It then gives instant, actionable feedback and suggestions.'
    },
    {
      question: 'Can I track my progress over time?',
      answer: 'Yes. You get a progress dashboard with skill breakdowns, weekly trends, and personalized recommendations based on your performance.'
    },
    {
      question: 'Is the platform suitable for all English levels?',
      answer: 'Absolutely. We support beginner to advanced levels, and our adaptive learning adjusts question difficulty based on your results.'
    },
    {
      question: 'What skills can I improve with AssessAI?',
      answer: 'You can improve reading, listening, speaking, and writing with guided practice, tests, and AI coaching.'
    },
    {
      question: 'Do you offer 24/7 AI tutor support?',
      answer: 'Yes. The AI tutor is available anytime to explain concepts, provide examples, and help you practice.'
    },
    {
      question: 'Can I use AssessAI on mobile devices?',
      answer: 'Yes. The platform is fully responsive and works on phones, tablets, and desktops.'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <img src={logo} alt="AssessAI Logo" className="w-10 h-10" />
              <span className="text-xl font-bold text-gray-900">AssessAI</span>
            </div>
            <div className="hidden md:flex gap-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</a>
              <a href="#how-it-works" className="text-gray-600 hover:text-gray-900 transition-colors" onClick={(e) => handleNavClick(e, 'how-it-works')}>How It Works</a>
              <a href="#testimonials" className="text-gray-600 hover:text-gray-900 transition-colors" onClick={(e) => handleNavClick(e, 'testimonials')}>Testimonials</a>
              <a href="#faq" className="text-gray-600 hover:text-gray-900 transition-colors" onClick={(e) => handleNavClick(e, 'faq')}>FAQ</a>
            </div>
            <button
              onClick={onGetStarted}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* AI Robot - Scroll Triggered */}
      <AIRobot show={showRobot} />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full mb-6">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-medium">AI-Powered English Learning Platform</span>
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 max-w-4xl mx-auto">
              Master English with{' '}
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Instant Feedback
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              Master English with our advanced AI-powered platform. Get instant feedback on your writing, speaking, and comprehension skills.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose Our Platform?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powered by advanced AI technology to give you the most effective English learning experience
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                title: 'AI-Powered Feedback',
                description: 'Get instant, personalized feedback on every answer with detailed explanations',
                color: 'from-indigo-500 to-indigo-600'
              },
              {
                icon: TrendingUp,
                title: 'Progress Tracking',
                description: 'Monitor your improvement with detailed analytics and performance insights',
                color: 'from-purple-500 to-purple-600'
              },
              {
                icon: Zap,
                title: 'Adaptive Learning',
                description: 'Questions adapt to your skill level, keeping you challenged but not overwhelmed',
                color: 'from-pink-500 to-pink-600'
              },
              {
                icon: CheckCircle,
                title: 'Instant Validation',
                description: 'Know immediately if you\'re on the right track with real-time answer checking',
                color: 'from-blue-500 to-blue-600'
              },
              {
                icon: Bot,
                title: 'AI Study Assistant',
                description: 'Your personal English tutor available 24/7 to answer questions and provide guidance',
                color: 'from-green-500 to-green-600'
              },
              {
                icon: Star,
                title: 'Gamified Experience',
                description: 'Earn points, unlock achievements, and compete with friends to stay motivated',
                color: 'from-yellow-500 to-yellow-600'
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-2xl hover:shadow-xl transition-shadow"
              >
                <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-4`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-white mb-6">
              Ready to Master English?
            </h2>
            <p className="text-xl text-indigo-100 mb-10">
              Join thousands of learners who are already achieving English fluency with our AI-powered platform
            </p>
            <button
              onClick={onGetStarted}
              className="group bg-white text-indigo-600 px-8 py-4 rounded-xl text-lg font-medium hover:shadow-2xl transition-all inline-flex items-center gap-2"
            >
              Start Learning Now
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <img src={logo} alt="AssessAI Logo" className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white">AssessAI</span>
              </div>
              <p className="text-sm">
                AI-powered English learning platform helping millions achieve fluency.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Courses</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-sm text-center">
            © 2026 AssessAI. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Floating FAQ Button */}
      <button
        type="button"
        onClick={() => setShowModal('faq')}
        className="fixed bottom-6 right-6 z-[55] flex items-center gap-2 rounded-full bg-gray-900 text-white px-4 py-3 shadow-xl hover:shadow-2xl transition-all"
        aria-label="Open FAQ"
      >
        <HelpCircle className="w-5 h-5" />
        <span className="text-sm font-semibold">FAQ</span>
      </button>

      {/* Modal for How It Works */}
      <AnimatePresence>
        {showModal === 'how-it-works' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
            onClick={() => setShowModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white p-8 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900">How It Works</h2>
                <button
                  onClick={() => setShowModal(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="text-lg text-gray-600 mb-8 text-center">
                Start learning in three simple steps
              </p>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  {
                    step: '01',
                    title: 'Choose Your Level',
                    description: 'Select from beginner to advanced English courses tailored to your learning goals'
                  },
                  {
                    step: '02',
                    title: 'Practice & Learn',
                    description: 'Complete exercises and receive instant AI-powered feedback on your English'
                  },
                  {
                    step: '03',
                    title: 'Track Progress',
                    description: 'Watch your English skills grow with detailed analytics and personalized recommendations'
                  }
                ].map((step, index) => (
                  <div key={index} className="relative bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl">
                    <div className="text-5xl font-bold text-indigo-200 mb-4">{step.step}</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                    <p className="text-gray-600">{step.description}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal for Testimonials */}
      <AnimatePresence>
        {showModal === 'testimonials' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
            onClick={() => setShowModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white p-8 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900">Loved by Learners Worldwide</h2>
                <button
                  onClick={() => setShowModal(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="text-lg text-gray-600 mb-8 text-center">
                See what our users are saying about their learning journey
              </p>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  {
                    name: 'Sarah Johnson',
                    role: 'Business Professional',
                    content: 'This platform helped me improve my business English! The instant feedback was invaluable for my career.',
                    rating: 5
                  },
                  {
                    name: 'Michael Chen',
                    role: 'International Student',
                    content: 'Best English learning platform I\'ve used. The AI feedback is incredibly detailed and helpful.',
                    rating: 5
                  },
                  {
                    name: 'Emily Rodriguez',
                    role: 'IELTS Candidate',
                    content: 'I passed my IELTS exam with a high score thanks to this platform. The practice tests are amazing!',
                    rating: 5
                  }
                ].map((testimonial, index) => (
                  <div key={index} className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl">
                    <div className="flex gap-1 mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                      ))}
                    </div>
                    <p className="text-gray-700 mb-6 italic">&quot;{testimonial.content}&quot;</p>
                    <div>
                      <div className="font-semibold text-gray-900">{testimonial.name}</div>
                      <div className="text-sm text-gray-600">{testimonial.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal for FAQ */}
      <AnimatePresence>
        {showModal === 'faq' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
            onClick={() => setShowModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white p-8 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-900">Frequently Asked Questions</h2>
                <button
                  onClick={() => setShowModal(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
                  aria-label="Close FAQ"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="text-lg text-gray-600 mb-6">
                Quick answers to the most common questions about AssessAI.
              </p>
              <div className="rounded-2xl border border-gray-200 p-2">
                <Accordion type="single" collapsible className="w-full">
                  {faqItems.map((item, index) => (
                    <AccordionItem key={item.question} value={`faq-${index}`} className="px-4">
                      <AccordionTrigger className="text-gray-900 text-base">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-gray-600 text-base">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
