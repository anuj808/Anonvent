# AnonVent

AnonVent is a secure, anonymous web platform designed to let users speak their minds, share thoughts, and connect without judgment. This repository houses the MERN skeleton project structured with a React + Vite frontend and an Express + Node.js backend.

## Project Structure

```
/anonvent
  ├── /client         # React frontend with Vite & TypeScript
  ├── /server         # Node.js + Express backend
  ├── package.json    # Orchestrates running both client and server
  └── README.md       # Project guide
```

---

## Getting Started

Follow these steps to set up and run the project locally.

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [MongoDB](https://www.mongodb.com/) (running locally or via Atlas)

### 1. Installation

Install dependencies for the root, server, and client directories:

```bash
npm run install-all
```

This single command installs the required dependencies recursively.

### 2. Environment Variables Configuration

Both the frontend and backend require environmental variables setup to run.

#### Backend Setup (`/server`)

Create a `.env` file in the `/server` directory and configure the following variables (you can copy `/server/.env.example`):

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/anonvent
JWT_SECRET=your_super_secret_jwt_key_here
ALLOWED_ORIGIN=http://localhost:5173
```

#### Frontend Setup (`/client`)

Create a `.env` file in the `/client` directory and configure (you can copy `/client/.env.example`):

```env
VITE_API_URL=http://localhost:5000/api
```

---

## Running the Application

You can run the server and client separately or concurrently.

### Run Concurrently (Recommended)

From the project root directory, run:

```bash
npm run dev
```

This starts:
- The backend server on [http://localhost:5000](http://localhost:5000)
- The frontend client on [http://localhost:5173](http://localhost:5173)

### Run Separately

- **To run only the backend server:**
  ```bash
  npm run server
  ```
- **To run only the frontend client:**
  ```bash
  npm run client
  ```

---

## Security Features Configured

1. **Helmet**: Configured globally in the backend to set security-related HTTP headers.
2. **CORS Protection**: Restricted to the specified `ALLOWED_ORIGIN` (defaulting to the local Vite client).
3. **NoSQL Injection Prevention**: Built-in protection using `express-mongo-sanitize` middleware to sanitize inputs.
4. **Rate Limiting**: Configured to allow a maximum of 100 requests per 15 minutes per IP to avoid denial-of-service attempts.
5. **Cookie Parsing**: Set up cookie parser to prepare for secure HTTP-only session cookies.

---

## Verifying the Setup

1. **Health Check Endpoint**: Open your browser or API client (like Postman/curl) and navigate to `http://localhost:5000/api/health`. You should receive:
   ```json
   { "status": "ok" }
   ```
2. **Client Interface**: Open `http://localhost:5173`. You should see the premium "AnonVent" home page. The page contains a status indicator querying the backend API to show if it is online or offline.

---

## Deployment (Production)

To deploy AnonVent to production using free-tier hosting (Render for backend, Vercel for frontend, MongoDB Atlas for database), follow these step-by-step instructions.

### Prerequisites
- Create a MongoDB Atlas cluster and get the connection URI string.
- Create accounts on [Render](https://render.com) and [Vercel](https://vercel.com).
- Push your project code to a remote GitHub repository.

### Step 1: Deploy Backend on Render (Web Service)
1. Log in to Render. Click **New** -> **Web Service**.
2. Connect your GitHub repository.
3. Configure the following web service settings:
   - **Name**: `anonvent-api`
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Region**: Choose a region close to your target audience.
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Expand the **Advanced** section to add the required **Environment Variables**:
   - `NODE_ENV`: `production`
   - `PORT`: `5000`
   - `MONGO_URI`: `your_mongodb_atlas_connection_string`
   - `JWT_SECRET`: `a_secure_random_hash_string`
   - `ALLOWED_ORIGIN`: Set a placeholder for now, e.g., `http://localhost:5173`. We will update this with the Vercel URL once the frontend is deployed.
5. Click **Create Web Service** and wait for deployment to complete. Copy the live service URL (e.g. `https://anonvent-api.onrender.com`).

### Step 2: Deploy Frontend on Vercel
1. Log in to Vercel. Click **Add New** -> **Project**.
2. Connect your GitHub repository.
3. Configure the following project settings:
   - **Framework Preset**: `Vite` (auto-detected)
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist` (auto-detected)
4. Add the required **Environment Variables**:
   - `VITE_API_URL`: Paste your Render URL followed by `/api` (e.g. `https://anonvent-api.onrender.com/api`).
5. Click **Deploy**. Vercel will build the frontend and provide your live URL (e.g. `https://anonvent.vercel.app`).

### Step 3: Link Vercel URL Back to Render CORS
1. Return to your Render Web Service dashboard.
2. Navigate to **Environment**.
3. Edit the value of `ALLOWED_ORIGIN` to be: `https://your-vercel-domain.vercel.app,http://localhost:5173` (comma-separated origins).
4. Save the changes. Render will automatically redeploy the backend with the updated CORS configuration.

