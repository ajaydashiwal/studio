
import { useEffect, useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { MonthlyData, User } from "@/lib/data"
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "../ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import QRCodeDialog from "./QRCodeDialog";
  
interface DataTableProps {
    flatNo: string;
    user?: Omit<User, 'membershipStatus'>;
}

declare global {
    interface Window {
        Razorpay: any;
    }
}

const getStatusBadgeVariant = (status: 'Paid' | 'Due' | 'Processing'): "default" | "destructive" | "secondary" => {
    switch (status) {
        case 'Paid': return 'default';
        case 'Due': return 'destructive';
        case 'Processing': return 'secondary';
        default: return 'secondary';
    }
};

const getStatusBadgeClass = (status: 'Paid' | 'Due' | 'Processing') => {
     switch (status) {
        case 'Paid': return 'bg-green-600 hover:bg-green-700';
        case 'Processing': return 'bg-yellow-400 text-yellow-900 hover:bg-yellow-500';
        default: return '';
    }
}
  
export default function DataTable({ flatNo, user }: DataTableProps) {
    const [data, setData] = useState<MonthlyData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [payingMonth, setPayingMonth] = useState<string | null>(null);
    const [isQrCodeOpen, setIsQrCodeOpen] = useState(false);
    const [paymentDetails, setPaymentDetails] = useState({ 
      month: "", 
      flatNo: "", 
      upiLink: "", 
      amount: 300,
      ownerName: ""
    });
    const { toast } = useToast();

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/maintenance/${flatNo}`);
            if (!response.ok) {
                throw new Error("Failed to fetch data");
            }
            const result = await response.json();
            setData(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (flatNo) {
            fetchData();
        }
    }, [flatNo]);

    const handlePayment = (amount: number, monthYear: string) => {
        setPayingMonth(monthYear);
        const transactionNote = `Maint. for ${monthYear.replace(' ', '')}, Flat ${flatNo}`;
        const generatedUpiLink = `upi://pay?pa=9811632886m@pnb&pn=UPVAN%20APARTMENT%20RW%20ASSOCIATION&am=${amount}&tn=${encodeURIComponent(transactionNote)}`;
        
        setPaymentDetails({ 
          month: monthYear, 
          flatNo: flatNo, 
          upiLink: generatedUpiLink,
          amount: amount,
          ownerName: user?.ownerName || ""
        });
        setIsQrCodeOpen(true);
        setPayingMonth(null); // Reset loader immediately as we are just opening a dialog
    };
    
    const showActionColumn = user?.userType !== 'Agent';

    const renderSkeletons = () => (
        Array.from({ length: 12 }).map((_, index) => (
            <TableRow key={`skeleton-${index}`}>
                <TableCell className="sticky left-0 bg-background z-10"><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell className="text-center"><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                {showActionColumn && <TableCell className="text-center"><Skeleton className="h-9 w-24 rounded-md" /></TableCell>}
            </TableRow>
        ))
    );

    return (
      <>
        <Card className="shadow-md h-full flex flex-col">
          <CardHeader>
            <CardTitle>Maintenance Statement</CardTitle>
            <CardDescription>Showing payment history for last 24 months.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow overflow-y-auto">
              <Table>
                  <TableHeader className="sticky top-0 bg-secondary z-10">
                  <TableRow>
                      <TableHead className="sticky left-0 bg-secondary z-20 min-w-[150px]">Month</TableHead>
                      <TableHead className="min-w-[120px]">Receipt No</TableHead>
                      <TableHead className="min-w-[120px]">Receipt Date</TableHead>
                      <TableHead className="text-right min-w-[100px]">Amount</TableHead>
                      <TableHead className="text-center min-w-[100px]">Status</TableHead>
                      {showActionColumn && <TableHead className="text-center min-w-[120px]">Action</TableHead>}
                  </TableRow>
                  </TableHeader>
                  <TableBody>
                  {loading ? (
                      renderSkeletons()
                  ) : error ? (
                      <TableRow>
                          <TableCell colSpan={showActionColumn ? 6 : 5} className="text-center text-destructive">
                              {error}
                          </TableCell>
                      </TableRow>
                  ) : data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={showActionColumn ? 6 : 5} className="text-center text-muted-foreground">
                              No maintenance records found.
                          </TableCell>
                      </TableRow>
                  ) : (
                      data.map((item) => (
                          <TableRow key={item.id} className="text-xs md:text-sm">
                          <TableCell className="font-medium sticky left-0 bg-background z-10">{item.month}</TableCell>
                          <TableCell>{item.receiptNo}</TableCell>
                          <TableCell>{item.receiptDate}</TableCell>
                          <TableCell className="text-right">₹{item.amount}</TableCell>                        
                          <TableCell className="text-center">
                                <Badge 
                                    variant={getStatusBadgeVariant(item.status as any)} 
                                    className={getStatusBadgeClass(item.status as any)}>
                                  {item.status}
                              </Badge>
                          </TableCell>
                          {showActionColumn && user?.userType !== 'Agent' && (
                            <TableCell className="text-center">
                                {item.status === 'Due' && (
                                <Button 
                                    size="sm" 
                                    onClick={() => handlePayment(Number(item.amount), item.month)}
                                    disabled={payingMonth === item.month}
                                >
                                    {payingMonth === item.month ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Pay Now'}
                                </Button>
                                )}
                            </TableCell>
                          )}
                          </TableRow>
                      ))
                  )}
                  </TableBody>
              </Table>
          </CardContent>
        </Card>
        <QRCodeDialog 
          isOpen={isQrCodeOpen} 
          onClose={() => setIsQrCodeOpen(false)}
          onPaymentSuccess={fetchData}
          upiLink={paymentDetails.upiLink}
          month={paymentDetails.month}
          flatNo={paymentDetails.flatNo}
          amount={paymentDetails.amount}
          ownerName={paymentDetails.ownerName}
        />
      </>
    )
}
