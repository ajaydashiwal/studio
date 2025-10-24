
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { useToast } from "@/hooks/use-toast"
import { Building, Hash, User as UserIcon, Receipt, CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

const formSchema = z.object({
  flatNo: z.string().min(1, { message: "Flat number is required." }),
  memberName: z.string().min(3, { message: "Member name is required." }),
  membershipNo: z.coerce.number().positive({ message: "A valid membership number is required." }),
  receiptNo: z.string().min(1, { message: "Receipt number is required." }),
  receiptDate: z.date({
    required_error: "A date of receipt is required.",
  }),
})

export default function MembershipEntryForm() {
  const { toast } = useToast()
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        flatNo: "",
        memberName: "",
        membershipNo: "" as any,
        receiptNo: "",
    }
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
     const formattedValues = {
      ...values,
      receiptDate: format(values.receiptDate, "dd/MM/yyyy"),
    };

    try {
        const response = await fetch('/api/master-membership', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formattedValues),
        });

        const result = await response.json();

        if (response.ok) {
            toast({
                title: "Success",
                description: result.message || "New membership record created successfully.",
            });
            form.reset();
        } else {
            toast({
                variant: "destructive",
                title: "Submission Failed",
                description: result.error || "Could not save the new membership record.",
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-md">
        <FormField
          control={form.control}
          name="flatNo"
          render={({ field }) => (
              <FormItem>
              <FormLabel>Flat Number</FormLabel>
                <FormControl>
                    <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Enter flat number" {...field} className="pl-10" />
                    </div>
                </FormControl>
              <FormMessage />
              </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="memberName"
          render={({ field }) => (
              <FormItem>
              <FormLabel>Owner/Member Name</FormLabel>
                <FormControl>
                    <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Enter the full name of the member" {...field} className="pl-10" />
                    </div>
                </FormControl>
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
                    <div className="relative">
                        <Receipt className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Enter receipt number" {...field} className="pl-10" />
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
                <FormLabel>Receipt Date</FormLabel>
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
          name="membershipNo"
          render={({ field }) => (
              <FormItem>
              <FormLabel>Membership No.</FormLabel>
                <FormControl>
                    <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="number" placeholder="Enter membership number" {...field} className="pl-10" />
                    </div>
                </FormControl>
              <FormMessage />
              </FormItem>
          )}
        />
        <Button type="submit">Create Membership Record</Button>
      </form>
    </Form>
  )
}
