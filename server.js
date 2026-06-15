import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import * as dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const FAL_KEY = process.env.FAL_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY;
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.json({ status: "Reelo API läuft ✓" });
});

app.post("/api/generate-script", async (req, res) => {
  const { prompt, niche, language, platform } = req.body;
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `Du bist ein viraler Social-Media-Experte für ${platform}. Erstelle ein kurzes emotionales Video-Skript (max 60 Wörter) auf ${language === "de" ? "Deutsch" : "Englisch"} für die Nische: ${niche}. Thema: ${prompt}. Starker Hook in den ersten 3 Sekunden. Zum Folgen animieren. Antworte NUR mit dem Skripttext.`
        }]
      })
    });
    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message });
    res.json({ script: data.content[0].text.trim() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/generate-scenes", async (req, res) => {
  const { script, niche, language } = req.body;
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `Basierend auf diesem Video-Skript für die Nische ${niche}: "${script}" Erstelle 4 visuelle Szenen auf ${language === "de" ? "Deutsch" : "Englisch"}. Antworte NUR mit diesem JSON-Array: [{"scene":1,"text":"Untertitel","imagePrompt":"English cinematic image description, 9:16 vertical, photorealistic"},{"scene":2,"text":"...","imagePrompt":"..."},{"scene":3,"text":"...","imagePrompt":"..."},{"scene":4,"text":"...","imagePrompt":"..."}]`
        }]
      })
    });
    const data = await response.json();
    if (data.error) return res.status(400).json({ error: data.error.message });
    const raw = data.content[0].text.trim();
    const match = raw.match(/\[\s*\{[\s\S]*?\}\s*\]/);
    if (!match) return res.status(400).json({ error: "Keine Szenen generiert" });
    res.json({ scenes: JSON.parse(match[0]) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/generate-image", async (req, res) => {
  const { prompt } = req.body;
  try {
    const response = await fetch("https://fal.run/fal-ai/flux/schnell", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Key ${FAL_KEY}`,
      },
      body: JSON.stringify({
        prompt: prompt + ", vertical portrait 9:16, cinematic, photorealistic, high quality",
        image_size: "portrait_9_16",
        num_images: 1,
        num_inference_steps: 4,
      })
    });
    const data = await response.json();
    const url = data?.images?.[0]?.url || data?.image?.url || data?.url || data?.output?.url;
    if (!url) {
      const text = JSON.stringify(data);
      const match = text.match(/https?:\/\/[^\s"]+\.(png|jpg|jpeg|webp)/i);
      if (match) return res.json({ url: match[0] });
      return res.status(400).json({ error: "Kein Bild-URL gefunden", data });
    }
    res.json({ url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => console.log(`Reelo Server läuft auf Port ${PORT}`));
