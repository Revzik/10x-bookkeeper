import { useState, useEffect } from "react";
import { useAuthMutations } from "@/hooks/useAuthMutations";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/i18n/react";
import { withLocalePath } from "@/i18n";

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
}

/**
 * DeleteAccountDialog - Confirm and execute account deletion
 *
 * Features:
 * - Email confirmation required for destructive action
 * - Clear warning about cascade behavior (deletes all user data)
 * - Destructive styling
 * - Redirects to signup page on success
 * - Uses custom hook for consistent state management and error handling
 */
export const DeleteAccountDialog = ({ open, onOpenChange, userEmail }: DeleteAccountDialogProps) => {
  const { t, locale } = useT();
  const [emailConfirmation, setEmailConfirmation] = useState("");
  const [generalError, setGeneralError] = useState<string | null>(null);
  const { deleteAccount, isDeletingAccount } = useAuthMutations();

  const signupPath = withLocalePath(locale, "/signup");

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setEmailConfirmation("");
      setGeneralError(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    // Validate email confirmation
    if (emailConfirmation !== userEmail) {
      setGeneralError(t("dialogs.account.deleteEmailMismatch"));
      return;
    }

    const result = await deleteAccount();

    if (result.success) {
      // Redirect to signup page after successful deletion
      window.location.href = signupPath;
    } else {
      setGeneralError(result.error?.generalError || t("dialogs.account.deleteError"));
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const isEmailMatch = emailConfirmation === userEmail;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t("dialogs.account.deleteTitle")}</DialogTitle>
          <DialogDescription>{t("dialogs.account.deleteDescription")}</DialogDescription>
        </DialogHeader>

        {generalError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {generalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cascade Warning */}
          <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive space-y-2">
            <p>
              <strong>{t("dialogs.account.deleteWarningTitle")}</strong>
            </p>
            <p>{t("dialogs.account.deleteWarningBody")}</p>
          </div>

          {/* Email Confirmation Input */}
          <div className="space-y-2">
            <Label htmlFor="email-confirmation">{t("dialogs.account.deleteEmailLabel", { email: userEmail })}</Label>
            <Input
              id="email-confirmation"
              type="email"
              value={emailConfirmation}
              onChange={(e) => setEmailConfirmation(e.target.value)}
              placeholder={userEmail}
              disabled={isDeletingAccount}
              autoComplete="off"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isDeletingAccount}>
              {t("dialogs.account.cancel")}
            </Button>
            <Button type="submit" variant="destructive" disabled={isDeletingAccount || !isEmailMatch}>
              {isDeletingAccount ? t("dialogs.account.deleting") : t("dialogs.account.deleteConfirm")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
