import asyncio
from datetime import datetime, timezone
from bs4 import BeautifulSoup
from main import parse_certifications, parse_timeline_page, resolve_user_runtime_limits


class FakeElement:
    """Lightweight async Playwright ElementHandle adapter backed by BeautifulSoup."""

    def __init__(self, tag):
        self._tag = tag

    async def get_attribute(self, name: str):
        val = self._tag.get(name)
        if isinstance(val, list):
            return " ".join(val)
        return val

    async def inner_text(self) -> str:
        return self._tag.get_text()

    async def query_selector(self, selector: str):
        found = self._tag.select_one(selector)
        return FakeElement(found) if found else None


class FakePage:
    """Lightweight async Playwright Page adapter for deterministic HTML unit testing."""

    def __init__(self, html: str):
        self._soup = BeautifulSoup(html, "html.parser")

    async def query_selector_all(self, selector: str) -> list:
        return [FakeElement(tag) for tag in self._soup.select(selector)]


def test_parse_certifications_extracts_slugs_and_urls():
    sample_html = """
    <section>
      <a href="/certification/livanov-as/responsive-web-design-v9">
        View Responsive Web Design Certification
      </a>
      <a href="/certification/livanov-as/javascript-v9">
        View JavaScript Certification
      </a>
      <a href="/learn/javascript-v9">Not a certification link</a>
    </section>
    """
    page = FakePage(sample_html)
    certs = asyncio.run(parse_certifications(page, "livanov-as"))

    assert len(certs) == 2
    assert certs[0] == {
        "_id": "livanov-as-responsive-web-design-v9",
        "slug": "responsive-web-design-v9",
        "title": "View Responsive Web Design Certification",
        "url": "freecodecamp.org/certification/livanov-as/responsive-web-design-v9",
    }
    assert certs[1]["slug"] == "javascript-v9"


def test_parse_timeline_page_extracts_v9_and_legacy_tasks():
    sample_html = """
    <table>
      <tbody>
        <tr class="timeline-row">
          <td>
            <a href="/learn/javascript-v9/workshop-envelope-budget-app/step-81">
              Build an Envelope Budget App - Step 81
            </a>
          </td>
          <td><time datetime="2026-03-15T14:30:00.000Z">Mar 15, 2026</time></td>
        </tr>
        <tr class="timeline-row">
          <td>
            <a href="/learn/python-v9/lecture-intro/step-1">
              Python Intro - Step 1
            </a>
          </td>
          <td><time datetime="2026-03-14T10:00:00Z">Mar 14, 2026</time></td>
        </tr>
        <tr class="timeline-row">
          <td>
            <a href="/learn/2022/responsive-web-design/learn-html/step-1">
              Legacy HTML Step 1
            </a>
          </td>
          <td><time datetime="2024-05-01T08:00:00.000Z">May 1, 2024</time></td>
        </tr>
      </tbody>
    </table>
    """
    page = FakePage(sample_html)
    tasks = asyncio.run(parse_timeline_page(page, "alice-dev"))

    assert len(tasks) == 3

    # Verify v9 task metadata and ISO timestamp parsing
    assert tasks[0] == {
        "username": "alice-dev",
        "task_name": "Build an Envelope Budget App - Step 81",
        "category": "javascript-v9",
        "date": datetime(2026, 3, 15, 14, 30, tzinfo=timezone.utc),
        "url": "freecodecamp.org/learn/javascript-v9/workshop-envelope-budget-app/step-81",
    }
    assert tasks[1]["category"] == "python-v9"

    # Verify non-v9 category extraction so main.py loop can filter it out cleanly
    assert "v9" not in tasks[2]["category"].lower()


def test_resolve_user_runtime_limits_enforces_finops_guard():
    assert resolve_user_runtime_limits({"role": "USER"}) == 30
    assert resolve_user_runtime_limits(None) == 30
