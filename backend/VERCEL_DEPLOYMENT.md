# Vercel Deployment Guide for Backend

## Changes Made for Vercel Deployment

1. **Modified `src/app.ts`**:
   - Added default export of the Express app instance
   - Added database connection middleware for serverless functions
   - Database connections are cached and reused across invocations

2. **Created `vercel.json`**:
   - Configured Vercel to use `@vercel/node` for TypeScript
   - Set up routing to handle all requests through `src/app.ts`

## Deployment Steps

### 1. Push Your Code to GitHub
Make sure all changes are committed and pushed to your repository.

### 2. Configure Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your GitHub repository
4. **Important**: Set the root directory to `backend`
5. Configure the project:
   - **Framework Preset**: Other
   - **Root Directory**: `backend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### 3. Set Environment Variables

In your Vercel project settings, add these environment variables:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
DB_NAME=taskmanager
JWT_SECRET=your-secure-jwt-secret-key-here
NODE_ENV=production
```

**Important**:
- Use your actual MongoDB Atlas connection string for `MONGODB_URI`
- Generate a secure random string for `JWT_SECRET`
- Set `NODE_ENV` to `production`

### 4. Deploy

Click "Deploy" and Vercel will:
1. Install dependencies
2. Build your TypeScript code
3. Deploy your serverless functions

### 5. Test Your API

Once deployed, your API will be available at:
```
https://your-project-name.vercel.app/api/auth/...
https://your-project-name.vercel.app/api/tasks/...
https://your-project-name.vercel.app/api/projects/...
https://your-project-name.vercel.app/api/users/...
https://your-project-name.vercel.app/api/dashboard/...
```

## Important Notes

1. **MongoDB Connection**: 
   - The app uses connection caching for serverless environments
   - Make sure your MongoDB cluster allows connections from anywhere (0.0.0.0/0) or add Vercel's IP addresses

2. **CORS Configuration**:
   - Update your CORS settings in `src/middlewares/cors.ts` to allow your frontend domain

3. **Cold Starts**:
   - First request might be slower due to serverless cold starts
   - Subsequent requests will be faster due to connection caching

4. **Local Development**:
   - Continue using `npm run dev` for local development
   - The changes are backward compatible with local server setup

## Troubleshooting

If you encounter issues:
- Check Vercel logs in the dashboard
- Verify all environment variables are set correctly
- Ensure MongoDB allows connections from Vercel
- Check that your build completes successfully
