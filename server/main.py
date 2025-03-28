from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.file_parsers import parser_map
import uvicorn

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    try:
        # Get file extension
        if not file.filename or "." not in file.filename:
            raise HTTPException(400, "Invalid filename")

        file_ext = file.filename.split(".")[-1].lower()
        parser = parser_map.get(file_ext)

        if not parser:
            raise HTTPException(400, f"Unsupported file type: {file_ext}")

        # Process file
        if hasattr(parser, "parse") and callable(parser.parse):
            result = await parser.parse(file)
        else:
            result = parser.parse(file)

        return result

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(500, f"Processing error: {str(e)}")
