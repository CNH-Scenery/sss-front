from sqlalchemy import text

from app.db import create_engine_from_url


def test_create_engine_from_url_connects_to_sqlite_database(tmp_path):
    database_url = f"sqlite:///{tmp_path / 'tacit_trader_test.db'}"
    engine = create_engine_from_url(database_url)

    with engine.connect() as connection:
        result = connection.execute(text("select 1")).scalar_one()

    assert result == 1
