# AI Architecture

Phase 1 defines provider abstractions, not implementations.

- `LLMProvider`: generic interface for language model generation and structured output.
- `EmbeddingProvider`: generic interface for text and document embeddings.
- `RerankerProvider`: generic interface for ranking relevance scores.
- `BasePredictor`: generic interface for model training, inference, and persistence.

This provider pattern ensures the business layer can switch between OpenAI-compatible APIs, local models, or future providers without changing endpoint logic.
