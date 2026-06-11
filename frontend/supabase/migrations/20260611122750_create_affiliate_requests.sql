-- Ensure is_premium column exists on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE NOT NULL;

-- Create affiliate_requests table
CREATE TABLE IF NOT EXISTS public.affiliate_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    neobet_username TEXT NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.affiliate_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can insert their own affiliate requests" 
ON public.affiliate_requests FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own affiliate requests" 
ON public.affiliate_requests FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all affiliate requests" 
ON public.affiliate_requests FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.role = 'ADMIN' OR profiles.role = 'admin')
  )
);
