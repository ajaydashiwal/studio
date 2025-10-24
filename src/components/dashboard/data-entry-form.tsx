
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
import { useState, useEffect, useCallback } from "react"
import debounce from "lodash.debounce";

const formSchema = z.object({
  flatNo: z.coerce.number().positive({ message: "Flat number is required." }),
  monthYear: z.string({
    required_error: "Please select a month and year.",
  }),
  amount: z.coerce.number().positive({ message: "Please enter a valid amount." }),
  receiptDate: z.date({
    required_error: "A date of receipt is required.",
  }),
  receiptNo: z.string().min(1, { message: "Receipt number is required." }),
  tenantName: z.string().optional(),
  modeOfPayment: z.enum(["Cash", "Transfer"], {
    required_error: "Please select a mode of payment.",
  }),
  transactionRef: z.string().optional(),
}).refine(data => {
    if (data.modeOfPayment === 'Transfer') {
        return !!data.transactionRef && data.transactionRef.length > 0;
    }
    return true;
}, {
    message: "Transaction reference is required for transfers.",
    path: ["transactionRef"],
});


const generateMonthYearOptions = () => {
    const options = [];
    const currentYear = new Date().getFullYear();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    for (let i = -1; i < 4; i++) {
        const year = currentYear + i;
        for (const month of monthNames) {
            options.push(`${month} ${year}`);
        }
    }
    return options;
}

export default function DataEntryForm() {
  const { toast } = useToast()
  const monthYearOptions = generateMonthYearOptions();
  
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [isMember, setIsMember] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        flatNo: "" as any,
        receiptNo: "",
        amount: 300,
        tenantName: "",
        transactionRef: "",
    }
  })

  const watchedModeOfPayment = form.watch("modeOfPayment");
  const watchedFlatNo = form.watch("flatNo");
  const watchedMonthYear = form.watch("monthYear");

  const checkRecord = useCallback(debounce(async (flatNo, monthYear) => {
    if (!flatNo || !monthYear) {
      setIsDuplicate(false);
      setIsMember(false);
      return;
    }
    
    try {
      const response = await fetch(`/api/maintenance/${flatNo}/${encodeURIComponent(monthYear)}`);
      if (response.ok) {
        const { isDuplicate, isMember } = await response.json();
        setIsDuplicate(isDuplicate);
        setIsMember(isMember);
        if (isDuplicate) {
          toast({
            variant: "destructive",
            title: "Duplicate Record",
            description: `A maintenance record for this flat and month already exists.`,
          });
        }
      } else {
         // Reset on error to allow submission attempt
         setIsDuplicate(false);
         setIsMember(false);
      }
    } catch (error) {
      console.error("Failed to check record:", error);
      setIsDuplicate(false);
      setIsMember(false);
    }
  }, 500), []);


  useEffect(() => {
    checkRecord(watchedFlatNo, watchedMonthYear);
  }, [watchedFlatNo, watchedMonthYear, checkRecord]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (isDuplicate) {
        toast({
            variant: "destructive",
            title: "Submission Blocked",
            description: "Cannot submit a duplicate record.",
        });
        return;
    }
    
    const formattedValues = {
      ...values,
      receiptDate: format(values.receiptDate, "dd/MM/yyyy"),
    };
    
    try {
        const response = await fetch('/api/maintenance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formattedValues),
        });

        if (response.ok) {
            toast({
                title: "Data Submitted",
                description: "Maintenance record added successfully.",
            });
            form.reset();
            form.setValue("amount", 300);
            setIsDuplicate(false);
            setIsMember(false);
        } else {
            const { error } = await response.json();
            toast({
                variant: "destructive",
                title: "Submission Failed",
                description: error || "Could not save the record.",
            });
        }
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not connect to the server.",
        });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField
              control={form.control}
              name="flatNo"
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>Flat Number</FormLabel>
                  <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Enter flat number" 
                        {...field}
                       />
                  </FormControl>
                  <FormMessage />
                  </FormItem>
              )}
            />
            <FormField
            control={form.control}
            name="monthYear"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Month & Year</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
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
                        <Input type="number" placeholder="300" {...field} className="pl-7" readOnly />
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
                    <FormItem className="flex flex-col pt-2">
                    <FormLabel>Date of receipt</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            variant={"outline"}
                            className={cn(
                                "w-full justify-start pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                            )}
                            >
                             <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                                format(field.value, "dd/MM/yyyy")
                            ) : (
                                <span>Pick a date</span>
                            )}
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
                name="modeOfPayment"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Mode of Payment</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select payment mode" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="Transfer">Transfer</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
            {watchedModeOfPayment === 'Transfer' && (
                <FormField
                    control={form.control}
                    name="transactionRef"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Transaction Ref.</FormLabel>
                        <FormControl>
                            <Input placeholder="Enter transaction reference" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            )}
            {!isMember && (
              <FormField
                control={form.control}
                name="tenantName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Tenant Name</FormLabel>
                    <FormControl>
                        <Input placeholder="Enter tenant's name" {...field} />
                    </FormControl>
                    <FormDescription>
                        This field is for non-members only.
                    </FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
              />
            )}
        </div>
        <Button type="submit" disabled={isDuplicate}>Submit</Button>
      </form>
    </Form>
  )
}
