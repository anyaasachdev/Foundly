# Foundly Development Guide

## Current Issue
The frontend is trying to connect to the Vercel API, but the API deployment is returning 404 errors.

## Quick Fix for Development

### Option 1: Run Backend Locally (Recommended for Development)

1. **Start the backend server locally:**
   ```bash
   ./start-backend.sh
   ```
   Or manually:
   ```bash
   cd backend
   npm install
   npm start
   ```

2. **Start the frontend:**
   ```bash
   npm start
   ```

3. **The frontend will automatically connect to `http://localhost:3001/api`**

### Option 2: Use Vercel API (Production)

If you want to use the Vercel API, you need to:

1. **Set the environment variable:**
   ```bash
   export REACT_APP_API_URL=https://foundly-olive.vercel.app/api
   ```

2. **Or create a `.env.local` file:**
   ```
   REACT_APP_API_URL=https://foundly-olive.vercel.app/api
   ```

## API Configuration

The app uses a centralized configuration in `src/services/config.js`:

- **Development**: `http://localhost:3001/api`
- **Production**: `https://foundly-olive.vercel.app/api`
- **Custom**: Set `REACT_APP_API_URL` environment variable

## Troubleshooting

### Backend Issues
- Check if MongoDB is connected
- Verify environment variables in `backend/.env`
- Check server logs in `backend/server.log`

### Frontend Issues
- Check browser console for network errors
- Verify API URL in browser dev tools
- Check if CORS is properly configured

### Vercel Deployment Issues
- The API functions might not be properly deployed
- Check Vercel dashboard for deployment status
- Verify environment variables in Vercel dashboard

## Environment Variables Needed

### Backend (.env)
```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
```

### Frontend (.env.local)
```
REACT_APP_API_URL=http://localhost:3001/api
```

## Next Steps

1. **For immediate development**: Use Option 1 (local backend)
2. **For production**: Fix Vercel deployment or deploy backend separately
3. **Consider**: Deploying backend to Railway, Render, or Heroku for better reliability 