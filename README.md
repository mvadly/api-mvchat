# MVChat API

NestJS Backend for WhatsApp-like Chat Application with Google Sheets storage.

## Tech Stack
- NestJS 10.x + TypeScript
- Socket.io for WebSocket real-time messaging
- Google Sheets API for data storage
- JWT Authentication

## Prerequisites
- Node.js v22+

## Installation

```bash
cd /mnt/d/Projects/Nestjs/api-mvchat
npm install
```

## Environment Variables

Create `.env` file in project root:

```env
PORT=3001
JWT_SECRET=mvchat-secret-key-change-in-production
JWT_EXPIRES_IN=7d
GOOGLE_SPREADSHEET_ID=10bLHBJ0rWQyaDv2uVwYmNVNxcBHX2tZw3B01RSkXrxc
CLIENT_URL=http://localhost:3001
GOOGLE_SERVICE_ACCOUNT_KEY={"type": "service_account","project_id": "xxx",...}
```

Note: Server runs on port 3001 (not 3000) to avoid conflicts.

## Google Sheets Setup

Your spreadsheet must have these sheets:

### 1. Users Sheet
| Column | Header |
|--------|--------|
| A | id |
| B | username |
| C | email |
| D | passwordHash |
| E | avatarUrl |
| F | createdAt |

### 2. Conversations Sheet
| Column | Header |
|--------|--------|
| A | id |
| B | name |
| C | type |
| D | createdAt |

### 3. ConversationMembers Sheet
| Column | Header |
|--------|--------|
| A | conversation_id |
| B | user_id |
| C | role |

### 4. Messages Sheet
| Column | Header |
|--------|--------|
| A | id |
| B | conversationId |
| C | senderId |
| D | senderName |
| E | content |
| F | type |
| G | createdAt |
| H | readAt |

**Important:** The Messages sheet was updated to include senderName in column D.

## Run

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

Server runs on http://localhost:3001

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/register | Register new user |
| POST | /auth/login | Login, get JWT token |
| GET | /auth/users | Get all users |
| GET | /auth/users/:id | Get user by ID |

### Conversations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /conversations | Get all conversations |
| GET | /conversations/user/:userId | Get user's conversations |
| GET | /conversations/:id | Get conversation by ID |
| GET | /conversations/:id/members | Get conversation members |
| POST | /conversations | Create conversation |
| POST | /conversations/direct/:userId1/:userId2 | Create/get direct chat |

### Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /messages/conversation/:conversationId | Get messages by conversation |
| POST | /messages/upsert | Insert or update message (idempotent) |

## Message Flow Architecture

This backend uses a unique message flow to prevent duplicates:

### Send Message Flow
```
1. Flutter sends message via WebSocket
2. Backend broadcasts to all clients in room (real-time, NO persistence)
3. Each client receives WebSocket message
4. Client calls POST /messages/upsert to save to Google Sheets
5. On receive: if message ID exists, UPDATE; if not, INSERT
```

### Why This Architecture?
- Prevents duplicate messages in Google Sheets
- Real-time delivery via WebSocket
- Persisted via upsert on client side
- Works across multiple devices

## WebSocket Events

### Connect
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  extraHeaders: {
    'Authorization': 'Bearer <JWT_TOKEN>'
  }
});
```

### Client Events
| Event | Payload | Description |
|-------|---------|-------------|
| join | { conversationId, userId } | Join room |
| leave | { conversationId, userId } | Leave room |
| message | { conversationId, senderId, senderName, content, type } | Send message (broadcast only, not persisted) |
| typing | { conversationId, userId, userName } | User typing |
| read | { messageId } | Mark as read |

### Server Events (Received)
| Event | Data | Description |
|-------|------|-------------|
| newMessage | Message object with senderName | New message received |
| userTyping | { userId, userName } | User is typing |

## Example Usage

### Register User
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"john","email":"john@example.com","password":"123456"}'
```

### Login
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"123456"}'
```

### Create Direct Conversation
```bash
curl -X GET http://localhost:3001/conversations/direct/user1_id/user2_id \
  -H "Authorization: Bearer <TOKEN>"
```

### Get Messages
```bash
curl -X GET http://localhost:3001/messages/conversation/conv_xxx \
  -H "Authorization: Bearer <TOKEN>"
```

## Troubleshooting

### Google Sheets error
1. Verify service account has access to spreadsheet
2. Check GOOGLE_SERVICE_ACCOUNT_KEY is valid JSON
3. Ensure spreadsheet ID is correct

### Port already in use
```bash
# Find process using port 3001
netstat -tlnp | grep 3001

# Change port in .env
PORT=3002
```

### Messages not showing
- Check Messages sheet has correct headers (8 columns including senderName)
- Verify column D header is "senderName"
- Check console for error logs

## Project Structure

```
api-mvchat/
├── src/
│   ├── main.ts                 # Entry point
│   ├── app.module.ts           # Root module
│   ├── config/               # Configuration
│   │   ├── config.module.ts
│   │   ├── config.service.ts
│   │   └── google-sheets.service.ts
│   ├── auth/                 # Authentication
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts
│   │   ├── auth.controller.ts
│   │   └── jwt.strategy.ts
│   ├── users/               # User management
│   │   ├── users.module.ts
│   │   ├── users.service.ts
│   │   └── users.controller.ts
│   ├── conversations/        # Chat rooms
│   │   ├── conversations.module.ts
│   │   ├── conversations.service.ts
│   │   └── conversations.controller.ts
│   ├── messages/           # Messages
│   │   ├── messages.module.ts
│   │   ├── messages.service.ts
│   │   └── messages.controller.ts
│   ├── gateway/            # WebSocket
│   │   ├── chat.gateway.ts
│   │   └── gateway.module.ts
│   └── common/             # Shared
│       └── interfaces.ts
├── .env                   # Environment variables
├── package.json
├── tsconfig.json
└── nest-cli.json
```