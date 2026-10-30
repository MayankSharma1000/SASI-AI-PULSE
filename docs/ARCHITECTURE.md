SASI AI Pulse Architecture

1. Overview

SASI AI Pulse is a research and news discovery application. External sources supply research papers and technology news. The backend normalizes and stores incoming content, identifies potentially related news, generates AI-assisted summaries, and ranks content according to user preferences.

2. System Architecture

flowchart TD
    USER[User] --> UI[React and Vite Frontend]
    UI --> API[Node.js and Express API]
    API --> AUTH[Authentication and Profile Routes]
    API --> ITEMS[Item Routes]
    API --> FEEDBACK[Feedback Routes]
    AUTH --> DB[(MongoDB)]
    ITEMS --> RANK[Ranking Service]
    RANK --> DB
    FEEDBACK --> DB
    ARXIV[arXiv API] --> PAPER[Research Ingestion]
    FEEDS[Configured News Feeds] --> NEWS[News Ingestion]
    PAPER --> DB
    NEWS --> CLUSTER[News Clustering]
    CLUSTER --> DB
    NEWS --> SUMMARY[Summary Service]
    SUMMARY --> AI[OpenRouter]
    AI --> SUMMARY
    SUMMARY --> DB

This diagram represents logical components and their relationships. It does not imply that every operation executes synchronously.

3. Component Responsibilities

Frontend

The React application provides the interface for browsing research and news, viewing personalized content, and interacting with profiles and feedback. Vite supports development and production builds.

Backend API

The Express application exposes endpoints for items, profiles, authentication, and feedback. Protected operations should enforce authentication and appropriate profile ownership checks.

Research Ingestion

The research ingestion process retrieves metadata and abstracts from the arXiv API and stores normalized paper records.

News Ingestion

Configured publisher feeds supply news records. Incoming content is normalized before persistence. Feed failures and partial ingestion should be tracked.

Database

MongoDB stores research papers, news items, profiles, and application state. Mongoose defines the schemas and database access layer.

Personalized Ranking

The ranking service scores eligible items using available profile information and feedback signals, including interests, topic tags, title and summary matches, project-description tokens, liked content, and freshness.

Dismissed items may be excluded from recommendations.

The scoring algorithm is not proof of recommendation quality. Quality must be measured against human-reviewed relevance labels.

News Clustering

The clustering service compares news records using configured similarity logic and thresholds. Similarity identifies potentially related stories but does not prove that two articles describe the same event.

Summarization

The summary service selects eligible news items and requests summaries from the configured AI provider. Generated summaries must be checked against their source material. Insufficient source text, provider failures, and unsupported claims are important failure cases.

Profiles and Feedback

User profiles store interests and project descriptions. Feedback may include liked topics, liked items, saved items, and dismissed items. Applicable feedback signals can influence subsequent ranking.

4. Data Flow

1. A user opens the frontend.
2. The frontend sends requests to the Express API.
3. The backend retrieves eligible records from MongoDB.
4. The ranking service scores content using the relevant user profile.
5. The API returns ranked content to the frontend.
6. Separate ingestion processes retrieve research papers and news.
7. Incoming records are normalized and persisted.
8. News clustering identifies potentially related records.
9. Eligible news items may be summarized through the AI provider.
10. User feedback is stored for subsequent requests.

5. Main Data Entities

The item model includes fields such as type, externalId, title, source, publishedAt, url, authors, topicTags, rawText, summary, embedding, and clusterId.

The user-profile model includes a user identifier, interests, project description, liked topics, liked items, saved items, and dismissed items.

The authoritative schemas are:

* backend/src/models/Item.js
* backend/src/models/UserProfile.js

6. External Dependencies

Dependency	Purpose	Potential risks
arXiv API	Research metadata	Availability, rate limits, response changes
Publisher feeds	News discovery	Outages and malformed feeds
MongoDB	Persistence	Connection and query failures
OpenRouter	AI summaries	Quota, latency, provider errors, inaccurate output

7. Evaluation Plan

Recommendation Quality

Evaluate papers from a defined seven-day period using human-reviewed relevance labels. Calculate Precision@10 and nDCG@10 for personalized ranking and a keyword baseline. Compare cold-start and post-feedback results across multiple profiles.

Clustering Quality

Manually review candidate article pairs. Record false merges and missed duplicates. Generating a review CSV does not complete the evaluation until labels have been supplied and analyzed.

Summary Faithfulness

Compare generated summaries with their original sources. Record unsupported claims and whether automated checks detect them. Valid formatting does not establish factual accuracy.

Feed Latency

Measure repeated requests to the actual feed endpoint. Record sample size, median latency, p95 latency, and failures. Compare the results with the two-second target.

Ingestion Reliability

Record elapsed time, records processed, source failures, and retries. Test repeated ingestion for duplicate prevention and controlled transient failures for retry behavior.

Reporting

Record dataset windows, sample sizes, procedures, results, and limitations. Distinguish automatically generated artifacts from human-reviewed evidence. Do not mark quality targets as passed without measurements.

8. Security and Limitations

* Store credentials in environment variables.
* Do not commit secrets or private user data.
* Enforce authentication and profile ownership.
* Validate incoming requests and external content.
* Treat external content and AI-generated text as untrusted.
* Do not claim production readiness solely from successful builds or health checks.

9. Implementation References

* backend/src/models/Item.js
* backend/src/models/UserProfile.js
* backend/src/services/rankingService.js
* backend/src/services/summaryService.js
* backend/src/services/aiService.js
* backend/src/routes/itemRoutes.js
* backend/src/routes/profileRoutes.js
* backend/src/routes/feedbackRoutes.js
* backend/evaluateNewsClustering.js