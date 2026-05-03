mport { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  'https://scmnbypdyazarlamjsos.supabase.co/rest/v1/', 
  'scmnbypdyazarlamjsos'           
)