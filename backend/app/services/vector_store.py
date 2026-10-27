import logging
import os
import uuid
from typing import Any, Dict, List, Optional
from qdrant_client import QdrantClient
from qdrant_client.http import models as rest_models

from backend.app.core.config import settings
from backend.app.schemas.paper import PaperCreate, PaperOut

logger = logging.getLogger(__name__)


class QdrantVectorStore:
    """
    Manages Qdrant vector database interactions.
    Supports zero-setup embedded local storage or remote Qdrant instances.
    """

    def __init__(
        self,
        collection_name: Optional[str] = None,
        dimension: int = 384,
    ) -> None:
        self.collection_name = collection_name or settings.QDRANT_COLLECTION_NAME
        self.dimension = dimension
        self._client: Optional[QdrantClient] = None

    @property
    def client(self) -> QdrantClient:
        if self._client is None:
            if settings.VECTOR_DB_URL:
                logger.info(f"Connecting to remote Qdrant at {settings.VECTOR_DB_URL}")
                self._client = QdrantClient(url=settings.VECTOR_DB_URL)
            elif settings.QDRANT_STORAGE_PATH == ":memory:":
                logger.info("Initializing in-memory Qdrant storage")
                self._client = QdrantClient(":memory:")
            else:
                try:
                    storage_path = settings.QDRANT_STORAGE_PATH
                    os.makedirs(storage_path, exist_ok=True)
                    logger.info(f"Initializing embedded local Qdrant storage at {storage_path}")
                    self._client = QdrantClient(path=storage_path)
                except Exception as e:
                    logger.warning(
                        f"Could not lock local storage ({e}). Using in-memory Qdrant storage."
                    )
                    self._client = QdrantClient(":memory:")

            self._ensure_collection()
        return self._client


    def _ensure_collection(self) -> None:
        """Creates the collection if it doesn't already exist."""
        try:
            collections = self.client.get_collections().collections
            exists = any(c.name == self.collection_name for c in collections)
            if not exists:
                logger.info(f"Creating Qdrant collection: {self.collection_name} (dim={self.dimension})")
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=rest_models.VectorParams(
                        size=self.dimension,
                        distance=rest_models.Distance.COSINE,
                    ),
                )
        except Exception as e:
            logger.error(f"Error ensuring Qdrant collection: {e}")

    def _to_uuid(self, custom_id: str) -> str:
        """Derive a stable deterministic UUID from string ID for Qdrant point storage."""
        return str(uuid.uuid5(uuid.NAMESPACE_DNS, custom_id))

    async def upsert_papers(
        self,
        papers: List[PaperCreate],
        embeddings: List[List[float]],
    ) -> int:
        """Upserts a batch of papers along with their embeddings."""
        if not papers or not embeddings or len(papers) != len(embeddings):
            return 0

        points = []
        for paper, vec in zip(papers, embeddings):
            point_id = self._to_uuid(paper.id)
            payload = paper.model_dump()
            points.append(
                rest_models.PointStruct(
                    id=point_id,
                    vector=vec,
                    payload=payload,
                )
            )

        try:
            self.client.upsert(
                collection_name=self.collection_name,
                points=points,
            )
            return len(points)
        except Exception as e:
            logger.error(f"Failed to upsert papers to Qdrant: {e}")
            return 0

    async def search_vectors(
        self,
        query_vector: List[float],
        limit: int = 20,
        score_threshold: Optional[float] = None,
    ) -> List[PaperOut]:
        """Searches Qdrant collection using dense vector similarity."""
        try:
            # Query points using the query_points API or search API
            search_result = self.client.query_points(
                collection_name=self.collection_name,
                query=query_vector,
                limit=limit,
                score_threshold=score_threshold,
                with_payload=True,
            ).points

            papers: List[PaperOut] = []
            for hit in search_result:
                if hit.payload:
                    payload = dict(hit.payload)
                    payload["semantic_score"] = round(
                        max(0.0, min(1.0, float(hit.score))),
                        4,
                    )
                    papers.append(PaperOut(**payload))
            return papers
        except Exception as e:
            logger.error(f"Error searching Qdrant vectors: {e}")
            return []

    async def get_paper_by_id(self, paper_id: str) -> Optional[PaperOut]:
        """Fetches a single paper by its identifier."""
        try:
            point_id = self._to_uuid(paper_id)
            records = self.client.retrieve(
                collection_name=self.collection_name,
                ids=[point_id],
                with_payload=True,
            )
            if records and records[0].payload:
                return PaperOut(**records[0].payload)
        except Exception as e:
            logger.error(f"Error fetching paper {paper_id}: {e}")
        return None

    async def get_total_count(self) -> int:
        """Returns total number of papers indexed."""
        try:
            info = self.client.get_collection(collection_name=self.collection_name)
            return int(info.points_count or 0)
        except Exception as e:
            logger.warning(f"Could not retrieve collection count: {e}")
            return 0


# Singleton vector store instance
vector_store = QdrantVectorStore()
