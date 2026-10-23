import pytest
from starlette.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_search_endpoint_with_mock_data():
    # 1. First ingest a test paper so it is indexed
    sample_paper = {
        "id": "test.2401.0001",
        "title": "Deep Graph Attention Networks for Molecular Discovery",
        "abstract": "We propose a novel deep graph attention architecture that outperforms traditional graph neural networks on chemical solubility benchmarks. However, scalability to billion-node graphs remains an open challenge.",
        "authors": ["Alice Chen", "Bob Davis"],
        "year": 2024,
        "categories": ["cs.AI", "q-bio.BM"],
        "source": "arxiv",
    }
    ingest_resp = client.post("/api/v1/papers/ingest", json=sample_paper)
    assert ingest_resp.status_code == 201

    # 2. Retrieve paper by ID
    get_resp = client.get("/api/v1/papers/test.2401.0001")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == "test.2401.0001"
    assert get_resp.json()["title"] == sample_paper["title"]

    # 3. Hybrid search
    search_payload = {
        "query": "graph attention molecular discovery",
        "limit": 5,
        "use_reranker": True,
        "hybrid_weight": 0.7,
        "fetch_live": False,  # disable network in unit test
    }
    search_resp = client.post("/api/v1/search", json=search_payload)
    assert search_resp.status_code == 200
    data = search_resp.json()
    assert "results" in data
    assert len(data["results"]) >= 1
    top_hit = data["results"][0]
    assert top_hit["id"] == "test.2401.0001"
    assert top_hit["semantic_score"] is not None
    assert top_hit["rerank_score"] is not None


def test_research_evidence_endpoint():
    resp = client.get("/api/v1/research/evidence?query=graph+attention&limit=3")
    assert resp.status_code == 200
    data = resp.json()
    assert "evidence" in data
    assert "summary_insight" in data


def test_research_compare_endpoint():
    compare_payload = {
        "paper_ids": ["test.2401.0001", "test.2401.0002"]
    }
    resp = client.post("/api/v1/research/compare", json=compare_payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "dimensions" in data
    assert len(data["dimensions"]) >= 3
    assert "synthesis" in data


def test_research_synthesize_endpoint():
    synth_payload = {
        "topic": "Graph Neural Networks and Attention",
        "max_papers": 3,
    }
    resp = client.post("/api/v1/research/synthesize", json=synth_payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "executive_summary" in data
    assert "themes" in data
    assert "open_questions_and_gaps" in data


def test_paper_summary_endpoint():
    resp = client.get("/api/v1/research/summary/test.2401.0001")
    assert resp.status_code == 200
    data = resp.json()
    assert data["paper_id"] == "test.2401.0001"
    assert "one_line_summary" in data
    assert "core_objective" in data
    assert "methodology_overview" in data


def test_chat_with_papers_endpoint():
    chat_payload = {
        "message": "What is the core methodology of graph attention networks?",
        "paper_ids": ["test.2401.0001"],
    }
    resp = client.post("/api/v1/research/chat", json=chat_payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "answer" in data
    assert len(data["cited_papers"]) >= 1
    assert len(data["suggested_followups"]) >= 1

