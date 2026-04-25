# MVChat API

NestJS Backend for WhatsApp-like Chat Application with Google Sheets storage.

## Tech Stack
- NestJS 10.x + TypeScript
- Socket.io for WebSocket real-time messaging
- Google Sheets API for data storage
- JWT Authentication

## Prerequisites
- Node.js v22+
- Redis (running on localhost:6379)

## Installation

```bash
cd /mnt/d/Projects/NestJS/api-mvchat
npm install
```

## Environment Variables

Create `.env` file in project root:

```env
PORT=3000
JWT_SECRET=mvchat-secret-key-change-in-production
JWT_EXPIRES_IN=7d
GOOGLE_SPREADSHEET_ID=10bLHBJ0rWQyaDv2uVwYmNVNxcBHX2tZw3B01RSkXrxc
REDIS_URL=redis://localhost:6379
CLIENT_URL=http://localhost:3001
GOOGLE_SERVICE_ACCOUNT_KEY={"type": "service_account","project_id": "xxx",...}
```

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
| B | conversation_id |
| C | sender_id |
| D | content |
| E | type |
| F | createdAt |
| G | read_at |

## Run

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

Server runs on http://localhost:3000

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
| GET | /messages/conversation/:conversationId | Get messages |
| POST | /messages | Create message |

## WebSocket Events

### Connect
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  extraHeaders: {
    'Authorization': 'Bearer <JWT_TOKEN>'
  }
});
```

### Events
| Event | Payload | Description |
|-------|---------|-------------|
| join | { conversationId, userId } | Join room |
| leave | { conversationId, userId } | Leave room |
| message | { conversationId, senderId, senderName, content, type } | Send message |
| typing | { conversationId, userId, userName } | User typing |
| read | { messageId } | Mark as read |

### Received Events
| Event | Data | Description |
|-------|------|-------------|
| newMessage | Message object | New message |
| userTyping | { userId, userName } | User is typing |

## Example Usage

### Register User
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"john","email":"john@example.com","password":"123456"}'
```

### Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"123456"}'
```

### Create Direct Conversation
```bash
curl -X GET http://localhost:3000/conversations/direct/user1_id/user2_id \
  -H "Authorization: Bearer <TOKEN>"
```

## Troubleshooting

### Redis not running
```bash
# Check Redis
podman ps | grep redis

# Start Redis
podman run -d --name redis -p 6379:6379 redis:alpine
```

### Google Sheets error
1. Verify service account has access to spreadsheet
2. Check GOOGLE_SERVICE_ACCOUNT_KEY is valid JSON
3. Ensure spreadsheet ID is correct

### Port already in use
```bash
# Find process using port 3000
lsof -i :3000

# Change port in .env
PORT=3001
```

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