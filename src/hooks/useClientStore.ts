"use client";

import { useState, useEffect, useCallback } from "react";
import { Event } from "@/lib/types";
import { showErrorToast, devThrow } from "@/lib/error-toast";
import {
  fetchClientEvent,
  clientUpdateGuests,
  clientUpdateMessages,
  clientUpdateQuestionnaireAssignments,
  clientUpdateContracts,
  clientUpdateFiles,
  clientUpdateMoodBoard,
  clientUpdateTimeline,
  clientUpdateSchedule,
  clientUpdateEventFields,
  clientUpdateBudget,
  clientUpdateDiscoveredVendors,
} from "@/lib/supabase/db";

export function useClientEvent(shareToken: string) {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!shareToken) return;
    try {
      const data = await fetchClientEvent(shareToken);
      setEvent(data);
    } catch (err) {
      showErrorToast("Failed to load event. Please refresh the page.");
      devThrow("useClientEvent fetch failed", err);
    } finally {
      setLoading(false);
    }
  }, [shareToken]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { event, loading, refetch };
}

export function useClientActions(shareToken: string) {
  // Generic update function that handles all sub-entity types
  const updateEvent = useCallback(
    async (currentEvent: Event, partial: Partial<Event>) => {
      const updates: Promise<void>[] = [];

      if (partial.guests !== undefined) updates.push(clientUpdateGuests(shareToken, partial.guests));
      if (partial.messages !== undefined) updates.push(clientUpdateMessages(shareToken, partial.messages));
      if (partial.questionnaires !== undefined) updates.push(clientUpdateQuestionnaireAssignments(shareToken, partial.questionnaires));
      if (partial.contracts !== undefined) updates.push(clientUpdateContracts(shareToken, partial.contracts));
      if (partial.files !== undefined) updates.push(clientUpdateFiles(shareToken, partial.files));
      if (partial.moodBoard !== undefined) updates.push(clientUpdateMoodBoard(shareToken, partial.moodBoard));
      if (partial.timeline !== undefined) updates.push(clientUpdateTimeline(shareToken, partial.timeline));
      if (partial.schedule !== undefined) updates.push(clientUpdateSchedule(shareToken, partial.schedule));
      if (partial.budget !== undefined) updates.push(clientUpdateBudget(shareToken, partial.budget));
      if (partial.discoveredVendors !== undefined) updates.push(clientUpdateDiscoveredVendors(shareToken, partial.discoveredVendors));
      if (partial.colorPalette !== undefined) updates.push(clientUpdateEventFields(shareToken, { colorPalette: partial.colorPalette }));

      try {
        await Promise.all(updates);
      } catch (err) {
        showErrorToast("Failed to save changes. Please try again.");
        devThrow("useClientActions update failed", err);
      }
    },
    [shareToken]
  );

  return { updateEvent };
}
