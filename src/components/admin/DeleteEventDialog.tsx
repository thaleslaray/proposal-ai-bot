import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DeleteEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventName: string;
  onConfirm: () => void;
}

export const DeleteEventDialog = ({
  open,
  onOpenChange,
  eventName,
  onConfirm,
}: DeleteEventDialogProps) => {
  const [confirmText, setConfirmText] = useState("");
  const isValid = confirmText === "DELETAR";

  const handleConfirm = () => {
    if (isValid) {
      onConfirm();
      setConfirmText("");
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setConfirmText("");
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-[6px] border-destructive shadow-[8px_8px_0_0_rgba(239,68,68,0.3)]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl font-bebas uppercase text-destructive flex items-center gap-2">
            ⚠️ ATENÇÃO: DELETAR EVENTO
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4 text-left">
            <p className="font-semibold text-foreground">
              Tem certeza que deseja DELETAR permanentemente o evento "{eventName}"?
            </p>
            
            <div className="bg-destructive/10 p-4 rounded-lg border-2 border-destructive/20">
              <p className="font-semibold mb-2 text-foreground">Esta ação NÃO pode ser desfeita e irá remover:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>O evento</li>
                <li>Todos os participantes</li>
                <li>Todas as ações registradas</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-delete" className="font-semibold">
                Digite "DELETAR" em letras maiúsculas para confirmar:
              </Label>
              <Input
                id="confirm-delete"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETAR"
                className="border-2 focus-visible:ring-destructive"
                autoComplete="off"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isValid}
            className="bg-destructive hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🗑️ Deletar Permanentemente
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
