# Reconnect 2.0 — Centralized Digital Lost & Found System

This version upgrades the original prototype into a working MVP.

## Included

- User registration and login
- JWT authentication
- PostgreSQL database
- User profiles
- Create lost/found item posts
- Image uploads
- Browse/search/filter items
- Item details
- Claim submission
- View your claims
- View your own posted items
- Claim status updates through the API
- Express REST API
- React + Vite + Tailwind frontend

## 1. PostgreSQL

Create a database called:

reconnect_db

Example using psql:

CREATE DATABASE reconnect_db;

Copy `backend/.env.example` to `backend/.env` and replace `YOUR_PASSWORD`.

## 2. Backend

Open terminal:

cd reconnect-full/backend
npm install

Initialize tables:

npm run db:init

Start server:

npm run dev

API:

http://localhost:5000

## 3. Frontend

Open a second terminal:

cd reconnect-full/frontend
npm install

Copy `.env.example` to `.env` if desired:

VITE_API_URL=http://localhost:5000/api

Start:

npm run dev

Open the URL shown by Vite, normally:

http://localhost:5173

## Important

Do not commit a real `.env` file or real JWT/database credentials to GitHub.

This is an MVP foundation. Production deployment should additionally use secure secrets, HTTPS, stronger validation, rate limiting, proper email verification/password reset, and cloud/object storage for images.
