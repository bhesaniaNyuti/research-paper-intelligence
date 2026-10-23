from pydantic import BaseModel


class BaseMeta(BaseModel):
    created_at: str | None = None
    updated_at: str | None = None
