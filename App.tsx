import React, { useState, useEffect, useCallback } from 'react';
import { Message, Role, Status } from './types';
import { generateJarvisResponse } from './services/geminiService';
import { useSpeech } from './hooks/useSpeech';
import ChatWindow from './components/ChatWindow';
import InputBar from './components/InputBar';
import SystemStatus from './components/SystemStatus';
import ControlPanel from './components/ControlPanel';
import Header from './components/Header';
import { PowerIcon } from './components/icons/PowerIcon';
import MusicPlayer from './components/MusicPlayer';


const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: Role.ASSISTANT, content: 'Greetings. I am J.A.R.V.I.S. How may I assist you today?' }
  ]);
  const [status, setStatus] = useState<Status>(Status.IDLE);
  const [nowPlaying, setNowPlaying] = useState<{ song: string; artist: string } | null>(null);
  const {
    transcript,
    isListening,
    startListening,
    stopListening,
    speak,
    isSpeaking,
    isSpeechSupported,
  } = useSpeech();
  
  useEffect(() => {
    if(isListening) setStatus(Status.LISTENING);
    else if(status === Status.LISTENING) setStatus(Status.IDLE);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListening]);

  useEffect(() => {
    if(isSpeaking) setStatus(Status.SPEAKING);
    else if(status === Status.SPEAKING) setStatus(Status.IDLE);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpeaking]);
  
  const handleSendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = { id: Date.now().toString(), role: Role.USER, content: text };
    setMessages(prev => [...prev, userMessage]);
    setStatus(Status.THINKING);

    try {
      const aiResponseText = await generateJarvisResponse(text, messages);
      
      if (aiResponseText.startsWith('PLAY_SONG::')) {
        const jsonString = aiResponseText.substring('PLAY_SONG::'.length);
        const musicData = JSON.parse(jsonString);
        setNowPlaying(musicData);
        
        const friendlyResponse = `Of course. Opening YouTube to play "${musicData.song}"${musicData.artist ? ` by ${musicData.artist}` : ''}.`;
        const aiMessage: Message = { id: (Date.now() + 1).toString(), role: Role.ASSISTANT, content: friendlyResponse };
        setMessages(prev => [...prev, aiMessage]);
        speak(friendlyResponse);

      } else {
        const aiMessage: Message = { id: (Date.now() + 1).toString(), role: Role.ASSISTANT, content: aiResponseText };
        setMessages(prev => [...prev, aiMessage]);
        speak(aiResponseText);
      }

    } catch (error) {
      console.error("Error getting AI response:", error);
      const errorMessageContent = error instanceof Error && error.message.includes('JSON')
        ? "My apologies, I had trouble processing that music request. Please try again."
        : "My apologies, I seem to be experiencing a connection issue.";
      const errorMessage: Message = { id: (Date.now() + 1).toString(), role: Role.ASSISTANT, content: errorMessageContent };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
        setStatus(Status.IDLE);
    }
  }, [messages, speak]);
  
  useEffect(() => {
    if (transcript && !isListening) {
      handleSendMessage(transcript);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript, isListening]);

  const handleCommand = (command: string) => {
    const commands: { [key: string]: string } = {
      'weather': "What is the current weather?",
      'news': "Give me the latest news headlines.",
      'music': "Play some upbeat electronic music",
      'settings': "Open settings panel.",
    };
    handleSendMessage(commands[command]);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="bg-slate-900 h-full text-slate-300 flex flex-col p-4 md:p-6 lg:p-8">
      <Header />
      <main className="flex-grow flex flex-col lg:flex-row gap-6 mt-4 overflow-hidden">
        {/* Left Panel */}
        <div className="flex flex-col gap-6 lg:w-1/4">
          <SystemStatus status={status} />
          <ControlPanel onCommand={handleCommand} />
        </div>

        {/* Center Panel - Chat */}
        <div className="flex flex-col bg-black/30 border border-cyan-500/20 rounded-lg glow-cyan-box lg:w-1/2 flex-grow min-h-0">
          <ChatWindow messages={messages} />
          <InputBar
            onSendMessage={handleSendMessage}
            isListening={isListening}
            toggleListening={toggleListening}
            isSpeechSupported={isSpeechSupported}
          />
        </div>

        {/* Right Panel */}
        <div className="flex flex-col gap-6 lg:w-1/4">
            {nowPlaying ? (
                 <MusicPlayer 
                    song={nowPlaying.song} 
                    artist={nowPlaying.artist} 
                    onClose={() => setNowPlaying(null)} 
                />
            ) : (
                <div className="bg-black/30 p-4 border border-cyan-500/20 rounded-lg glow-cyan-box flex-grow">
                     <h2 className="font-orbitron text-lg text-cyan-300 glow-cyan-text mb-4">SYSTEM CORE</h2>
                     <div className="flex justify-center items-center h-full">
                        <PowerIcon className="w-48 h-48 text-cyan-400 opacity-20 animate-pulse" />
                     </div>
                </div>
            )}
        </div>
      </main>
    </div>
  );
};

export default App;
