import { PlanType } from "./types";

// Sidebar items that require Professional plan
export const PRO_ONLY_ROUTES = new Set([
  "/planner/inquiries",
  "/planner/calendar",
  "/planner/questionnaires",
  "/planner/contracts",
  "/planner/finances",
  "/planner/reports",
  "/planner/preferred",
]);

// Max active events per plan
export const MAX_EVENTS: Record<PlanType, number> = {
  pending: 0,
  trial: 3,
  diy: 1,
  professional: 999,
  expired: 0,
};

export function isProFeature(route: string): boolean {
  return PRO_ONLY_ROUTES.has(route);
}

export function canCreateEvent(plan: PlanType, activeEventCount: number): boolean {
  return activeEventCount < MAX_EVENTS[plan];
}
