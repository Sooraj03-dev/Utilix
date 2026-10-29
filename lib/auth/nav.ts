// Utilix — role-aware navigation paths
// Owner: A

import type { UserRole } from "../types/enums";

/** Home page path per role; C's Navbar uses the same mapping. */
export function homePathForRole(role: UserRole): string {
  switch (role) {
    case "coordinator":
      return "/dashboard/coordinator";
    case "admin":
      return "/dashboard/admin";
    case "student":
    default:
      return "/dashboard";
  }
}

