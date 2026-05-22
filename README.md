# PrintEase — Online Xerox

PrintEase is a full-stack web application that modernizes the document printing experience. Users upload their files online, configure print preferences, and collect their printouts from a local print center — eliminating the need to physically carry storage devices or wait in queues.

**Live Application:** https://printease-client.vercel.app

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
- [Available Scripts](#available-scripts)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

---

## About the Project

PrintEase addresses the inefficiency of conventional print centers by enabling users to submit print jobs remotely. Rather than visiting a shop with a USB drive, users upload documents from any browser-enabled device, specify their requirements, and collect the finished printout at their convenience.

The application is structured as a **JavaScript monorepo** using npm workspaces, with two isolated packages — a React-based frontend (`client`) and a Node.js backend (`server`) — coordinated from a single root configuration.

---

## Features

- Online document upload from any browser-enabled device
- Configurable print preferences including copies, page range, orientation, and color mode
- Direct order submission to the print center for immediate processing
- Decoupled client-server architecture for independent scalability
- Single-command development environment launching both services concurrently
- Frontend deployed to Vercel with a dedicated backend service

---

## Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| Frontend | React.js (JavaScript) | User interface and client-side logic |
| Backend | Node.js | REST API and server-side business logic |
| Package Management | npm Workspaces | Monorepo dependency management |
| Dev Tooling | Concurrently | Parallel execution of client and server |
| Hosting | Vercel | Frontend deployment |

Language composition: JavaScript 99.5%, Other 0.5%

---

## Project Structure

```
printease/
├── client/                  # React frontend application
│   ├── public/              # Static assets
│   ├── src/                 # Components, pages, and application logic
│   └── package.json         # Client-specific dependencies and scripts
│
├── server/                  # Node.js backend API
│   ├── routes/              # API route definitions
│   ├── controllers/         # Request handlers and business logic
│   └── package.json         # Server-specific dependencies and scripts
│
├── .gitignore
├── package.json             # Root monorepo configuration (workspaces, shared scripts)
└── package-lock.json
```

The root `package.json` declares both `client` and `server` as workspaces, enabling shared tooling and unified install commands from the project root.

---

## Getting Started

The following instructions will set up PrintEase locally for development and testing.

### Prerequisites

- **Node.js** v16 or higher — [nodejs.org](https://nodejs.org/)
- **npm** v7 or higher (npm Workspace support requires v7+; ships with Node.js 16+)

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

### Running the Application

Start both the frontend and backend in development mode with a single command:

```bash
npm run dev
```

This uses [concurrently](https://www.npmjs.com/package/concurrently) to launch both processes in parallel within the same terminal session. Output from each process is prefixed and color-coded by workspace name (`server`, `client`) for readability.

| Process | Default URL |
|---------|-------------|
| Backend (server) | http://localhost:5000 |
| Frontend (client) | http://localhost:3000 |

---

## Available Scripts

**Root-level** (run from the project root):

| Script | Description |
|--------|-------------|
| `npm run dev` | Starts both client and server concurrently in development mode |
| `npm run install:all` | Installs dependencies for the root, client, and server workspaces |

**Workspace-specific** (target a single package using the `-w` flag):

```bash
npm run dev -w server    # Start the backend only
npm run dev -w client    # Start the frontend only
```

---

## Environment Variables

Each workspace requires its own environment file. Create the following before running the application:

**`server/.env`**
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=your_database_connection_string
JWT_SECRET=your_jwt_secret_key
```

**`client/.env`**
```env
REACT_APP_API_URL=http://localhost:5000
```

Environment files must never be committed to version control. The repository `.gitignore` already excludes `.env` files. It is recommended to maintain a `.env.example` file in each workspace to document available variables for other contributors.

---

## Deployment

### Frontend — Vercel

The production frontend is live at: https://printease-client.vercel.app

To deploy a new instance:

1. Import the repository into [Vercel](https://vercel.com).
2. Set the **Root Directory** to `client`.
3. Add the required environment variables from `client/.env` in the Vercel project settings.
4. Deploy. Vercel will handle the build and serve the React application automatically.

### Backend — Node.js Hosting

The server can be deployed to any Node.js-compatible platform. Recommended options:

| Platform | Notes |
|----------|-------|
| [Railway](https://railway.app) | GitHub integration, free tier available |
| [Render](https://render.com) | Auto-deploy from GitHub, free tier available |
| [Fly.io](https://fly.io) | Docker-based deployment, generous free tier |
| [Heroku](https://heroku.com) | Established platform, paid plans |

After deploying the backend, update the `REACT_APP_API_URL` environment variable in Vercel to point to the production server URL.

---

## Contributing

Contributions, bug reports, and feature requests are welcome. To contribute code:

1. Fork the repository.
2. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Commit your changes using descriptive messages:
   ```bash
   git commit -m "feat: add online payment support"
   ```
4. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
5. Open a Pull Request against the `main` branch.

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification. Please use the appropriate prefix (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`) in commit messages.

---

## License

This project is private, as defined in the root `package.json`. All rights reserved by [Harshitjhamb](https://github.com/Harshitjhamb).

---

## Contact

**Harshit Jhamb**

- Email: harshtihjamb03@gmail.com
- GitHub: https://github.com/Harshitjhamb

For bug reports or feature requests, please open an issue at https://github.com/Harshitjhamb/printease/issues.
