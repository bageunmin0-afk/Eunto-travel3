
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateSmartItinerary(prompt: string) {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `목적지: ${prompt}. 여행 일정을 한국어로 상세히 작성해 주세요. 
    반드시 'Day 1', 'Day 2'와 같은 일차 구분 항목(type: 'day')을 일정의 시작과 날짜가 바뀔 때마다 포함하세요.
    모든 장소 명칭과 추천 정보는 반드시 한국어여야 합니다.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          itinerary: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING, description: "장소 이름 또는 'Day 1'과 같은 일차 표시" },
                type: { type: Type.STRING, description: "'day' 또는 'location'" },
                icon: { type: Type.STRING, description: "아이콘 이름 (예: car, food, hotel, camera, plane)" },
                time: { type: Type.STRING, description: "방문 시간 (예: 10:00)" }
              },
              required: ["label", "type", "icon"]
            }
          },
          recommendations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                url: { type: Type.STRING }
              }
            }
          },
          costReport: {
            type: Type.OBJECT,
            properties: {
              total: { type: Type.STRING, description: "총 예상 금액" },
              breakdown: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING, description: "항목명 (예: 식비, 숙박비)" },
                    amount: { type: Type.STRING, description: "금액" }
                  }
                }
              }
            }
          }
        },
        required: ["itinerary", "recommendations", "costReport"]
      }
    }
  });

  try {
    const text = response.text;
    return JSON.parse(text || '{}');
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return { itinerary: [], recommendations: [], costReport: null };
  }
}
