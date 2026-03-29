"use client";

import {
  ZoomIn,
  ZoomOut,
  Grid3X3,
  Undo2,
  Redo2,
  Download,
  Trash2,
  RotateCw,
  LayoutTemplate,
  Copy,
  ClipboardPaste,
  Magnet,
} from "lucide-react";

interface Props {
  snapEnabled: boolean;
  onToggleSnap: () => void;
  rotationSnap: boolean;
  onToggleRotationSnap: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onExport: () => void;
  onDeleteSelected: () => void;
  onRotateSelected: () => void;
  hasSelection: boolean;
  zoom: number;
  onRoomShape: () => void;
  onCopy: () => void;
  onPaste: () => void;
  canPaste: boolean;
}

export default function Toolbar({
  snapEnabled,
  onToggleSnap,
  rotationSnap,
  onToggleRotationSnap,
  onZoomIn,
  onZoomOut,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onExport,
  onDeleteSelected,
  onRotateSelected,
  hasSelection,
  zoom,
  onRoomShape,
  onCopy,
  onPaste,
  canPaste,
}: Props) {
  return (
    <div className="h-11 bg-white border-b border-stone-200 flex items-center px-3 gap-1 overflow-x-auto flex-nowrap">
      <ToolButton icon={Undo2} onClick={onUndo} disabled={!canUndo} tooltip="Undo" />
      <ToolButton icon={Redo2} onClick={onRedo} disabled={!canRedo} tooltip="Redo" />
      <Divider />
      <ToolButton icon={ZoomOut} onClick={onZoomOut} tooltip="Zoom Out" />
      <span className="text-xs text-stone-400 w-12 text-center shrink-0">
        {Math.round(zoom * 100)}%
      </span>
      <ToolButton icon={ZoomIn} onClick={onZoomIn} tooltip="Zoom In" />
      <Divider />
      <ToolButton
        icon={Grid3X3}
        onClick={onToggleSnap}
        active={snapEnabled}
        tooltip="Snap to Grid"
      />
      <Divider />
      <button
        onClick={onRoomShape}
        title="Change Room Shape"
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-stone-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors shrink-0 border border-stone-200 hover:border-rose-200"
      >
        <LayoutTemplate size={13} />
        <span>Room</span>
      </button>
      <Divider />
      <ToolButton
        icon={RotateCw}
        onClick={onRotateSelected}
        disabled={!hasSelection}
        tooltip={rotationSnap ? "Rotate 15°" : "Rotate 45°"}
      />
      <ToolButton
        icon={Magnet}
        onClick={onToggleRotationSnap}
        active={rotationSnap}
        tooltip={rotationSnap ? "Rotation Snap: 15°" : "Rotation Snap: Off"}
      />
      <ToolButton
        icon={Trash2}
        onClick={onDeleteSelected}
        disabled={!hasSelection}
        tooltip="Delete"
        danger
      />
      <Divider />
      <ToolButton
        icon={Copy}
        onClick={onCopy}
        disabled={!hasSelection}
        tooltip="Copy (Ctrl+C)"
      />
      <ToolButton
        icon={ClipboardPaste}
        onClick={onPaste}
        disabled={!canPaste}
        tooltip="Paste (Ctrl+V)"
      />
      <div className="flex-1" />
      <ToolButton icon={Download} onClick={onExport} tooltip="Export PNG" />
    </div>
  );
}

function ToolButton({
  icon: Icon,
  onClick,
  disabled,
  active,
  tooltip,
  danger,
}: {
  icon: any;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  tooltip: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={`p-1.5 rounded-lg transition-colors shrink-0 ${
        disabled
          ? "text-stone-300 cursor-not-allowed"
          : active
            ? "bg-rose-50 text-rose-600"
            : danger
              ? "text-stone-400 hover:text-red-500 hover:bg-red-50"
              : "text-stone-400 hover:text-stone-600 hover:bg-stone-100"
      }`}
    >
      <Icon size={16} />
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-stone-200 mx-1 shrink-0" />;
}
