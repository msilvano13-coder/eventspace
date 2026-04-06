"use client";

import { useRef, useState, useCallback, Suspense, useMemo } from "react";
import { Canvas, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, ContactShadows, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { v4 as uuid } from "uuid";
import type { Tablescape, TablescapeItem, TableShape } from "@/lib/types";
import type { AssetModel } from "@/hooks/useAsset";
import { getAssetGLBPath, useModelsManifest } from "@/hooks/useAsset";
import AssetBrowser from "./AssetBrowser";
import { Package, Trash2, RotateCcw, Plus, Minus, ArrowUp, ArrowDown, Save } from "lucide-react";

// ── Constants ──

const INCHES_TO_METERS = 0.0254;

// Target real-world sizes per category (diameter/width in meters)
const CATEGORY_TARGET_SIZE: Record<string, number> = {
  "charger-set-plates": 0.33,  // ~13 inches
  "china-dishware": 0.27,      // ~10.5 inches
  "flatware": 0.22,            // ~8.5 inches laid out
  "glassware": 0.08,           // ~3 inches wide
  "linens": 0.45,              // napkin ~18 inches folded
  "serving-pieces": 0.30,      // ~12 inches
};

/** Auto-scale a loaded GLB to realistic table-item size */
function getAutoScale(scene: THREE.Object3D, category: string): number {
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim === 0) return 1;
  const target = CATEGORY_TARGET_SIZE[category] ?? 0.25;
  return target / maxDim;
}

// ── PlacedItem: renders a single GLB on the table ──

function PlacedItem({
  item,
  asset,
  selected,
  onClick,
}: {
  item: TablescapeItem;
  asset: AssetModel | undefined;
  selected: boolean;
  onClick: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);

  if (!asset) return null;

  return (
    <group
      ref={groupRef}
      position={[item.positionX, item.positionY, item.positionZ]}
      rotation={[0, item.rotationY, 0]}
      scale={item.scale}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <Suspense fallback={<ItemPlaceholder />}>
        <GLBModel asset={asset} colorOverride={item.colorOverride} />
      </Suspense>
      {selected && <SelectionIndicator />}
    </group>
  );
}

function GLBModel({ asset, colorOverride }: { asset: AssetModel; colorOverride: string | null }) {
  const { scene } = useGLTF(getAssetGLBPath(asset));
  const autoScale = useMemo(() => getAutoScale(scene, asset.category), [scene, asset.category]);
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    if (colorOverride) {
      clone.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (mat && mat.name?.startsWith("mat_primary")) {
            const newMat = mat.clone();
            newMat.color.set(colorOverride);
            mesh.material = newMat;
          }
        }
      });
    }
    return clone;
  }, [scene, colorOverride]);

  return (
    <group scale={autoScale}>
      <primitive object={clonedScene} />
    </group>
  );
}

function ItemPlaceholder() {
  return (
    <mesh>
      <boxGeometry args={[0.05, 0.05, 0.05]} />
      <meshStandardMaterial color="#94a3b8" wireframe />
    </mesh>
  );
}

function SelectionIndicator() {
  return (
    <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.12, 0.14, 32]} />
      <meshBasicMaterial color="#14b8a6" transparent opacity={0.8} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ── Table mesh ──

