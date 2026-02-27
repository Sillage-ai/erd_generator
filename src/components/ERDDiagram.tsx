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
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { Schema, Table } from "@/lib/sql-parser";
import { Key, Link } from "lucide-react";

interface ERDDiagramProps {
  schema: Schema;
}

// Custom node for table
function TableNode({ data }: { data: Table }) {
  return (
    <div className="bg-white rounded-xl shadow-lg border-2 border-sillage-dark/10 min-w-[200px] overflow-hidden">
      {/* Table header */}
      <div className="bg-sillage-dark text-white px-4 py-3 font-semibold text-sm">
        {data.name}
      </div>
      
      {/* Columns */}
      <div className="divide-y divide-sillage-dark/5">
        {data.columns.map((col) => (
          <div
            key={col.name}
            className="px-4 py-2 flex items-center gap-2 text-sm hover:bg-sillage-lavender/10 transition-colors"
          >
            {col.isPrimaryKey && (
              <Key size={12} className="text-sillage-pink flex-shrink-0" />
            )}
            {col.isForeignKey && !col.isPrimaryKey && (
              <Link size={12} className="text-sillage-cyan flex-shrink-0" />
            )}
            {!col.isPrimaryKey && !col.isForeignKey && (
              <span className="w-3 flex-shrink-0" />
            )}
            <span className={`font-medium ${col.isPrimaryKey ? "text-sillage-pink" : col.isForeignKey ? "text-sillage-cyan" : "text-sillage-dark"}`}>
              {col.name}
            </span>
            <span className="text-sillage-gray text-xs ml-auto">
              {col.type}
            </span>
            {!col.isNullable && (
              <span className="text-red-400 text-xs">*</span>
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

export default function ERDDiagram({ schema }: ERDDiagramProps) {
  // Calculate node positions in a grid layout
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    const cols = Math.ceil(Math.sqrt(schema.tables.length));
    const nodeWidth = 250;
    const nodeHeight = 200;
    const gapX = 100;
    const gapY = 80;

    schema.tables.forEach((table, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      
      nodes.push({
        id: table.name,
        type: "tableNode",
        position: {
          x: col * (nodeWidth + gapX),
          y: row * (nodeHeight + gapY),
        },
        data: table,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });
    });

    // Create edges from relations
    schema.relations.forEach((relation, index) => {
      edges.push({
        id: `e${index}`,
        source: relation.from.table,
        target: relation.to.table,
        sourceHandle: relation.from.column,
        targetHandle: relation.to.column,
        type: "smoothstep",
        animated: true,
        style: { stroke: "#97eaea", strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#97eaea",
        },
        label: `${relation.from.column} → ${relation.to.column}`,
        labelStyle: { fontSize: 10, fill: "#807f7a" },
        labelBgStyle: { fill: "#fff", fillOpacity: 0.9 },
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
    <div className="w-full h-[600px] bg-white rounded-2xl border border-sillage-dark/10 overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={onInit}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
      >
        <Background color="#e2c7fc" gap={20} size={1} />
        <Controls className="bg-white rounded-lg shadow-md" />
        <MiniMap 
          nodeColor={() => "#fca5f1"}
          maskColor="rgba(27, 21, 33, 0.1)"
          className="rounded-lg"
        />
      </ReactFlow>
    </div>
  );
}
