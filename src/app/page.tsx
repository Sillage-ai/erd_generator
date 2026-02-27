"use client";

import { useState, useCallback } from "react";
import {
  Database,
  Upload,
  Loader2,
  ArrowUpRight,
  Download,
  RefreshCw,
  Table2,
  Link,
  Image as ImageIcon,
  FileCode,
  X,
} from "lucide-react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Schema } from "@/lib/sql-parser";

// Import ERDDiagram dynamically to avoid SSR issues with ReactFlow
const ERDDiagram = dynamic(() => import("@/components/ERDDiagram"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[700px] bg-white rounded-2xl border border-sillage-dark/10 flex items-center justify-center">
      <Loader2 className="animate-spin text-sillage-gray" size={32} />
    </div>
  ),
});

type InputMode = "sql" | "image";

export default function Home() {
  const [inputMode, setInputMode] = useState<InputMode>("sql");
  const [sql, setSql] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [schema, setSchema] = useState<Schema | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSQLFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSql(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleImageDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleGenerateFromSQL = async () => {
    if (!sql.trim()) {
      setError("Veuillez fournir un schema SQL");
      return;
    }

    setLoading(true);
    setError("");
    setSchema(null);

    try {
      const response = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors du parsing");
      }

      setSchema(data.schema);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFromImage = async () => {
    if (!imagePreview) {
      setError("Veuillez uploader une image");
      return;
    }

    setLoading(true);
    setError("");
    setSchema(null);
    setSql("");

    try {
      // Step 1: Analyze image and get SQL
      const analyzeResponse = await fetch("/api/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imagePreview }),
      });

      const analyzeData = await analyzeResponse.json();

      if (!analyzeResponse.ok) {
        throw new Error(analyzeData.error || "Erreur lors de l'analyse");
      }

      const generatedSQL = analyzeData.sql;
      setSql(generatedSQL);

      // Step 2: Parse the generated SQL
      const parseResponse = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: generatedSQL }),
      });

      const parseData = await parseResponse.json();

      if (!parseResponse.ok) {
        throw new Error(parseData.error || "Erreur lors du parsing");
      }

      setSchema(parseData.schema);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = () => {
    if (inputMode === "sql") {
      handleGenerateFromSQL();
    } else {
      handleGenerateFromImage();
    }
  };

  const handleDownloadSVG = () => {
    const svg = document.querySelector(".react-flow__viewport");
    if (!svg) return;

    const svgClone = svg.cloneNode(true) as SVGElement;
    const svgData = new XMLSerializer().serializeToString(svgClone);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "erd-diagram.svg";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSQL = () => {
    if (!sql) return;
    const blob = new Blob([sql], { type: "text/sql" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "schema.sql";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exampleSQL = `-- Exemple de schema e-commerce
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  stock INTEGER DEFAULT 0,
  category_id UUID REFERENCES categories(id)
);

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES categories(id)
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'pending',
  total DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL
);`;

  const canGenerate = inputMode === "sql" ? sql.trim() : !!imagePreview;

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-16">
            <div className="flex items-center gap-3">
              <div className="w-[100px] h-[100px] flex items-center justify-center">
                <Image
                  src="/logo-sillage.png"
                  alt="Sillage"
                  width={100}
                  height={100}
                  className="object-contain"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://tool-box-sillage.vercel.app/"
                className="flex items-center gap-2 px-4 py-2 text-sillage-gray hover:text-sillage-dark transition-colors text-sm font-medium"
              >
                Tous les outils
              </a>
              <a
                href="https://www.sillage.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-sm"
              >
                Sillage.ai
                <ArrowUpRight size={16} />
              </a>
            </div>
          </div>

          <div className="text-center max-w-4xl mx-auto">
            <div className="flex justify-center mb-8">
              <div className="w-24 h-24 rounded-3xl bg-white shadow-lg flex items-center justify-center border border-sillage-dark/5">
                <Database size={40} className="text-sillage-dark" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-sillage-dark mb-6">
              ERD <span className="gradient-text">Generator</span>
            </h1>
            <p className="text-lg text-sillage-gray max-w-2xl mx-auto mb-8">
              Visualisez votre schema SQL ou uploadez une mind map pour générer
              automatiquement le diagramme et le code SQL.
            </p>
            <span className="section-label">Visualisation de base de données</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <section className="px-6 pb-16">
        <div className="max-w-6xl mx-auto">
          {/* Input Mode Selector */}
          <div className="card mb-6">
            <div className="flex gap-2 p-1 bg-sillage-dark/5 rounded-xl mb-6">
              <button
                onClick={() => setInputMode("sql")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
                  inputMode === "sql"
                    ? "bg-white shadow-sm text-sillage-dark"
                    : "text-sillage-gray hover:text-sillage-dark"
                }`}
              >
                <FileCode size={18} />
                Code SQL
              </button>
              <button
                onClick={() => setInputMode("image")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
                  inputMode === "image"
                    ? "bg-white shadow-sm text-sillage-dark"
                    : "text-sillage-gray hover:text-sillage-dark"
                }`}
              >
                <ImageIcon size={18} />
                Image / Mind Map
              </button>
            </div>

            {/* SQL Input */}
            {inputMode === "sql" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-sillage-dark">📄 Schema SQL</h3>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSql(exampleSQL)}
                      className="text-sm text-sillage-gray hover:text-sillage-dark transition-colors"
                    >
                      Charger exemple
                    </button>
                    <label className="cursor-pointer flex items-center gap-2 text-sm text-sillage-gray hover:text-sillage-dark transition-colors">
                      <Upload size={16} />
                      Upload .sql
                      <input
                        type="file"
                        accept=".sql"
                        onChange={handleSQLFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
                <textarea
                  value={sql}
                  onChange={(e) => setSql(e.target.value)}
                  placeholder={`Collez votre schema SQL ici...

CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  ...
);`}
                  className="input-field h-64 font-mono text-sm resize-none"
                />
                <p className="text-xs text-sillage-gray mt-2">
                  Supporte PostgreSQL, MySQL, SQLite. Les clés étrangères seront détectées automatiquement.
                </p>
              </div>
            )}

            {/* Image Input */}
            {inputMode === "image" && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-sillage-dark">🖼️ Mind Map / Schéma</h3>
                  {imagePreview && (
                    <button
                      onClick={() => setImagePreview(null)}
                      className="text-sm text-red-500 hover:text-red-600 transition-colors flex items-center gap-1"
                    >
                      <X size={14} />
                      Supprimer
                    </button>
                  )}
                </div>
                
                {!imagePreview ? (
                  <div
                    onDrop={handleImageDrop}
                    onDragOver={handleDragOver}
                    className="border-2 border-dashed border-sillage-dark/20 rounded-xl p-12 text-center cursor-pointer hover:border-sillage-pink/50 transition-all"
                  >
                    <label className="cursor-pointer">
                      <ImageIcon size={48} className="mx-auto mb-4 text-sillage-gray" />
                      <p className="text-sillage-dark font-medium mb-2">
                        Glissez-déposez votre image ici
                      </p>
                      <p className="text-sm text-sillage-gray mb-4">
                        ou cliquez pour sélectionner (PNG, JPG, WEBP)
                      </p>
                      <span className="inline-block px-4 py-2 bg-sillage-lavender/30 text-sillage-dark rounded-full text-sm font-medium">
                        Choisir une image
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="relative rounded-xl overflow-hidden border border-sillage-dark/10">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full max-h-[400px] object-contain bg-sillage-dark/5"
                    />
                  </div>
                )}
                
                <p className="text-xs text-sillage-gray mt-2">
                  L'IA analysera votre image (mind map, diagramme, schéma) et générera le SQL correspondant.
                </p>
              </div>
            )}
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!canGenerate || loading}
            className="btn-primary w-full justify-center text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed mb-6"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                {inputMode === "image" ? "Analyse de l'image en cours..." : "Analyse en cours..."}
              </>
            ) : (
              <>
                <Database size={20} />
                {inputMode === "image" ? "Analyser et générer le ERD" : "Générer le diagramme ERD"}
              </>
            )}
          </button>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
              {error}
            </div>
          )}

          {/* Result */}
          {schema && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="flex gap-4">
                <div className="card flex-1 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-sillage-pink/20 flex items-center justify-center">
                    <Table2 size={24} className="text-sillage-pink" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-sillage-dark">
                      {schema.tables.length}
                    </p>
                    <p className="text-sm text-sillage-gray">Tables</p>
                  </div>
                </div>
                <div className="card flex-1 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-sillage-cyan/20 flex items-center justify-center">
                    <Link size={24} className="text-sillage-cyan" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-sillage-dark">
                      {schema.relations.length}
                    </p>
                    <p className="text-sm text-sillage-gray">Relations</p>
                  </div>
                </div>
              </div>

              {/* Generated SQL (shown when generated from image) */}
              {inputMode === "image" && sql && (
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-sillage-dark">📝 Code SQL généré</h3>
                    <button
                      onClick={handleDownloadSQL}
                      className="btn-secondary text-sm"
                    >
                      <Download size={16} />
                      Télécharger .sql
                    </button>
                  </div>
                  <div className="bg-sillage-dark rounded-xl p-4 overflow-auto max-h-[300px]">
                    <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap">
                      {sql}
                    </pre>
                  </div>
                </div>
              )}

              {/* Diagram Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-sillage-dark">
                  Diagramme ERD
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSchema(null);
                      handleGenerate();
                    }}
                    className="btn-secondary text-sm"
                  >
                    <RefreshCw size={16} />
                    Régénérer
                  </button>
                  <button onClick={handleDownloadSVG} className="btn-primary text-sm">
                    <Download size={16} />
                    Export SVG
                  </button>
                </div>
              </div>

              {/* ERD Diagram */}
              <ERDDiagram schema={schema} />

              {/* Legend */}
              <div className="card">
                <h3 className="font-semibold text-sillage-dark mb-4">Légende</h3>
                <div className="flex flex-wrap gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-sillage-pink" />
                    <span className="text-sillage-gray">Clé primaire (PK)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-sillage-cyan" />
                    <span className="text-sillage-gray">Clé étrangère (FK)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-red-400 font-bold">*</span>
                    <span className="text-sillage-gray">NOT NULL</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-0.5 bg-sillage-cyan" />
                    <span className="text-sillage-gray">Relation</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 border-t border-sillage-dark/10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <div className="w-[100px] h-[100px] flex items-center justify-center">
                <Image
                  src="/logo-sillage.png"
                  alt="Sillage"
                  width={100}
                  height={100}
                  className="object-contain"
                />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-sillage-gray text-sm">© 2025 Sillage</span>
              <a
                href="https://www.sillage.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-sm"
              >
                Visiter sillage.ai
                <ArrowUpRight size={14} />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
