import { GoogleGenAI } from "@google/genai";
import { z } from "zod/v4";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const diseaseResponseSchema = z.object({
  diseaseName: z.string(),
  confidenceScore: z.number().min(0).max(100),
  severity: z.enum(["Low", "Medium", "High", "Critical"]),
  treatmentPlan: z.array(z.string()),
  preventiveMeasures: z.array(z.string()),
});

export const weatherResponseSchema = z.object({
  riskLevel: z.enum(["Low", "Moderate", "High", "Severe"]),
  vulnerabilities: z.array(z.string()),
  immediateActions: z.array(z.string()),
  recoveryPostEvent: z.array(z.string()),
});

export const marketResponseSchema = z.object({
  recommendation: z.enum(["Sell Immediately", "Hold and Store", "Partial Sell"]),
  expectedPriceTrend: z.string(),
  targetMarkets: z.array(z.string()),
  financialRiskWarning: z.string(),
});

const systemInstruction =
  "You are AgriAssist, an elite expert system combining the knowledge of a Master Agronomist, a Plant Pathologist, and an Agricultural Economist. Your sole purpose is to provide highly accurate, actionable, and strictly formatted advice to farmers to prevent crop loss and maximize financial yield. You never hallucinate treatments. You prioritize low-cost, accessible solutions for farmers. Your output must strictly adhere to the requested JSON schema.";

function schemaFor(
  shape:
    | "disease"
    | "weather"
    | "market",
) {
  if (shape === "disease") {
    return {
      type: "object",
      properties: {
        diseaseName: { type: "string" },
        confidenceScore: { type: "number", description: "0 to 100" },
        severity: { type: "string", enum: ["Low", "Medium", "High", "Critical"] },
        treatmentPlan: { type: "array", items: { type: "string" } },
        preventiveMeasures: { type: "array", items: { type: "string" } },
      },
      required: [
        "diseaseName",
        "confidenceScore",
        "severity",
        "treatmentPlan",
        "preventiveMeasures",
      ],
    };
  }
  if (shape === "weather") {
    return {
      type: "object",
      properties: {
        riskLevel: { type: "string", enum: ["Low", "Moderate", "High", "Severe"] },
        vulnerabilities: { type: "array", items: { type: "string" } },
        immediateActions: { type: "array", items: { type: "string" } },
        recoveryPostEvent: { type: "array", items: { type: "string" } },
      },
      required: [
        "riskLevel",
        "vulnerabilities",
        "immediateActions",
        "recoveryPostEvent",
      ],
    };
  }
  return {
    type: "object",
    properties: {
      recommendation: {
        type: "string",
        enum: ["Sell Immediately", "Hold and Store", "Partial Sell"],
      },
      expectedPriceTrend: { type: "string" },
      targetMarkets: { type: "array", items: { type: "string" } },
      financialRiskWarning: { type: "string" },
    },
    required: [
      "recommendation",
      "expectedPriceTrend",
      "targetMarkets",
      "financialRiskWarning",
    ],
  };
}

function parseModelJson(text: string): unknown {
  const normalized = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");
  return JSON.parse(normalized);
}

export async function generateDiseaseAdvice(
  cropType: string,
  symptomsOnset: number,
  image: { data: string; mimeType: string },
) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Analyze the provided image of a ${cropType} crop. The farmer reports symptoms started ${symptomsOnset} days ago. Identify the most likely disease/pest, assess the severity, and provide a step-by-step treatment plan.`,
          },
          { inlineData: image },
        ],
      },
    ],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: schemaFor("disease"),
      maxOutputTokens: 8192,
    },
  });
  return diseaseResponseSchema.parse(parseModelJson(response.text ?? ""));
}

export async function generateWeatherAdvice(
  cropType: string,
  growthStage: string,
  weatherEvent: string,
) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `The farmer is growing ${cropType} currently in the ${growthStage} stage. They are facing the following weather event: ${weatherEvent}. Provide an immediate action plan to protect the yield.`,
          },
        ],
      },
    ],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: schemaFor("weather"),
      maxOutputTokens: 8192,
    },
  });
  return weatherResponseSchema.parse(parseModelJson(response.text ?? ""));
}

export async function generateMarketAdvice(
  cropType: string,
  estimatedYieldKg: number,
  currentLocalPricePerKg: number,
  storageAvailability: boolean,
) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `A farmer has ${estimatedYieldKg} kg of ${cropType}. Current local price is ${currentLocalPricePerKg}. They have storage availability: ${storageAvailability}. Based on standard agricultural market cycles, advise on the best selling strategy.`,
          },
        ],
      },
    ],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: schemaFor("market"),
      maxOutputTokens: 8192,
    },
  });
  return marketResponseSchema.parse(parseModelJson(response.text ?? ""));
}