import { motion, AnimatePresence } from 'motion/react';
import { Bot, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { generateAssistantReply, type AssistantChatMessage } from '../lib/ai-services';

interface AIRobotProps {
  show: boolean;
}

export function AIRobot({ show }: AIRobotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<AssistantChatMessage[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your AI learning assistant. How can I help you today?",
    },
  ]);
  const chatMessagesRef = useRef<AssistantChatMessage[]>(chatMessages);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const quickMessages = useMemo(
    () => [
      'How do I get started?',
      'What topics are available?',
      'How does the AI feedback work?',
    ],
    []
  );

  useEffect(() => {
    chatMessagesRef.current = chatMessages;
    if (!isOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isOpen]);

  const handleSend = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    setMessage('');
    setIsLoading(true);
    setChatMessages((prev) => [...prev, { role: 'user', content: trimmed }]);

    try {
      const reply = await generateAssistantReply([
        ...chatMessagesRef.current,
        { role: 'user', content: trimmed },
      ]);
      setChatMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Sorry, I could not respond right now. Please try again.';
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: errorMessage,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="fixed bottom-6 right-6 z-50"
        >
          {/* Chat Window */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute bottom-20 right-0 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden mb-4"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <Bot className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-semibold">AI Assistant</div>
                        <div className="text-xs text-indigo-100">Online</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="hover:bg-white/20 p-1 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="p-4 h-64 overflow-y-auto bg-gray-50">
                  {chatMessages.map((msg, idx) => (
                    <motion.div
                      key={`${msg.role}-${idx}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3 rounded-lg shadow-sm mb-3 ${
                        msg.role === 'assistant'
                          ? 'bg-white text-gray-700'
                          : 'bg-indigo-600 text-white ml-8'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </motion.div>
                  ))}

                  {/* Quick Action Buttons */}
                  <div className="space-y-2">
                    {quickMessages.map((msg, index) => (
                      <motion.button
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => handleSend(msg)}
                        className="w-full text-left text-sm bg-white border border-gray-200 p-3 rounded-lg hover:border-indigo-600 hover:bg-indigo-50 transition-all"
                      >
                        {msg}
                      </motion.button>
                    ))}
                  </div>

                  {isLoading && (
                    <div className="text-xs text-gray-500 mt-3">Assistant is typing...</div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 bg-white border-t border-gray-200">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSend(message);
                        }
                      }}
                      placeholder="Type your question..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600 text-sm"
                      disabled={isLoading}
                    />
                    <button
                      onClick={() => handleSend(message)}
                      disabled={isLoading}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Robot Button */}
          <motion.button
            onClick={() => setIsOpen(!isOpen)}
            className="relative w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full shadow-lg hover:shadow-2xl transition-all flex items-center justify-center group"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Bot className="w-8 h-8 text-white" />
            
            {/* Pulse Effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full"
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />

            {/* Notification Badge */}
            {!isOpen && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold"
              >
                1
              </motion.div>
            )}
          </motion.button>

          {/* Tooltip */}
          {!isOpen && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="absolute bottom-20 right-0 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm whitespace-nowrap mb-2"
            >
              Need help? Ask me anything!
              <div className="absolute -bottom-1 right-6 w-2 h-2 bg-gray-900 transform rotate-45"></div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
