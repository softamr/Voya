"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Mail } from 'lucide-react';

const resetPasswordSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setLoading(true);
    // In a real app, call Firebase sendPasswordResetEmail(auth, data.email)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      console.log("Password reset email requested for:", data.email);
      toast({ title: "Password Reset Email Sent", description: "If an account exists for this email, you will receive instructions to reset your password." });
      setSubmitted(true);
      form.reset();
    } catch (error) {
      console.error("Password reset failed:", error);
      const errorMessage = (error instanceof Error) ? error.message : "An unexpected error occurred.";
      toast({ title: "Request Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <>
        <CardHeader className="text-center p-0 mb-6">
          <Mail className="mx-auto h-12 w-12 text-primary mb-4" />
          <CardTitle className="text-2xl font-headline">Check Your Email</CardTitle>
          <CardDescription>
            We've sent a password reset link to your email address. Please check your inbox (and spam folder).
          </CardDescription>
        </CardHeader>
         <Button onClick={() => setSubmitted(false)} className="w-full">Request Another Link</Button>
      </>
    );
  }


  return (
    <>
      <CardHeader className="text-center p-0 mb-6">
        <CardTitle className="text-2xl font-headline">Reset Your Password</CardTitle>
        <CardDescription>Enter your email address and we'll send you a link to reset your password.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="you@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>
      </Form>
    </>
  );
}
