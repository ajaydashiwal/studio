
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { useState } from "react"
import { Loader2 } from "lucide-react"

const formSchema = z.object({
  flatNo: z.string().min(1, { message: "Flat number is required." }),
})

export default function ResetPasswordForm() {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        flatNo: "",
    }
  })

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
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(() => setIsDialogOpen(true))} className="space-y-6 max-w-sm">
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
                The user's password will be reset to the default value.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reset Password
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will permanently reset the password for flat number 
                <span className="font-bold"> {form.watch('flatNo')}</span> to the default password ('password'). This user will lose access until they use the new password.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleReset} disabled={isSubmitting}>
                {isSubmitting ? 'Resetting...' : 'Continue'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </form>
    </Form>
  )
}
