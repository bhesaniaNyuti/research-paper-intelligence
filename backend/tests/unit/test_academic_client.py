from backend.app.services.academic_client import AcademicClient

SAMPLE_ARXIV_XML = """<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:arxiv="http://arxiv.org/schemas/atom">
  <entry>
    <id>http://arxiv.org/abs/2301.12345v1</id>
    <title>Scaling Test-Time Compute in Large Language Models</title>
    <summary>We propose a novel framework that improves reasoning capabilities by allocating compute dynamically at inference time rather than parameter pretraining.</summary>
    <author><name>Jane Doe</name></author>
    <author><name>John Smith</name></author>
    <published>2024-01-15T12:00:00Z</published>
    <arxiv:doi>10.1234/test.doi</arxiv:doi>
    <category term="cs.AI"/>
    <category term="cs.LG"/>
    <link href="http://arxiv.org/pdf/2301.12345v1" rel="related" type="application/pdf" title="pdf"/>
  </entry>
</feed>
"""


def test_parse_arxiv_atom():
    client = AcademicClient()
    papers = client._parse_arxiv_atom(SAMPLE_ARXIV_XML)

    assert len(papers) == 1
    p = papers[0]
    assert p.id == "2301.12345"
    assert "Scaling Test-Time Compute" in p.title
    assert "Jane Doe" in p.authors
    assert "John Smith" in p.authors
    assert p.year == 2024
    assert "cs.AI" in p.categories
    assert p.doi == "10.1234/test.doi"
    assert "2301.12345v1" in p.url
