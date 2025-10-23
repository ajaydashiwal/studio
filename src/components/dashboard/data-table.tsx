
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
import type { MonthlyData } from "@/lib/data"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton";
  
interface DataTableProps {
    flatNo: string;
}
  
export default function DataTable({ flatNo }: DataTableProps) {
    const [data, setData] = useState<MonthlyData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
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

        if (flatNo) {
            fetchData();
        }
    }, [flatNo]);

    const renderSkeletons = () => (
        Array.from({ length: 12 }).map((_, index) => (
            <TableRow key={`skeleton-${index}`}>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell className="text-center"><Skeleton className="h-6 w-14 rounded-full" /></TableCell>
            </TableRow>
        ))
    );

    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Maintenance charges Statement</CardTitle>
          <CardDescription>Showing your payment history.</CardDescription>
        </CardHeader>
        <CardContent>
            <ScrollArea className="h-[60vh] rounded-md border">
                <Table>
                    <TableHeader className="sticky top-0 bg-secondary">
                    <TableRow>
                        <TableHead className="w-[150px]">Month</TableHead>
                        <TableHead>Receipt No</TableHead>
                        <TableHead>Receipt Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-center w-[120px]">Status</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {loading ? (
                        renderSkeletons()
                    ) : error ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center text-destructive">
                                {error}
                            </TableCell>
                        </TableRow>
                    ) : data.length === 0 ? (
                        <TableRow>
                           <TableCell colSpan={5} className="text-center text-muted-foreground">
                                No maintenance records found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map((item) => (
                            <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.month}</TableCell>
                            <TableCell>{item.receiptNo}</TableCell>
                            <TableCell>{item.receiptDate}</TableCell>
                            <TableCell className="text-right">₹{item.amount}</TableCell>                        
                            <TableCell className="text-center">
                                <Badge variant={item.status === 'Paid' ? 'default' : 'destructive'} 
                                className={item.status === 'Paid' ? 'bg-green-600' : ''}>
                                    {item.status}
                                </Badge>
                            </TableCell>
                            </TableRow>
                        ))
                    )}
                    </TableBody>
                </Table>
            </ScrollArea>
        </CardContent>
      </Card>
    )
}
