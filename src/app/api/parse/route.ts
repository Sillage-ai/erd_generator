import { NextResponse } from "next/server";
import { parseSQL } from "@/lib/sql-parser";

export async function POST(request: Request) {
  try {
    const { sql } = await request.json();

    if (!sql || typeof sql !== "string") {
      return NextResponse.json(
        { error: "SQL requis" },
        { status: 400 }
      );
    }

    const schema = parseSQL(sql);

    if (schema.tables.length === 0) {
      return NextResponse.json(
        { error: "Aucune table trouvée dans le SQL" },
        { status: 400 }
      );
    }

    return NextResponse.json({ schema });
  } catch (error) {
    console.error("Parse error:", error);
    return NextResponse.json(
      { error: "Erreur lors du parsing SQL" },
      { status: 500 }
    );
  }
}
