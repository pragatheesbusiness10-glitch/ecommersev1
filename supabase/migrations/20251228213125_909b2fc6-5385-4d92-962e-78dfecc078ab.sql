-- Block anonymous access to orders table (contains customer emails, phones, addresses)
CREATE POLICY "Require authentication for orders"
ON public.orders
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Block anonymous access to chat_messages table (contains private conversations)
CREATE POLICY "Require authentication for chat_messages"
ON public.chat_messages
FOR ALL
TO anon
USING (false)
WITH CHECK (false);