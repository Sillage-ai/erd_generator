"use client";

import { useCallback, useMemo } from "react";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { Schema, Table, Column } from "@/lib/sql-parser";
import { Key, Link } from "lucide-react";

interface ERDDiagramProps {
  schema: Schema;
}

// Custom node for table with handles on each column
function TableNode({ data }: { data: Table & { columnHandles: Map<string, number> } }) {
  return (
    <div className="bg-white rounded-xl shadow-xl border-2 border-sillage-dark/10 min-w-[260px] max-w-[300px]">
      {/* Table header */}
      <div className="bg-gradient-to-r from-sillage-dark to-sillage-dark/90 text-white px-4 py-3 font-bold text-sm rounded-t-lg">
        <span className="text-sillage-pink mr-2">◆</span>
        {data.name}
      </div>
      
      {/* Columns */}
      <div className="py-1">
        {data.columns.map((col: Column, index: number) => {
          const yOffset = 52 + index * 32 + 16; // Header + index * row height + half row
          
          return (
            <div
              key={col.name}
              className="px-4 py-1.5 flex items-center gap-2 text-sm relative group"
            >
              {/* Left handle for PK (target) */}
              {col.isPrimaryKey && (
                <Handle
                  type="target"
                  position={Position.Left}
                  id={`${col.name}-target`}
                  className="!w-2.5 !h-2.5 !bg-sillage-pink !border-2 !border-white !-left-1"
                />
              )}
              
              {/* Right handle for FK (source) */}
              {col.isForeignKey && (
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`${col.name}-source`}
                  className="!w-2.5 !h-2.5 !bg-sillage-cyan !border-2 !border-white !-right-1"
                />
              )}

              {/* Icon */}
              <div className="w-4 flex-shrink-0">
                {col.isPrimaryKey ? (
                  <Key size={12} className="text-sillage-pink" />
                ) : col.isForeignKey ? (
                  <Link size={12} className="text-sillage-cyan" />
                ) : null}
              </div>
              
              {/* Column name */}
              <span className={`flex-1 truncate ${
                col.isPrimaryKey 
                  ? "text-sillage-pink font-semibold" 
                  : col.isForeignKey 
                    ? "text-sillage-cyan font-medium" 
                    : "text-sillage-dark"
              }`}>
                {col.name}
              </span>
              
              {/* Type badge */}
              <span className="text-[10px] text-sillage-gray font-mono bg-sillage-dark/5 px-1.5 py-0.5 rounded">
                {col.type}
              </span>
              
              {!col.isNullable && (
                <span className="text-red-400 text-[10px] font-bold">*</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const nodeTypes = {
  tableNode: TableNode,
};

// Improved layout - place tables in a way that minimizes edge crossings
function calculateLayout(tables: Table[], relations: Schema["relations"]) {
  const positions: Map<string, { x: number; y: number }> = new Map();
  
  // Build graph
  const outgoing: Map<string, string[]> = new Map();
  const incoming: Map<string, string[]> = new Map();
  tables.forEach(t => {
    outgoing.set(t.name, []);
    incoming.set(t.name, []);
  });
  
  relations.forEach(rel => {
    outgoing.get(rel.from.table)?.push(rel.to.table);
    incoming.get(rel.to.table)?.push(rel.from.table);
  });
  
  // Find root tables (no incoming relations or most outgoing)
  const roots = tables.filter(t => (incoming.get(t.name)?.length || 0) === 0);
  const nonRoots = tables.filter(t => (incoming.get(t.name)?.length || 0) > 0);
  
  // Sort non-roots by number of connections
  nonRoots.sort((a, b) => {
    const aTotal = (outgoing.get(a.name)?.length || 0) + (incoming.get(a.name)?.length || 0);
    const bTotal = (outgoing.get(b.name)?.length || 0) + (incoming.get(b.name)?.length || 0);
    return bTotal - aTotal;
  });
  
  const orderedTables = [...roots, ...nonRoots];
  
  // Layout parameters - more space!
  const nodeWidth = 320;
  const baseNodeHeight = 80;
  const rowHeight = 32;
  const gapX = 200; // More horizontal gap
  const gapY = 150; // More vertical gap
  
  const getTableHeight = (table: Table) => baseNodeHeight + table.columns.length * rowHeight;
  
  // Place in grid with more space
  const maxCols = Math.max(2, Math.min(3, Math.ceil(Math.sqrt(tables.length))));
  let col = 0;
  let row = 0;
  let maxHeightInRow = 0;
  let currentY = 0;
  
  orderedTables.forEach((table) => {
    const tableHeight = getTableHeight(table);
    
    if (col >= maxCols) {
      col = 0;
      row++;
      currentY += maxHeightInRow + gapY;
      maxHeightInRow = 0;
    }
    
    // Offset odd rows for better edge routing
    const xOffset = row % 2 === 1 ? nodeWidth / 2 : 0;
    
    positions.set(table.name, { 
      x: col * (nodeWidth + gapX) + xOffset, 
      y: currentY 
    });
    
    maxHeightInRow = Math.max(maxHeightInRow, tableHeight);
    col++;
  });
  
  return positions;
}

export default function ERDDiagram({ schema }: ERDDiagramProps) {
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    const positions = calculateLayout(schema.tables, schema.relations);

    // Create nodes
    schema.tables.forEach((table) => {
      const pos = positions.get(table.name) || { x: 0, y: 0 };
      
      // Calculate handle positions for each column
      const columnHandles = new Map<string, number>();
      table.columns.forEach((col, idx) => {
        columnHandles.set(col.name, 52 + idx * 32 + 16);
      });
      
      nodes.push({
        id: table.name,
        type: "tableNode",
        position: pos,
        data: { ...table, columnHandles },
      });
    });

    // Create edges - simpler, cleaner style
    schema.relations.forEach((relation, index) => {
      // Alternate colors for different relations
      const colors = ["#97eaea", "#fca5f1", "#a78bfa", "#6ee7b7", "#f9a8d4"];
      const color = colors[index % colors.length];
      
      edges.push({
        id: `edge-${index}`,
        source: relation.from.table,
        target: relation.to.table,
        sourceHandle: `${relation.from.column}-source`,
        targetHandle: `${relation.to.column}-target`,
        type: "smoothstep",
        style: { 
          stroke: color, 
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: color,
          width: 16,
          height: 16,
        },
        // No labels - cleaner look
        pathOptions: {
          offset: index * 10, // Offset paths to reduce overlap
        },
      });
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [schema]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onInit = useCallback(() => {}, []);

  return (
    <div className="w-full h-[700px] bg-gradient-to-br from-slate-50 to-sillage-lavender/20 rounded-2xl border border-sillage-dark/10 overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={onInit}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.4 }}
        minZoom={0.2}
        maxZoom={1.5}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        proOptions={{ hideAttribution: true }}
      >
        <Background 
          color="#e2c7fc" 
          gap={30} 
          size={1}
          style={{ opacity: 0.3 }}
        />
        <Controls 
          className="bg-white rounded-xl shadow-lg border border-sillage-dark/10 !bottom-4 !left-4"
          showInteractive={false}
        />
        <MiniMap 
          nodeColor={() => "#fca5f1"}
          maskColor="rgba(27, 21, 33, 0.05)"
          className="rounded-xl border border-sillage-dark/10 !bottom-4 !right-4"
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
}
