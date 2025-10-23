
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
  
interface SummaryTableProps {
    users: User[];
}

const calculateDues = () => {
    // This is a mock calculation. In a real app, this data would come from a backend.
    const paidMonths = Math.floor(Math.random() * 25); // 0 to 24
    const dueMonths = 24 - paidMonths;
    const maintenanceFee = 2000;
    return {
        totalPaid: paidMonths * maintenanceFee,
        totalDue: dueMonths * maintenanceFee,
    }
}
  
export default function SummaryTable({ users }: SummaryTableProps) {
    const summaryData = users.map(user => ({
        ...user,
        ...calculateDues()
    }));

    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Residents' Maintenance Summary</CardTitle>
          <CardDescription>Overview of maintenance payments for all residents.</CardDescription>
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
