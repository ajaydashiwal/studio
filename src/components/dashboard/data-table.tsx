
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
  
interface DataTableProps {
    flatNo: string;
    user?: Omit<User, 'membershipStatus'>;
}

declare global {
    interface Window {
        Razorpay: any;
    }
}
  
export default function DataTable({ flatNo, user }: DataTableProps) {
    const [data, setData] = useState<MonthlyData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [payingMonth, setPayingMonth] = useState<string | null>(null);
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

    const handlePayment = async (amount: number, monthYear: string) => {
        if (!user) return; // Guard clause
        setPayingMonth(monthYear);
        try {
             const response = await fetch('/api/payment/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, flatNo, monthYear })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Failed to create payment order.');
            }

            const order = await response.json();

            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: order.amount,
                currency: order.currency,
                name: "Upvan Apartments RWA",
                description: `Maintenance for ${monthYear}`,
                order_id: order.id,
                handler: async function (response: any) {
                    const verificationResponse = await fetch('/api/payment/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_signature: response.razorpay_signature,
                            flatNo: flatNo,
                            monthYear: monthYear,
                            amount: amount,
                            ownerName: user.ownerName,
                        })
                    });

                    const result = await verificationResponse.json();
                    if (verificationResponse.ok) {
                        toast({ title: "Payment Successful", description: result.message });
                        fetchData(); // Refresh data
                    } else {
                        toast({ variant: "destructive", title: "Verification Failed", description: result.error });
                    }
                },
                prefill: {
                    name: user.ownerName,
                },
                theme: {
                    color: "#3399cc"
                }
            };
            
            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response: any){
                toast({
                    variant: "destructive",
                    title: "Payment Failed",
                    description: response.error.description,
                });
            });
            rzp.open();

        } catch(error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error instanceof Error ? error.message : "An unknown error occurred",
            });
        } finally {
            setPayingMonth(null);
        }
    }
    
    const showActionColumn = user?.userType === 'Member';

    const renderSkeletons = () => (
        Array.from({ length: 12 }).map((_, index) => (
            <TableRow key={`skeleton-${index}`}>
                <TableCell className="sticky left-0 bg-background z-10"><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell className="text-center"><Skeleton className="h-6 w-14 rounded-full" /></TableCell>
                {showActionColumn && <TableCell className="text-center"><Skeleton className="h-9 w-24 rounded-md" /></TableCell>}
            </TableRow>
        ))
    );

    return (
      <Card className="shadow-md h-full flex flex-col">
        <CardHeader>
          <CardTitle>Maintenance Statement</CardTitle>
          <CardDescription>Showing payment history.</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
            <div className="rounded-md border h-96 overflow-auto">
              <Table className="min-w-full">
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
                              <Badge variant={item.status === 'Paid' ? 'default' : 'destructive'} 
                              className={item.status === 'Paid' ? 'bg-green-600' : ''}>
                                  {item.status}
                              </Badge>
                          </TableCell>
                          {showActionColumn && (
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
            </div>
        </CardContent>
      </Card>
    )
}
