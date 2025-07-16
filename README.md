# Foundly - Simplified Version

A simplified all-in-one platform for youth-led organizations to manage projects, events, and team collaboration.

## What Changed

This is a **simplified version** of Foundly that removes complexity while keeping all core features:

### ✅ **Kept (Core Features)**
- User Authentication (login/register)
- Organization Management (create/join)
- Project Management (create/track)
- Event Calendar (schedule events)
- Hours Logging (track volunteer hours)
- Basic Stats (simple metrics)

### ❌ **Removed (Complexity)**
- Real-time messaging (Socket.io)
- Complex role system (just admin/member)
- Advanced analytics
- Complex organization switching
- Multiple API endpoints
- Complex error handling
- Debug/test infrastructure
- Over-engineered data models

## Architecture

### Frontend
- **React** with simple state management
- **React Router** for navigation
- **Simple API service** with basic error handling
- **Clean UI** without complex animations

### Backend
- **Express.js** server with consolidated routes
- **MongoDB** with simplified models
- **JWT authentication** (no refresh tokens)
- **Single API** instead of multiple endpoints

## Quick Start

### 1. Install Dependencies

```bash
# Frontend
npm install

# Backend
cd backend
npm install
```

### 2. Set up Environment

Create `.env` file in the backend directory:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
```

### 3. Start the Application

```bash
# Start backend (in backend directory)
npm start

# Start frontend (in root directory)
npm start
```

The app will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## Features

### Organizations
- Create organizations with join codes
- Join existing organizations
- Simple admin/member roles

### Projects
- Create and track projects
- Set due dates and descriptions
- Mark as active/completed

### Events
- Schedule events with dates
- Add descriptions and details
- View in calendar format

### Hours Logging
- Log volunteer hours
- Add descriptions and dates
- Track total hours

### Stats
- View member count
- See total hours logged
- Track active projects

## Why Simplified?

The original Foundly had too much complexity:
- **Dual API system** (main + working endpoints)
- **Over-engineered data models** with nested objects
- **Complex authentication** with refresh tokens
- **Real-time features** that weren't essential
- **Multiple debug scripts** and test files

This simplified version:
- **90% less code**
- **Much easier to maintain**
- **Fewer bugs** due to simpler logic
- **Same core value** for users
- **Easier to add features** later

## File Structure

```
foundly/
├── src/
│   ├── components/          # React components
│   ├── services/
│   │   └── api.js          # Simplified API service
│   └── App.jsx             # Main app component
├── backend/
│   ├── models/             # Simplified MongoDB models
│   └── server.js           # Consolidated Express server
└── package.json            # Simplified dependencies
```

## Contributing

This simplified version is much easier to contribute to:
1. **Clearer code structure**
2. **Fewer dependencies**
3. **Simpler API endpoints**
4. **Less complex state management**

## License

This is a student hobby project. Use at your own risk! 