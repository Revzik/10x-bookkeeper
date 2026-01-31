import type { AiChatComposerViewModel } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/i18n/react";

interface AiChatComposerProps {
  value: string;
  disabled: boolean;
  placeholder: string;
  composer: AiChatComposerViewModel;
  canCopyLastAnswer: boolean;
  canClear: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCopyLastAnswer: () => void;
  onClearChatClick: () => void; // opens confirm dialog in parent
}

/**
 * AiChatComposer - Multi-line question input + submit + options.
 *
 * Shared component used by both Book Ask and Series Ask tabs.
 * Features:
 * - Multi-line textarea with character counter
 * - Enter to send, Shift+Enter for newline
 * - Options dropdown (Copy last answer, Clear chat)
 * - Validation feedback
 * - Disabled state while submitting
 */
export const AiChatComposer = ({
  value,
  disabled,
  placeholder,
  composer,
  canCopyLastAnswer,
  canClear,
  onChange,
  onSubmit,
  onCopyLastAnswer,
  onClearChatClick,
}: AiChatComposerProps) => {
  const { t } = useT();
  // Handle submit (form submission)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (composer.isEmpty || composer.isTooLong || disabled) {
      return;
    }

    onSubmit();
  };

  // Handle Enter/Shift+Enter behavior
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        className="min-h-[100px] resize-y"
        aria-label={t("ai.chat.ariaInput")}
      />

      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span>{composer.charCountLabel}</span>
          <span>
            {t("ai.chat.hintEnterToSend")} • {t("ai.chat.hintShiftEnter")}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {composer.validationError && !disabled && (
            <span className={`text-xs ${composer.isTooLong ? "text-destructive" : "text-muted-foreground"}`}>
              {composer.validationError}
            </span>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={disabled}>
                {t("ai.chat.options")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={!canCopyLastAnswer || disabled} onClick={onCopyLastAnswer}>
                {t("ai.chat.copyLast")}
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!canClear || disabled} onClick={onClearChatClick}>
                {t("ai.chat.clearChat")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button type="submit" disabled={composer.isEmpty || composer.isTooLong || disabled}>
            {disabled ? t("ai.chat.sending") : t("ai.chat.send")}
          </Button>
        </div>
      </div>
    </form>
  );
};
