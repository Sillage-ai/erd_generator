# 🗺️ ERD Generator

Visualisez votre schema SQL en diagramme entité-relation interactif.

## ✨ Fonctionnalités

- 📊 **Visualisation interactive** - Diagramme ERD avec zoom, pan, et minimap
- 🔗 **Détection automatique** - Clés primaires, étrangères et relations
- 🎨 **Interface moderne** - Design Sillage avec React Flow
- 📥 **Import flexible** - Copier/coller ou upload de fichiers .sql
- 💾 **Export SVG** - Téléchargez votre diagramme
- 🎯 **Support multi-DB** - PostgreSQL, MySQL, SQLite

## 🚀 Démo

[https://erd-generator.vercel.app](https://erd-generator.vercel.app)

## 🛠️ Stack Technique

- **Next.js 14** - Framework React
- **React Flow** - Bibliothèque de diagrammes interactifs
- **Tailwind CSS** - Styling
- **TypeScript** - Typage statique
- **Vercel** - Déploiement

## 📦 Installation

```bash
# Installation des dépendances
pnpm install

# Lancement en développement
pnpm dev

# Build de production
pnpm build
```

## 💡 Utilisation

1. Collez votre schema SQL dans l'éditeur
2. Ou uploadez un fichier `.sql`
3. Cliquez sur "Générer le diagramme ERD"
4. Interagissez avec le diagramme :
   - 🖱️ Glissez les tables pour réorganiser
   - 🔍 Zoomez avec la molette ou les contrôles
   - 🗺️ Utilisez la minimap pour naviguer
5. Exportez en SVG si besoin

## 📝 Exemple SQL

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT
);

CREATE TABLE posts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  content TEXT
);
```

## 🎨 Légende

- 🔑 **Rose** - Clé primaire (PK)
- 🔗 **Cyan** - Clé étrangère (FK)
- ⚠️ **Rouge (*)** - Champ NOT NULL
- ↔️ **Flèches cyan** - Relations entre tables

## 🏗️ Architecture

```
erd_generator/
├── src/
│   ├── app/
│   │   ├── api/parse/        # API de parsing SQL
│   │   ├── page.tsx           # Page principale
│   │   └── layout.tsx
│   ├── components/
│   │   └── ERDDiagram.tsx     # Composant React Flow
│   └── lib/
│       └── sql-parser.ts      # Parser SQL personnalisé
├── public/                    # Assets statiques
└── package.json
```

## 🔧 Parser SQL

Le parser personnalisé supporte :
- Syntaxe `CREATE TABLE`
- Clés primaires (inline et table-level)
- Clés étrangères (inline et `FOREIGN KEY`)
- Contraintes `NOT NULL`, `UNIQUE`, `DEFAULT`
- Schémas publics (`public.table_name`)
- Commentaires SQL (`--` et `/* */`)

## 🤝 Contribution

Fait avec ❤️ par [Sillage](https://sillage.ai)

## 📄 Licence

MIT
