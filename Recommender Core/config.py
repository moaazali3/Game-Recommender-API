"""Runtime database configuration for Recommender Core."""

import os
import dotenv
import logging

try:
    from .logging_utils import configure_logging
except ImportError:
    from logging_utils import configure_logging

logger = logging.getLogger(__name__)
configure_logging()

dotenv.load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    logger.error(
        "component=database operation=config stage=validation failure=missing_config "
        "next_action=set DATABASE_URL before starting the service"
    )

    raise RuntimeError(
        "DATABASE_URL environment variable is not set."
    )