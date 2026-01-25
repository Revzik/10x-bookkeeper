import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clear chat?</DialogTitle>
          <DialogDescription>This will clear the current chat transcript. This cannot be undone.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Clear chat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
