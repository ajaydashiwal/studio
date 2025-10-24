
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
import { useToast } from "@/hooks/use-toast"
import { Building, Hash, User as UserIcon } from "lucide-react"

const formSchema = z.object({
  flatNo: z.string().min(1, { message: "Flat number is required." }),
  memberName: z.string().min(3, { message: "Member name is required." }),
  membershipNo: z.coerce.number().positive({ message: "A valid membership number is required." }),
})

export default function MembershipEntryForm() {
  const { toast } = useToast()
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        flatNo: "",
        memberName: "",
        membershipNo: "" as any,
    }
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
        const response = await fetch('/api/master-membership', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
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
              <FormLabel>Member Name</FormLabel>
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
