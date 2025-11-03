import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

// Declaração de tipos para Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

/**
 * Props do componente VoiceRecorder
 */
interface VoiceRecorderProps {
  /** Callback chamado quando transcrição de voz é concluída */
  onTranscript: (text: string) => void;
}

interface SpeechRecognitionEvent {
  results: any[];
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

export const VoiceRecorder = ({ onTranscript }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);

  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Gravação de voz não suportada neste navegador');
      return;
    }

    const SpeechRecognitionConstructor =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) return;

    recognitionRef.current = new SpeechRecognitionConstructor();
    recognitionRef.current.lang = 'pt-BR';
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = false;

    recognitionRef.current.onstart = () => {
      setIsRecording(true);
      toast.success('Gravação iniciada');
    };

    recognitionRef.current.onresult = (event: any) => {
      const speechEvent = event as SpeechRecognitionEvent;
      const results = speechEvent.results;
      let transcript = '';
      
      for (let i = 0; i < results.length; i++) {
        transcript += results[i][0].transcript + ' ';
      }
      
      onTranscript(transcript.trim());
    };

    recognitionRef.current.onerror = (event: any) => {
      const errorEvent = event as SpeechRecognitionErrorEvent;
      logger.error('Speech recognition error', errorEvent.error);
      toast.error('Erro na gravação: ' + errorEvent.error);
      setIsRecording(false);
    };

    recognitionRef.current.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current.start();
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      toast.success('Gravação finalizada');
    }
  };

  return (
    <Button
      type="button"
      variant={isRecording ? 'destructive' : 'outline'}
      size="icon"
      onClick={isRecording ? stopRecording : startRecording}
      className={`shrink-0 transition-brutal h-8 w-8 sm:h-10 sm:w-10 ${isRecording ? 'animate-pulse' : ''}`}
    >
      {isRecording ? (
        <Square className="h-4 w-4 sm:h-6 sm:w-6" />
      ) : (
        <Mic className="h-4 w-4 sm:h-6 sm:w-6" />
      )}
    </Button>
  );
};
