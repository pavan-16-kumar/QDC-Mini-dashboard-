# 👕 QDC Mini Dashboard: Local Setup & Developer Guide

This repository contains a lightweight, functional slice of **QDC (Quick Dry Cleaning Software)**, a B2B POS and business management app for retail laundry and dry-cleaning stores. It simulates a modular multi-tier application with a NestJS backend and a React frontend connected via TypeScript.

---

## 📋 Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Step-by-Step Local Setup](#2-step-by-step-local-setup)
3. [Running Individual Modules](#3-running-individual-modules)
4. [Port Mapping & Verification](#4-port-mapping--verification)
5. [Troubleshooting & FAQs](#5-troubleshooting--faqs)
6. [Architecture & Flow](#6-architecture--flow)

---

## 🛠️ 1. Prerequisites

Before setting up the project locally, ensure you have the following installed on your system:

*   **Node.js**: Version `18.x` or `20.x` (LTS is highly recommended).
*   **npm**: Version `9.x` or higher (which natively supports npm workspaces).

To check your current versions, run the following in your terminal:
```bash
node -v
npm -v
```

---

## ⚙️ 2. Step-by-Step Local Setup

Follow these commands in your terminal to get the full application up and running locally.

### Step 2.1: Clone & Navigate to the Project Root
Open your terminal and navigate to the project directory:
```bash
cd /Users/pavankumar/assignment-13-1780050387207
```

### Step 2.2: Install Workspace Dependencies
This project uses **npm workspaces** to manage packages for both the frontend (`client`) and backend (`server`) modules in one command. Run:
```bash
npm run install-all
```
*(This triggers `npm install --workspaces` under the hood, placing shared dependencies in the root `node_modules` while symlinking the local workspaces).*

### Step 2.3: Start the System (Frontend + Backend Concurrently)
Start both development servers concurrently with hot-reloading active:
```bash
npm run dev
```
*(This launches the NestJS API server on **port 3001** and the React client app on **port 3000** simultaneously using `concurrently`)*.

---

## 🧩 3. Running Individual Modules

If you want to run or debug the backend API or frontend UI separately, use these workspace-specific scripts:

### Run the Backend (NestJS Server) Only
```bash
npm run server
```
*   **Path**: `server/`
*   **Console Output**: You should see NestJS bootstrap logs ending with `Server running on http://localhost:3001`.

### Run the Frontend (React Client) Only
```bash
npm run client
```
*   **Path**: `client/`
*   **Console Output**: Compiles the React project and opens `http://localhost:3000` in your web browser.

---

## 🔌 4. Port Mapping & Verification

Once the dev servers are running, the application maps to the following local services:

| Service | Port | Endpoint URL | Test command (cURL) |
| :--- | :--- | :--- | :--- |
| **React Client UI** | `3000` | [http://localhost:3000](http://localhost:3000) | `curl -I http://localhost:3000` |
| **Backend REST API (All Orders)** | `3001` | [http://localhost:3001/api/orders](http://localhost:3001/api/orders) | `curl http://localhost:3001/api/orders` |
| **Backend REST API (Single Order)** | `3001` | [http://localhost:3001/api/orders/ORD-1001](http://localhost:3001/api/orders/ORD-1001) | `curl http://localhost:3001/api/orders/ORD-1001` |

---

## 🩺 5. Troubleshooting & FAQs

### ⚠️ Issue: Port `3000` or `3001` is already in use
*   **Reason**: Another development server or background process is running on these ports.
*   **Solution**: Find and terminate the process using:
    ```bash
    # Find process on port 3000
    lsof -i :3000
    # Find process on port 3001
    lsof -i :3001
    
    # Kill the process using the PID returned
    kill -9 <PID>
    ```

### ⚠️ Issue: `node_modules` conflicts or dependency issues
*   **Solution**: Clean your setup and reinstall:
    ```bash
    # Remove existing node_modules from root, client, and server
    rm -rf node_modules client/node_modules server/node_modules package-lock.json
    
    # Reinstall everything cleanly
    npm run install-all
    ```

---

## 📄 6. Architecture & Flow

For a complete breakdown of the codebase, modules, reactive states, and detailed guides on how to implement new features or upgrade the visual aesthetic of the dashboard, see the unified project documentation:

👉 **[Read the complete Project Overview & Architecture Guide](file:///Users/pavankumar/assignment-13-1780050387207/PROJECT_OVERVIEW.md)**
