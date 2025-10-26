/**
 * Configuración base para el Video Agent
 * Basado en Gemini Live API docs
 */
export interface AgentConfig {
  model?: string;
  systemInstruction: string;
  tools?: ToolDeclaration[];
  generationConfig?: GenerationConfig;
}

export interface GenerationConfig {
  responseModalities: ResponseModality[];
  speechConfig?: SpeechConfig;
  temperature?: number;
  maxOutputTokens?: number;
}

export type ResponseModality = 'AUDIO' | 'TEXT';

export interface SpeechConfig {
  voiceConfig: {
    prebuiltVoiceConfig: {
      voiceName: string; // 'Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'
    };
  };
}

export interface ToolDeclaration {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * Mensajes del servidor según Gemini Live API
 */
export interface ServerMessage {
  serverContent?: {
    modelTurn?: {
      parts: MessagePart[];
    };
    turnComplete?: boolean;
  };
  toolCall?: {
    functionCalls: FunctionCall[];
  };
}

export interface MessagePart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string; // Base64
  };
  functionCall?: FunctionCall;
}

export interface FunctionCall {
  name: string;
  args: Record<string, any>;
  id?: string;
}

/**
 * Configuración de streams según docs oficiales
 */
export interface StreamConfig {
  video: {
    fps: number; // 1 fps según docs
    width: number; // 768 óptimo
    height: number; // 768 óptimo
    mimeType: string; // 'image/jpeg'
  };
  audio: {
    sampleRate: number; // 16000 Hz
    channelCount: number; // 1 (mono)
    bitDepth: number; // 16-bit PCM
    mimeType: string; // 'audio/pcm'
  };
}

export const DEFAULT_STREAM_CONFIG: StreamConfig = {
  video: {
    fps: 1,
    width: 768,
    height: 768,
    mimeType: 'image/jpeg'
  },
  audio: {
    sampleRate: 16000,
    channelCount: 1,
    bitDepth: 16,
    mimeType: 'audio/pcm'
  }
};
