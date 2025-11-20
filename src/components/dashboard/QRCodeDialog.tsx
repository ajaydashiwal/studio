
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QRCode } from "qrcode.react";
import { useToast } from "@/hooks/use-toast";
import { Copy } from "lucide-react";

interface QRCodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  upiLink: string;
  month: string;
  flatNo: string;
}

export default function QRCodeDialog({ isOpen, onClose, upiLink, month, flatNo }: QRCodeDialogProps) {
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(upiLink);
    toast({
      title: "Copied!",
      description: "UPI link copied to clipboard.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-sm">
        <DialogHeader>
          <DialogTitle>Scan to Pay</DialogTitle>
          <DialogDescription>
            Use any UPI app to scan the QR code and pay for{" "}
            <span className="font-bold">{month}</span> (Flat: {flatNo}).
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-4 gap-6">
          <div className="p-4 bg-white rounded-lg border">
            <QRCode value={upiLink} size={220} />
          </div>
          <div className="text-center text-sm text-muted-foreground">
            <p>Or copy the link below:</p>
            <div className="flex items-center gap-2 mt-2">
                <input
                    type="text"
                    value={upiLink}
                    readOnly
                    className="w-full p-2 border rounded-md bg-muted text-xs truncate"
                />
                <Button variant="outline" size="icon" onClick={handleCopy}>
                    <Copy className="h-4 w-4" />
                </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
