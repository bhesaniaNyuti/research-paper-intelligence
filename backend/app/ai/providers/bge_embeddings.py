import asyncio
import hashlib
import logging
from typing import Any, List, Optional
import numpy as np

from backend.app.ai.interfaces.embeddings import EmbeddingProvider
from backend.app.core.config import settings

logger = logging.getLogger(__name__)


class BGEEmbeddingProvider(EmbeddingProvider):
    """
    Embedding provider utilizing BAAI/bge-small-en-v1.5 (384 dimensions).
    Features graceful fallback if sentence-transformers is not yet installed.
    """

    def __init__(
        self,
        model_name: Optional[str] = None,
        dimension: int = 384,
    ) -> None:
        self.model_name = model_name or settings.EMBEDDING_MODEL or "BAAI/bge-small-en-v1.5"
        self._dim = dimension
        self._model = None
        self._load_attempted = False
        self._model_timeout = 2.0

    def _get_model(self) -> Any:
        if self._model is not None:
            return self._model

        if not self._load_attempted:
            self._load_attempted = True
            try:
                from sentence_transformers import SentenceTransformer  # type: ignore

                logger.info(f"Loading SentenceTransformer model: {self.model_name}")
                self._model = SentenceTransformer(self.model_name)
                logger.info("SentenceTransformer loaded successfully.")
            except ImportError:
                logger.warning(
                    "sentence-transformers package not installed. Using fast deterministic feature projection."
                )
            except Exception as e:
                logger.warning(f"Could not load SentenceTransformer ({e}). Using feature projection fallback.")

        return self._model

    def _fallback_embed(self, text: str) -> List[float]:
        """
        Fast deterministic semantic projection into 384-dimensional unit vector.
        Preserves lexical n-gram similarity and cosine geometry for testing and zero-dep dev.
        """
        words = text.lower().split()
        vec = np.zeros(self._dim, dtype=np.float32)
        if not words:
            return vec.tolist()

        for i, word in enumerate(words):
            h = int(hashlib.md5(word.encode("utf-8")).hexdigest(), 16)
            idx = h % self._dim
            sign = 1.0 if ((h >> 8) % 2 == 0) else -1.0
            vec[idx] += sign

            # Also hash bigrams for sequence continuity
            if i > 0:
                bigram = f"{words[i-1]}_{word}"
                bh = int(hashlib.sha256(bigram.encode("utf-8")).hexdigest(), 16)
                bidx = bh % self._dim
                bsign = 1.0 if ((bh >> 8) % 2 == 0) else -1.0
                vec[bidx] += 1.5 * bsign

        norm = np.linalg.norm(vec)
        if norm > 1e-6:
            vec = vec / norm
        return vec.tolist()

    async def embed_text(self, text: str, **kwargs: Any) -> List[float]:
        try:
            model = await asyncio.wait_for(
                asyncio.to_thread(self._get_model),
                timeout=self._model_timeout,
            )
        except asyncio.TimeoutError:
            logger.warning("Embedding model load timed out. Using feature projection fallback.")
            model = None
        if model is not None:
            try:
                emb = await asyncio.wait_for(
                    asyncio.to_thread(model.encode, text, normalize_embeddings=True),
                    timeout=self._model_timeout,
                )
                return emb.tolist()
            except asyncio.TimeoutError:
                logger.warning("Embedding model inference timed out. Using feature projection fallback.")
            except Exception as e:
                logger.error(f"Error in model.encode: {e}. Falling back.")

        return self._fallback_embed(text)

    async def embed_documents(self, documents: List[str], **kwargs: Any) -> List[List[float]]:
        try:
            model = await asyncio.wait_for(
                asyncio.to_thread(self._get_model),
                timeout=self._model_timeout,
            )
        except asyncio.TimeoutError:
            logger.warning("Embedding model load timed out. Using feature projection fallback.")
            model = None
        if model is not None:
            try:
                embs = await asyncio.wait_for(
                    asyncio.to_thread(
                        model.encode,
                        documents,
                        normalize_embeddings=True,
                        batch_size=32,
                    ),
                    timeout=self._model_timeout,
                )
                return embs.tolist()
            except asyncio.TimeoutError:
                logger.warning("Embedding model inference timed out. Using feature projection fallback.")
            except Exception as e:
                logger.error(f"Error in batch model.encode: {e}. Falling back.")

        return [self._fallback_embed(doc) for doc in documents]

    def dimension(self) -> int:
        return self._dim

    async def health_check(self) -> bool:
        sample = await self.embed_text("research mind health check")
        return len(sample) == self._dim
