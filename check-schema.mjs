import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function checkPersonalitiesSchema() {
  console.log('Checking personalities table schema...\n');
  
  try {
    // Try to get one record to see the structure
    const { data, error } = await supabase
      .from('personalities')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('Existing record columns:', Object.keys(data[0]));
    } else {
      console.log('Table exists but is empty. Let\'s check column info via SQL query...');
      
      // Try direct SQL query
      const { data: schemaData, error: schemaError } = await supabase
        .rpc('sql', { 
          query: `SELECT column_name, data_type, is_nullable 
                  FROM information_schema.columns 
                  WHERE table_name = 'personalities' 
                  ORDER BY ordinal_position;` 
        });
        
      if (schemaError) {
        console.log('SQL RPC not available. Trying alternative approach...');
        
        // Try to insert a minimal record to see what columns are expected
        const testInsert = await supabase
          .from('personalities')
          .insert([
            { 
              id: '00000000-0000-0000-0000-000000000000',
              name: 'test',
              user_id: '00000000-0000-0000-0000-000000000000'
            }
          ]);
          
        console.log('Test insert result:', testInsert.error?.message || 'Success');
        
        // Clean up test record
        if (!testInsert.error) {
          await supabase
            .from('personalities')
            .delete()
            .eq('id', '00000000-0000-0000-0000-000000000000');
        }
      } else {
        console.log('Schema info:', schemaData);
      }
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkPersonalitiesSchema();