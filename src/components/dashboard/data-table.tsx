
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
                <TableCell className="sticky left-0 bg-background z-10"><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell className="text-center"><Skeleton className="h-6 w-14 rounded-full" /></TableCell>
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
            <div className="rounded-md border">
              <ScrollArea className="h-96 w-full">
                  <Table className="min-w-full">
                      <TableHeader className="sticky top-0 bg-secondary z-10">
                      <TableRow>
                          <TableHead className="sticky left-0 bg-secondary z-20 min-w-[150px]">Month</TableHead>
                          <TableHead className="min-w-[120px]">Receipt No</TableHead>
                          <TableHead className="min-w-[120px]">Receipt Date</TableHead>
                          <TableHead className="text-right min-w-[100px]">Amount</TableHead>
                          <TableHead className="text-center min-w-[100px]">Status</TableHead>
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
                              </TableRow>
                          ))
                      )}
                      </TableBody>
                  </Table>
              </ScrollArea>
            </div>
        </CardContent>
      </Card>
    )
}
