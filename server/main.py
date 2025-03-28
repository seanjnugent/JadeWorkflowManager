from fastapi import FastAPI, File, UploadFile
from app.file_parsers import parser_map

app = FastAPI()


@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    file_ext = file.filename.split(".")[-1].lower()
    parser = parser_map.get(file_ext)

    if not parser:
        return {"error": "Unsupported file format"}

    try:
        result = (
            await parser.parse(file.file)
            if hasattr(parser, "parse") and callable(getattr(parser, "parse"))
            else parser.parse(file.file)
        )
        return result
    except Exception as e:
        return {"error": str(e)}
