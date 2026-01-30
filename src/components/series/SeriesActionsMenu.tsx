import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/i18n/react";

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
  const { t } = useT();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          {t("series.actions.menu")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>{t("series.actions.edit")}</DropdownMenuItem>
        <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
          {t("series.actions.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
