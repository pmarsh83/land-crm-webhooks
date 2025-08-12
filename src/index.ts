import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env['PORT'] || 3000;

// Initialize Supabase client
const supabaseUrl = process.env['SUPABASE_URL']!;
const supabaseServiceKey = process.env['SUPABASE_SERVICE_KEY']!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.raw({ type: 'application/json' }));

// Health check endpoint
app.get('/health', (_req, res) => {
  return res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// OpenPhone webhook signature verification
function verifyOpenPhoneSignature(payload: string, signature: string, secret: string): boolean {
  if (!secret) return true; // Skip verification if no secret is configured
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  const providedSignature = signature.replace('sha256=', '');
  
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(providedSignature, 'hex')
  );
}

// OpenPhone webhook endpoint
app.post('/webhook/openphone', async (_req, res) => {
  try {
    const signature = _req.headers['x-openphone-signature'] as string;
    const webhookSecret = process.env['OPENPHONE_WEBHOOK_SECRET'];
    const payload = JSON.stringify(_req.body);

    // Verify signature if secret is configured
    if (webhookSecret && signature) {
      if (!verifyOpenPhoneSignature(payload, signature, webhookSecret)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const webhookData = _req.body;
    console.log('Received OpenPhone webhook:', JSON.stringify(webhookData, null, 2));

    // Extract contact and communication data
    const { type, data } = webhookData;

    if (!data || !data.phoneNumber) {
      return res.status(400).json({ error: 'Missing required phone number data' });
    }

    const phoneNumber = data.phoneNumber;
    const contactName = data.name || data.contactName || null;
    const messageText = data.text || data.message || null;
    const callDuration = data.duration || null;
    const timestamp = data.createdAt || data.timestamp || new Date().toISOString();

    // Upsert contact
    const { data: contactData, error: contactError } = await supabase
      .from('contacts')
      .upsert(
        {
          phone_number: phoneNumber,
          name: contactName,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'phone_number',
          ignoreDuplicates: false
        }
      )
      .select('id')
      .single();

    if (contactError) {
      console.error('Error upserting contact:', contactError);
      return res.status(500).json({ error: 'Failed to upsert contact' });
    }

    // Insert communication record
    const communicationType = type === 'call' ? 'call' : 'message';
    const { error: communicationError } = await supabase
      .from('communications')
      .insert({
        contact_id: contactData.id,
        type: communicationType,
        content: messageText,
        duration: callDuration,
        timestamp: timestamp,
        created_at: new Date().toISOString()
      });

    if (communicationError) {
      console.error('Error inserting communication:', communicationError);
      return res.status(500).json({ error: 'Failed to insert communication' });
    }

    console.log(`Successfully processed ${communicationType} for contact: ${phoneNumber}`);
    return res.status(200).json({ success: true, message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Error processing OpenPhone webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  return res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
  console.log(`OpenPhone webhook endpoint at http://localhost:${PORT}/webhook/openphone`);
});
