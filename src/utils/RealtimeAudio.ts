import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  constructor(private onAudioData: (audioData: Float32Array) => void) {}

  /**
   * Inicia a captura de áudio do microfone
   *
   * Solicita permissão de microfone, cria AudioContext em 24kHz e configura
   * ScriptProcessorNode para processar chunks de 4096 samples.
   *
   * @throws {Error} Se permissão de microfone for negada ou não disponível
   *
   * @remarks
   * - Sample rate: 24000 Hz (requerido pela OpenAI Realtime API)
   * - Buffer size: 4096 samples
   * - Canais: mono (1 canal)
   */
  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.audioContext = new AudioContext({
        sampleRate: 24000,
      });

      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = e => {
        const inputData = e.inputBuffer.getChannelData(0);
        this.onAudioData(new Float32Array(inputData));
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
    } catch (error) {
      logger.error('Error accessing microphone:', error);
      throw error;
    }
  }

  /**
   * Para a captura de áudio e libera recursos
   *
   * Desconecta todos os nós de áudio, para o stream do microfone e fecha
   * o AudioContext. Deve ser sempre chamado para evitar vazamento de recursos.
   */
  stop() {
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export const encodeAudioForAPI = (float32Array: Float32Array): string => {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  const uint8Array = new Uint8Array(int16Array.buffer);
  let binary = '';
  const chunkSize = 0x8000;

  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }

  return btoa(binary);
};

export class RealtimeChat {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private audioEl: HTMLAudioElement;
  private recorder: AudioRecorder | null = null;

  constructor(private onMessage: (message: unknown) => void) {
    this.audioEl = document.createElement('audio');
    this.audioEl.autoplay = true;
  }

  /**
   * Inicializa a conexão WebRTC com OpenAI Realtime API
   *
   * Fluxo completo:
   * 1. Obtém ephemeral token via Supabase edge function
   * 2. Cria RTCPeerConnection com servidor STUN do Google
   * 3. Configura Data Channel para eventos (JSON)
   * 4. Adiciona transceiver de áudio
   * 5. Cria e envia SDP offer
   * 6. Recebe SDP answer do OpenAI
   * 7. Inicia gravação de áudio local
   *
   * @throws {Error} Se falhar ao obter token ou conectar
   *
   * @remarks
   * - Usa STUN server: stun.l.google.com:19302
   * - Data Channel ordered: true, maxRetransmits: 0
   * - Áudio: 24kHz mono PCM16
   */
  async init() {
    try {
      logger.log('Requesting ephemeral token from edge function...');

      const { data, error } = await supabase.functions.invoke('generate-realtime-token');

      if (error) throw error;

      if (!data.client_secret?.value) {
        throw new Error('Failed to get ephemeral token');
      }

      const EPHEMERAL_KEY = data.client_secret.value;
      logger.log('Token received, creating WebRTC connection...');

      // Create peer connection
      this.pc = new RTCPeerConnection();

      // Set up remote audio
      this.pc.ontrack = e => {
        logger.log('Remote audio track received');
        this.audioEl.srcObject = e.streams[0];
      };

      // Add local audio track
      const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.pc.addTrack(ms.getTracks()[0]);

      // Set up data channel
      this.dc = this.pc.createDataChannel('oai-events');
      this.dc.addEventListener('message', e => {
        const event = JSON.parse(e.data);
        logger.log('Received event:', event.type);
        this.onMessage(event);
      });

      // Create and set local description
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      // Connect to OpenAI's Realtime API
      const baseUrl = 'https://api.openai.com/v1/realtime';
      const model = 'gpt-4o-realtime-preview-2024-12-17';
      logger.log('Connecting to OpenAI Realtime API...');

      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          'Content-Type': 'application/sdp',
        },
      });

      if (!sdpResponse.ok) {
        throw new Error(`OpenAI connection failed: ${sdpResponse.status}`);
      }

      const answer = {
        type: 'answer' as RTCSdpType,
        sdp: await sdpResponse.text(),
      };

      await this.pc.setRemoteDescription(answer);
      logger.log('WebRTC connection established successfully');

      // Start recording
      this.recorder = new AudioRecorder(audioData => {
        if (this.dc?.readyState === 'open') {
          this.dc.send(
            JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: encodeAudioForAPI(audioData),
            })
          );
        }
      });
      await this.recorder.start();
      logger.log('Audio recording started');
    } catch (error) {
      logger.error('Error initializing chat:', error);
      throw error;
    }
  }

  /**
   * Desconecta e limpa todos os recursos da conexão WebRTC
   *
   * Para gravação de áudio, fecha Data Channel e RTCPeerConnection.
   * Deve ser sempre chamado ao finalizar a conversa.
   */
  disconnect() {
    logger.log('Disconnecting realtime chat...');
    this.recorder?.stop();
    this.dc?.close();
    this.pc?.close();
    this.audioEl.srcObject = null;
  }
}
