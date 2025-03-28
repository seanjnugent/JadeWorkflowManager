import pandas as pd
import pyarrow.parquet as pq
import json
import io
import re
from datetime import datetime


class FileParser:
    async def parse(self, file):
        raise NotImplementedError("Subclasses must implement this method")

    def _format_response(self, df):
        return {
            "schema": {
                col: {"type": str(dtype), "format": self._detect_format(df[col])}
                for col, dtype in df.dtypes.items()
            },
            "data": df.head(3).to_dict(orient="records"),
        }

    def _detect_format(self, series):
        # Basic type detection
        if pd.api.types.is_datetime64_any_dtype(series):
            return "datetime"
        elif pd.api.types.is_timedelta64_dtype(series):
            return "timedelta"
        elif pd.api.types.is_numeric_dtype(series):
            return "numeric" if pd.api.types.is_float_dtype(series) else "integer"
        elif pd.api.types.is_bool_dtype(series):
            return "boolean"
        return "string"


class CSVParser(FileParser):
    async def parse(self, file):
        content = await file.read()
        df = pd.read_csv(io.BytesIO(content))
        return self._format_response(df)


class ExcelParser(FileParser):
    async def parse(self, file):
        content = await file.read()
        df = pd.read_excel(io.BytesIO(content))
        return self._format_response(df)


class ParquetParser(FileParser):
    async def parse(self, file):
        content = await file.read()
        df = pd.read_parquet(io.BytesIO(content))
        return self._format_response(df)


class JSONParser(FileParser):
    async def parse(self, file):
        content = await file.read()
        data = json.loads(content)

        if isinstance(data, list):
            df = pd.DataFrame(data)
            return self._format_response(df)

        return {"schema": self._infer_schema_from_json(data), "data": data}

    def _infer_schema_from_json(self, data):
        if isinstance(data, dict):
            return {key: type(value).__name__ for key, value in data.items()}
        return {"value": type(data).__name__}


parser_map = {
    "csv": CSVParser(),
    "xls": ExcelParser(),
    "xlsx": ExcelParser(),
    "parquet": ParquetParser(),
    "json": JSONParser(),
}
