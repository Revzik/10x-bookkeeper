import type { BookStatus } from "@/types";

interface BookStatusBadgeProps {
  status: BookStatus;
}

/**
 * BookStatusBadge - Consistent status badge styling across the app
 *
 * Colors:
 * - Want to Read: Blue
 * - Reading: Green
 * - Completed: Gray
 */
export const BookStatusBadge = ({ status }: BookStatusBadgeProps) => {
  const statusLabels: Record<BookStatus, string> = {
    want_to_read: "Want to Read",
    reading: "Reading",
    completed: "Completed",
  };

  const statusStyles: Record<BookStatus, string> = {
    want_to_read: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    reading: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    completed: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[status]}`}>
      {statusLabels[status]}
    </span>
  );
};
