"""Deployability Blender service wrapper."""
from __future__ import annotations

from ml.blender import GameBlender


class BlenderService:
    def __init__(self, blender: GameBlender):
        self.blender = blender

    def recommend(self, selected_app_ids, top_k = 10, stage2_multiplier = 3):
        return self.blender.recommend(selected_app_ids, top_k, stage2_multiplier)
