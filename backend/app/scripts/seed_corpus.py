import argparse
import asyncio
import logging
from typing import List

from backend.app.ai.providers.bge_embeddings import BGEEmbeddingProvider
from backend.app.schemas.paper import PaperCreate
from backend.app.services.academic_client import academic_client
from backend.app.services.vector_store import vector_store

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Curated core topics for high-impact AI research papers
CORE_TOPICS = [
    "attention is all you need transformer language models",
    "retrieval augmented generation dense passage retrieval",
    "deep learning computer vision convolutional residual networks",
    "generative adversarial diffusion models text to image",
    "reinforcement learning human feedback direct preference optimization",
    "knowledge graph embedding reasoning multi hop",
    "state space models mamba efficient long context",
    "mixture of experts sparse routing llm",
]


async def seed_corpus(limit_per_topic: int = 5) -> None:
    logger.info("Initializing ResearchMind AI 2.0 Corpus Seeding...")
    embedding_provider = BGEEmbeddingProvider()

    all_papers: List[PaperCreate] = []
    seen_ids = set()

    for topic in CORE_TOPICS:
        logger.info(f"Fetching papers for topic: '{topic}'")
        papers = await academic_client.search_arxiv(query=topic, limit=limit_per_topic)
        for p in papers:
            if p.id not in seen_ids:
                seen_ids.add(p.id)
                all_papers.append(p)

    logger.info(f"Retrieved {len(all_papers)} unique papers. Generating embeddings...")
    texts = [f"{p.title}\n{p.abstract}" for p in all_papers]
    embeddings = await embedding_provider.embed_documents(texts)

    logger.info("Upserting papers into Qdrant vector database...")
    count = await vector_store.upsert_papers(all_papers, embeddings)
    total_in_db = await vector_store.get_total_count()

    logger.info(f"Successfully indexed {count} papers. Total papers in vector store: {total_in_db}")
    if vector_store._client is not None:
        vector_store._client.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed ResearchMind AI 2.0 vector database with landmark papers")
    parser.add_argument("--limit-per-topic", type=int, default=5, help="Number of papers per topic to fetch")
    args = parser.parse_args()

    asyncio.run(seed_corpus(limit_per_topic=args.limit_per_topic))


if __name__ == "__main__":
    main()
