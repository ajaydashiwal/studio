
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { useState } from "react"
import { Loader2 } from "lucide-react"

const formSchema = z.object({
  flatNo: z.string().min(1, { message: "Flat number is required." }),
})

interface UserDetails {
  membershipNo: string;
}

export default function ResetPasswordForm() {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        flatNo: "",
    }
  })

  const generatedPassword = userDetails
    ? `UAarwa${userDetails.membershipNo}${form.getValues("flatNo")}@`
    : "";

  const preSubmitCheck = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    setUserDetails(null);
    try {
        // This endpoint will return a 409 if user exists, and 404 if no record found
        // A 200 OK means a PENDING user was found, which is close enough for our needs here.
        // We just need the membership number.
        const response = await fetch(`/api/users/${values.flatNo}`);
        const data = await response.json();

        if (response.status === 404) {
            toast({
                variant: "destructive",
                title: "Not Found",
                description: data.message || "No user record found for this flat number.",
            });
            return;
        }

        if (data.membershipNo) {
            setUserDetails({ membershipNo: data.membershipNo });
            setIsDialogOpen(true);
        } else {
             toast({
                variant: "destructive",
                title: "Missing Details",
                description: "Could not retrieve membership number for this user. Cannot reset password.",
            });
        }
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not connect to the server to verify user.",
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  const handleReset = async () => {
    setIsSubmitting(true)
    const flatNo = form.getValues("flatNo")

    try {
        const response = await fetch(`/api/users/${flatNo}/reset-password`, {
            method: 'PUT',
        })
        const result = await response.json()

        if (response.ok) {
            toast({
                title: "Success",
                description: result.message,
            })
            form.reset()
        } else {
            toast({
                variant: "destructive",
                title: "Reset Failed",
                description: result.error || "Could not reset the password.",
            })
        }
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not connect to the server.",
        })
    } finally {
        setIsSubmitting(false)
        setIsDialogOpen(false)
        setUserDetails(null);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(preSubmitCheck)} className="space-y-6 max-w-sm">
        <FormField
          control={form.control}
          name="flatNo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Flat Number</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter the flat number of the user" 
                  {...field}
                />
              </FormControl>
              <FormDescription>
                The user's password will be reset to a new default password.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reset Password
        </Button>
        
        <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will reset the password for flat 
                <span className="font-bold"> {form.watch('flatNo')}</span>.
                <br/><br/>
                The new password will be:
                <div className="my-2 p-2 bg-muted text-foreground rounded-md font-mono text-center">
                    {generatedPassword}
                </div>
                Please confirm this action.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setUserDetails(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleReset} disabled={isSubmitting}>
                {isSubmitting ? 'Resetting...' : 'Confirm & Reset'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </form>
    </Form>
  )
}
