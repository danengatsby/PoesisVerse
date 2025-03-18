import { Request, Response } from "express";
import { storage } from "./storage";

export async function massAddPoemsHandler(req: Request, res: Response) {
  try {
    const { poems, metadata } = req.body;

    if (!Array.isArray(poems) || poems.length === 0) {
      return res.status(400).json({
        message: "Date invalide. Trebuie să furnizați un array de poeme.",
      });
    }

    if (!metadata || typeof metadata !== "object") {
      return res.status(400).json({
        message: "Date invalide. Trebuie să furnizați metadatele comune.",
      });
    }

    const requiredFields = ["title", "author", "imageUrl"];
    for (const field of requiredFields) {
      if (!metadata[field]) {
        return res.status(400).json({
          message: `Câmpul ${field} este obligatoriu în metadate.`,
        });
      }
    }

    const successfulPoems: number[] = [];
    const failedPoems: { index: number; error: string }[] = [];

    // Adăugăm fiecare poem în baza de date
    for (let i = 0; i < poems.length; i++) {
      const poemContent = poems[i];
      
      if (!poemContent || typeof poemContent !== "string" || poemContent.trim() === "") {
        failedPoems.push({
          index: i,
          error: "Conținutul poemului este gol sau invalid.",
        });
        continue;
      }
      
      try {
        const poem = await storage.createPoem({
          title: metadata.title,
          author: metadata.author,
          content: poemContent,
          description: metadata.description || null,
          category: metadata.category || null,
          year: metadata.year || null,
          isPremium: metadata.isPremium || false,
          imageUrl: metadata.imageUrl,
          audioUrl: metadata.audioUrl || null,
          id: 0, // Va fi ignorat la inserare
          createdAt: new Date(),
        });
        
        successfulPoems.push(poem.id);
      } catch (error) {
        console.error(`Eroare la adăugarea poemului ${i}:`, error);
        failedPoems.push({
          index: i,
          error: error instanceof Error ? error.message : "Eroare necunoscută",
        });
      }
    }

    return res.status(200).json({
      message: `Adăugare în masă finalizată: ${successfulPoems.length} poeme adăugate, ${failedPoems.length} eșuate.`,
      successCount: successfulPoems.length,
      failedCount: failedPoems.length,
      successfulPoemIds: successfulPoems,
      failedPoems: failedPoems,
    });
  } catch (error) {
    console.error("Eroare la adăugarea în masă a poemelor:", error);
    return res.status(500).json({
      message: "A apărut o eroare la adăugarea poemelor.",
      error: error instanceof Error ? error.message : "Eroare necunoscută",
    });
  }
}