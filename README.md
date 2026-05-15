# Ocean 🌊

Ocean is a powerful, minimalist block-based editor and workspace platform inspired by modern productivity tools. Built with a focus on speed, aesthetics, and real-time collaboration, it provides a seamless environment for thinking, writing, and organizing.

## ✨ Features

- **Block-Based Editing**: A flexible editor where everything is a block (Text, Images, Headers). Move and manipulate content with ease.
- **Dynamic Workspaces**: Organize your life into multiple workspaces, each with its own hierarchy of nested pages.
- **Real-Time Synchronization**: Powered by Firebase, your data syncs instantly across devices. Includes robust offline support for uninterrupted productivity.
- **Ocean Aesthetic**: A refined, dark-mode-first interface featuring smooth transitions, glassmorphism accents, and a calming color palette.
- **Google Authentication**: Quick and secure access via Google Sign-In.
- **Emoji Personalization**: Express yourself with full emoji support for page icons.
- **Lightning Search**: Quickly navigate through your notes and workspaces with a unified search interface.

## 🚀 Tech Stack

- **Frontend**: React 19 + TypeScript
- **State Management**: Zustand
- **Database & Sync**: Firebase Firestore (Enterprise Edition)
- **Authentication**: Firebase Auth (Google)
- **Storage**: Firebase Storage (for media assets)
- **Styling**: Tailwind CSS 4
- **Animations**: Framer Motion
- **Routing**: React Router 7
- **Editor Core**: Custom block system with `fractional-indexing` for robust reordering.

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18+)
- A Firebase Project (Firestore, Auth, and Storage enabled)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd ocean
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory (refer to `.env.example`):
   ```env
   VITE_API_KEY=your_firebase_api_key
   VITE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_PROJECTID=your_project_id
   VITE_STORAGE_BUCKET=your_project.firebasestorage.app
   VITE_MESSAGING_SENDER_ID=your_sender_id
   VITE_APPID=your_app_id
   VITE_FIRESTORE_DATABASE_ID=your_database_id
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## 🏗️ Architecture

- **`src/lib/store.ts`**: The central brain of the application, managing active page states, block data, and optimistic updates.
- **`src/lib/sync.ts`**: Handles the complex logic of bidirectional sync between local Zustand state and Firestore.
- **`src/components/editor/`**: Contains the block-based editor components, including individual block nodes and specialized content types.
- **`src/components/sidebar/`**: Manages workspace navigation, page trees, and hierarchy rendering.

## 📜 License

This project is open source. Do whatever you want with it! 🌊
