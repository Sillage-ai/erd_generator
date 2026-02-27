import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `Tu es un expert en bases de données et en modélisation de données.

L'utilisateur va t'envoyer une image d'une mind map, d'un diagramme conceptuel, d'un schéma ou d'un dessin représentant des entités et leurs relations.

Ta tâche est d'analyser cette image et de générer le code SQL CREATE TABLE correspondant.

RÈGLES IMPORTANTES:
1. Identifie toutes les entités (tables) visibles dans l'image
2. Pour chaque entité, déduis les colonnes logiques basées sur le contexte
3. Ajoute toujours une colonne 'id' UUID comme clé primaire
4. Ajoute 'created_at' TIMESTAMPTZ pour les tables principales
5. Crée les clés étrangères pour les relations identifiées
6. Utilise des types PostgreSQL appropriés (UUID, TEXT, INTEGER, DECIMAL, BOOLEAN, TIMESTAMPTZ, etc.)
7. Ajoute des contraintes NOT NULL quand c'est logique

CONVENTIONS:
- Noms de tables en snake_case au pluriel (users, products, orders)
- Noms de colonnes en snake_case
- Clés étrangères: {table_singulier}_id (ex: user_id, product_id)
- Pour les relations many-to-many, crée une table de jonction

RETOURNE UNIQUEMENT le code SQL, sans explications ni markdown.`;

export async function POST(request: Request) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: "Image requise" },
        { status: 400 }
      );
    }

    // Check if it's a base64 data URL or a regular URL
    const imageContent = image.startsWith("data:") 
      ? image 
      : image;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyse cette image et génère le code SQL CREATE TABLE pour créer la base de données correspondante. Identifie les entités, leurs attributs et les relations entre elles.",
            },
            {
              type: "image_url",
              image_url: {
                url: imageContent,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: 4096,
      temperature: 0.2,
    });

    const sql = response.choices[0]?.message?.content || "";

    // Clean up the response - remove markdown code blocks if present
    const cleanSQL = sql
      .replace(/```sql\n?/gi, "")
      .replace(/```\n?/gi, "")
      .trim();

    return NextResponse.json({ sql: cleanSQL });
  } catch (error) {
    console.error("Analyze image error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'analyse de l'image" },
      { status: 500 }
    );
  }
}
