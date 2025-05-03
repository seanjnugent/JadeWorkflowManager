import pytest
import pandas as pd
import json
import io
from fastapi import UploadFile
from app.file_parsers import CSVParser, ExcelParser, ParquetParser, JSONParser
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Sample data
CSV_CONTENT = b"name,age\nAlice,30\nBob,25"
JSON_CONTENT = b'[{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]'
EXCEL_CONTENT = b""  # Generated dynamically
PARQUET_CONTENT = b""  # Generated dynamically

@pytest.fixture
def csv_file():
    logger.info("Creating CSV file fixture")
    return UploadFile(filename="test.csv", file=io.BytesIO(CSV_CONTENT))

@pytest.fixture
def json_file():
    logger.info("Creating JSON file fixture")
    return UploadFile(filename="test.json", file=io.BytesIO(JSON_CONTENT))

@pytest.fixture
def excel_file():
    """Generates an in-memory Excel file."""
    logger.info("Creating Excel file fixture")
    output = io.BytesIO()
    df = pd.DataFrame({"name": ["Alice", "Bob"], "age": [30, 25]})
    df.to_excel(output, index=False, engine="openpyxl")
    output.seek(0)
    return UploadFile(filename="test.xlsx", file=output)

@pytest.fixture
def parquet_file():
    """Generates an in-memory Parquet file."""
    logger.info("Creating Parquet file fixture")
    output = io.BytesIO()
    df = pd.DataFrame({"name": ["Alice", "Bob"], "age": [30, 25]})
    df.to_parquet(output, engine="pyarrow")
    output.seek(0)
    return UploadFile(filename="test.parquet", file=output)

@pytest.mark.asyncio
async def test_csv_parser(csv_file):
    logger.info("Testing CSV parser")
    parser = CSVParser()
    
    # Test parse method
    content = await csv_file.read()
    df = await parser.parse(content)
    assert isinstance(df, pd.DataFrame), "Parse should return a DataFrame"
    assert list(df.columns) == ["name", "age"], "Unexpected columns"
    assert len(df) == 2, "Unexpected number of rows"
    assert df.iloc[0].to_dict() == {"name": "Alice", "age": 30}, "Unexpected row data"
    
    # Test format_response method
    result = parser.format_response(df, "test_path")
    assert isinstance(result, dict), "Format_response should return a dict"
    assert set(result.keys()) == {"file_path", "schema", "data", "structure"}, "Unexpected keys in result"
    assert result["file_path"] == "test_path", "Incorrect file_path"
    
    # Check schema
    assert result["schema"]["name"]["type"] == "string", "Incorrect type for name"
    assert result["schema"]["age"]["type"] == "integer", "Incorrect type for age"
    assert result["schema"]["name"]["format"] == "none", "Incorrect format for name"
    assert result["schema"]["age"]["format"] == "none", "Incorrect format for age"
    assert result["schema"]["name"]["sample"] == "Alice", "Incorrect sample for name"
    assert result["schema"]["age"]["sample"] == 30, "Incorrect sample for age"
    
    # Check data
    assert len(result["data"]) == 2, "Unexpected number of sample rows"
    assert result["data"] == [
        {"name": "Alice", "age": 30},
        {"name": "Bob", "age": 25}
    ], "Unexpected sample data"
    
    # Check structure
    assert result["structure"]["columns"][0] == {
        "name": "name",
        "type": "string",
        "format": "none",
        "required": False,
        "description": "Column name from uploaded file"
    }, "Incorrect structure for name"
    assert result["structure"]["columns"][1] == {
        "name": "age",
        "type": "integer",
        "format": "none",
        "required": False,
        "description": "Column age from uploaded file"
    }, "Incorrect structure for age"

@pytest.mark.asyncio
async def test_json_parser(json_file):
    logger.info("Testing JSON parser")
    parser = JSONParser()
    
    # Test parse method
    content = await json_file.read()
    df = await parser.parse(content)
    assert isinstance(df, pd.DataFrame), "Parse should return a DataFrame"
    assert list(df.columns) == ["name", "age"], "Unexpected columns"
    assert len(df) == 2, "Unexpected number of rows"
    assert df.iloc[0].to_dict() == {"name": "Alice", "age": 30}, "Unexpected row data"
    
    # Test format_response method
    result = parser.format_response(df, "test_path")
    assert isinstance(result, dict), "Format_response should return a dict"
    assert set(result.keys()) == {"file_path", "schema", "data", "structure"}, "Unexpected keys in result"
    assert result["file_path"] == "test_path", "Incorrect file_path"
    
    # Check schema
    assert result["schema"]["name"]["type"] == "string", "Incorrect type for name"
    assert result["schema"]["age"]["type"] == "integer", "Incorrect type for age"
    assert result["schema"]["name"]["format"] == "none", "Incorrect format for name"
    assert result["schema"]["age"]["format"] == "none", "Incorrect format for age"
    assert result["schema"]["name"]["sample"] == "Alice", "Incorrect sample for name"
    assert result["schema"]["age"]["sample"] == 30, "Incorrect sample for age"
    
    # Check data
    assert len(result["data"]) == 2, "Unexpected number of sample rows"
    assert result["data"] == [
        {"name": "Alice", "age": 30},
        {"name": "Bob", "age": 25}
    ], "Unexpected sample data"
    
    # Check structure
    assert result["structure"]["columns"][0] == {
        "name": "name",
        "type": "string",
        "format": "none",
        "required": False,
        "description": "Column name from uploaded file"
    }, "Incorrect structure for name"
    assert result["structure"]["columns"][1] == {
        "name": "age",
        "type": "integer",
        "format": "none",
        "required": False,
        "description": "Column age from uploaded file"
    }, "Incorrect structure for age"

