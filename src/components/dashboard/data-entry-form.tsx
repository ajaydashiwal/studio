"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

const formSchema = z.object({
  monthYear: z.string({
    required_error: "Please select a month and year.",
  }),
  amount: z.coerce.number().positive({ message: "Please enter a valid amount." }),
  receiptDate: z.date({
    required_error: "A date of receipt is required.",
  }),
  receiptNo: z.string().min(1, { message: "Receipt number is required." }),
  tenantName: z.string().optional(),
})

const generateMonthYearOptions = () => {
    const options = [];
    const currentYear = new Date().getFullYear();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (const month of monthNames) {
        options.push(`${month} ${currentYear}`);
    }
    return options;
}

export default function DataEntryForm() {
  const { toast } = useToast()
  const monthYearOptions = generateMonthYearOptions();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        receiptNo: "",
        amount: 2000,
        tenantName: "",
    }
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    const formattedValues = {
      ...values,
      receiptDate: format(values.receiptDate, "dd/MM/yyyy"),
    };
    console.log(formattedValues)
    toast({
        title: "Data Submitted",
        description: (
            <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
                <code className="text-white">{JSON.stringify(formattedValues, null, 2)}</code>
            </pre>
        ),
    });
    form.reset();
    form.setValue("amount", 2000);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField
            control={form.control}
            name="monthYear"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Month & Year</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a month" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {monthYearOptions.map(option => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                        <Input type="number" placeholder="2000" {...field} className="pl-7" />
                    </div>
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
                control={form.control}
                name="receiptDate"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Date of receipt</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            variant={"outline"}
                            className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                            )}
                            >
                            {field.value ? (
                                format(field.value, "dd/MM/yyyy")
                            ) : (
                                <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
            control={form.control}
            name="receiptNo"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Receipt No.</FormLabel>
                <FormControl>
                    <Input placeholder="Enter receipt number" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="tenantName"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Tenant Name (Optional)</FormLabel>
                <FormControl>
                    <Input placeholder="Enter tenant's name" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  )
}
