
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
import { format, subMonths, startOfMonth, differenceInMonths } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from "../ui/alert"
import { Terminal } from "lucide-react"

interface MonthData {
    month: string;
    amount: number;
}

interface ReportSection {
    type: string;
    months: MonthData[];
    total: number;
}

const generateMonthYearOptions = () => {
    const options = [];
    const now = startOfMonth(new Date());
    const startDate = new Date(2015, 9, 1); // October 2015

    const totalMonths = differenceInMonths(now, startDate);

    for (let i = 0; i <= totalMonths; i++) {
        const date = subMonths(now, i);
        options.push({ value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`, label: format(date, 'MMM yyyy') });
    }
    return options.reverse(); // Oldest to newest
};

const monthYearOptions = generateMonthYearOptions();

export default function ExpenditureReport() {
    const [data, setData] = useState<ReportSection[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState<{ from: string; to: string }>({
        from: format(subMonths(new Date(), 11), 'yyyy-MM'),
        to: format(new Date(), 'yyyy-MM'),
    });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            setData(null);
            const { from, to } = period;

            try {
                const response = await fetch(`/api/reports/expenditure?from=${from}&to=${to}`);
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || "Failed to fetch expenditure report");
                }
                const result: ReportSection[] = await response.json();
                setData(result);
            } catch (err) {
                setError(err instanceof Error ? err.message : "An unknown error occurred");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [period]);
    
    const grandTotal = data ? data.reduce((acc, section) => acc + section.total, 0) : 0;
    
    const renderSkeletons = () => (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
                <Card key={`skeleton-${index}`}>
                    <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-24 w-full" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );

    return (
        <Card className="shadow-md">
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                    <div>
                        <CardTitle>Expenditure Report</CardTitle>
                        <CardDescription>Category-wise expenditure for the selected period.</CardDescription>
                    </div>
                    <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-4 sm:items-end">
                        <div className="grid gap-2">
                            <Label htmlFor="from-period">From</Label>
                            <Select value={period.from} onValueChange={(value) => setPeriod(p => ({ ...p, from: value }))}>
                                <SelectTrigger className="w-full sm:w-[160px]" id="from-period">
                                    <SelectValue placeholder="Select Period" />
                                </SelectTrigger>
                                <SelectContent>
                                    {monthYearOptions.map(option => (
                                        <SelectItem key={`from-${option.value}`} value={option.value} disabled={option.value > period.to}>{option.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="to-period">To</Label>
                            <Select value={period.to} onValueChange={(value) => setPeriod(p => ({ ...p, to: value }))}>
                                <SelectTrigger className="w-full sm:w-[160px]" id="to-period">
                                    <SelectValue placeholder="Select Period" />
                                </SelectTrigger>
                                <SelectContent>
                                    {monthYearOptions.map(option => (
                                        <SelectItem key={`to-${option.value}`} value={option.value} disabled={option.value < period.from}>{option.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                 <ScrollArea className="h-[65vh] w-full p-1">
                    {loading ? (
                        renderSkeletons()
                    ) : error ? (
                        <Alert variant="destructive">
                            <Terminal className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    ) : !data || data.length === 0 ? (
                         <div className="flex items-center justify-center h-full text-muted-foreground">
                            No expenditure data found for the selected period.
                        </div>
                    ) : (
                        <>
                            <div className="mb-6">
                                <Card>
                                    <CardHeader className="p-4">
                                        <CardTitle className="text-xl">Grand Total</CardTitle>
                                        <CardDescription>Total expenditure for the selected period.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0">
                                        <p className="text-3xl font-bold">₹{grandTotal.toLocaleString()}</p>
                                    </CardContent>
                                </Card>
                            </div>
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {data.map(section => (
                                    <Card key={section.type}>
                                        <CardHeader>
                                            <CardTitle>{section.type}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Month</TableHead>
                                                        <TableHead className="text-right">Amount</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {section.months.map(item => (
                                                        <TableRow key={item.month}>
                                                            <TableCell>{item.month}</TableCell>
                                                            <TableCell className="text-right">
                                                                {item.amount.toLocaleString()}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                                <TableFooter>
                                                    <TableRow>
                                                        <TableCell className="font-bold">Total</TableCell>
                                                        <TableCell className="text-right font-bold">
                                                            {section.total.toLocaleString()}
                                                        </TableCell>
                                                    </TableRow>
                                                </TableFooter>
                                            </Table>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    )
}
