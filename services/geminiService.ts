
import { GoogleGenAI, Type } from "@google/genai";
import { Reservation, Room, Purpose, Region, Referral } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const parseComplexSchedule = async (csvText: string): Promise<Partial<Reservation>[]> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `
    Parse this specific SST Meeting Room schedule into a JSON array of reservation objects.
    The input is a CSV-like text which contains headers like "MEETING ROOM #1" and "MEETING ROOM #2" that apply to the rows below them until the next room header.
    
    Mapping Rules:
    - "MEETING ROOM #1" -> "Room1"
    - "MEETING ROOM #2" -> "Room2"
    - Date format in CSV (e.g. 2026-01-08) -> Should be mapped to a short format like "Jan 8".
    - "Client Company" -> companyName
    - "Client Name" -> name
    - "Total number of attendees" -> attendees (integer)
    - If "Client Name" or "Client Company" is empty, skip that time slot.
    - Purpose should default to "To attend the meeting".
    - Region and Referral should be inferred if possible, or default to "Asia" and "Website".

    Input Text:
    ${csvText}
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            companyName: { type: Type.STRING },
            region: { type: Type.STRING },
            referral: { type: Type.STRING },
            attendees: { type: Type.INTEGER },
            purpose: { type: Type.STRING },
            date: { type: Type.STRING },
            room: { type: Type.STRING },
            timeSlot: { type: Type.STRING },
          },
          required: ["name", "companyName", "date", "room", "timeSlot"],
        },
      },
    },
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Gemini Parsing Error:", e);
    return [];
  }
};
