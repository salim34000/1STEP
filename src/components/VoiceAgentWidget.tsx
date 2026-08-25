import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2, Sparkles, X, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sound } from '../utils/audio';

export const VoiceAgentWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false); // When the agent is speaking

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  const toggleConnection = async () => {
    sound.click();
    if (isConnected || isConnecting) {
      stopConnection();
      setIsOpen(false);
    } else {
      setIsOpen(true);
      startConnection();
    }
  };

  const startConnection = async () => {
    setIsConnecting(true);
    setHasError(false);
    try {
      // 1. Setup WebSockets
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/live`);
      wsRef.current = ws;

      // 2. Setup Audio Contexts
      const InputContext = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new InputContext({ sampleRate: 16000 });
      inputAudioCtxRef.current = inputCtx;

      const outputCtx = new InputContext({ sampleRate: 24000 });
      outputAudioCtxRef.current = outputCtx;
      nextStartTimeRef.current = 0;

      // 3. Get Microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const source = inputCtx.createMediaStreamSource(stream);
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(inputCtx.destination);

      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN) {
          const channelData = e.inputBuffer.getChannelData(0);
          const base64 = pcmToBase64(channelData);
          ws.send(JSON.stringify({ audio: base64 }));
        }
      };

      ws.onopen = () => {
        setIsConnecting(false);
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.error) {
            setHasError(true);
            stopConnection();
          }
          if (msg.audio) {
            setIsSpeaking(true);
            playAudioChunk(outputCtx, msg.audio);
            // Reset isSpeaking roughly when audio might finish
            // This is a rough estimation since we don't have exact playback end events here
            setTimeout(() => setIsSpeaking(false), 500); 
          }
          if (msg.interrupted) {
            nextStartTimeRef.current = outputCtx.currentTime;
            setIsSpeaking(false);
          }
        } catch (e) {
          console.error(e);
        }
      };

      ws.onclose = () => {
        stopConnection();
      };
      
      ws.onerror = () => {
        setHasError(true);
        stopConnection();
      };

    } catch (err) {
      console.error(err);
      setHasError(true);
      stopConnection();
    }
  };

  const stopConnection = () => {
    setIsConnecting(false);
    setIsConnected(false);
    setIsSpeaking(false);

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close();
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close();
      outputAudioCtxRef.current = null;
    }
  };

  // Helper: Convert Float32Array PCM to Base64 (16-bit little endian)
  const pcmToBase64 = (pcmData: Float32Array) => {
    const buffer = new ArrayBuffer(pcmData.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < pcmData.length; i++) {
      let s = Math.max(-1, Math.min(1, pcmData[i]));
      s = s < 0 ? s * 0x8000 : s * 0x7FFF;
      view.setInt16(i * 2, s, true);
    }
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  // Helper: Play Base64 Audio Chunk
  const playAudioChunk = (ctx: AudioContext, base64Audio: string) => {
    try {
      const binary = window.atob(base64Audio);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const buffer = bytes.buffer;

      // Format is 16-bit PCM little-endian
      const view = new DataView(buffer);
      const floatArray = new Float32Array(buffer.byteLength / 2);
      for (let i = 0; i < floatArray.length; i++) {
        floatArray[i] = view.getInt16(i * 2, true) / 32768.0;
      }

      const audioBuffer = ctx.createBuffer(1, floatArray.length, 24000);
      audioBuffer.getChannelData(0).set(floatArray);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const currentTime = ctx.currentTime;
      if (nextStartTimeRef.current < currentTime) {
        nextStartTimeRef.current = currentTime;
      }

      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += audioBuffer.duration;
    } catch (e) {
      console.error("Audio playback error", e);
    }
  };

  useEffect(() => {
    return () => {
      stopConnection();
    };
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
      {/* Expanded Modal/Bubble */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="bg-white dark:bg-[#1E1E1E] border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-2xl w-72 origin-bottom-right"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold font-serif">
                <Sparkles className="w-4 h-4" />
                <span>Coach IA</span>
              </div>
              <button
                onClick={() => {
                  stopConnection();
                  setIsOpen(false);
                }}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center py-4 flex flex-col items-center gap-4">
              <div className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${isConnected ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' : hasError ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' : 'bg-slate-100 dark:bg-zinc-800 text-slate-400'}`}>
                {isConnecting ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : hasError ? (
                  <MicOff className="w-8 h-8" />
                ) : isSpeaking ? (
                  <Volume2 className="w-8 h-8 animate-pulse" />
                ) : (
                  <Mic className="w-8 h-8" />
                )}
                
                {isConnected && !isSpeaking && (
                  <span className="absolute inset-0 rounded-full ring-2 ring-indigo-500/30 animate-ping"></span>
                )}
                {isSpeaking && (
                  <>
                    <span className="absolute inset-0 rounded-full border-4 border-indigo-400 animate-pulse"></span>
                    <span className="absolute -inset-2 rounded-full border-2 border-indigo-300 animate-ping opacity-50"></span>
                  </>
                )}
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {isConnecting ? "Connexion au coach..." :
                   hasError ? "Erreur de connexion" :
                   isConnected ? "Je vous écoute..." : 
                   "Prêt à décomposer vos objectifs"}
                </p>
                {isConnected && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Parlez naturellement de votre projet.
                  </p>
                )}
              </div>

              {!isConnected && !isConnecting && (
                <button
                  onClick={startConnection}
                  className="mt-2 py-2 px-6 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                >
                  {hasError ? "Réessayer" : "Démarrer la session"}
                </button>
              )}
              {isConnected && (
                <button
                  onClick={() => {
                    stopConnection();
                    setIsOpen(false);
                  }}
                  className="mt-2 py-2 px-6 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 text-xs font-bold rounded-xl transition-colors"
                >
                  Terminer
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={toggleConnection}
          className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 group relative"
          title="Coach IA - Décomposez vos objectifs"
        >
          <Sparkles className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 border-2 border-white dark:border-[#121212] rounded-full animate-bounce"></span>
        </motion.button>
      )}
    </div>
  );
};
