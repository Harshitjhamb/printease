# PrintEase — Online Xerox

> **PrintEase** is a full-stack web application that lets users upload documents online and get them printed at a local xerox/print center — no more waiting in queues.

**Live Demo:** [printease-client.vercel.app](https://printease-client.vercel.app)

---

## Table of Contents

- [About the Project](#about-the-project)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Application](#running-the-application)
- [Scripts](#scripts)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## About the Project

PrintEase is an **Online Xerox** platform that bridges the gap between users and print shops. Users can upload their documents from any device, configure print settings, and have them ready for pickup — eliminating the need to physically carry files to a print center.

The project is a **monorepo** with two workspaces:
- `client` — the frontend React application
- `server` — the backend Node.js API

---

## Features

- Upload documents for printing online
- Hassle-free integration with local xerox/print centers
- Configure print preferences before submitting
- Full-stack architecture with separate client and server
- Deployed on Vercel (client) with a dedicated backend server

---

## Tech Stack

| Layer    | Technology                     |
|----------|-------------------------------|
| Frontend | React.js (JavaScript)         |
| Backend  | Node.js (JavaScript)          |
| Tooling  | Concurrently, npm workspaces  |
| Hosting  | Vercel (client)               |

**Language breakdown:** JavaScript 99.5%, Other 0.5%

---

## Project Structure

```
printease/
├── client/             # React frontend application
├── server/             # Node.js backend API
├── .gitignore
├── package.json        # Root monorepo config (npm workspaces)
└── package-lock.json
```

The project uses **npm workspaces** to manage both `client` and `server` from the root `package.json`.

---

## Getting Started

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- npm (v7 or higher — required for workspace support)

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/Harshitjhamb/printease.git
   cd printease
   ```

2. **Install all dependencies** (root + client + server):

   ```bash
   npm run install:all
   ```

   This runs `npm install` at the root level and then installs dependencies for both the `server` and `client` workspaces.

### Running the Application

To start both the client and server simultaneously in development mode:

```bash
npm run dev
```

This uses [`concurrently`](https://www.npmjs.com/package/concurrently) to launch:
- **Server** — labeled `server` (green)
- **Client** — labeled `client` (blue)

Both processes run in parallel in the same terminal window.

---

## Scripts

The following scripts are available from the **root** of the project:

| Script              | Description                                              |
|---------------------|----------------------------------------------------------|
| `npm run dev`       | Starts both server and client in development mode        |
| `npm run install:all` | Installs dependencies for root, server, and client     |

> Individual `dev` scripts in each workspace can be run with:
> ```bash
> npm run dev -w server   # Run server only
> npm run dev -w client   # Run client only
> ```

---

## Environment Variables

Each workspace likely requires its own environment configuration. Create `.env` files in the respective directories:

**`server/.env`** (example):
```env
PORT=5000
# Add your database URL, JWT secret, etc.
```

**`client/.env`** (example):
```env
REACT_APP_API_URL=http://localhost:5000
# Add other client-side environment variables
```

> Never commit `.env` files to version control. The `.gitignore` already excludes them.

---

## Deployment

- **Client** is deployed on [Vercel](https://vercel.com) at: [printease-client.vercel.app](https://printease-client.vercel.app)
- **Server** should be deployed separately (e.g., Railway, Render, Heroku, or any Node.js-compatible host)

To deploy the client on Vercel:

1. Connect your GitHub repository to Vercel.
2. Set the **root directory** to `client`.
3. Add any required environment variables in the Vercel dashboard.
4. Deploy.

---

## Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository
2. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Make your changes and commit:
   ```bash
   git commit -m "feat: describe your change"
   ```
4. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
5. Open a Pull Request on GitHub

---

## License

This project is **private** (as defined in `package.json`). All rights reserved by [Harshitjhamb](https://github.com/Harshitjhamb).

---

> Made with ❤️ by [Harshitjhamb](https://github.com/Harshitjhamb)