function TableMesh({
  shape,
  widthInches,
  depthInches,
  onPointerDown,
}: {
  shape: TableShape;
  widthInches: number;
  depthInches: number;
  onPointerDown: (e: ThreeEvent<PointerEvent>) => void;
}) {
  // Square tables use equal dimensions
  const effectiveDepth = shape === "square" ? widthInches : depthInches;
  const widthM = widthInches * INCHES_TO_METERS;
  const depthM = effectiveDepth * INCHES_TO_METERS;
  const tableHeight = 0.03; // 3cm thick tabletop
  const legHeight = 0.75; // standard table height

  return (
    <group>
      {/* Tabletop */}
      {shape === "round" ? (
        <mesh
          position={[0, legHeight + tableHeight / 2, 0]}
          onPointerDown={onPointerDown}
        >
          <cylinderGeometry args={[widthM / 2, widthM / 2, tableHeight, 48]} />
          <meshStandardMaterial color="#f5f0eb" roughness={0.4} />
        </mesh>
      ) : (
        <mesh position={[0, legHeight, 0]} onPointerDown={onPointerDown}>
          <boxGeometry args={[widthM, tableHeight, depthM]} />
          <meshStandardMaterial color="#f5f0eb" roughness={0.4} />
        </mesh>
      )}

      {/* Legs */}
      {shape === "round" ? (
        <mesh position={[0, legHeight / 2, 0]}>
          <cylinderGeometry args={[0.04, 0.05, legHeight, 12]} />
          <meshStandardMaterial color="#8B7355" roughness={0.6} metalness={0.1} />
        </mesh>
      ) : (
        <>
          {[
            [widthM / 2 - 0.05, 0, depthM / 2 - 0.05],
            [-widthM / 2 + 0.05, 0, depthM / 2 - 0.05],
            [widthM / 2 - 0.05, 0, -depthM / 2 + 0.05],
            [-widthM / 2 + 0.05, 0, -depthM / 2 + 0.05],
          ].map(([x, , z], i) => (
            <mesh key={i} position={[x, legHeight / 2, z]}>
              <boxGeometry args={[0.04, legHeight, 0.04]} />
              <meshStandardMaterial color="#8B7355" roughness={0.6} metalness={0.1} />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
}

// ── Ground plane ──

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
      <planeGeometry args={[10, 10]} />
      <meshStandardMaterial color="#c8c0b4" roughness={0.9} />
    </mesh>
  );
}

// ── Scene content (inside Canvas) ──

function SceneContent({
  tablescape,
  selectedItemId,
  selectedAsset,
  onSelectItem,
  onPlaceItem,
}: {
  tablescape: Tablescape;
  selectedItemId: string | null;
  selectedAsset: AssetModel | null;
  onSelectItem: (id: string | null) => void;
  onPlaceItem: (point: THREE.Vector3) => void;
}) {
  const { manifest } = useModelsManifest();

  const handleTableClick = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (selectedAsset) {
        // Pass the click point — Y will be overridden to table surface in placeAsset
        onPlaceItem(e.point);
      } else {
        onSelectItem(null);
      }
    },
    [selectedAsset, onPlaceItem, onSelectItem]
  );

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 3]} intensity={1.2} castShadow />
      <directionalLight position={[-2, 3, -2]} intensity={0.4} />
      <hemisphereLight args={["#f0f0ff", "#404040", 0.5]} />

      {/* Controls */}
      <OrbitControls
        makeDefault
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2.1}
        minDistance={0.5}
        maxDistance={4}
        target={[0, 0.75, 0]}
      />

      {/* Table */}
      <TableMesh
        shape={tablescape.tableShape}
        widthInches={tablescape.tableWidth}
        depthInches={tablescape.tableDepth}
        onPointerDown={handleTableClick}
      />

      {/* Placed items */}
      {tablescape.items.map((item) => (
        <PlacedItem
          key={item.id}
          item={item}
          asset={manifest?.models[item.assetId]}
          selected={selectedItemId === item.id}
          onClick={() => onSelectItem(item.id)}
        />
      ))}

      {/* Ground & shadows */}
      <Ground />
      <ContactShadows
        position={[0, 0, 0]}
        opacity={0.4}
        scale={6}
        blur={2}
        far={2}
      />
    </>
  );
}

// ── Main Editor Component ──

interface TablescapeEditorProps {
  tablescape: Tablescape;
  onUpdate: (updated: Tablescape) => void;
  readOnly: boolean;
}

