
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QRCodeSVG } from "qrcode.react";
import { useToast } from "@/hooks/use-toast";
import { Copy, Loader2, Timer } from "lucide-react";
import { format } from 'date-fns';

interface QRCodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
  upiLink: string;
  month: string;
  flatNo: string;
  amount: number;
  ownerName: string;
}

const UPI_ID = "9811632886m@pnb";
const TIMER_DURATION = 120; // 120 seconds

export default function QRCodeDialog({
  isOpen,
  onClose,
  onPaymentSuccess,
  upiLink,
  month,
  flatNo,
  amount,
  ownerName,
}: QRCodeDialogProps) {
  const { toast } = useToast();
  const [transactionId, setTransactionId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);

  useEffect(() => {
    if (isOpen) {
      setTimeLeft(TIMER_DURATION);
      setTransactionId("");

      const timer = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(timer);
            onClose(); // Auto-close when timer ends
            toast({
              variant: "destructive",
              title: "Time's Up!",
              description: "The payment session has expired.",
            });
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isOpen, onClose, toast]);


  const handleCopy = () => {
    navigator.clipboard.writeText(UPI_ID);
    toast({
      title: "Copied!",
      description: "UPI ID copied to clipboard.",
    });
  };

  const handleConfirmPayment = async () => {
    if (!transactionId) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please enter the transaction number.",
      });
      return;
    }
    
    setIsSubmitting(true);
    const currentDate = new Date();
    const formattedReceiptDate = format(currentDate, 'dd/MM/yyyy');

    const paymentData = {
        flatNo: flatNo,
        monthYear: month,
        amount: amount,
        receiptDate: formattedReceiptDate,
        receiptNo: '', // Receipt number is blank for processing
        tenantName: '', // Not applicable for online payments
        modeOfPayment: 'Online', // Set mode of payment to Online
        transactionRef: transactionId,
        entryByFlatNo: flatNo,
    };

    try {
        const response = await fetch('/api/maintenance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(paymentData),
        });

        const result = await response.json();

        if (response.ok) {
            toast({
                title: "Payment Submitted",
                description: `Your payment for ${month} is processing. You will be notified once it is confirmed.`,
            });
            onPaymentSuccess();
            onClose();
        } else {
            throw new Error(result.error || "Failed to confirm payment.");
        }
    } catch (error) {
         toast({
            variant: "destructive",
            title: "Confirmation Failed",
            description: error instanceof Error ? error.message : "An unknown error occurred.",
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle>Scan to Pay</DialogTitle>
          <DialogDescription>
            Paying for <span className="font-bold">{month}</span> (Flat: {flatNo}). After paying, enter the transaction number below to confirm.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center pt-4 gap-4">
          <div className="p-4 bg-white rounded-lg border">
            <QRCodeSVG value={upiLink} size={200} />
          </div>
          <div className="text-center text-sm text-muted-foreground w-full">
            <p>Or copy the UPI ID:</p>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={UPI_ID}
                readOnly
                className="w-full p-2 border rounded-md bg-muted text-xs truncate"
              />
              <Button variant="outline" size="icon" onClick={handleCopy}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <div className="space-y-2">
            <Label htmlFor="transactionId">Transaction Number</Label>
            <Input 
                id="transactionId"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="Enter the UPI transaction number"
            />
        </div>

        <DialogFooter className="sm:justify-between items-center pt-4">
           <div className="flex items-center gap-2 text-sm text-destructive font-medium">
             <Timer className="h-4 w-4" />
             <span>Time left: {minutes}:{seconds < 10 ? `0${seconds}` : seconds}</span>
           </div>
           <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleConfirmPayment} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirm Payment'}
            </Button>
           </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
