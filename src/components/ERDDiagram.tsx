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
  ConnectionLineType,
} from "reactflow";
import "reactflow/dist/style.css";
import { Schema, Table, Column } from "@/lib/sql-parser";
import { Key, Link } from "lucide-react";

interface ERDDiagramProps {
  schema: Schema;
}

interface TableNodeData extends Table {
  hasLeftConnections: Set<string>;
  hasRightConnections: Set<string>;
}

// Custom node for table with handles on each column
function TableNode({ data }: { data: TableNodeData }) {
  return (
    <div className="bg-white rounded-xl shadow-lg border-2 border-sillage-dark/10 min-w-[220px] overflow-hidden">
      {/* Table header */}
      <div className="bg-gradient-to-r from-sillage-dark to-sillage-dark/90 text-white px-4 py-3 font-semibold text-sm flex items-center gap-2">
        <span className="text-sillage-pink">◆</span>
        {data.name}
      </div>
      
      {/* Columns */}
      <div className="divide-y divide-sillage-dark/5">
        {data.columns.map((col: Column, index: number) => (
          <div
            key={col.name}
            className="px-4 py-2.5 flex items-center gap-2 text-sm hover:bg-sillage-lavender/10 transition-colors relative"
          >
            {/* Left handle for target connections (PK) */}
            {col.isPrimaryKey && (
              <Handle
                type="target"
                position={Position.Left}
                id={`${col.name}-left`}
                className="!w-3 !h-3 !bg-sillage-pink !border-2 !border-white"
                style={{ top: "50%" }}
              />
            )}
            
            {/* Right handle for source connections (FK) */}
            {col.isForeignKey && (
              <Handle
                type="source"
                position={Position.Right}
                id={`${col.name}-right`}
                className="!w-3 !h-3 !bg-sillage-cyan !border-2 !border-white"
                style={{ top: "50%" }}
              />
            )}

            {/* Column icon */}
            <div className="w-5 flex-shrink-0 flex justify-center">
              {col.isPrimaryKey && (
                <Key size={14} className="text-sillage-pink" />
              )}
              {col.isForeignKey && !col.isPrimaryKey && (
                <Link size={14} className="text-sillage-cyan" />
              )}
            </div>
            
            {/* Column name */}
            <span className={`font-medium flex-1 ${
              col.isPrimaryKey 
                ? "text-sillage-pink" 
                : col.isForeignKey 
                  ? "text-sillage-cyan" 
                  : "text-sillage-dark"
            }`}>
              {col.name}
            </span>
            
            {/* Column type */}
            <span className="text-sillage-gray text-xs font-mono bg-sillage-dark/5 px-2 py-0.5 rounded">
              {col.type}
            </span>
            
            {/* NOT NULL indicator */}
            {!col.isNullable && (
              <span className="text-red-400 text-xs font-bold">*</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const nodeTypes = {
  tableNode: TableNode,
};

// Smart layout algorithm - organize by relationships
function calculateLayout(tables: Table[], relations: Schema["relations"]) {
  const positions: Map<string, { x: number; y: number }> = new Map();
  const visited = new Set<string>();
  
  // Build adjacency list
  const connections: Map<string, Set<string>> = new Map();
  tables.forEach(t => connections.set(t.name, new Set()));
  
  relations.forEach(rel => {
    connections.get(rel.from.table)?.add(rel.to.table);
    connections.get(rel.to.table)?.add(rel.from.table);
  });
  
  // Find tables with most connections (central tables)
  const sortedTables = [...tables].sort((a, b) => {
    const aConns = connections.get(a.name)?.size || 0;
    const bConns = connections.get(b.name)?.size || 0;
    return bConns - aConns;
  });
  
  const nodeWidth = 280;
  const nodeHeight = 250;
  const gapX = 150;
  const gapY = 100;
  
  // Calculate estimated height for each table
  const getTableHeight = (table: Table) => 60 + table.columns.length * 36;
  
  // Place tables in layers based on relationships
  let currentX = 0;
  let currentY = 0;
  let maxHeightInRow = 0;
  let tablesInRow = 0;
  const maxTablesPerRow = Math.min(4, Math.ceil(Math.sqrt(tables.length)));
  
  sortedTables.forEach((table) => {
    if (visited.has(table.name)) return;
    
    const tableHeight = getTableHeight(table);
    
    if (tablesInRow >= maxTablesPerRow) {
      currentX = 0;
      currentY += maxHeightInRow + gapY;
      maxHeightInRow = 0;
      tablesInRow = 0;
    }
    
    positions.set(table.name, { x: currentX, y: currentY });
    visited.add(table.name);
    
    maxHeightInRow = Math.max(maxHeightInRow, tableHeight);
    currentX += nodeWidth + gapX;
    tablesInRow++;
  });
  
  return positions;
}

export default function ERDDiagram({ schema }: ERDDiagramProps) {
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    // Calculate positions
    const positions = calculateLayout(schema.tables, schema.relations);
    
    // Track connections for each table
    const leftConnections: Map<string, Set<string>> = new Map();
    const rightConnections: Map<string, Set<string>> = new Map();
    
    schema.tables.forEach(t => {
      leftConnections.set(t.name, new Set());
      rightConnections.set(t.name, new Set());
    });
    
    schema.relations.forEach(rel => {
      rightConnections.get(rel.from.table)?.add(rel.from.column);
      leftConnections.get(rel.to.table)?.add(rel.to.column);
    });

    schema.tables.forEach((table) => {
      const pos = positions.get(table.name) || { x: 0, y: 0 };
      
      nodes.push({
        id: table.name,
        type: "tableNode",
        position: pos,
        data: {
          ...table,
          hasLeftConnections: leftConnections.get(table.name) || new Set(),
          hasRightConnections: rightConnections.get(table.name) || new Set(),
        } as TableNodeData,
      });
    });

    // Create edges from relations with better styling
    const edgeColors = [
      { stroke: "#97eaea", marker: "#97eaea" }, // cyan
      { stroke: "#fca5f1", marker: "#fca5f1" }, // pink
      { stroke: "#e2c7fc", marker: "#e2c7fc" }, // lavender
      { stroke: "#a78bfa", marker: "#a78bfa" }, // purple
      { stroke: "#6ee7b7", marker: "#6ee7b7" }, // green
    ];
    
    schema.relations.forEach((relation, index) => {
      const colorSet = edgeColors[index % edgeColors.length];
      
      edges.push({
        id: `e${index}`,
        source: relation.from.table,
        target: relation.to.table,
        sourceHandle: `${relation.from.column}-right`,
        targetHandle: `${relation.to.column}-left`,
        type: "smoothstep",
        animated: false,
        style: { 
          stroke: colorSet.stroke, 
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: colorSet.marker,
          width: 20,
          height: 20,
        },
        markerStart: {
          type: MarkerType.Circle,
          color: colorSet.marker,
          width: 10,
          height: 10,
        },
        label: `${relation.from.column}`,
        labelStyle: { 
          fontSize: 11, 
          fill: "#1b1521",
          fontWeight: 500,
        },
        labelBgStyle: { 
          fill: "#fff", 
          fillOpacity: 0.95,
          stroke: colorSet.stroke,
          strokeWidth: 1,
        },
        labelBgPadding: [6, 4] as [number, number],
        labelBgBorderRadius: 4,
      });
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [schema]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onInit = useCallback(() => {
    // Fit view on init
  }, []);

  return (
    <div className="w-full h-[700px] bg-gradient-to-br from-white to-sillage-lavender/10 rounded-2xl border border-sillage-dark/10 overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={onInit}
        nodeTypes={nodeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background 
          color="#e2c7fc" 
          gap={24} 
          size={1.5}
          style={{ opacity: 0.5 }}
        />
        <Controls 
          className="bg-white rounded-xl shadow-lg border border-sillage-dark/10"
          showInteractive={false}
        />
        <MiniMap 
          nodeColor={(node) => {
            const hasRelations = schema.relations.some(
              r => r.from.table === node.id || r.to.table === node.id
            );
            return hasRelations ? "#fca5f1" : "#e2c7fc";
          }}
          maskColor="rgba(27, 21, 33, 0.08)"
          className="rounded-xl border border-sillage-dark/10"
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
}
