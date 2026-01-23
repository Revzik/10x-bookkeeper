import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SeriesActionsMenuProps {
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * SeriesActionsMenu - Accessible "More" menu for global series actions
 *
 * Features:
 * - Dropdown menu for Edit and Delete actions
 * - Better mobile UX with overflow menu
 * - Keyboard accessible
 */
export const SeriesActionsMenu = ({ onEdit, onDelete }: SeriesActionsMenuProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          Actions
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>Edit series</DropdownMenuItem>
        <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
          Delete series
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
