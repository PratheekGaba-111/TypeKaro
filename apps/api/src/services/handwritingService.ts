
import axios from "axios";
import { env } from "../config/env";

export interface HandwritingResult {
  imageUrl: string;
  generationTimeMs: number;
}

export const generateHandwriting = async (text: string): Promise<HandwritingResult> => {
  const response = await axios.post(
    `${env.handwritingServiceUrl}/generate`,
    { text },
    { timeout: 30000 }
  );

  return {
    imageUrl: response.data.imageUrl,
    generationTimeMs: response.data.generationTimeMs
  };
};

