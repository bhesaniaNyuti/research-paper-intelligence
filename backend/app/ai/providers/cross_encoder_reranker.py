import logging
import math
from typing import Any, List, Optional, Tuple
import numpy as np

from backend.app.ai.interfaces.reranker import RerankerProvider
from backend.app.core.config import settings

logger = logging.getLogger(__name__)


class CrossEncoderReranker(RerankerProvider):
    """
    Cross-Encoder Reranker using cross-encoder/ms-marco-MiniLM-L-6-v2.
    Evaluates deep query-document relevance to reorder top candidates.
    Features graceful fallback if sentence-transformers is not yet installed.
    """

    def __init__(self, model_name: Optional[str] = None) -> None:
        self.model_name = model_name or settings.RERANKER_MODEL or "cross-encoder/ms-marco-MiniLM-L-6-v2"
        self._model = None
        self._load_attempted = False

    def _get_model(self) -> Any:
        if self._model is not None:
            return self._model

        if not self._load_attempted:
            self._load_attempted = True
            try:
                from sentence_transformers import CrossEncoder  # type: ignore

                logger.info(f"Loading CrossEncoder model: {self.model_name}")
                self._model = CrossEncoder(self.model_name)
                logger.info("CrossEncoder loaded successfully.")
            except ImportError:
                logger.warning(
                    "sentence-transformers not installed. Using BM25 lexical alignment fallback for reranking."
                )
            except Exception as e:
                logger.warning(f"Could not load CrossEncoder ({e}). Using alignment fallback.")

        return self._model

    def _fallback_score(self, query: str, document: str) -> float:
        """
        Fast lexical and semantic coverage scoring when neural cross-encoder is offline.
        Measures exact match, term density, and position bonus.
        """
        q_tokens = [t.lower() for t in query.split() if len(t) > 2]
        doc_lower = document.lower()
        if not q_tokens or not doc_lower:
            return 0.0

        matches = 0
        density = 0.0
        for token in q_tokens:
            count = doc_lower.count(token)
            if count > 0:
                matches += 1
                density += min(count, 5) * (1.0 / (1.0 + math.log(1.0 + len(token))))

        match_ratio = matches / len(q_tokens)
        score = (0.6 * match_ratio) + (0.4 * min(density / 10.0, 1.0))
        # Sigmoid scaling
        return 1.0 / (1.0 + math.exp(-6.0 * (score - 0.5)))

    async def score_pairs(self, query: str, documents: List[str]) -> List[float]:
        """Returns raw relevance scores for each query-document pair."""
        if not documents:
            return []

        model = self._get_model()
        if model is not None:
            try:
                pairs = [[query, doc] for doc in documents]
                scores = model.predict(pairs)
                # Normalize scores to 0-1 range
                if isinstance(scores, np.ndarray):
                    norm_scores = 1.0 / (1.0 + np.exp(-scores))
                    return norm_scores.tolist()
                return [float(s) for s in scores]
            except Exception as e:
                logger.error(f"Error in CrossEncoder.predict: {e}. Using fallback.")

        return [self._fallback_score(query, doc) for doc in documents]

    async def rerank(self, query: str, documents: List[str], **kwargs: Any) -> List[int]:
        """
        Reranks documents and returns the permutation of indices sorted by relevance descending.
        """
        if not documents:
            return []

        scores = await self.score_pairs(query, documents)
        # Pair with original indices and sort descending
        indexed_scores: List[Tuple[int, float]] = list(enumerate(scores))
        indexed_scores.sort(key=lambda x: x[1], reverse=True)
        return [idx for idx, _ in indexed_scores]
