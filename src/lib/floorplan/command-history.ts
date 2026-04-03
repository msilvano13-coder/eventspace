import { Canvas, FabricObject, util } from "fabric";
import { getObjectById } from "./canvas-helpers";

// ── Command Interface ──

export interface FloorPlanCommand {
  readonly type: string;
  readonly description: string;
  execute(canvas: Canvas): void;
  undo(canvas: Canvas): void;
}

// ── Move Command ──

export class MoveCommand implements FloorPlanCommand {
  readonly type = "move";
  readonly description: string;

  constructor(
    private objectIds: string[],
    private fromPositions: Array<{ left: number; top: number }>,
    private toPositions: Array<{ left: number; top: number }>,
  ) {
    this.description = `Move ${objectIds.length} object(s)`;
  }

  execute(canvas: Canvas): void {
    this.objectIds.forEach((id, i) => {
      const obj = getObjectById(canvas, id);
      if (!obj) return;
      const center = this.toPositions[i];
      obj.set({ left: center.left, top: center.top });
      obj.setCoords();
    });
    canvas.requestRenderAll();
  }

  undo(canvas: Canvas): void {
    this.objectIds.forEach((id, i) => {
      const obj = getObjectById(canvas, id);
      if (!obj) return;
      const center = this.fromPositions[i];
      obj.set({ left: center.left, top: center.top });
      obj.setCoords();
    });
    canvas.requestRenderAll();
  }
}

// ── Rotate Command ──

export class RotateCommand implements FloorPlanCommand {
  readonly type = "rotate";
  readonly description: string;

  constructor(
    private objectIds: string[],
    private fromAngles: number[],
    private toAngles: number[],
  ) {
    this.description = `Rotate ${objectIds.length} object(s)`;
  }

  execute(canvas: Canvas): void {
    this.objectIds.forEach((id, i) => {
      const obj = getObjectById(canvas, id);
      if (!obj) return;
      obj.rotate(this.toAngles[i]);
      obj.setCoords();
    });
    canvas.requestRenderAll();
  }

  undo(canvas: Canvas): void {
    this.objectIds.forEach((id, i) => {
      const obj = getObjectById(canvas, id);
      if (!obj) return;
      obj.rotate(this.fromAngles[i]);
      obj.setCoords();
    });
    canvas.requestRenderAll();
  }
}

// ── Add Command ──

export class AddCommand implements FloorPlanCommand {
  readonly type = "add";
  readonly description: string;
  private serializedObjects: Record<string, unknown>[] | null = null;

  constructor(
    private objectIds: string[],
    private objects: FabricObject[],
  ) {
    this.description = `Add ${objectIds.length} object(s)`;
    // Serialize immediately so we can re-add on redo after an undo removed them
    this.serializedObjects = objects.map((o) => o.toJSON());
  }

  execute(canvas: Canvas): void {
    // Redo: re-add from serialized JSON
    if (!this.serializedObjects) return;
    util.enlivenObjects(this.serializedObjects).then((objects: any[]) => {
      objects.forEach((obj: any) => canvas.add(obj));
      canvas.requestRenderAll();
    });
  }

  undo(canvas: Canvas): void {
    this.objectIds.forEach((id) => {
      const obj = getObjectById(canvas, id);
      if (obj) canvas.remove(obj);
    });
    canvas.discardActiveObject();
    canvas.requestRenderAll();
  }
}

// ── Remove Command ──

export class RemoveCommand implements FloorPlanCommand {
  readonly type = "remove";
  readonly description: string;
  private serializedObjects: Record<string, unknown>[];

  constructor(
    private objectIds: string[],
    objects: FabricObject[],
  ) {
    this.description = `Remove ${objectIds.length} object(s)`;
    this.serializedObjects = objects.map((o) => o.toJSON());
  }

  execute(canvas: Canvas): void {
    // Redo: re-remove the objects
    this.objectIds.forEach((id) => {
      const obj = getObjectById(canvas, id);
      if (obj) canvas.remove(obj);
    });
    canvas.discardActiveObject();
    canvas.requestRenderAll();
  }

  undo(canvas: Canvas): void {
    // Undo: re-add from serialized JSON
    util.enlivenObjects(this.serializedObjects).then((objects: any[]) => {
      objects.forEach((obj: any) => canvas.add(obj));
      canvas.requestRenderAll();
    });
  }
}

// ── Property Command ──

export class PropertyCommand implements FloorPlanCommand {
  readonly type = "property";
  readonly description: string;

  constructor(
    private objectId: string,
    private property: string,
    private fromValue: unknown,
    private toValue: unknown,
  ) {
    this.description = `Change ${property}`;
  }

  execute(canvas: Canvas): void {
    const obj = getObjectById(canvas, this.objectId);
    if (!obj) return;
    if (this.property === "data") {
      obj.data = this.toValue as Record<string, unknown>;
    } else {
      obj.set(this.property as keyof FabricObject, this.toValue);
    }
    obj.setCoords();
    canvas.requestRenderAll();
  }

  undo(canvas: Canvas): void {
    const obj = getObjectById(canvas, this.objectId);
    if (!obj) return;
    if (this.property === "data") {
      obj.data = this.fromValue as Record<string, unknown>;
    } else {
      obj.set(this.property as keyof FabricObject, this.fromValue);
    }
    obj.setCoords();
    canvas.requestRenderAll();
  }
}

// ── Batch Command ──

export class BatchCommand implements FloorPlanCommand {
  readonly type = "batch";
  readonly description: string;

  constructor(private commands: FloorPlanCommand[]) {
    this.description = commands.length > 0
      ? `Batch: ${commands[0].description} (+${commands.length - 1})`
      : "Batch (empty)";
  }

  execute(canvas: Canvas): void {
    this.commands.forEach((cmd) => cmd.execute(canvas));
  }

  undo(canvas: Canvas): void {
    // Undo in reverse order
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo(canvas);
    }
  }
}

// ── Command History Manager ──

export class CommandHistory {
  private undoStack: FloorPlanCommand[] = [];
  private redoStack: FloorPlanCommand[] = [];
  private maxSize: number;
  private listeners: Set<() => void> = new Set();

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  push(cmd: FloorPlanCommand): void {
    this.undoStack.push(cmd);
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.notify();
  }

  undo(canvas: Canvas): FloorPlanCommand | null {
    const cmd = this.undoStack.pop();
    if (!cmd) return null;
    cmd.undo(canvas);
    this.redoStack.push(cmd);
    this.notify();
    return cmd;
  }

  redo(canvas: Canvas): FloorPlanCommand | null {
    const cmd = this.redoStack.pop();
    if (!cmd) return null;
    cmd.execute(canvas);
    this.undoStack.push(cmd);
    this.notify();
    return cmd;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.notify();
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }
}
