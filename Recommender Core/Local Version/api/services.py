"""Small API service wrapper."""
from __future__ import annotations
class PageBuilder:
    def __init__(self, recommender): self.recommender = recommender
    def build(self, request): return {"recommendations": self.recommender.get_recommendations_widget(request)}
