
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
  SelectLabel as SelectGroupLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useState, useEffect, useCallback } from "react"
import debounce from "lodash.debounce";

const formSchema = z.object({
  flatNo: z.coerce.number().positive({ message: "Flat number is required." }),
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
  // Fields for single month payment
  monthYear: z.string().optional(),
  // Field for bulk payment
  bulkPaymentType: z.enum(["historic", "future"]).optional(),
}).refine(data => {
    if (data.modeOfPayment === 'Transfer') {
        return !!data.transactionRef && data.transactionRef.length > 0;
    }
    return true;
}, {
    message: "Transaction reference is required for transfers.",
    path: ["transactionRef"],
}).refine(data => {
    // If it's a single payment, monthYear is required
    if (data.amount === 300) {
        return !!data.monthYear && data.monthYear.length > 0;
    }
    return true;
}, {
    message: "Please select a month for single payment.",
    path: ["monthYear"]
}).refine(data => {
    // If it's a bulk payment, bulkPaymentType is required
    const isBulk = data.amount > 300 && data.amount % 300 === 0;
    if (isBulk) {
        return !!data.bulkPaymentType;
    }
    return true;
}, {
    message: "Please select payment direction for bulk amount.",
    path: ["bulkPaymentType"]
}).refine(data => {
    const isBulk = data.amount > 300 && data.amount % 300 === 0;
    if (!isBulk) return true;

    const numberOfMonths = data.amount / 300;
    if (data.bulkPaymentType === 'historic' && numberOfMonths > 6) {
        return false;
    }
    if (data.bulkPaymentType === 'future' && numberOfMonths > 12) {
        return false;
    }
    return true;
}, {
    message: "Amount exceeds allowed months (max 6 for historic, 12 for future).",
    path: ["amount"],
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
  
  const [isMember, setIsMember] = useState(true); // Default to true to hide tenant name initially
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unpaidMonths, setUnpaidMonths] = useState<{ historic: string[], future: string[] }>({ historic: [], future: [] });

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
  const watchedAmount = form.watch("amount");

  const isSinglePayment = watchedAmount === 300;
  const isBulkPayment = watchedAmount > 300 && watchedAmount % 300 === 0;

  const fetchUnpaidMonths = useCallback(debounce(async (flatNo) => {
    if (!flatNo || flatNo <= 0) {
      setUnpaidMonths({ historic: [], future: [] });
      return;
    }
    try {
      const response = await fetch(`/api/maintenance/${flatNo}/unpaid`);
      if (response.ok) {
        const data = await response.json();
        setUnpaidMonths(data);
      } else {
        setUnpaidMonths({ historic: [], future: [] });
      }
    } catch (error) {
      console.error("Failed to fetch unpaid months:", error);
      setUnpaidMonths({ historic: [], future: [] });
    }
  }, 300), []);


  const checkMembership = useCallback(debounce(async (flatNo) => {
    if (!flatNo || flatNo <= 0) {
      setIsMember(true); // Reset to default
      return;
    }
    try {
      const response = await fetch(`/api/users/${flatNo}/status`);
      if (response.ok) {
        const { membershipStatus } = await response.json();
        // A member is anyone with 'Active' or 'Inactive' status. 'NotFound' means they are not a member.
        setIsMember(membershipStatus === 'Active' || membershipStatus === 'Inactive');
      } else {
        setIsMember(false); // Assume not a member if API fails or returns 404
      }
    } catch (error) {
      console.error("Failed to check membership:", error);
      setIsMember(false); // Assume not a member on network error
    }
  }, 300), []);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);

    if (isSinglePayment && values.monthYear) {
      // Pre-flight validation for single historic payments
      const validationResponse = await fetch(`/api/maintenance/${values.flatNo}/${encodeURIComponent(values.monthYear)}`);
      if (!validationResponse.ok) {
        const errorResult = await validationResponse.json();
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: errorResult.error || "This payment cannot be processed.",
        });
        setIsSubmitting(false);
        return;
      }
    }
    
    let endpoint = '/api/maintenance';
    let body = {
      ...values,
      receiptDate: format(values.receiptDate, "dd/MM/yyyy"),
    };
    
    if (isBulkPayment) {
        endpoint = '/api/maintenance/bulk';
        // The bulk endpoint only needs a subset of fields
        body = {
          flatNo: values.flatNo,
          amount: values.amount,
          receiptDate: format(values.receiptDate, "dd/MM/yyyy"),
          receiptNo: values.receiptNo,
          tenantName: values.tenantName,
          modeOfPayment: values.modeOfPayment,
          transactionRef: values.transactionRef,
          bulkPaymentType: values.bulkPaymentType,
        } as any;
    }

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const result = await response.json();

        if (response.ok) {
            toast({
                title: "Data Submitted",
                description: result.message || "Maintenance record(s) added successfully.",
            });
            form.reset();
            form.setValue("amount", 300);
            setIsMember(true);
        } else {
             toast({
                variant: "destructive",
                title: "Error",
                description: result.error || "Could not submit maintenance record(s).",
            });
        }
        
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Error",
            description: error instanceof Error ? error.message : "Could not connect to the server.",
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
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
                        onChange={(e) => {
                            field.onChange(e);
                            checkMembership(e.target.value);
                            fetchUnpaidMonths(e.target.value);
                        }}
                       />
                  </FormControl>
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
                        <Input type="number" placeholder="300" {...field} step="300" className="pl-7" />
                    </div>
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            {isSinglePayment && (
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
                             <SelectGroupLabel>--- Historic Dues ---</SelectGroupLabel>
                             {unpaidMonths.historic.length > 0 ? (
                                unpaidMonths.historic.map(month => (
                                    <SelectItem key={month} value={month}>{month}</SelectItem>
                                ))
                             ) : (
                                <SelectItem value="no-historic" disabled>No historic dues</SelectItem>
                             )}
                            <SelectGroupLabel>--- Future Payments ---</SelectGroupLabel>
                            {unpaidMonths.future.map(month => (
                                <SelectItem key={month} value={month}>{month}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
              />
            )}
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
                        This field is required for non-members.
                    </FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
              />
            )}
        </div>
         {isBulkPayment && (
                <FormField
                    control={form.control}
                    name="bulkPaymentType"
                    render={({ field }) => (
                        <FormItem className="space-y-3 bg-muted p-4 rounded-lg border">
                            <FormLabel>Bulk Payment Direction</FormLabel>
                            <FormControl>
                                <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-col space-y-1"
                                >
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                    <RadioGroupItem value="historic" />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                    Pay for previous (historic) due months
                                    </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                    <RadioGroupItem value="future" />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                    Pay for upcoming (future) advance months
                                    </FormLabel>
                                </FormItem>
                                </RadioGroup>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                 />
            )}
        <Button type="submit" disabled={isSubmitting}>
             {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit
        </Button>
      </form>
    </Form>
  )
}

    