
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
import { Skeleton } from "@/components/ui/skeleton";
import { format, subMonths } from 'date-fns';

interface ReportData {
    report: { [type: string]: { [month: string]: number } };
    months: string[];
    types: string[];
}

const generateMonthYearOptions = () => {
    const options = [];
    const now = new Date();
    // Go back 36 months for the dropdowns
    for (let i = 0; i < 36; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const month = date.toLocaleString('default', { month: 'short' });
        const year = date.getFullYear();
        options.push({ value: `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`, label: `${month} ${year}` });
    }
    return options;
}

const monthYearOptions = generateMonthYearOptions();

export default function ExpenditureReport() {
    const [data, setData] = useState<ReportData | null>(null);
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
            const { from, to } = period;

            try {
                const response = await fetch(`/api/reports/expenditure?from=${from}&to=${to}`);
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || "Failed to fetch expenditure report");
                }
                const result: ReportData = await response.json();
                setData(result);
            } catch (err) {
                setError(err instanceof Error ? err.message : "An unknown error occurred");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [period]);
    
    const calculateColumnTotals = () => {
        if (!data) return {};
        const totals: { [month: string]: number } = {};
        for (const month of data.months) {
            totals[month] = 0;
            for (const type of data.types) {
                totals[month] += data.report[type]?.[month] || 0;
            }
        }
        return totals;
    };

    const calculateRowTotals = () => {
        if (!data) return {};
        const totals: { [type: string]: number } = {};
        for (const type of data.types) {
            totals[type] = Object.values(data.report[type] || {}).reduce((acc, val) => acc + val, 0);
        }
        return totals;
    };
    
    const columnTotals = calculateColumnTotals();
    const rowTotals = calculateRowTotals();
    const grandTotal = Object.values(columnTotals).reduce((acc, val) => acc + val, 0);

    const renderSkeletons = () => (
        Array.from({ length: 8 }).map((_, rowIndex) => (
            <TableRow key={`skeleton-row-${rowIndex}`}>
                <TableCell className="sticky left-0 bg-background z-10"><Skeleton className="h-4 w-32" /></TableCell>
                {Array.from({ length: 6 }).map((_, colIndex) => (
                    <TableCell key={`skeleton-cell-${colIndex}`} className="text-right"><Skeleton className="h-4 w-20" /></TableCell>
                ))}
                <TableCell className="text-right font-bold sticky right-0 bg-background z-10"><Skeleton className="h-4 w-24" /></TableCell>
            </TableRow>
        ))
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
                                        <SelectItem key={`from-${option.value}`} value={option.value}>{option.label}</SelectItem>
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
                                        <SelectItem key={`to-${option.value}`} value={option.value}>{option.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                 <div className="rounded-md border">
                    <ScrollArea className="h-[65vh] w-full">
                        <Table>
                            <TableHeader className="sticky top-0 bg-secondary z-20">
                                <TableRow>
                                    <TableHead className="sticky left-0 bg-secondary z-30 min-w-[200px]">Expenditure Type</TableHead>
                                    {data?.months.map(month => (
                                        <TableHead key={month} className="text-right min-w-[120px]">{month}</TableHead>
                                    ))}
                                    <TableHead className="text-right min-w-[120px] sticky right-0 bg-secondary z-30">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    renderSkeletons()
                                ) : error ? (
                                    <TableRow>
                                        <TableCell colSpan={(data?.months.length || 0) + 2} className="text-center text-destructive">{error}</TableCell>
                                    </TableRow>
                                ) : !data || data.types.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={(data?.months.length || 0) + 2} className="text-center text-muted-foreground">No expenditure data found for the selected period.</TableCell>
                                    </TableRow>
                                ) : (
                                    data.types.map(type => (
                                        <TableRow key={type}>
                                            <TableCell className="font-medium sticky left-0 bg-background z-10">{type}</TableCell>
                                            {data.months.map(month => (
                                                <TableCell key={`${type}-${month}`} className="text-right">
                                                    {data.report[type]?.[month]?.toLocaleString() || '-'}
                                                </TableCell>
                                            ))}
                                            <TableCell className="text-right font-bold sticky right-0 bg-background z-10">
                                                {rowTotals[type]?.toLocaleString() || '0'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                            {!loading && !error && data && data.types.length > 0 && (
                                <TableFooter className="sticky bottom-0 bg-secondary z-20">
                                    <TableRow>
                                        <TableCell className="font-bold sticky left-0 bg-secondary z-30">Monthly Total</TableCell>
                                        {data.months.map(month => (
                                            <TableCell key={`total-${month}`} className="text-right font-bold">
                                                {columnTotals[month]?.toLocaleString() || '0'}
                                            </TableCell>
                                        ))}
                                        <TableCell className="text-right font-bold text-lg sticky right-0 bg-secondary z-30">
                                            {grandTotal.toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                </TableFooter>
                            )}
                        </Table>
                    </ScrollArea>
                 </div>
            </CardContent>
        </Card>
    )
}
