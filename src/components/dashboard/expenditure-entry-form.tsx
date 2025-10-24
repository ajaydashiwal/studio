
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
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
import { Textarea } from "../ui/textarea"

const formSchema = z.object({
  paymentDate: z.date({ required_error: "A payment date is required." }),
  description: z.string().min(1, { message: "Description is required." }),
  amount: z.coerce.number().positive({ message: "Please enter a valid amount." }),
  modeOfPayment: z.enum(["Cash", "Cheque", "Transfer"], {
    required_error: "Please select a mode of payment.",
  }),
  transactionRef: z.string().optional(),
  chequeNo: z.string().optional(),
  chequeDate: z.date().optional(),
})
.refine(data => data.modeOfPayment !== 'Transfer' || (data.transactionRef && data.transactionRef.length > 0), {
    message: "Transaction reference is required for transfers.",
    path: ["transactionRef"],
})
.refine(data => data.modeOfPayment !== 'Cheque' || (data.chequeNo && data.chequeNo.length > 0), {
    message: "Cheque number is required for cheque payments.",
    path: ["chequeNo"],
})
.refine(data => data.modeOfPayment !== 'Cheque' || !!data.chequeDate, {
    message: "Cheque date is required for cheque payments.",
    path: ["chequeDate"],
});


export default function ExpenditureEntryForm() {
  const { toast } = useToast()
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        description: "",
        amount: "" as any,
        transactionRef: "",
        chequeNo: "",
    }
  })

  const watchedModeOfPayment = form.watch("modeOfPayment");

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const formattedValues = {
      ...values,
      paymentDate: format(values.paymentDate, "dd/MM/yyyy"),
      chequeDate: values.chequeDate ? format(values.chequeDate, "dd/MM/yyyy") : "",
    };
    
    try {
        const response = await fetch('/api/expenditure', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formattedValues),
        });

        if (response.ok) {
            toast({
                title: "Data Submitted",
                description: "Expenditure record added successfully.",
            });
            form.reset();
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                    <FormItem className="flex flex-col pt-2">
                    <FormLabel>Payment Date</FormLabel>
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
            name="amount"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                        <Input type="number" placeholder="Enter amount" {...field} className="pl-7" />
                    </div>
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
             <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                  <FormItem className="md:col-span-2">
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                      <Textarea 
                        placeholder="Enter payment details (e.g., Security guard salary for May)" 
                        {...field}
                       />
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
                            <SelectItem value="Cheque">Cheque</SelectItem>
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
            {watchedModeOfPayment === 'Cheque' && (
              <>
                <FormField
                    control={form.control}
                    name="chequeNo"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Cheque No.</FormLabel>
                        <FormControl>
                            <Input placeholder="Enter cheque number" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="chequeDate"
                    render={({ field }) => (
                        <FormItem className="flex flex-col pt-2">
                        <FormLabel>Cheque Date</FormLabel>
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
                                {field.value ? format(field.value, "dd/MM/yyyy") : <span>Pick a date</span>}
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                        </FormItem>
                    )}
                />
              </>
            )}
        </div>
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  )
}
