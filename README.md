# SASI AI Pulse

An AI-powered research assistant that collects AI research papers and industry news, detects duplicates, clusters related stories, ranks content for users, and generates concise summaries.

## Tech Stack

- Frontend: React, Vite, JavaScript, CSS
- Backend: Node.js, Express.js
- Database: MongoDB, Mongoose
- Research ingestion: arXiv API
- Processing: Clustering, personalized ranking, AI summaries

## Features

- Research paper and news ingestion
- Duplicate detection and clustering
- Personalized content feeds
- User profiles and topic preferences
- Feedback-based personalization
- AI-generated summaries

## Setup

Install dependencies in both the `backend` and `frontend` directories using `npm install`.

Configure backend environment variables in `backend/.env`. Never commit secrets.

Start the backend using its configured npm start script. Start the frontend with `npm run dev` from the `frontend` directory.

## Production Build

Run `npm run build` inside `frontend`.

## Status

Under development.
