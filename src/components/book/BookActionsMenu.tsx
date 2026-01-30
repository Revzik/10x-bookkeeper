import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/i18n/react";

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
  const { t } = useT();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          {t("book.actions.menu")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>{t("book.actions.edit")}</DropdownMenuItem>
        <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
          {t("book.actions.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
