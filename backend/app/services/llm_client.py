from app.config import Settings, get_settings


class LLMClient:
    def __init__(self, settings: Settings | None = None):
        self.settings = settings or get_settings()

    async def generate_strategy(self, prompt: str) -> str | None:
        return None
