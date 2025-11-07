
"use client"

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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { format, subMonths } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from "../ui/alert"
import { Terminal } from "lucide-react"

interface DefaulterRecord {
    id: number;
    flatNo: string;
    ownerName: string;
}

const now = new Date();

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

export default function DefaulterReport() {
    const [data, setData] = useState<DefaulterRecord[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState<string>(format(now, 'yyyy-MM'));

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            setData(null);

            try {
                const response = await fetch(`/api/reports/defaulters?period=${period}`);
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || "Failed to fetch defaulters report");
                }
                const result: DefaulterRecord[] = await response.json();
                setData(result);
            } catch (err) {
                setError(err instanceof Error ? err.message : "An unknown error occurred");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [period]);
    
    const renderSkeletons = () => (
        Array.from({ length: 15 }).map((_, index) => (
            <TableRow key={`skeleton-${index}`}>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-48" /></TableCell>
            </TableRow>
        ))
    );

    return (
        <Card className="shadow-md">
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                    <div>
                        <CardTitle>Monthly Defaulter Report</CardTitle>
                        <CardDescription>Flats with unpaid maintenance for the selected month.</CardDescription>
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
                    <div className="relative w-full overflow-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-secondary z-10">
                                <TableRow>
                                    <TableHead className="min-w-[120px]">Flat No</TableHead>
                                    <TableHead className="min-w-[200px]">Owner Name</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    renderSkeletons()
                                ) : error ? (
                                    <TableRow>
                                        <TableCell colSpan={2}>
                                            <Alert variant="destructive">
                                                <Terminal className="h-4 w-4" />
                                                <AlertTitle>Error</AlertTitle>
                                                <AlertDescription>{error}</AlertDescription>
                                            </Alert>
                                        </TableCell>
                                    </TableRow>
                                ) : !data || data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center h-24 text-muted-foreground">
                                            No defaulters found for the selected month. All payments cleared.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.map(record => (
                                        <TableRow key={record.id}>
                                            <TableCell className="font-medium">{record.flatNo}</TableCell>
                                            <TableCell>{record.ownerName}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}
