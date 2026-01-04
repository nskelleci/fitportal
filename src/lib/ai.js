// In a real production app, this should be a call to your Backend API (Firebase Functions)
// to keep the API key secure. For this MVP, we use a direct call with a warning.

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

export const generateAIContent = async (prompt, systemInstruction = "") => {
  if (!GEMINI_API_KEY) {
    console.warn("Gemini API Key is missing.");
    return mockResponse("API Key Eksik");
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          // systemInstruction is supported in newer models, but basic generateContent might ignore it or require beta endpoint
          // For simplicity in MVP, we just send the prompt.
        })
      }
    );
    
    const data = await response.json();
    
    if (!response.ok) {
      // Handle Quota limits or other API errors gracefully
      console.warn("Gemini API Error:", data.error?.message);
      return mockResponse(data.error?.message || "API Error");
    }

    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Yanıt alınamadı.";

  } catch (error) {
    console.error("AI Connection Error:", error);
    return mockResponse(error.message);
  }
};

// Fallback Mock Response Generator
const mockResponse = (reason) => {
  return `⚠️ [SİSTEM NOTU: AI Servisi Şu An Meşgul (${reason})]
  
  Bu otomatik oluşturulmuş bir örnek içeriktir. Testlerinize devam edebilirsiniz.
  
  **Özet:** Antrenman verileriniz kaydedildi. Harika bir performans gösterdiniz!
  **Gelişim Alanı:** Set aralarındaki dinlenme süresini biraz daha kısaltabilirsiniz.
  **Öneri:** Bir sonraki antrenmanda ağırlıkları %5 artırmayı deneyin.
  
  *Not: Gerçek AI yanıtı için kotanın yenilenmesini bekleyin veya API anahtarınızı kontrol edin.*`;
};
