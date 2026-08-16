# Cloud File Storage — Backend

A backend-only file storage service built with Node.js, Express, and MongoDB. Supports authenticated file/directory management, S3-based storage with presigned uploads, resource sharing (users + links), subscription plans (Razorpay), and an admin panel API.

## Features

- **Auth**: Email OTP, Google OAuth, GitHub OAuth (implemented manually, no Passport.js)
- **File storage**: AWS S3 backend — uploads use a two-step presigned URL flow; downloads use presigned URLs (not proxied through the server)
- **Directories**: Recursive directory tree via DFS traversal, with breadcrumb navigation
- **Sharing**: Per-user sharing (viewer/editor permissions) and shareable links with expiry
- **Subscriptions**: Plan management via Razorpay (create, pause, resume, cancel, change plan) with webhook handling
- **Admin API**: User management, role changes, forced logout, file/directory inspection
- **Security**: Path traversal protection on directory/file operations, streaming for large file transfers

## Tech Stack

- Node.js / Express
- MongoDB
- AWS S3 (presigned URL uploads/downloads)
- Razorpay (subscriptions & webhooks)
- Manual OAuth (Google, GitHub)

## Base URL

```
/api/v1
```

## API Reference

### Authentication
| Method | Route | Body |
|---|---|---|
| POST | `/auth/send-otp` | `{ email }` |
| POST | `/auth/verify-otp` | `{ email, otp }` |
| POST | `/auth/google` | `{ idToken }` |
| GET | `/auth/github` | — |
| GET | `/auth/github/callback` | — (`?code=`) |

### Users / Account
| Method | Route | Body |
|---|---|---|
| POST | `/users/register` | `{ name, email, password, otp }` |
| POST | `/users/login` | `{ email, password }` |
| GET | `/users/me` | — |
| POST | `/users/logout` | — |
| DELETE | `/users/users/:userId` | — |

### Directories
| Method | Route | Body |
|---|---|---|
| GET | `/directories` / `/directories/:id` | — |
| POST | `/directories` / `/directories/:parentDirId` | `{ name }` |
| PATCH | `/directories/:dirId` | `{ newDirName }` |
| DELETE | `/directories/:id` | — |
| GET | `/directories/:id/breadCrumb` | — |

### Files
| Method | Route | Body |
|---|---|---|
| GET | `/files/:id` | — |
| GET | `/files/:id/download` | — |
| PATCH | `/files/:id` | `{ newFilename }` |
| DELETE | `/files/:id` | — |
| POST | `/files/upload/initiate` | `{ name, size, contentType, parentDirId? }` |
| POST | `/files/upload/complete` | `{ fileId }` |
| DELETE | `/files/cancel/:fileId` | — |

### Sharing
| Method | Route | Body |
|---|---|---|
| POST | `/shares/:resourceType/:resourceId` | `{ email, permission }` |
| GET | `/shares/:resourceType/:resourceId` | — |
| POST | `/shares/:resourceType/:resourceId/:userId` (revoke) | — |
| PATCH | `/shares/:resourceType/:resourceId/:userId` | `{ permission }` |
| POST | `/shares/:resourceType/:resourceId/link` | `{ permission, expiresIn? }` |
| DELETE | `/shares/:resourceType/:resourceId/link` | — |
| GET | `/shares/:token` | — |

`resourceType` is `file` or `directory`. `permission` is `viewer` or `editor`. `expiresIn` defaults to `7` (days).

### Subscriptions
| Method | Route | Body |
|---|---|---|
| GET | `/subscriptions/plans` | — |
| POST | `/subscriptions` | `{ planId }` |
| POST | `/subscriptions/pause` | — |
| POST | `/subscriptions/resume` | — |
| POST | `/subscriptions/cancel` | — |
| POST | `/subscriptions/change-plan` | `{ planId }` |

### Admin
| Method | Route | Body |
|---|---|---|
| GET | `/admin/users` | — |
| POST | `/admin/user/logout-all` | — |
| GET | `/admin/users/:userId/files` | — |
| GET | `/admin/users/:userId/directories` | — |
| GET | `/admin/files/:fileId` | — |
| POST | `/admin/users/:userId/logout` | — |
| PATCH | `/admin/users/:userId/role` | `{ role }` |
| DELETE | `/admin/users/:userId/hard` | — |
| DELETE | `/admin/users/:userId/files/:fileId` | — |

### Other
| Method | Route | Notes |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/webhooks/razorpay` | Razorpay webhook (server-to-server, not a client route) |

## API Testing

A Postman collection and environment are included in the `/postman` folder.

1. Import both files into Postman
2. Select the "Cloud File Storage" environment
3. Set `base_url` if different from the default (`http://localhost:<PORT>/api/v1`)
4. Auth flow (Send OTP → Verify OTP → Register/Login) is tested and working

## Setup

```bash
git clone <repo-url>
cd cloud-file-storage
npm install
cp .env.example .env   # fill in the values described below
npm run dev
```

### Environment Variables

Create a `.env` file in the project root with the following keys:

```dotenv
# Server
PORT=4000
NODE_ENV=
CORS_ORIGIN=
CLIENT_URL=
BASE_URL=

# Database
MONGO_URI=

# Cookies / Sessions
COOKIE_SECRET=

# Email (OTP delivery)
GMAIL_USER=
GMAIL_PASS=

# OAuth
CLIENT_ID=               # Google OAuth client ID
GIT_CLIENT_ID=            # GitHub OAuth client ID
GIT_SECRET=               # GitHub OAuth client secret


# AWS S3
AWS_BUCKET_NAME=
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# Razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
RZP_BASIC_MONTHLY=
RZP_PRO_MONTHLY=
RZP_PREMIUM_MONTHLY=
RZP_BASIC_YEARLY=
RZP_PRO_YEARLY=
RZP_PREMIUM_YEARLY=

# Redis (caching / sessions / rate limiting)
REDIS_URL=
```

> **Never commit real values.** Commit a `.env.example` with these keys blank, add `.env` to `.gitignore`, and keep actual credentials (AWS keys, Razorpay secrets, OAuth secrets, Redis URL) local only.

## Notes

- This is a backend-only project (no frontend). See the API reference above or the Postman collection to exercise the endpoints.
- Frontend rule (if a UI is added later): only build features with a corresponding backend route — no Trash, Starred, Favorites, Notifications, Activity feed, or Comments until backend support exists.
