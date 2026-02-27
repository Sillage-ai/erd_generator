export interface Column {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isNullable: boolean;
  references?: {
    table: string;
    column: string;
  };
}

export interface Table {
  name: string;
  columns: Column[];
}

export interface Relation {
  from: { table: string; column: string };
  to: { table: string; column: string };
  type: "one-to-one" | "one-to-many" | "many-to-many";
}

export interface Schema {
  tables: Table[];
  relations: Relation[];
}

export function parseSQL(sql: string): Schema {
  const tables: Table[] = [];
  const relations: Relation[] = [];

  // Normalize SQL
  const normalizedSQL = sql
    .replace(/--.*$/gm, "") // Remove comments
    .replace(/\/\*[\s\S]*?\*\//g, "") // Remove block comments
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();

  // Find all CREATE TABLE statements
  const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?["']?(\w+)["']?\s*\(([\s\S]*?)\)(?:\s*;|\s*$)/gi;

  let match;
  while ((match = tableRegex.exec(normalizedSQL)) !== null) {
    const tableName = match[1];
    const columnsBlock = match[2];

    const columns: Column[] = [];
    const columnDefs = splitColumnDefinitions(columnsBlock);

    for (const colDef of columnDefs) {
      const trimmed = colDef.trim();
      
      // Skip constraints that aren't column definitions
      if (/^(PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|CHECK|CONSTRAINT)/i.test(trimmed)) {
        // Parse table-level FOREIGN KEY constraint
        const fkMatch = trimmed.match(/FOREIGN\s+KEY\s*\(["']?(\w+)["']?\)\s*REFERENCES\s+(?:public\.)?["']?(\w+)["']?\s*\(["']?(\w+)["']?\)/i);
        if (fkMatch) {
          const localColumn = fkMatch[1];
          const refTable = fkMatch[2];
          const refColumn = fkMatch[3];
          
          // Update column with FK info
          const col = columns.find(c => c.name === localColumn);
          if (col) {
            col.isForeignKey = true;
            col.references = { table: refTable, column: refColumn };
          }
          
          relations.push({
            from: { table: tableName, column: localColumn },
            to: { table: refTable, column: refColumn },
            type: "one-to-many",
          });
        }
        continue;
      }

      const column = parseColumnDefinition(trimmed, tableName);
      if (column) {
        columns.push(column);
        
        // Add relation if FK
        if (column.isForeignKey && column.references) {
          relations.push({
            from: { table: tableName, column: column.name },
            to: { table: column.references.table, column: column.references.column },
            type: "one-to-many",
          });
        }
      }
    }

    tables.push({ name: tableName, columns });
  }

  return { tables, relations };
}

function splitColumnDefinitions(block: string): string[] {
  const result: string[] = [];
  let current = "";
  let parenDepth = 0;

  for (const char of block) {
    if (char === "(") parenDepth++;
    else if (char === ")") parenDepth--;
    else if (char === "," && parenDepth === 0) {
      result.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  if (current.trim()) {
    result.push(current.trim());
  }

  return result;
}

function parseColumnDefinition(def: string, _tableName: string): Column | null {
  // Match column name and type
  const colMatch = def.match(/^["']?(\w+)["']?\s+(\w+(?:\s*\([^)]*\))?)/i);
  if (!colMatch) return null;

  const name = colMatch[1];
  const type = colMatch[2].toUpperCase();
  const upperDef = def.toUpperCase();

  const isPrimaryKey = upperDef.includes("PRIMARY KEY");
  const isNullable = !upperDef.includes("NOT NULL") && !isPrimaryKey;

  // Check for inline REFERENCES
  const refMatch = def.match(/REFERENCES\s+(?:public\.)?["']?(\w+)["']?\s*\(["']?(\w+)["']?\)/i);
  const isForeignKey = !!refMatch;
  const references = refMatch ? { table: refMatch[1], column: refMatch[2] } : undefined;

  return {
    name,
    type,
    isPrimaryKey,
    isForeignKey,
    isNullable,
    references,
  };
}