@pytest.mark.asyncio
async def test_excel_parser(excel_file):
    logger.info("Testing Excel parser")
    parser = ExcelParser()
    
    # Test parse method
    content = await excel_file.read()
    df = await parser.parse(content)
    assert isinstance(df, pd.DataFrame), "Parse should return a DataFrame"
    assert list(df.columns) == ["name", "age"], "Unexpected columns"
    assert len(df) == 2, "Unexpected number of rows"
    assert df.iloc[0].to_dict() == {"name": "Alice", "age": 30}, "Unexpected row data"
    
    # Test format_response method
    result = parser.format_response(df, "test_path")
    assert isinstance(result, dict), "Format_response should return a dict"
    assert set(result.keys()) == {"file_path", "schema", "data", "structure"}, "Unexpected keys in result"
    assert result["file_path"] == "test_path", "Incorrect file_path"
    
    # Check schema
    assert result["schema"]["name"]["type"] == "string", "Incorrect type for name"
    assert result["schema"]["age"]["type"] == "integer", "Incorrect type for age"
    assert result["schema"]["name"]["format"] == "none", "Incorrect format for name"
    assert result["schema"]["age"]["format"] == "none", "Incorrect format for age"
    assert result["schema"]["name"]["sample"] == "Alice", "Incorrect sample for name"
    assert result["schema"]["age"]["sample"] == 30, "Incorrect sample for age"
    
    # Check data
    assert len(result["data"]) == 2, "Unexpected number of sample rows"
    assert result["data"] == [
        {"name": "Alice", "age": 30},
        {"name": "Bob", "age": 25}
    ], "Unexpected sample data"
    
    # Check structure
    assert result["structure"]["columns"][0] == {
        "name": "name",
        "type": "string",
        "format": "none",
        "required": False,
        "description": "Column name from uploaded file"
    }, "Incorrect structure for name"
    assert result["structure"]["columns"][1] == {
        "name": "age",
        "type": "integer",
        "format": "none",
        "required": False,
        "description": "Column age from uploaded file"
    }, "Incorrect structure for age"

@pytest.mark.asyncio
async def test_parquet_parser(parquet_file):
    logger.info("Testing Parquet parser")
    parser = ParquetParser()
    
    # Test parse method
    content = await parquet_file.read()
    df = await parser.parse(content)
    assert isinstance(df, pd.DataFrame), "Parse should return a DataFrame"
    assert list(df.columns) == ["name", "age"], "Unexpected columns"
    assert len(df) == 2, "Unexpected number of rows"
    assert df.iloc[0].to_dict() == {"name": "Alice", "age": 30}, "Unexpected row data"
    
    # Test format_response method
    result = parser.format_response(df, "test_path")
    assert isinstance(result, dict), "Format_response should return a dict"
    assert set(result.keys()) == {"file_path", "schema", "data", "structure"}, "Unexpected keys in result"
    assert result["file_path"] == "test_path", "Incorrect file_path"
    
    # Check schema
    assert result["schema"]["name"]["type"] == "string", "Incorrect type for name"
    assert result["schema"]["age"]["type"] == "integer", "Incorrect type for age"
    assert result["schema"]["name"]["format"] == "none", "Incorrect format for name"
    assert result["schema"]["age"]["format"] == "none", "Incorrect format for age"
    assert result["schema"]["name"]["sample"] == "Alice", "Incorrect sample for name"
    assert result["schema"]["age"]["sample"] == 30, "Incorrect sample for age"
    
    # Check data
    assert len(result["data"]) == 2, "Unexpected number of sample rows"
    assert result["data"] == [
        {"name": "Alice", "age": 30},
        {"name": "Bob", "age": 25}
    ], "Unexpected sample data"
    
    # Check structure
    assert result["structure"]["columns"][0] == {
        "name": "name",
        "type": "string",
        "format": "none",
        "required": False,
        "description": "Column name from uploaded file"
    }, "Incorrect structure for name"
    assert result["structure"]["columns"][1] == {
        "name": "age",
        "type": "integer",
        "format": "none",
        "required": False,
        "description": "Column age from uploaded file"
    }, "Incorrect structure for age"