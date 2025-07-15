// Mock translation service for MVP
// In production, this would integrate with a real translation service

interface TranslationResult {
  text: string;
  targetLanguage: string;
  sourceLanguage: string;
}

const mockTranslations: Record<string, Record<string, string>> = {
  "pt-BR": {
    "Hello! How are you?": "Olá! Como você está?",
    "I'm doing well, thank you!": "Estou bem, obrigado!",
    "Good morning": "Bom dia",
    "Good afternoon": "Boa tarde",
    "Good evening": "Boa noite",
    "Thank you": "Obrigado",
    "You're welcome": "De nada",
    "How was your day?": "Como foi seu dia?",
    "Nice to meet you": "Prazer em conhecê-lo",
    "See you later": "Até mais tarde",
  },
  "en-US": {
    "Olá! Como você está?": "Hello! How are you?",
    "Estou bem, obrigado!": "I'm doing well, thank you!",
    "Bom dia": "Good morning",
    "Boa tarde": "Good afternoon",
    "Boa noite": "Good evening",
    "Obrigado": "Thank you",
    "De nada": "You're welcome",
    "Como foi seu dia?": "How was your day?",
    "Prazer em conhecê-lo": "Nice to meet you",
    "Até mais tarde": "See you later",
  },
  "es-ES": {
    "Hello! How are you?": "¡Hola! ¿Cómo estás?",
    "I'm doing well, thank you!": "¡Estoy bien, gracias!",
    "Good morning": "Buenos días",
    "Good afternoon": "Buenas tardes",
    "Good evening": "Buenas noches",
    "Thank you": "Gracias",
    "You're welcome": "De nada",
    "How was your day?": "¿Cómo estuvo tu día?",
    "Nice to meet you": "Mucho gusto",
    "See you later": "Hasta luego",
  },
};

export async function translateText(
  text: string,
  targetLanguage: string,
  sourceLanguage: string = "auto"
): Promise<TranslationResult> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Mock translation logic
  const translations = mockTranslations[targetLanguage];
  const translatedText = translations?.[text] || `[Traduzido] ${text}`;

  return {
    text: translatedText,
    targetLanguage,
    sourceLanguage: sourceLanguage === "auto" ? "pt-BR" : sourceLanguage,
  };
}

export function detectLanguage(text: string): string {
  // Simple language detection based on common words
  const portugueseWords = ["você", "está", "como", "bem", "obrigado", "dia"];
  const englishWords = ["you", "are", "how", "well", "thank", "day"];
  const spanishWords = ["estás", "cómo", "gracias", "días", "tardes"];

  const lowerText = text.toLowerCase();
  
  const ptCount = portugueseWords.filter(word => lowerText.includes(word)).length;
  const enCount = englishWords.filter(word => lowerText.includes(word)).length;
  const esCount = spanishWords.filter(word => lowerText.includes(word)).length;

  if (ptCount >= enCount && ptCount >= esCount) return "pt-BR";
  if (esCount >= enCount) return "es-ES";
  return "en-US";
}

export function getSupportedLanguages() {
  return [
    { code: "pt-BR", name: "Português (Brasil)", flag: "🇧🇷" },
    { code: "en-US", name: "English (US)", flag: "🇺🇸" },
    { code: "es-ES", name: "Español", flag: "🇪🇸" },
    { code: "fr-FR", name: "Français", flag: "🇫🇷" },
    { code: "de-DE", name: "Deutsch", flag: "🇩🇪" },
    { code: "it-IT", name: "Italiano", flag: "🇮🇹" },
    { code: "ja-JP", name: "日本語", flag: "🇯🇵" },
    { code: "ko-KR", name: "한국어", flag: "🇰🇷" },
    { code: "zh-CN", name: "中文", flag: "🇨🇳" },
  ];
}