export default function TablescapeEditor({ tablescape, onUpdate, readOnly }: TablescapeEditorProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<AssetModel | null>(null);
  const [showAssets, setShowAssets] = useState(true);
  const [saved, setSaved] = useState(false);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const selectedItem = tablescape.items.find((i) => i.id === selectedItemId);

  const tableHeight = 0.75 + 0.03; // leg height + tabletop thickness

  const placeAsset = useCallback(
    (assetId: string, x: number, z: number) => {
      if (readOnly) return;
      const newItem: TablescapeItem = {
        id: uuid(),
        assetId,
        positionX: x,
        positionY: tableHeight, // place on top of table surface
        positionZ: z,
        rotationY: 0,
        scale: 1,
        colorOverride: null,
      };
      onUpdate({
        ...tablescape,
        items: [...tablescape.items, newItem],
      });
      setSaved(false);
    },
    [tablescape, onUpdate, readOnly, tableHeight]
  );

  const handlePlaceItem = useCallback(
    (point: THREE.Vector3) => {
      if (!selectedAsset || readOnly) return;
      placeAsset(selectedAsset.id, point.x, point.z);
    },
    [selectedAsset, placeAsset, readOnly]
  );

  // Handle drag-and-drop from asset browser
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const data = e.dataTransfer.getData("application/tablescape-asset");
      if (!data) return;
      try {
        const { id } = JSON.parse(data);
        // Place at center of table on drop
        placeAsset(id, 0, 0);
      } catch { /* ignore */ }
    },
    [placeAsset]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDeleteItem = useCallback(() => {
    if (!selectedItemId || readOnly) return;
    onUpdate({
      ...tablescape,
      items: tablescape.items.filter((i) => i.id !== selectedItemId),
    });
    setSelectedItemId(null);
    setSaved(false);
  }, [selectedItemId, tablescape, onUpdate, readOnly]);

  const handleRotateItem = useCallback(
    (delta: number) => {
      if (!selectedItemId || readOnly) return;
      onUpdate({
        ...tablescape,
        items: tablescape.items.map((i) =>
          i.id === selectedItemId
            ? { ...i, rotationY: i.rotationY + delta }
            : i
        ),
      });
      setSaved(false);
    },
    [selectedItemId, tablescape, onUpdate, readOnly]
  );

  const handleScaleItem = useCallback(
    (delta: number) => {
      if (!selectedItemId || readOnly) return;
      onUpdate({
        ...tablescape,
        items: tablescape.items.map((i) =>
          i.id === selectedItemId
            ? { ...i, scale: Math.max(0.2, Math.min(3, i.scale + delta)) }
            : i
        ),
      });
      setSaved(false);
    },
    [selectedItemId, tablescape, onUpdate, readOnly]
  );

  const handleMoveItemY = useCallback(
    (delta: number) => {
      if (!selectedItemId || readOnly) return;
      onUpdate({
        ...tablescape,
        items: tablescape.items.map((i) =>
          i.id === selectedItemId
            ? { ...i, positionY: Math.max(0, i.positionY + delta) }
            : i
        ),
      });
      setSaved(false);
    },
    [selectedItemId, tablescape, onUpdate, readOnly]
  );

  const handleClearAll = useCallback(() => {
    if (readOnly) return;
    if (!confirm("Remove all items from this tablescape?")) return;
    onUpdate({ ...tablescape, items: [] });
    setSelectedItemId(null);
    setSaved(false);
  }, [tablescape, onUpdate, readOnly]);

  const handleSave = useCallback(() => {
    // onUpdate already pushes to store which auto-persists to DB
    // This just triggers a fresh save and shows confirmation
    onUpdate({ ...tablescape });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [tablescape, onUpdate]);

  return (
    <div className="flex-1 flex h-full">
      {/* 3D Viewport */}
      <div
        ref={canvasContainerRef}
        className="flex-1 relative"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <Canvas
          camera={{ position: [0, 1.8, 1.5], fov: 45 }}
          shadows
          gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
          style={{ position: "absolute", inset: 0 }}
        >
          <SceneContent
            tablescape={tablescape}
            selectedItemId={selectedItemId}
            selectedAsset={selectedAsset}
            onSelectItem={setSelectedItemId}
            onPlaceItem={handlePlaceItem}
          />
        </Canvas>

        {/* UI overlay — sits above the canvas */}
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
          {/* Floating toolbar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white/90 backdrop-blur-sm border border-stone-200 rounded-xl px-2 py-1.5 shadow-lg pointer-events-auto">
            {!readOnly && (
              <>
                <button
                  onClick={() => setShowAssets((s) => !s)}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    showAssets
                      ? "bg-teal-50 text-teal-600"
                      : "text-stone-400 hover:text-stone-600"
                  }`}
                >
                  <Package size={13} />
                  Assets
                </button>

                <div className="w-px h-5 bg-stone-200" />

                {selectedItemId && (
                  <>
                    <button
                      onClick={() => handleRotateItem(-Math.PI / 12)}
                      className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100"
                      title="Rotate left"
                    >
                      <RotateCcw size={14} />
                    </button>
                    <button
                      onClick={() => handleRotateItem(Math.PI / 12)}
                      className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100"
                      title="Rotate right"
                    >
                      <RotateCcw size={14} className="scale-x-[-1]" />
                    </button>

                    <div className="w-px h-5 bg-stone-200" />

                    <button
                      onClick={() => handleScaleItem(-0.1)}
                      className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100"
                      title="Scale down"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-[10px] text-stone-500 min-w-[32px] text-center">
                      {selectedItem ? `${Math.round(selectedItem.scale * 100)}%` : ""}
                    </span>
                    <button
                      onClick={() => handleScaleItem(0.1)}
                      className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100"
                      title="Scale up"
                    >
                      <Plus size={14} />
                    </button>

                    <div className="w-px h-5 bg-stone-200" />

                    {/* Move up/down (Y position) */}
                    <button
                      onClick={() => handleMoveItemY(0.02)}
                      className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100"
                      title="Move up"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <span className="text-[10px] text-stone-500 min-w-[32px] text-center">
                      {selectedItem ? `${(selectedItem.positionY * 100).toFixed(1)}cm` : ""}
                    </span>
                    <button
                      onClick={() => handleMoveItemY(-0.02)}
                      className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100"
                      title="Move down"
                    >
                      <ArrowDown size={14} />
                    </button>

                    <div className="w-px h-5 bg-stone-200" />

                    <button
                      onClick={handleDeleteItem}
                      className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                      title="Delete item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}

                <div className="w-px h-5 bg-stone-200" />

                <button
                  onClick={handleClearAll}
                  className="text-xs text-stone-400 hover:text-red-500 px-2 py-1.5"
                >
                  Clear All
                </button>

                <div className="w-px h-5 bg-stone-200" />

                {/* Manual save button */}
                <button
                  onClick={handleSave}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    saved
                      ? "bg-green-50 text-green-600"
                      : "text-stone-400 hover:text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  <Save size={13} />
                  {saved ? "Saved!" : "Save"}
                </button>
              </>
            )}
          </div>

          {/* Placement mode indicator */}
          {selectedAsset && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-teal-500 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg flex items-center gap-2 pointer-events-auto">
              Placing: {selectedAsset.name}
              <button
                onClick={() => setSelectedAsset(null)}
                className="hover:bg-teal-600 rounded-full p-0.5"
              >
                <span className="sr-only">Cancel</span>
                &times;
              </button>
            </div>
          )}

          {/* Item count */}
          <div className="absolute top-4 right-4 text-xs text-stone-400 bg-white/80 px-2 py-1 rounded-lg">
            {tablescape.items.length} items
          </div>
        </div>
      </div>

      {/* Asset browser sidebar */}
      {showAssets && !readOnly && (
        <AssetBrowser
          onSelectAsset={(asset) => {
            setSelectedAsset(asset);
            setSelectedItemId(null);
          }}
          selectedAssetId={selectedAsset?.id ?? null}
          onClose={() => setShowAssets(false)}
        />
      )}
    </div>
  );
}
