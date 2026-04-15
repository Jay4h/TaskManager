back env # Server Configuration   
NODE_ENV=development 
# NODE_ENV=production 
                   # Environment: development, production, test
PORT=3001                               # Port number for the server

# Database Configuration (REQUIRED)
MONGODB_URI=mongodb://localhost:27017/   # MongoDB connection URI (REQUIRED)
DB_NAME=mydb   # Database name (default: mydb)

# Authentication
JWT_SECRET=8ba8312850e3b658c20be3fe61d2239c89d4147235656e9f1c1c437ea378d796       # Secret key for JWT token generation (default provided)

# CORS Configuration
FRONTEND_URL=http://localhost:3000      # Frontend URL for CORS (default: http://localhost:3000)
SEED_USER_ID=6985c7272821ed56fd985152

# Email Notifications (Nodemailer)
EMAIL_NOTIFICATIONS_ENABLED=true   
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465   
SMTP_USER=thakkarjay152005@gmail.com
SMTP_PASS=wbckkobbvsozylkv  
SMTP_FROM="Task Manager" <thakkarjay152005@gmail.com>
SMTP_SECURE=true  

# live kit 
LIVEKIT_URL=wss://taskmanager-gkiz5dck.livekit.cloud
LIVEKIT_API_KEY=APIiisVwRnwNj2M
LIVEKIT_API_SECRET=eXYW8mBHJzJhz7vEuaD4tTQ7Kcz8eraHcyWB5vCP1iT

# Call Duration Limits (minutes)
MAX_CALL_DURATION_MINUTES=120
CALL_WARNING_THRESHOLD_MINUTES=110

# Database Maintenance
CALL_HISTORY_RETENTION_DAYS=90

REDIS_URL=redis://default:gQAAAAAAAQl4AAIncDJiMGM1NWMzNmVmMDg0ZTYwOTI2MGUyOTNkYTVkNjdkYXAyNjc5NjA@ace-kiwi-67960.upstash.io:6379
