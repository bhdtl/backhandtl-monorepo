import { supabase } from './supabase';

export const sendReportEmail = async (email: string, subject: string, contentHtml: string) => {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: {
      to: email,
      subject: subject,
      html: contentHtml,
    },
  });

  if (error) throw error;
  return data;
};