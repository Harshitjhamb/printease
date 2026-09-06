# PrintEase - Online Xerox & Print Center Manager

PrintEase is a full-stack MERN application that modernizes the campus printing experience. Students upload documents from the browser or directly from **Google Drive**, configure per-document print settings, and pay online — skipping the physical queue entirely. Print center operators get a dedicated admin portal to manage incoming orders, verify payments, and track revenue.

**Live Application:** https://printease-client.vercel.app

---

## Table of Contents

- [About the Project](#about-the-project)
- [Features](#features)
  - [Student Experience](#student-experience)
  - [Admin Experience](#admin-experience)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Application](#running-the-application)
- [Available Scripts](#available-scripts)
- [Environment Variables](#environment-variables)
- [API Overview](#api-overview)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

---

## About the Project

PrintEase removes the friction of conventional print shops by letting students submit print jobs remotely instead of carrying a USB drive and waiting in line. Files are uploaded from any browser-enabled device (including directly from Google Drive), per-document settings such as color mode, sides, copies, and page range are configured, payment is collected online, and the finished printout is collected later from the print center.

The codebase is a **JavaScript monorepo** managed with npm workspaces, with two independent packages — a Vite/React frontend (`client`) and an Express/MongoDB backend (`server`) — coordinated from a single root configuration.

---

## Features

### Student Experience

- Sign up / log in with JWT-based authentication
- Upload documents via the browser or import directly from **Google Drive**
- Configure per-document print settings: print type (B/W or color), sides (single/double), number of copies, paper size, and page range
- Inline comment parser that lets a single document mix settings per page (e.g. color overrides for specific pages within a range)
- Real-time pricing calculation based on selected settings
- Pay online via **Razorpay** (PayPal integration also supported) with signature verification on the backend
- Track order status (pending → in progress → completed) and payment status from "My Orders"

### Admin Experience

- Role-based admin portal, separate from the student dashboard
- View and filter all orders by status and payment state
- Verify and reconcile payments per order
- Toggle printer availability to pause new submissions when the print center is offline
- View date-range revenue reports, filterable by order, and export them as **CSV**

---

## Tech Stack

| Layer | Technology | Role |
|---|---|---|
| Frontend | React 18 + Vite | UI and client-side logic |
| Styling | Tailwind CSS | Utility-first styling |
| Backend | Node.js + Express | REST API and business logic |
| Database | MongoDB + Mongoose | Persistent storage (users, orders, files, settings) |
| Auth | JWT + bcryptjs | Stateless authentication and password hashing |
| File Uploads | Multer | Disk storage with automatic retention cleanup |
| Payments | Razorpay, PayPal Checkout SDK | Online payment processing and verification |
| Validation | Zod | Request schema validation |
| Package Management | npm Workspaces | Monorepo dependency management |
| Dev Tooling | Concurrently | Parallel client/server dev servers |
| Hosting | Vercel (client) | Frontend deployment |

---

## Project Structure

```
printease/
├── client/                       # React (Vite) frontend
│   └── src/
│       ├── components/           # Shared UI components (AppShell, ui primitives)
│       ├── pages/                # LoginPage, SignupPage, DashboardPage,
│       │                         # NewOrderPage, MyOrdersPage, AdminPage
│       └── lib/                  # api client, auth context, pricing, formatting
│
├── server/                       # Express + MongoDB backend
│   └── src/
│       ├── routes/               # auth, files, orders, payments, admin, meta
│       ├── models/                # User, Order, StoredFile, AppSetting
│       ├── middleware/            # JWT auth & admin guards
│       └── utils/                 # pricing engine, comment parser,
│                                   # settings helper, file retention job
│
├── .gitignore
├── package.json                  # Root workspace configuration & shared scripts
└── package-lock.json
```

The root `package.json` declares `server` and `client` as workspaces, enabling unified install and dev commands from the project root.

---

## Getting Started

### Prerequisites

- **Node.js** v18 or higher — [nodejs.org](https://nodejs.org/)
- **npm** v7 or higher (workspace support; ships with Node 16+)
- A **MongoDB** instance (local or MongoDB Atlas)
- **Razorpay** (and optionally PayPal) API credentials for payments
- A **Google Cloud** OAuth client (for the Google Drive file picker)

Verify installed versions before proceeding:

```bash
node -v
npm -v
```

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/Harshitjhamb/printease.git
   cd printease
   ```

2. Install all dependencies for the root, client, and server workspaces:

   ```bash
   npm run install:all
   ```

3. Create the required `.env` files (see [Environment Variables](#environment-variables)).

### Running the Application

Start both the frontend and backend in development mode with a single command:

```bash
npm run dev
```

This uses [concurrently](https://www.npmjs.com/package/concurrently) to run both processes in parallel, with output prefixed and color-coded by workspace (`server`, `client`).

| Process | Default URL |
|---|---|
| Backend (server) | http://localhost:8080 |
| Frontend (client) | http://localhost:5173 |

---

## Available Scripts

**Root-level** (run from the project root):

| Script | Description |
|---|---|
| `npm run dev` | Starts both client and server concurrently in development mode |
| `npm run install:all` | Installs dependencies for the root, client, and server workspaces |

**Workspace-specific:**

```bash
npm run dev -w server      # Start the backend only (auto-restarts on change)
npm run dev -w client      # Start the frontend only (Vite dev server)
npm run build -w client    # Production build of the frontend
npm start -w server        # Start the backend in production mode
```

---

## Environment Variables

**`server/.env`**

```env
PORT=8080
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key

# Razorpay
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# PayPal (optional)
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_ENV=sandbox   # or "live"

# Uploaded file retention, in days (deletes files from disk, keeps order metadata)
FILE_RETENTION_DAYS=7
```

**`client/.env`**

```env
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=your_google_api_key
```

Environment files are excluded from version control via `.gitignore`. Reference `.env.example` (present in `client/`) for the variables expected by each workspace.

---

## API Overview

All routes are mounted under `/api`. Authenticated routes require a `Bearer` JWT issued at signup/login; admin routes additionally require an admin-role account.

| Route | Description |
|---|---|
| `GET /api/health` | Health check |
| `POST /api/auth/signup`, `/api/auth/login` | Account creation and authentication |
| `POST /api/files/upload` | Upload a document (disk storage via Multer) |
| `GET /api/files/:id/view` | View an uploaded file inline |
| `POST /api/orders` | Create a print order from one or more uploaded files, with pricing calculated server-side |
| `POST /api/payments/razorpay/create-order` | Create a Razorpay order for a given print order |
| `POST /api/payments/razorpay/verify` | Verify Razorpay payment signature and mark order as paid |
| `POST /api/payments/paypal/create-order`, `/api/payments/paypal/capture` | PayPal order creation and capture flow |
| `GET /api/admin/orders` | List and filter all orders (admin only) |
| `GET /api/admin/revenue` | Date-range revenue report, exportable as CSV (admin only) |
| `GET /api/meta` | Public app/printer settings (e.g. printer availability) |

---

## Deployment

### Frontend — Vercel

The production frontend is live at: https://printease-client.vercel.app

1. Import the repository into [Vercel](https://vercel.com).
2. Set the **Root Directory** to `client`.
3. Add the environment variables from `client/.env` in the Vercel project settings.
4. Deploy — Vercel builds and serves the Vite/React app automatically.

### Backend — Node.js Hosting

The Express server can be deployed to any Node.js-compatible platform with persistent disk storage for uploads (e.g. Railway, Render, Fly.io). After deploying:

1. Set all variables listed in [`server/.env`](#environment-variables) on the hosting platform.
2. Ensure the MongoDB instance is reachable from the deployed server.
3. Update the client's API base URL (in `client/src/lib/api.js`) to point at the deployed backend.

---

## Contributing

Contributions, bug reports, and feature requests are welcome.

1. Fork the repository.
2. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Commit using descriptive messages:
   ```bash
   git commit -m "feat: add online payment support"
   ```
4. Push to your fork and open a Pull Request against `main`.

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`).

---

## License

This project is private, as defined in the root `package.json`. All rights reserved by [Harshitjhamb](https://github.com/Harshitjhamb).

---

## Contact

**Harshit Jhamb**

- Email: harshtihjamb03@gmail.com
- GitHub: https://github.com/Harshitjhamb

For bug reports or feature requests, please open an issue at https://github.com/Harshitjhamb/printease/issues.
