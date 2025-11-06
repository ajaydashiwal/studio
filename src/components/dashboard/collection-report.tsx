
"use client"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableFooter,
} from "@/components/ui/table"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { format, subMonths, addMonths, startOfMonth } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from "../ui/alert"
import { Terminal } from "lucide-react"

interface CollectionRecord {
    id: number;
    flatNo: string;
    tenantName: string;
    receiptDate: string;
    receiptNo: string;
    amount: number;
    modeOfPayment: string;
    transactionRef: string;
}

const now = startOfMonth(new Date());

const periodOptions = (() => {
    const options = [];
    const startDate = new Date(2015, 9, 1); // October 2015
    let currentDate = now;
    while (currentDate >= startDate) {
        options.push({
            value: format(currentDate, 'yyyy-MM'),
            label: format(currentDate, 'MMM yyyy')
        });
        currentDate = subMonths(currentDate, 1);
    }
    return options;
})();

export default function CollectionReport() {
    const [data, setData] = useState<CollectionRecord[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState<string>(format(now, 'yyyy-MM'));

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            setData(null);

            try {
                const response = await fetch(`/api/reports/collection?period=${period}`);
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || "Failed to fetch collection report");
                }
                const result: CollectionRecord[] = await response.json();
                setData(result);
            } catch (err) {
                setError(err instanceof Error ? err.message : "An unknown error occurred");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [period]);
    
    const grandTotal = data ? data.reduce((acc, record) => acc + record.amount, 0) : 0;
    
    const renderSkeletons = () => (
        Array.from({ length: 15 }).map((_, index) => (
            <TableRow key={`skeleton-${index}`}>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-16" /></TableCell>
            </TableRow>
        ))
    );

    return (
        <Card className="shadow-md">
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                    <div>
                        <CardTitle>Monthly Collection Report</CardTitle>
                        <CardDescription>Maintenance collection for the selected month.</CardDescription>
                    </div>
                    <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-4 sm:items-end">
                        <div className="grid gap-2">
                            <Label htmlFor="period-select">Select Month</Label>
                            <Select value={period} onValueChange={setPeriod}>
                                <SelectTrigger className="w-full sm:w-[180px]" id="period-select">
                                    <SelectValue placeholder="Select Period" />
                                </SelectTrigger>
                                <SelectContent>
                                    {periodOptions.map(option => (
                                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                 <ScrollArea className="h-[65vh] w-full p-1">
                    <Table>
                        <TableHeader className="sticky top-0 bg-secondary z-10">
                            <TableRow>
                                <TableHead>Flat No</TableHead>
                                <TableHead>Receipt Date</TableHead>
                                <TableHead>Receipt No</TableHead>
                                <TableHead>Payer Name</TableHead>
                                <TableHead>Mode</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                             {loading ? (
                                renderSkeletons()
                            ) : error ? (
                                <TableRow>
                                    <TableCell colSpan={6}>
                                        <Alert variant="destructive">
                                            <Terminal className="h-4 w-4" />
                                            <AlertTitle>Error</AlertTitle>
                                            <AlertDescription>{error}</AlertDescription>
                                        </Alert>
                                    </TableCell>
                                </TableRow>
                            ) : !data || data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                        No collection data found for the selected month.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map(record => (
                                    <TableRow key={record.id}>
                                        <TableCell className="font-medium">{record.flatNo}</TableCell>
                                        <TableCell>{record.receiptDate}</TableCell>
                                        <TableCell>{record.receiptNo}</TableCell>
                                        <TableCell>{record.tenantName}</TableCell>
                                        <TableCell>{record.modeOfPayment}</TableCell>
                                        <TableCell className="text-right">
                                            {record.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                        <TableFooter className="sticky bottom-0 bg-secondary z-10">
                            <TableRow>
                                <TableCell colSpan={5} className="font-bold text-lg">Grand Total</TableCell>
                                <TableCell className="text-right font-bold text-lg">
                                    {grandTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                                </TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}
