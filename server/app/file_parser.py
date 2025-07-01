import pandas as pd
import pyarrow.parquet as pq
import json
import io
from datetime import datetime
from typing import Dict, Any, List
import uuid
import logging
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class FileParser:
    async def parse(self, file_content: bytes) -> pd.DataFrame:
        """Parse file content into a DataFrame"""
        raise NotImplementedError("Subclasses must implement this method")

    def format_response(self, df: pd.DataFrame, file_path: str = None) -> Dict[str, Any]:
        """Format the parsed data into a standardized response"""
        try:
            logger.info("Formatting response for DataFrame")
            schema = self._get_schema(df)
            data = self._get_sample_data(df)
            structure = self._get_structure_definition(df)
            logger.info("Response formatted successfully")
            return {
                "file_path": file_path,
                "schema": schema,
                "data": data,
                "structure": structure
            }
        except Exception as e:
            logger.error(f"Failed to format response: {str(e)}")
            raise

    def _get_schema(self, df: pd.DataFrame) -> Dict[str, Dict[str, str]]:
        """Extract schema information from DataFrame"""
        try:
            logger.info("Extracting schema")
            schema = {}
            for col in df.columns:
                try:
                    series = df[col]
                    schema[col] = {
                        "type": self._detect_type(series),
                        "format": self._detect_format(series),
                        "sample": self._get_sample_value(series)
                    }
                except Exception as e:
                    logger.error(f"Failed to process column {col}: {str(e)}")
                    schema[col] = {
                        "type": "unknown",
                        "format": "none",
                        "sample": None
                    }
            return schema
        except Exception as e:
            logger.error(f"Failed to get schema: {str(e)}")
            raise

    def _get_sample_data(self, df: pd.DataFrame, n: int = 3) -> List[Dict]:
        """Get sample data rows, ensuring JSON-serializable output"""
        try:
            logger.info("Extracting sample data")
            sample = df.head(n).replace({np.nan: None, pd.NaT: None}).to_dict(orient='records')
            for row in sample:
                for key, value in row.items():
                    if isinstance(value, (pd.Timestamp, datetime)):
                        row[key] = value.isoformat()
                    elif isinstance(value, (np.integer, np.floating)):
                        row[key] = float(value) if isinstance(value, np.floating) else int(value)
            return sample
        except Exception as e:
            logger.error(f"Failed to get sample data: {str(e)}")
            raise

    def _get_structure_definition(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Generate structure definition for workflow input"""
        try:
            logger.info("Generating structure definition")
            structure = {
                "columns": []
            }
            for col in df.columns:
                try:
                    series = df[col]
                    column_def = {
                        "name": col,
                        "type": self._detect_type(series),
                        "format": self._detect_format(series),
                        "required": False,
                        "description": f"Column {col} from uploaded file"
                    }
                    structure["columns"].append(column_def)
                except Exception as e:
                    logger.error(f"Failed to process column {col} for structure: {str(e)}")
                    structure["columns"].append({
                        "name": col,
                        "type": "unknown",
                        "format": "none",
                        "required": False,
                        "description": f"Column {col} (error processing: {str(e)})"
                    })
            return structure
        except Exception as e:
            logger.error(f"Failed to get structure definition: {str(e)}")
            raise

    def _detect_type(self, series: pd.Series) -> str:
        """Detect basic data type, handling edge cases"""
        try:
            if series.empty or series.isna().all():
                return "unknown"
            series = series.infer_objects()
            if pd.api.types.is_datetime64_any_dtype(series):
                return "datetime"
            elif pd.api.types.is_timedelta64_dtype(series):
                return "timedelta"
            elif pd.api.types.is_numeric_dtype(series):
                return "float" if pd.api.types.is_float_dtype(series) else "integer"
            elif pd.api.types.is_bool_dtype(series):
                return "boolean"
            else:
                return "string"
        except Exception as e:
            logger.error(f"Failed to detect type for series: {str(e)}")
            return "unknown"

    def _detect_format(self, series: pd.Series) -> str:
        """Detect specialized format if applicable"""
        try:
            if series.empty or series.isna().all():
                return "none"
            if pd.api.types.is_datetime64_any_dtype(series):
                return "ISO8601"
            return "none"
        except Exception as e:
            logger.error(f"Failed to detect format for series: {str(e)}")
            return "none"

    def _get_sample_value(self, series: pd.Series) -> Any:
        """Get a sample value from the series, ensuring JSON-serializable output"""
        try:
            if series.empty or series.isna().all():
                return None
            value = series.iloc[0]
            if pd.isna(value):
                return None
            if isinstance(value, (pd.Timestamp, datetime)):
                return value.isoformat()
            if isinstance(value, (np.integer, np.floating)):
                return float(value) if isinstance(value, np.floating) else int(value)
            return value
        except Exception as e:
            logger.error(f"Failed to get sample value: {str(e)}")
            return None

class CSVParser(FileParser):
    async def parse(self, file_content: bytes) -> pd.DataFrame:
        """Parse CSV file content"""
        try:
            logger.info("Parsing CSV file")
            return pd.read_csv(io.BytesIO(file_content))
        except Exception as e:
            logger.error(f"Failed to parse CSV: {str(e)}")
            raise ValueError(f"Invalid CSV file: {str(e)}")

class ExcelParser(FileParser):
    async def parse(self, file_content: bytes) -> pd.DataFrame:
        """Parse Excel file content"""
        try:
            logger.info("Parsing Excel file")
            return pd.read_excel(io.BytesIO(file_content))
        except Exception as e:
            logger.error(f"Failed to parse Excel: {str(e)}")
            raise ValueError(f"Invalid Excel file: {str(e)}")

class ParquetParser(FileParser):
    async def parse(self, file_content: bytes) -> pd.DataFrame:
        """Parse Parquet file content"""
        try:
            logger.info("Parsing Parquet file")
            return pd.read_parquet(io.BytesIO(file_content))
        except Exception as e:
            logger.error(f"Failed to parse Parquet: {str(e)}")
            raise ValueError(f"Invalid Parquet file: {str(e)}")

class JSONParser(FileParser):
    async def parse(self, file_content: bytes) -> pd.DataFrame:
        """Parse JSON file content"""
        try:
            logger.info("Parsing JSON file")
            data = json.loads(file_content)
            if isinstance(data, list):
                return pd.DataFrame(data)
            elif isinstance(data, dict):
                if all(isinstance(v, (list, dict)) for v in data.values()):
                    return pd.json_normalize(data)
                return pd.DataFrame([data])
            raise ValueError("Unsupported JSON structure")
        except Exception as e:
            logger.error(f"Failed to parse JSON: {str(e)}")
            raise ValueError(f"Invalid JSON file: {str(e)}")

# Parser mapping
parser_map = {
    "csv": CSVParser(),
    "xls": ExcelParser(),
    "xlsx": ExcelParser(),
    "parquet": ParquetParser(),
    "json": JSONParser(),
}