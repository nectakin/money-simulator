import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { InferenceClient } from "@huggingface/inference";
import { rateLimit } from "express-rate-limit";

dotenv.config();

const hf = new InferenceClient(process.env.HF_TOKEN);
const generationLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  limit: 2,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "Ліміт генерацій вичерпано. Спробуйте пізніше."
  }
});

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const hf = new InferenceClient(process.env.HF_TOKEN);

function normalizePrompt(prompt = "") {
  return prompt.trim().replace(/\s+/g, " ");
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/generate-image", generationLimiter, async (req, res) => {
  try {
    const userPrompt = normalizePrompt(req.body?.prompt || "");

    if (!userPrompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const prompt = `${userPrompt}, realistic product photo, clean background, studio lighting, ecommerce style`;

    const imageBlob = await hf.textToImage({
      provider: "fal-ai",
      model: "black-forest-labs/FLUX.1-schnell",
      inputs: prompt,
      parameters: {
        num_inference_steps: 4
      }
    });

    const arrayBuffer = await imageBlob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    return res.json({
      imageBase64: `data:image/png;base64,${base64}`
    });
  } catch (error) {
    console.error("HF image generation error:", error);
    return res.status(500).json({
      error: error?.message || "Image generation failed"
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});