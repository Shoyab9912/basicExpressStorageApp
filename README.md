# Cloud File Storage

A backend file storage system similar to Google Drive — built with Node.js, Express, and MongoDB. Users can upload, preview, download, rename, and delete files organized inside nested folders, all protected by session-based authentication and OTP email verification.

## Features

- **Nested directory structure** — create folders inside folders, just like a real file system
- **File upload via streaming** — files are piped directly to disk using Node.js streams, no memory bloat
- **File preview & download** — serve or download any file from a single endpoint via `?action=download`
- **Recursive folder deletion** — deleting a folder removes all nested subfolders and files automatically
- **OTP email verification** — users must verify their email via OTP (10 min TTL) before registration
- **Session-based authentication** — DB-backed sessions with 24hr expiry; supports logout from all devices
- **File & folder rename** — rename any file or directory after upload
- **Path traversal protection** — `safeStoragePath` blocks directory traversal attacks
- **Global error handler** — cleanly handles validation errors, duplicate keys, and operational errors

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB + Mongoose
- **Email:** Nodemailer (OTP verification)
- **Security:** bcryptjs (password hashing), signed HTTP-only cookies (session management)

## API Endpoints

### Auth (OTP)
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/auth/send-otp` | Send OTP to email |
| POST | `/auth/verify-otp` | Verify OTP |

### Users
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/users/register` | Register new user (requires valid OTP) |
| POST | `/users/login` | Login and start session |
| GET | `/users` | Get logged-in user details |
| POST | `/users/logout` | Logout current session |
| POST | `/users/logout-all` | Logout from all devices |

### Directories
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/directories/{:id}` | Get directory contents (files + subfolders) |
| POST | `/directories/{:parentDirId}` | Create a new folder |
| PATCH | `/directories/:dirId` | Rename a folder |
| DELETE | `/directories/:id` | Delete folder and all contents recursively |

### Files
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/files/{:parentDirId}` | Upload a file (streamed to disk) |
| GET | `/files/:id` | Preview file |
| GET | `/files/:id?action=download` | Download file |
| PATCH | `/files/:id` | Rename a file |
| DELETE | `/files/:id` | Delete a file |

## Getting Started

### Prerequisites
- Node.js v18+
- MongoDB

### Installation

```bash
git clone https://github.com/Shoyab9912/<your-repo-name>.git
cd <your-repo-name>
npm install
```

### Environment Variables

Create a `.env` file in the root:

```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
COOKIE_SECRET=your_cookie_secret
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password
NODE_ENV=development
```

### Run

```bash
npm run dev
```

## How It Works

### Registration Flow
1. User sends email to `/auth/send-otp` — OTP is emailed and saved in MongoDB with a 10-minute TTL
2. User submits name, email, password, and OTP to `/users/register`
3. OTP is verified, then a root directory and user account are created atomically in a single MongoDB session
4. On any failure the transaction rolls back — no orphaned data

### File Upload Flow
1. Authenticated user sends a `POST` to `/files/{:parentDirId}` with the file as a raw stream
2. File metadata (name, extension, owner, parent folder) is saved to MongoDB first
3. File content is piped directly to `./storage/<fileId><extension>` on disk
4. On any write error, the partial file and its metadata are cleaned up automatically

### Session Flow
1. On login, a `Session` document is created in MongoDB and its ID is stored in a signed HTTP-only cookie
2. Every protected route reads the cookie, looks up the session, then fetches the user
3. Sessions expire after 24 hours automatically via MongoDB TTL index
4. `logout-all` deletes every session for that user across all devices

### Recursive Delete Flow
When a folder is deleted, `getDirRecursively` traverses the entire tree depth-first, collecting all nested file IDs and directory IDs. Physical files are deleted from disk first, then all file records and directory records are removed from MongoDB in bulk.
