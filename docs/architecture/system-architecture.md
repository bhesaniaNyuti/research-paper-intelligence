# System Architecture

ResearchMind AI 2.0 is designed using a layered architecture with a clear separation between API, business logic, data access, and AI abstractions.

```
User
 ↓
Frontend
 ↓
FastAPI API
 ↓
Application Services
 ↓
┌───────────────────────────────┐
│ AI Intelligence Layer         │
│  - Document Processing       │
│  - Retrieval                 │
│  - Reranking                 │
│  - RAG                       │
│  - Knowledge Graph           │
│  - Agents                    │
│  - Prediction                │
└───────────────────────────────┘
 ↓
Data Layer
 - PostgreSQL
 - Vector DB
 - Neo4j
 - Object Storage
```

This foundation keeps Phase 1 minimal while allowing later additions without major refactor.
