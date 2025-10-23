
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
import type { User } from "@/lib/data"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState } from "react"
  
interface SummaryTableProps {
    users: User[];
}

const generateMonthYearOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 36; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const month = date.toLocaleString('default', { month: 'short' });
        const year = date.getFullYear();
        options.push({ value: `${year}-${date.getMonth()}`, label: `${month} ${year}` });
    }
    return options;
}

const calculateDues = (period: string | null) => {
    // This is a mock calculation. In a real app, this data would come from a backend.
    // The number of months for calculation can be adjusted based on the 'period'
    const totalMonths = period ? 36 - monthYearOptions.findIndex(opt => opt.value === period) : 24;
    const paidMonths = Math.floor(Math.random() * (totalMonths + 1));
    const dueMonths = totalMonths - paidMonths;
    const maintenanceFee = 2000;
    return {
        totalPaid: paidMonths * maintenanceFee,
        totalDue: dueMonths * maintenanceFee,
    }
}

const monthYearOptions = generateMonthYearOptions();
  
export default function SummaryTable({ users }: SummaryTableProps) {
    const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);

    const summaryData = users.map(user => ({
        ...user,
        ...calculateDues(selectedPeriod)
    }));

    return (
      <Card className="shadow-md">
        <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                <div>
                    <CardTitle>Residents' Maintenance Summary</CardTitle>
                    <CardDescription>Overview of maintenance payments for all residents.</CardDescription>
                </div>
                <div className="mt-4 sm:mt-0">
                    <Select onValueChange={(value) => setSelectedPeriod(value)}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Select Period" />
                        </SelectTrigger>
                        <SelectContent>
                            {monthYearOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            <ScrollArea className="h-[60vh] rounded-md border">
                <Table>
                    <TableHeader className="sticky top-0 bg-secondary">
                        <TableRow>
                            <TableHead className="w-[120px]">Flat No</TableHead>
                            <TableHead>Owner Name</TableHead>
                            <TableHead className="text-right">Total Paid</TableHead>
                            <TableHead className="text-right">Total Due</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                    {summaryData.map((item) => (
                        <TableRow key={item.membershipId}>
                            <TableCell className="font-medium">{item.flatNo}</TableCell>
                            <TableCell>{item.ownerName}</TableCell>
                            <TableCell className="text-right">₹{item.totalPaid.toLocaleString()}</TableCell>                        
                            <TableCell className="text-right">₹{item.totalDue.toLocaleString()}</TableCell>                        
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
            </ScrollArea>
        </CardContent>
      </Card>
    )
}

