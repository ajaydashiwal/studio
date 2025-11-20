
"use client"

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

interface ProcessingPayment {
    id: string;
    flatNo: string;
    receiptDate: string;
    monthYear: string;
    amount: number;
    transactionRef: string;
    modeOfPayment: string;
}

interface ProcessingPaymentsFormProps {
    entryByFlatNo: string;
}

export default function ProcessingPaymentsForm({ entryByFlatNo }: ProcessingPaymentsFormProps) {
    const { toast } = useToast();
    const [payments, setPayments] = useState<ProcessingPayment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [submittingId, setSubmittingId] = useState<string | null>(null);
    const [receiptNumbers, setReceiptNumbers] = useState<{ [key: string]: string }>({});

    const fetchPayments = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/maintenance/processing');
            if (response.ok) {
                const data = await response.json();
                setPayments(data);
            } else {
                toast({ variant: "destructive", title: "Error", description: "Failed to fetch pending payments." });
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Could not connect to the server." });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    const handleReceiptNoChange = (paymentId: string, value: string) => {
        setReceiptNumbers(prev => ({ ...prev, [paymentId]: value }));
    };

    const handleConfirm = async (payment: ProcessingPayment) => {
        const receiptNo = receiptNumbers[payment.id];
        if (!receiptNo) {
            toast({ variant: "destructive", title: "Missing Field", description: "Please enter a receipt number." });
            return;
        }

        setSubmittingId(payment.id);
        try {
            const response = await fetch(`/api/maintenance/confirm-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    receiptNo: receiptNo, 
                    entryByFlatNo,
                    flatNo: payment.flatNo,
                    transactionRef: payment.transactionRef,
                 }),
            });

            const result = await response.json();

            if (response.ok) {
                toast({ title: "Success", description: result.message });
                fetchPayments(); // Refresh the list
                setReceiptNumbers(prev => {
                    const newReceipts = { ...prev };
                    delete newReceipts[payment.id];
                    return newReceipts;
                });
            } else {
                toast({ variant: "destructive", title: "Error", description: result.error });
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred." });
        } finally {
            setSubmittingId(null);
        }
    };

    return (
        <Card className="shadow-md">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Confirm Online Payments</CardTitle>
                        <CardDescription>
                          Finalize payments that were made online and are awaiting confirmation.
                        </CardDescription>
                    </div>
                    <Button variant="outline" size="icon" onClick={fetchPayments} disabled={isLoading}>
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center items-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : payments.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No payments are currently pending confirmation.</p>
                ) : (
                    <div className="border rounded-lg overflow-hidden">
                        <div className="relative w-full overflow-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Flat</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mode</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction Ref</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt No.</th>
                                        <th scope="col" className="relative px-4 py-3">
                                            <span className="sr-only">Confirm</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {payments.map((p) => (
                                        <tr key={p.id}>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm">{p.receiptDate}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">{p.flatNo}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm">{p.monthYear}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{p.modeOfPayment}</span></td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm">₹{p.amount}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 truncate max-w-xs">{p.transactionRef}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <Input
                                                    value={receiptNumbers[p.id] || ''}
                                                    onChange={(e) => handleReceiptNoChange(p.id, e.target.value)}
                                                    placeholder="Enter receipt #"
                                                    className="max-w-xs"
                                                />
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleConfirm(p)}
                                                    disabled={submittingId === p.id}
                                                >
                                                    {submittingId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
