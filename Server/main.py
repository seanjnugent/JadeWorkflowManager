from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from typing import List, Dict

app = FastAPI()

# Enable CORS for React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/analyze-csv")
async def analyze_csv(file: UploadFile = File(...)):
    try:
        # Read CSV with pandas
        df = pd.read_csv(file.file)
        
        # Get sample data (first row)
        sample = df.iloc[0].to_dict()
        
        # Detect column types
        schema = []
        for col in df.columns:
            dtype = str(df[col].dtype)
            if dtype.startswith('int') or dtype.startswith('float'):
                col_type = "numeric"
            elif dtype.startswith('bool'):
                col_type = "boolean"
            elif pd.api.types.is_datetime64_any_dtype(df[col]):
                col_type = "date"
            else:
                col_type = "string"
            
            schema.append({
                "column": col,
                "type": col_type,
                "sample": str(sample.get(col, ""))
            })
        
        return {"schema": schema}
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))