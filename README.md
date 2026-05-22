<div align="center">

# 🖨️ PrintEase — Online Xerox

### *Skip the queue. Print from anywhere.*

**PrintEase** is a modern, full-stack web application that reimagines the traditional xerox experience. Upload your documents from any device, set your print preferences, and walk straight to the counter — no more waiting in long queues or carrying USB drives.

<br/>

[![Live Demo](https://img.shields.io/badge/🌐%20Live%20Demo-printease--client.vercel.app-brightgreen?style=for-the-badge)](https://printease-client.vercel.app)
[![GitHub Repo](https://img.shields.io/badge/GitHub-Harshitjhamb%2Fprintease-181717?style=for-the-badge&logo=github)](https://github.com/Harshitjhamb/printease)
[![JavaScript](https://img.shields.io/badge/JavaScript-99.5%25-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://github.com/Harshitjhamb/printease)

</div>

---

## 📌 Table of Contents

- [About the Project](#-about-the-project)
- [Why PrintEase?](#-why-printease)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Application](#running-the-application)
- [Available Scripts](#-available-scripts)
- [Environment Variables](#-environment-variables)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)
- [Contact](#-contact)

---

## 🧩 About the Project

**PrintEase** is built to solve a common, everyday problem — the inefficiency of traditional print shops. Whether you're a student rushing to submit an assignment, a professional needing last-minute printouts, or anyone who's ever stood in an annoying queue at a xerox center, PrintEase is for you.

The application allows users to:
- Upload documents from any browser-enabled device
- Choose their print preferences (pages, copies, color/B&W, etc.)
- Submit the order online and simply collect the printout

Under the hood, PrintEase is a **JavaScript monorepo** powered by **npm workspaces**, with two isolated packages — a React frontend (`client`) and a Node.js backend (`server`) — running seamlessly together in development via `concurrently`.

---

## 💡 Why PrintEase?

| Traditional Xerox Center | PrintEase |
|--------------------------|-----------|
| 🕐 Wait in long queues | ✅ Upload in seconds, skip the queue |
| 💾 Carry a USB drive or phone | ✅ Upload from any device, anywhere |
| 🤷 Explain settings verbally | ✅ Configure preferences in the app |
| 😤 Rush during peak hours | ✅ Order ahead at your own pace |

---

## ✨ Features

- 📤 **Online Document Upload** — Upload files directly from your browser without needing physical media
- ⚙️ **Print Preferences** — Configure number of copies, page range, orientation, and color settings before submitting
- 🏪 **Print Center Integration** — Orders go straight to the print center, ready for pickup
- 🔄 **Full-Stack Architecture** — Decoupled React frontend and Node.js backend for scalability
- 📦 **Monorepo Setup** — Single repository with npm workspaces managing client and server
- ⚡ **Concurrent Dev Server** — One command launches both client and server simultaneously
- ☁️ **Cloud Deployed** — Client live on Vercel with a production-ready backend

---

## 🛠️ Tech Stack

| Layer        | Technology                          | Purpose                            |
|--------------|-------------------------------------|------------------------------------|
| **Frontend** | React.js                            | UI / client-side rendering         |
| **Backend**  | Node.js + Express                   | REST API / business logic          |
| **Tooling**  | npm Workspaces                      | Monorepo dependency management     |
| **Dev Tool** | Concurrently                        | Run client & server in parallel    |
| **Hosting**  | Vercel                              | Frontend deployment                |
| **Language** | JavaScript (99.5%)                  | Entire codebase                    |

---

## 📂 Project Structure

```
printease/
│
├── client/                  # ⚛️  React frontend application
│   ├── public/              #     Static assets
│   ├── src/                 #     Source code (components, pages, hooks)
│   └── package.json         #     Client-specific dependencies
│
├── server/                  # 🟢  Node.js backend API
│   ├── routes/              #     API route definitions
│   ├── controllers/         #     Request handlers / business logic
│   └── package.json         #     Server-specific dependencies
│
├── .gitignore               # Git ignored files
├── package.json             # Root monorepo config (workspaces + scripts)
└── package-lock.json        # Lockfile
```

> The root `package.json` defines both `client` and `server` as workspaces, allowing shared tooling and a single install command.

---

## 🚀 Getting Started

Follow these steps to run PrintEase locally on your machine.

### Prerequisites

Ensure the following are installed before proceeding:

- **Node.js** v16 or higher → [Download](https://nodejs.org/)
- **npm** v7 or higher (required for workspace support — ships with Node.js 16+)

Verify your versions:
```bash
node -v   # Should be >= 16.x
npm -v    # Should be >= 7.x
```

### Installation

**1. Clone the repository:**

```bash
git clone https://github.com/Harshitjhamb/printease.git
cd printease
```

**2. Install all dependencies** (root + client + server in one command):

```bash
npm run install:all
```

This runs `npm install` at the root and also installs dependencies for both the `server` and `client` workspaces automatically.

### Running the Application

Start both the frontend and backend simultaneously in development mode:

```bash
npm run dev
```

This uses [`concurrently`](https://www.npmjs.com/package/concurrently) to launch both processes in parallel:

| Process | Label | Color | Default URL |
|---------|-------|-------|-------------|
| Backend | `server` | 🟢 Green | `http://localhost:5000` |
| Frontend | `client` | 🔵 Blue | `http://localhost:3000` |

Both processes stream their logs in the same terminal window with color-coded labels.

---

## 📜 Available Scripts

### Root-level scripts (run from project root)

| Script | Command | Description |
|--------|---------|-------------|
| Start Dev | `npm run dev` | Launches both client and server concurrently |
| Install All | `npm run install:all` | Installs dependencies for root, client, and server |

### Workspace-specific scripts

You can target individual workspaces using the `-w` flag:

```bash
npm run dev -w server    # Start backend only
npm run dev -w client    # Start frontend only
```

---

## 🔐 Environment Variables

Each workspace requires its own environment configuration. Create the following `.env` files before running the app:

**`server/.env`**
```env
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL=your_database_connection_string

# Auth (if applicable)
JWT_SECRET=your_jwt_secret_key
```

**`client/.env`**
```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_ENV=development
```

> ⚠️ **Important:** Never commit `.env` files to version control. The `.gitignore` already excludes them. Always use `.env.example` files to document available variables for other developers.

---

## ☁️ Deployment

### Client (Vercel)

The frontend is live at: **[printease-client.vercel.app](https://printease-client.vercel.app)**

To deploy your own instance on Vercel:

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Set the **Root Directory** to `client`
4. Add all required environment variables from `client/.env` in the Vercel dashboard
5. Click **Deploy** — Vercel will build and serve your React app automatically

### Server (Node.js Hosting)

The backend can be deployed to any Node.js-compatible platform:

| Platform | Notes |
|----------|-------|
| [Railway](https://railway.app) | Free tier available, easy GitHub integration |
| [Render](https://render.com) | Free tier available, auto-deploys from GitHub |
| [Heroku](https://heroku.com) | Paid, robust and battle-tested |
| [Fly.io](https://fly.io) | Docker-based, generous free tier |

After deploying the server, update `REACT_APP_API_URL` in your Vercel environment variables to point to your production server URL.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome and appreciated!

**To contribute:**

1. **Fork** the repository
2. **Create** a new feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make** your changes with clear, descriptive commits:
   ```bash
   git commit -m "feat: add online payment support"
   ```
4. **Push** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
5. **Open a Pull Request** on GitHub and describe what you've changed

### Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Use for |
|--------|---------|
| `feat:` | New features |
| `fix:` | Bug fixes |
| `docs:` | Documentation changes |
| `refactor:` | Code refactoring |
| `chore:` | Tooling, config, or build changes |

---

## 📄 License

This project is marked as **private** (as defined in the root `package.json`). All rights reserved by [Harshitjhamb](https://github.com/Harshitjhamb).

---

## 📬 Contact

Have questions, suggestions, or just want to say hi? Feel free to reach out!

**Harshit Jhamb**

[![Email](https://img.shields.io/badge/Email-harshtihjamb03%40gmail.com-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:harshtihjamb03@gmail.com)
[![GitHub](https://img.shields.io/badge/GitHub-Harshitjhamb-181717?style=for-the-badge&logo=github)](https://github.com/Harshitjhamb)

> 💬 For bug reports or feature requests, please [open an issue](https://github.com/Harshitjhamb/printease/issues) on GitHub.

---

<div align="center">

Made with ❤️ by [Harshit Jhamb](https://github.com/Harshitjhamb)

⭐ If you found this project helpful, consider giving it a star on GitHub!

</div>
