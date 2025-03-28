import pandas as pd
import pyarrow.parquet as pq
import json
import io


class FileParser:
    def parse(self, file):
        raise NotImplementedError("Subclasses must implement this method")

    def _format_response(self, df):
        return {
            "schema": df.dtypes.apply(lambda x: str(x)).to_dict(),
            "data": json.loads(df.to_json(orient="records")),
        }


class CSVParser(FileParser):
    def parse(self, file):
        df = pd.read_csv(file)
        return self._format_response(df)


class ExcelParser(FileParser):
    def parse(self, file):
        df = pd.read_excel(file)
        return self._format_response(df)


class ParquetParser(FileParser):
    async def parse(self, file):
        df = pd.read_parquet(io.BytesIO(await file.read()))
        return self._format_response(df)


class JSONParser(FileParser):
    async def parse(self, file):
        data = json.load(file)
        return {"schema": self._infer_schema_from_json(data), "data": data}

    def _infer_schema_from_json(self, data):
        if isinstance(data, list) and data:
            return {k: type(v).__name__ for k, v in data[0].items()}
        return {}


parser_map = {
    "csv": CSVParser(),
    "xls": ExcelParser(),
    "xlsx": ExcelParser(),
    "parquet": ParquetParser(),
    "json": JSONParser(),
}
