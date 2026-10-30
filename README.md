SASI AI Pulse

An AI-powered research assistant for discovering relevant AI research papers and industry news.

SASI AI Pulse collects research papers and technology news, identifies potentially duplicate stories, clusters related content, generates AI-assisted summaries, and personalizes content feeds using user interests and feedback.

Features

* Research paper ingestion through the arXiv API.
* News ingestion from configured publisher feeds.
* Duplicate detection and news clustering.
* Personalized research and news feeds.
* User profiles and topic preferences.
* Feedback-based personalization.
* AI-assisted news summaries.
* MongoDB persistence.

Technology Stack

Component	Technology
Frontend	React, Vite, JavaScript, CSS
Backend	Node.js, Express.js
Database	MongoDB, Mongoose
Research ingestion	arXiv API
News ingestion	Configured publisher feeds
AI summarization	OpenRouter
Local orchestration	Docker Compose

Prerequisites

* Node.js and npm
* Docker and Docker Compose
* MongoDB
* OpenRouter credentials for AI summarization

Setup and Execution

1. Clone the repository and enter the project directory.
2. Install dependencies in the backend and frontend directories using npm install.
3. Configure the required environment variables in backend/.env.
4. Start the configured services using the existing Docker Compose configuration or the appropriate npm scripts.
5. Check backend health:
    curl -fsS http://localhost:3001/api/health
6. Start or access the frontend using its configured development server.
7. Sign in and inspect the research feed, news feed, profile, and feedback features.
8. Run the available backend checks and evaluation scripts.

Never commit environment files containing secrets.

Production Build

Run from the repository root:

npm run build --prefix frontend

Validate the Docker Compose configuration with:

docker compose config -q

Data Sources

Research metadata is collected from arXiv. Configured news sources include OpenAI, Google DeepMind, Microsoft Research, NVIDIA, TechCrunch, The Verge, MIT Technology Review, and Ars Technica.

Source availability and feed formats may change.

Evaluation

The evaluation plan covers:

* Paper-ranking Precision@10 and nDCG@10 using manually reviewed relevance labels.
* Cold-start versus post-feedback ranking.
* News-clustering quality and duplicate detection.
* Summary faithfulness against original sources.
* Feed response latency.
* Ingestion runtime, failures, retries, and duplicate prevention.

Evaluation artifacts are stored under backend/evaluation-results/. News-clustering review data can be generated using backend/evaluateNewsClustering.js.

Generated datasets are not proof of quality. Report metrics only after the required labels have been reviewed and the calculations completed. Record actual timings and test outcomes rather than assuming targets have passed.

Limitations

Recommendation quality depends on profile information and content metadata. Clustering can miss duplicates or merge unrelated stories. AI summaries can omit context or introduce unsupported claims. External services can affect availability and performance.

SASI AI Pulse is a research discovery aid, not a replacement for reading original sources.

Project Status

Under active development. A successful build or health check demonstrates basic operation, not production readiness or verified recommendation, clustering, and summary quality.

See docs/ARCHITECTURE.md for the system architecture, data flow, and evaluation requirements.