import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useT } from "@/i18n/react";

interface ClearChatConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

/**
 * ClearChatConfirmDialog - Destructive confirmation for clearing transcript.
 *
 * Shared component used by both Book Ask and Series Ask tabs.
 * Features:
 * - Standard confirmation dialog pattern
 * - Destructive action styling
 * - Clear messaging about irreversibility
 */
export const ClearChatConfirmDialog = ({ open, onOpenChange, onConfirm }: ClearChatConfirmDialogProps) => {
  const { t } = useT();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("ai.dialog.clearTitle")}</DialogTitle>
          <DialogDescription>{t("ai.dialog.clearDescription")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("ai.dialog.cancel")}
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {t("ai.chat.clearChat")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
