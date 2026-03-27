import "fabric";

declare module "fabric" {
  interface FabricObject {
    data?: Record<string, any>;
  }
  interface GroupProps {
    data?: Record<string, any>;
  }
  interface RectProps {
    data?: Record<string, any>;
  }
  interface PolygonProps {
    data?: Record<string, any>;
  }
  interface CircleProps {
    data?: Record<string, any>;
  }
  interface FabricObjectProps {
    data?: Record<string, any>;
  }
}
