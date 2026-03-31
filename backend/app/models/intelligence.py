from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional, Any


class IntelligenceOut(BaseModel):
    id: UUID
    lead_id: UUID
    has_website: Optional[bool]
    website_score: Optional[int]
    social_facebook_url: Optional[str]
    social_instagram_url: Optional[str]
    social_engagement_score: Optional[int]
    google_rating: Optional[float]
    google_reviews_count: Optional[int]
    is_running_ads: Optional[bool]
    seo_score: Optional[int]
    raw_data: Optional[dict[str, Any]]
    scraped_at: Optional[datetime]

    class Config:
        from_attributes = True


class ScrapeSummary(BaseModel):
    has_website: bool
    website_score: int
    google_rating: Optional[float]
    google_reviews_count: Optional[int]
    is_running_ads: bool
    seo_score: int
    social_engagement_score: int
    pain_points: list[str]