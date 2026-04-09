import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs/promises";
import path from "path";

const app = express();
const PORT = 3000;

app.use(express.json());

const DATA_FILE = path.join(process.cwd(), "pixels.json");

// Initialize data file if it doesn't exist
async function initData() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    const initialData = [
      {
        id: "1",
        x: 40,
        y: 40,
        w: 20,
        h: 10,
        imageUrl: "https://picsum.photos/seed/turkey/200/100",
        linkUrl: "https://example.com",
        title: "Türkiye'nin ilk pikselleri!",
      },
    ];
    await fs.writeFile(DATA_FILE, JSON.stringify(initialData, null, 2));
  }
}

initData();

// API Routes
app.get("/api/pixels", async (req, res) => {
  try {
    const data = await fs.readFile(DATA_FILE, "utf-8");
    res.json(JSON.parse(data));
  } catch (e) {
    res.status(500).json({ error: "Failed to read data" });
  }
});

app.post("/api/pixels", async (req, res) => {
  try {
    const newPixel = req.body;
    const data = await fs.readFile(DATA_FILE, "utf-8");
    const pixels = JSON.parse(data);
    
    // Basic validation
    if (newPixel.x < 0 || newPixel.y < 0 || newPixel.x + newPixel.w > 100 || newPixel.y + newPixel.h > 100) {
      return res.status(400).json({ error: "Sınırların dışında" });
    }

    // Check for overlaps
    const isOccupied = pixels.some((p: any) => 
      newPixel.x < p.x + p.w &&
      newPixel.x + newPixel.w > p.x &&
      newPixel.y < p.y + p.h &&
      newPixel.y + newPixel.h > p.y
    );

    if (isOccupied) {
      return res.status(400).json({ error: "Bu alan zaten dolu" });
    }

    newPixel.id = Date.now().toString();
    pixels.push(newPixel);
    
    await fs.writeFile(DATA_FILE, JSON.stringify(pixels, null, 2));
    res.json(newPixel);
  } catch (e) {
    res.status(500).json({ error: "Failed to save data" });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
