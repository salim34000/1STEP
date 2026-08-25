import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { WebSocketServer } from "ws";
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { createServer } from "http";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = createServer(app);

  const wss = new WebSocketServer({ server: httpServer, path: '/live' });

  // Make sure we have the API key
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  wss.on("connection", async (clientWs) => {
    try {
      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "Tu es un coach en productivité expert et un décomposeur d'objectifs (voix française masculine). Ton rôle est d'aider l'utilisateur à décomposer ses grands objectifs en petites étapes réalisables et concrètes. Tu es encourageant, clair, structuré et tu vas droit au but. Pose des questions pour affiner la compréhension de l'objectif si nécessaire.",
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            const audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audio) {
              clientWs.send(JSON.stringify({ audio }));
            }
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            clientWs.send(JSON.stringify({ error: true }));
          },
          onclose: () => {
            console.log("Live API connection closed");
          }
        },
      });

      clientWs.on("message", (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.audio) {
            session.sendRealtimeInput({
              audio: { data: parsed.audio, mimeType: "audio/pcm;rate=16000" },
            });
          }
        } catch (e) {
          console.error("Error processing client message", e);
        }
      });

      clientWs.on("close", () => {
        // Handle cleanup
      });

    } catch (e) {
      console.error("Failed to connect to Live API:", e);
      clientWs.send(JSON.stringify({ error: true }));
      clientWs.close();
    }
  });

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/develop-idea", async (req, res) => {
    try {
      const { title, notes } = req.body;
      const prompt = `Agis comme un expert en productivité. 
J'ai une idée de projet : "${title}".
Notes additionnelles : "${notes || 'Aucune'}".
Donne-moi 3 pistes concrètes d'exécution et 1 point de vigilance pour m'aider à démarrer.
Réponds avec le format JSON suivant:
{
  "pistes": ["piste 1", "piste 2", "piste 3"],
  "vigilance": "point de vigilance"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const text = response.text;
      res.json(JSON.parse(text));
    } catch (error) {
      console.error("Erreur Gemini API:", error);
      res.status(500).json({ error: "Failed to generate idea expansion" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
