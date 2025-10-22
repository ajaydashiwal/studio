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
  
interface DataTableProps {
    data: MonthlyData[];
}
  
export default function DataTable({ data }: DataTableProps) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Account Statement</CardTitle>
          <CardDescription>Showing records for the last 24 months.</CardDescription>
        </CardHeader>
        <CardContent>
            <ScrollArea className="h-[60vh] rounded-md border">
                <Table>
                    <TableHeader className="sticky top-0 bg-secondary">
                    <TableRow>
                        <TableHead className="w-[150px]">Month</TableHead>
                        <TableHead className="text-right">Maintenance</TableHead>
                        <TableHead className="text-right">Water Bill</TableHead>
                        <TableHead className="text-center w-[120px]">Status</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {data.map((item) => (
                        <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.month}</TableCell>
                        <TableCell className="text-right">₹{item.maintenance}</TableCell>
                        <TableCell className="text-right">₹{item.water}</TableCell>
                        <TableCell className="text-center">
                            <Badge variant={item.status === 'Paid' ? 'default' : 'destructive'} 
                            className={item.status === 'Paid' ? 'bg-green-600' : ''}>
                                {item.status}
                            </Badge>
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
            </ScrollArea>
        </CardContent>
      </Card>
    )
}
