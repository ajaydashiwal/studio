
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
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import DataTable from "./data-table"
  
interface SummaryData {
    flatNo: string;
    ownerName: string;
    totalPaid: number;
    totalDue: number;
}

interface SummaryTableProps {
    summaryType: 'member' | 'non-member';
}
  
const generateMonthYearOptions = () => {
    const options = [];
    const now = new Date();
    // Go back 36 months for the "From" dropdown
    for (let i = 0; i < 36; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const month = date.toLocaleString('default', { month: 'short' });
        const year = date.getFullYear();
        options.push({ value: `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`, label: `${month} ${year}` });
    }
    return options;
}

const monthYearOptions = generateMonthYearOptions();
  
export default function SummaryTable({ summaryType }: SummaryTableProps) {
    const [summaryData, setSummaryData] = useState<SummaryData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState<{ from: string; to: string }>({ 
        from: monthYearOptions[11].value, // Default to 12 months ago
        to: monthYearOptions[0].value,   // Default to current month
    });
    const [selectedFlat, setSelectedFlat] = useState<{flatNo: string, ownerName: string} | null>(null);
    const [flatNoFilter, setFlatNoFilter] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            const { from, to } = period;
            
            const query = new URLSearchParams({ from, to });
            if (summaryType === 'non-member') {
                query.set('type', 'non-member');
            }

            try {
                const response = await fetch(`/api/summary?${query}`);
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || "Failed to fetch summary data");
                }
                const result = await response.json();
                setSummaryData(result);
            } catch (err) {
                setError(err instanceof Error ? err.message : "An unknown error occurred");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [period, summaryType]);

    const handleRowClick = (flat: {flatNo: string, ownerName: string}) => {
        setSelectedFlat(flat);
    };

    const filteredData = summaryData.filter(item => 
        item.flatNo.toLowerCase().includes(flatNoFilter.toLowerCase())
    );

    const renderSkeletons = () => (
        Array.from({ length: 15 }).map((_, index) => (
            <TableRow key={`skeleton-${index}`}>
                <TableCell className="sticky left-0 bg-background z-10"><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-20" /></TableCell>
            </TableRow>
        ))
    );

    const cardTitle = summaryType === 'member' ? "Member Summary" : "Non-Member Summary";
    const cardDescription = summaryType === 'member' 
        ? "Click a row to see details of maintenance payments for Member."
        : "Click a row to see details of maintenance payments for Non-Member.";

    return (
        <>
            <Card className="shadow-md">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                        <div>
                            <CardTitle>{cardTitle}</CardTitle>
                            <CardDescription>{cardDescription}</CardDescription>
                        </div>
                        <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-4 sm:items-end">
                            <div className="grid gap-2">
                                <Label htmlFor="flat-filter">Filter by Flat No.</Label>
                                <Input 
                                    id="flat-filter"
                                    placeholder="e.g., 101"
                                    value={flatNoFilter}
                                    onChange={(e) => setFlatNoFilter(e.target.value)}
                                    className="w-full sm:w-[160px]"
                                />
                            </div>
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
                                        {monthYearOptions.slice(0, 12).map(option => ( // Only show last 12 months for "To"
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
                        <ScrollArea className="h-[60vh] w-full">
                            <Table>
                                <TableHeader className="sticky top-0 bg-secondary z-10">
                                    <TableRow>
                                        <TableHead className="sticky left-0 bg-secondary z-20 min-w-[120px]">Flat No</TableHead>
                                        <TableHead className="min-w-[200px]">Owner/Tenant Name</TableHead>
                                        <TableHead className="text-right min-w-[120px]">Total Paid</TableHead>
                                        <TableHead className="text-right min-w-[120px]">Total Due</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                {loading ? (
                                    renderSkeletons()
                                ) : error ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-destructive">
                                            {error}
                                        </TableCell>
                                    </TableRow>
                                ) : filteredData.length === 0 ? (
                                    <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                                            {summaryData.length > 0 ? 'No flats match your filter.' : 'No summary data available for the selected period.'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredData.map((item) => (
                                        <TableRow 
                                            key={item.flatNo} 
                                            className="cursor-pointer" 
                                            onClick={() => handleRowClick({flatNo: item.flatNo, ownerName: item.ownerName})}
                                        >
                                            <TableCell className="font-medium sticky left-0 bg-background z-10">{item.flatNo}</TableCell>
                                            <TableCell>{item.ownerName}</TableCell>
                                            <TableCell className="text-right">₹{item.totalPaid.toLocaleString()}</TableCell>                        
                                            <TableCell className="text-right text-red-600">₹{item.totalDue.toLocaleString()}</TableCell>                        
                                        </TableRow>
                                    ))
                                )}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={!!selectedFlat} onOpenChange={(isOpen) => !isOpen && setSelectedFlat(null)}>
                <DialogContent className="max-w-4xl h-auto sm:h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>Maintenance Statement for {selectedFlat?.ownerName} (Flat: {selectedFlat?.flatNo})</DialogTitle>
                        <DialogDescription>
                            Showing payment history for the last 24 months.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4">
                        {selectedFlat && <DataTable flatNo={selectedFlat.flatNo} />}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
