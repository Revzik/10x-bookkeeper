import type { ReactNode } from "react";

interface AuthCardProps {
  children: ReactNode;
}

/**
 * AuthCard - Container card for authentication forms
 *
 * Features:
 * - Centered layout with max width
 * - Consistent padding and spacing
 * - Card styling matching app theme
 */
export const AuthCard = ({ children }: AuthCardProps) => {
  return (
    <div className="w-full max-w-md">
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 space-y-6">{children}</div>
    </div>
  );
};
