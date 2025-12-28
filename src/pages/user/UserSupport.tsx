import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LifeBuoy, Send, Loader2, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const ticketCategories = [
  { value: 'order', label: 'Order Issue' },
  { value: 'payment', label: 'Payment Problem' },
  { value: 'kyc', label: 'KYC Verification' },
  { value: 'storefront', label: 'Storefront Help' },
  { value: 'technical', label: 'Technical Issue' },
  { value: 'other', label: 'Other' },
];

const UserSupport: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!category || !subject || !message) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all fields.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Send the ticket as a chat message to admin
      const ticketMessage = `[SUPPORT TICKET]\nCategory: ${ticketCategories.find(c => c.value === category)?.label}\nSubject: ${subject}\n\n${message}`;
      
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user?.id,
          message: ticketMessage,
          sender_role: 'user',
          is_read: false,
        });

      if (error) throw error;

      toast({
        title: 'Ticket Submitted',
        description: 'Your support request has been sent. We will respond shortly.',
      });

      // Reset form
      setCategory('');
      setSubject('');
      setMessage('');
    } catch (error) {
      console.error('Error submitting ticket:', error);
      toast({
        title: 'Submission Failed',
        description: 'Could not submit your ticket. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <LifeBuoy className="w-8 h-8 text-primary" />
            Raise a Ticket
          </h1>
          <p className="text-muted-foreground mt-1">
            Need help? Submit a support ticket and we'll get back to you soon.
          </p>
        </div>

        {/* Support Ticket Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Submit Support Request
            </CardTitle>
            <CardDescription>
              Describe your issue and our team will assist you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {ticketCategories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief description of your issue"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Please provide details about your issue..."
                  rows={6}
                />
              </div>

              <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Submit Ticket
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Help Tips */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">Quick Tips</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Include order numbers when reporting order issues</li>
              <li>• Attach screenshots if reporting technical problems via chat</li>
              <li>• Check your email for responses to your tickets</li>
              <li>• You can also use the chat widget for quick questions</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default UserSupport;
