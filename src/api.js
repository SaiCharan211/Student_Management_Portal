import { supabase } from './supabaseClient.js';

// Calls the "manage-staff" Edge Function and returns a readable error.
export async function manageStaff(body) {
  const { data, error } = await supabase.functions.invoke('manage-staff', { body });
  if (error) {
    // The browser could not reach the function at all (not deployed, wrong name, or it crashed on start)
    if (error.name === 'FunctionsFetchError' || error.name === 'FunctionsRelayError') {
      throw new Error('Cannot reach the manage-staff function. In Supabase, check Edge Functions: it must be deployed and named exactly "manage-staff".');
    }
    const status = error.context?.status;
    let message = `The manage-staff function returned an error${status ? ` (HTTP ${status})` : ''}. Check its Logs in Supabase.`;
    try {
      const j = await error.context.json();
      if (j?.error) message = j.error;
      else if (j?.message) message = `${j.message}${status === 404 ? ' (function not deployed under the name "manage-staff")' : ''}`;
    } catch { /* keep default message */ }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
