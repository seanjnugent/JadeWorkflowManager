import pytest
import pandas as pd
import json
import io
from app.file_parsers import CSVParser, ExcelParser, ParquetParser, JSONParser

# Sample data
CSV_CONTENT = "name,age\nAlice,30\nBob,25"
JSON_CONTENT = '[{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]'


@pytest.fixture
def csv_file():
    return io.StringIO(CSV_CONTENT)


@pytest.fixture
def json_file():
    return io.StringIO(JSON_CONTENT)


# Test CSV Parser
def test_csv_parser(csv_file):
    parser = CSVParser()
    result = parser.parse(csv_file)

    assert result["schema"] == {"name": "object", "age": "int64"}
    assert result["data"] == [{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]


# Test JSON Parser
@pytest.mark.asyncio
async def test_json_parser(json_file):
    parser = JSONParser()
    result = await parser.parse(json_file)

    assert result["schema"] == {"name": "str", "age": "int"}
    assert result["data"] == [{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]
