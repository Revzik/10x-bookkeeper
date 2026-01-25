import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BookActionsMenuProps {
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * BookActionsMenu - Accessible "More" menu for global book actions
 *
 * Features:
 * - Dropdown menu for Edit and Delete actions
 * - Better mobile UX with overflow menu
 * - Keyboard accessible
 */
export const BookActionsMenu = ({ onEdit, onDelete }: BookActionsMenuProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          Actions
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>Edit book</DropdownMenuItem>
        <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
          Delete book
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
