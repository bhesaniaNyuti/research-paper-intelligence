# Data Flow

1. Client sends request to FastAPI endpoint.
2. API router forwards to service layer.
3. Service uses schemas, repositories, and AI providers.
4. The data layer persists to PostgreSQL or interacts with future vector and graph stores.
5. Responses are serialized via Pydantic and returned to the client.

Future steps will add document ingestion, embedding creation, vector search, and knowledge graph lookups into this flow.
