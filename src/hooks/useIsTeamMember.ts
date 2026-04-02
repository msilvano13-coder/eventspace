"use client";

import { useState, useEffect } from "react";

/**
 * Returns true if the current user is a member of any team (not an owner).
 * Team members get read-only access to assigned events.
 */
export function useIsTeamMember(): boolean {
  const [isTeamMember, setIsTeamMember] = useState(false);

  useEffect(() => {
    fetch("/api/teams")
      .then((r) => r.json())
      .then((data) => {
        if (data.memberships && data.memberships.length > 0) {
          setIsTeamMember(true);
        }
      })
      .catch(() => {});
  }, []);

  return isTeamMember;
}
