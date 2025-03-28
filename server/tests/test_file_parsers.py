import pytest
import pandas as pd
import json
import io
from fastapi import UploadFile
from app.file_parsers import CSVParser, ExcelParser, ParquetParser, JSONParser

# Sample data
CSV_CONTENT = b"name,age\nAlice,30\nBob,25"
JSON_CONTENT = b'[{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]'
EXCEL_CONTENT = b""  # We'll generate this dynamically
PARQUET_CONTENT = b""  # Same for Parquet


@pytest.fixture
def csv_file():
    return UploadFile(filename="test.csv", file=io.BytesIO(CSV_CONTENT))


@pytest.fixture
def json_file():
    return UploadFile(filename="test.json", file=io.BytesIO(JSON_CONTENT))


@pytest.fixture
def excel_file():
    """Generates an in-memory Excel file."""
    output = io.BytesIO()
    df = pd.DataFrame({"name": ["Alice", "Bob"], "age": [30, 25]})
    df.to_excel(output, index=False, engine="openpyxl")
    output.seek(0)
    return UploadFile(filename="test.xlsx", file=output)


@pytest.fixture
def parquet_file():
    """Generates an in-memory Parquet file."""
    output = io.BytesIO()
    df = pd.DataFrame({"name": ["Alice", "Bob"], "age": [30, 25]})
    df.to_parquet(output, engine="pyarrow")
    output.seek(0)
    return UploadFile(filename="test.parquet", file=output)


@pytest.mark.asyncio
async def test_csv_parser(csv_file):
    parser = CSVParser()
    result = await parser.parse(csv_file)

    assert "schema" in result
    assert "data" in result
    assert result["schema"]["name"]["type"] == "object"
    assert result["schema"]["age"]["type"] == "int64"
    assert result["data"] == [{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]


@pytest.mark.asyncio
async def test_json_parser(json_file):
    parser = JSONParser()
    result = await parser.parse(json_file)

    assert "schema" in result
    assert "data" in result
    assert result["schema"]["name"]["type"] == "object"
    assert result["schema"]["age"]["type"] in ["int64", "int"]
    assert result["data"] == [{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]


@pytest.mark.asyncio
async def test_excel_parser(excel_file):
    parser = ExcelParser()
    result = await parser.parse(excel_file)

    assert "schema" in result
    assert "data" in result
    assert result["schema"]["name"]["type"] == "object"
    assert result["schema"]["age"]["type"] == "int64"
    assert result["data"] == [{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]


@pytest.mark.asyncio
async def test_parquet_parser(parquet_file):
    parser = ParquetParser()
    result = await parser.parse(parquet_file)

    assert "schema" in result
    assert "data" in result
    assert result["schema"]["name"]["type"] == "object"
    assert result["schema"]["age"]["type"] == "int64"
    assert result["data"] == [{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]