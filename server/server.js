import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { InferenceClient } from "@huggingface/inference";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;


const redis = Redis.fromEnv();

const ipRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(1, "24 h"),
  prefix: "money-simulator:ip",
});

const globalRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "24 h"),
  prefix: "money-simulator:global",
});


app.use(cors({
  origin: "https://money-simulator.kvs171005.workers.dev/"
}));
app.use(express.json({ limit: "10mb" }));

const hf = new InferenceClient(process.env.HF_TOKEN);

function normalizePrompt(prompt = "") {
  return prompt.trim().replace(/\s+/g, " ");
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/generate-image", async (req, res) => {
  try {
    const userPrompt = normalizePrompt(req.body?.prompt || "");

    if (!userPrompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const ip = req.ip || "unknown";

const ipLimit = await ipRatelimit.limit(ip);

if (!ipLimit.success) {
  return res.status(429).json({
    error: "Ви вже використали безкоштовну генерацію. Спробуйте через 24 години."
  });
}

const globalLimit = await globalRatelimit.limit("all-users");

if (!globalLimit.success) {
  // Повертаємо користувачеві його особисту спробу,
  // бо Hugging Face навіть не викликався.
  await ipRatelimit.resetUsedTokens(ip);

  return res.status(429).json({
    error: "Денний ліміт AI-генерацій для сайту вичерпано. Спробуйте завтра."
  });
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