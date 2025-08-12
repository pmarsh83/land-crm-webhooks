# land-crm-webhooks

Express webhook server for OpenPhone integration with Supabase CRM

## Overview

This is a TypeScript Express server that handles OpenPhone webhooks and integrates with a Supabase CRM system. It provides endpoints for webhook processing and health checks.

## Features

- **Health Check Endpoint**: `/health` - Simple health status endpoint
- **OpenPhone Webhook Endpoint**: `/webhook/openphone` - Processes incoming OpenPhone webhooks
- **Webhook Signature Verification**: Validates OpenPhone webhook signatures for security
- **Supabase Integration**: Upserts contacts and inserts communications into CRM database
- **TypeScript Support**: Full TypeScript implementation with proper type checking
- **Environment-based Configuration**: All sensitive data handled via environment variables

## API Endpoints

### GET /health

Returns server health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-08-12T22:36:00.000Z"
}
```

### POST /webhook/openphone

Processes OpenPhone webhook events for calls and messages.

**Headers:**
- `x-openphone-signature`: Webhook signature (if webhook secret is configured)
- `Content-Type`: `application/json`

**Request Body:**
OpenPhone webhook payload (varies by event type)

**Response:**
```json
{
  "success": true,
  "message": "Webhook processed successfully"
}
```

## Environment Variables

The following environment variables are required:

### Supabase Configuration
- `SUPABASE_URL`: Your Supabase project URL (e.g., `https://your-project.supabase.co`)
- `SUPABASE_SERVICE_KEY`: Your Supabase service role key for server-side operations

### OpenPhone Configuration
- `OPENPHONE_WEBHOOK_SECRET`: (Optional) Webhook secret for signature verification

### Server Configuration
- `PORT`: (Optional) Server port, defaults to 3000

## Database Schema

This server expects the following Supabase tables:

### contacts
```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### communications
```sql
CREATE TABLE communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id),
  type TEXT NOT NULL CHECK (type IN ('call', 'message')),
  content TEXT,
  duration INTEGER,
  timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/pmarsh83/land-crm-webhooks.git
   cd land-crm-webhooks
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory:
   ```env
   SUPABASE_URL=https://gsliqkewqopsupzaijsd.supabase.co
   SUPABASE_SERVICE_KEY=your_supabase_service_key_here
   OPENPHONE_WEBHOOK_SECRET=your_webhook_secret_here
   PORT=3000
   ```

4. **Build the project:**
   ```bash
   npm run build
   ```

5. **Start the server:**
   ```bash
   npm start
   ```

   For development with hot reload:
   ```bash
   npm run dev
   ```

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run clean` - Remove dist directory
- `npm start` - Start production server

### Project Structure

```
land-crm-webhooks/
├── src/
│   └── index.ts          # Main Express server
├── dist/                 # Compiled JavaScript (generated)
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── .gitignore           # Git ignore rules
└── README.md            # This file
```

## OpenPhone Webhook Integration

To configure OpenPhone webhooks:

1. Go to your OpenPhone dashboard
2. Navigate to Settings > Webhooks
3. Add a new webhook endpoint: `https://your-domain.com/webhook/openphone`
4. Select the events you want to receive (calls, messages)
5. If you want signature verification, set a webhook secret and add it to your environment variables

## Security

- Webhook signature verification is implemented and enabled when `OPENPHONE_WEBHOOK_SECRET` is set
- All database operations use the Supabase service role key
- CORS is enabled for cross-origin requests
- Input validation is performed on webhook payloads

## Error Handling

The server includes comprehensive error handling:
- Invalid webhook signatures return 401 Unauthorized
- Missing required data returns 400 Bad Request  
- Database errors return 500 Internal Server Error
- All errors are logged to console for debugging

## License

MIT
