
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
import { mockUsers } from "@/lib/data"
import { useEffect } from "react"

const formSchema = z.object({
  flatNo: z.string().min(1, { message: "Please enter a flat number." }),
  receiptDate: z.date({
    required_error: "A date of receipt is required.",
  }),
  receiptNo: z.string().min(1, { message: "Receipt number is required." }),
  membershipFee: z.coerce.number().positive({ message: "Please enter a valid amount." }),
  membershipStatus: z.enum(["Active", "Inactive"]),
})


export default function MembershipEntryForm() {
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        flatNo: "",
        receiptNo: "",
        membershipFee: 1000,
        membershipStatus: "Active",
    }
  })

  const watchedFlatNo = form.watch("flatNo");

  useEffect(() => {
    const user = mockUsers.find(u => u.flatNo.toLowerCase() === watchedFlatNo.toLowerCase());
    if (user) {
        form.setValue("membershipStatus", user.membershipStatus);
    } else {
        form.setValue("membershipStatus", "Active");
    }
  }, [watchedFlatNo, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    const formattedValues = {
      ...values,
      receiptDate: format(values.receiptDate, "dd/MM/yyyy"),
    };
    console.log(formattedValues)
    const userExists = mockUsers.some(u => u.flatNo.toLowerCase() === values.flatNo.toLowerCase());
    
    toast({
        title: userExists ? "Membership Record Updated" : "New Membership Record Created",
        description: (
            <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
                <code className="text-white">{JSON.stringify(formattedValues, null, 2)}</code>
            </pre>
        ),
    });
    form.reset();
    form.setValue("membershipFee", 1000);
    form.setValue("membershipStatus", "Active");
    form.setValue("flatNo", "");
  }

  const handleFlatNoBlur = () => {
    const flatNo = form.getValues("flatNo");
    const user = mockUsers.find(u => u.flatNo.toLowerCase() === flatNo.toLowerCase());
    if (user) {
        form.setValue("membershipStatus", user.membershipStatus);
    } else {
        form.setValue("membershipStatus", "Active");
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
                        placeholder="Enter flat number and press tab" 
                        {...field} 
                        onBlur={handleFlatNoBlur}
                    />
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
            name="membershipFee"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Membership Fee</FormLabel>
                <FormControl>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                        <Input type="number" placeholder="1000" {...field} className="pl-7" />
                    </div>
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="membershipStatus"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Membership Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <Button type="submit">Update Record</Button>
      </form>
    </Form>
  )
}
