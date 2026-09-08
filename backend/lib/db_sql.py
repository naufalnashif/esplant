import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

# Try importing PostgreSQL (psycopg2) and DuckDB (duckdb)
try:
    import psycopg2
except ImportError:
    psycopg2 = None

try:
    import duckdb
except ImportError:
    duckdb = None


DB_PATH = Path(__file__).parent.parent / "esplant_db.duckdb"
PG_DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/esplant_db")


class SQLDatabaseManager:
    def __init__(self):
        self.db_type = "none"
        self._init_db()

    def _init_db(self):
        # 1. Try PostgreSQL connection
        if psycopg2:
            try:
                # Try connection string from env or default local postgres
                conn = psycopg2.connect(PG_DATABASE_URL)
                conn.autocommit = True
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        CREATE TABLE IF NOT EXISTS finance_state (
                            key VARCHAR(50) PRIMARY KEY,
                            data TEXT NOT NULL,
                            updated_at VARCHAR(100) NOT NULL
                        );
                        """
                    )
                conn.close()
                self.db_type = "postgres"
                logger.info("Successfully connected and initialized PostgreSQL database (%s)", PG_DATABASE_URL)
                return
            except Exception as exc:
                logger.warning("PostgreSQL connection failed (%s). Falling back to DuckDB...", exc)

        # 2. Try DuckDB connection (DBeaver compatible)
        if duckdb:
            try:
                conn = duckdb.connect(str(DB_PATH))
                conn.execute(
                    """
                    CREATE TABLE IF NOT EXISTS finance_state (
                        key VARCHAR PRIMARY KEY,
                        data VARCHAR,
                        updated_at VARCHAR
                    );
                    """
                )
                conn.close()
                self.db_type = "duckdb"
                logger.info("Successfully initialized DuckDB database file at %s", DB_PATH)
                return
            except Exception as exc:
                logger.error("DuckDB initialization failed: %s", exc)

        logger.error("No SQL database engine available!")

    def get_state(self) -> Optional[Dict[str, Any]]:
        if self.db_type == "postgres" and psycopg2:
            try:
                conn = psycopg2.connect(PG_DATABASE_URL)
                with conn.cursor() as cur:
                    cur.execute("SELECT data FROM finance_state WHERE key = 'default';")
                    row = cur.fetchone()
                    conn.close()
                    if row and row[0]:
                        return json.loads(row[0])
            except Exception as exc:
                logger.error("PostgreSQL get_state error: %s", exc)

        if self.db_type == "duckdb" and duckdb:
            try:
                conn = duckdb.connect(str(DB_PATH))
                res = conn.execute("SELECT data FROM finance_state WHERE key = 'default';").fetchone()
                conn.close()
                if res and res[0]:
                    return json.loads(res[0])
            except Exception as exc:
                logger.error("DuckDB get_state error: %s", exc)

        return None

    def save_state(self, state_data: Dict[str, Any]) -> bool:
        json_str = json.dumps(state_data)
        updated_at = datetime.now(timezone.utc).isoformat()

        if self.db_type == "postgres" and psycopg2:
            try:
                conn = psycopg2.connect(PG_DATABASE_URL)
                conn.autocommit = True
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO finance_state (key, data, updated_at)
                        VALUES ('default', %s, %s)
                        ON CONFLICT (key) DO UPDATE
                        SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at;
                        """,
                        (json_str, updated_at),
                    )
                conn.close()
                return True
            except Exception as exc:
                logger.error("PostgreSQL save_state error: %s", exc)

        if self.db_type == "duckdb" and duckdb:
            try:
                conn = duckdb.connect(str(DB_PATH))
                conn.execute(
                    """
                    INSERT OR REPLACE INTO finance_state (key, data, updated_at)
                    VALUES ('default', ?, ?);
                    """,
                    (json_str, updated_at),
                )
                conn.close()
                return True
            except Exception as exc:
                logger.error("DuckDB save_state error: %s", exc)

        return False


db_sql = SQLDatabaseManager()
