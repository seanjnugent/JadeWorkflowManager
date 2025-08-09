from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
import logging
from ..get_health_check import get_db
from sqlalchemy import text

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/runs", tags=["runs"])

@router.get("/filter-options")
async def get_filter_options(db: Session = Depends(get_db)):
    """Get unique filter options for runs"""
    try:
        logger.info("Fetching filter options")
        
        # Fetch unique statuses
        statuses = db.execute(
            text("SELECT DISTINCT status FROM workflow.run WHERE status IS NOT NULL")
        ).fetchall()
        statuses = [row[0] for row in statuses]

        # Fetch unique workflow IDs
        workflow_ids = db.execute(
            text("SELECT DISTINCT workflow_id FROM workflow.run WHERE workflow_id IS NOT NULL")
        ).fetchall()
        workflow_ids = [row[0] for row in workflow_ids]

        # Fetch unique user names
        user_names = db.execute(
            text("""
                SELECT DISTINCT CONCAT(b.first_name, ' ', b.surname) as user_name
                FROM workflow.run a
                LEFT JOIN workflow.user b ON a.triggered_by = b.id
                WHERE b.first_name IS NOT NULL AND b.surname IS NOT NULL
            """)
        ).fetchall()
        user_names = [row[0] for row in user_names]

        logger.info("Filter options retrieved successfully")
        return {
            "status": statuses,
            "workflow_id": workflow_ids,
            "user_name": user_names
        }

    except Exception as e:
        logger.error(f"Failed to fetch filter options: {str(e)}")
        raise HTTPException(500, f"Failed to fetch filter options: {str(e)}")

@router.get("/")
async def get_runs(
    page: int = 1,
    limit: int = 10,
    search: Optional[str] = None,
    status: Optional[str] = None,
    workflow_id: Optional[str] = None,
    user_name: Optional[str] = None,
    sort_by: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get a list of runs with pagination, filtering, and sorting"""
    try:
        logger.info("Fetching runs")
        offset = (page - 1) * limit

        # Base query
        query = """
            SELECT a.id, a.workflow_id, a.triggered_by, a.status, a.started_at, a.finished_at, a.error_message,
                   a.output_file_path, a.dagster_run_id, a.input_file_path, w."name", 
                   CONCAT(b.first_name, ' ', b.surname) as user_name, a.run_name
            FROM workflow.run a
            LEFT JOIN workflow.user b ON a.triggered_by = b.id
            LEFT JOIN workflow.workflow w ON a.workflow_id = w.id
            WHERE 1=1
        """
        count_query = "SELECT COUNT(*) FROM workflow.run a LEFT JOIN workflow.user b ON a.triggered_by = b.id LEFT JOIN workflow.workflow w ON a.workflow_id = w.id WHERE 1=1"
        params = {"limit": limit, "offset": offset}

        # Apply filters
        if search:
            query += " AND (a.id::text ILIKE :search OR a.workflow_id::text ILIKE :search OR a.status ILIKE :search)"
            count_query += " AND (a.id::text ILIKE :search OR a.workflow_id::text ILIKE :search OR a.status ILIKE :search)"
            params["search"] = f"%{search}%"

        if status:
            status_list = status.split(',')
            query += f" AND a.status IN ({','.join([':status' + str(i) for i in range(len(status_list))])})"
            count_query += f" AND a.status IN ({','.join([':status' + str(i) for i in range(len(status_list))])})"
            for i, s in enumerate(status_list):
                params[f"status{i}"] = s.strip()

        if workflow_id:
            workflow_id_list = workflow_id.split(',')
            query += f" AND a.workflow_id IN ({','.join([':workflow_id' + str(i) for i in range(len(workflow_id_list))])})"
            count_query += f" AND a.workflow_id IN ({','.join([':workflow_id' + str(i) for i in range(len(workflow_id_list))])})"
            for i, wid in enumerate(workflow_id_list):
                params[f"workflow_id{i}"] = int(wid.strip())

        if user_name:
            user_name_list = user_name.split(',')
            query += f" AND CONCAT(b.first_name, ' ', b.surname) IN ({','.join([':user_name' + str(i) for i in range(len(user_name_list))])})"
            count_query += f" AND CONCAT(b.first_name, ' ', b.surname) IN ({','.join([':user_name' + str(i) for i in range(len(user_name_list))])})"
            for i, un in enumerate(user_name_list):
                params[f"user_name{i}"] = un.strip()

        # Apply sorting
        sort_mapping = {
            'Newest first': 'a.started_at DESC',
            'Oldest first': 'a.started_at ASC',
            'A-Z': 'a.id ASC',
            'Z-A': 'a.id DESC'
        }
        sort_clause = sort_mapping.get(sort_by, 'a.started_at DESC')
        query += f" ORDER BY {sort_clause}"

        # Add pagination
        query += " LIMIT :limit OFFSET :offset"

        # Execute queries
        runs = db.execute(text(query), params).fetchall()
        total = db.execute(text(count_query), params).scalar()

        logger.info("Runs retrieved successfully")
        return {
            "runs": [dict(run._mapping) for run in runs],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        }

    except Exception as e:
        logger.error(f"Failed to fetch runs: {str(e)}")
        raise HTTPException(500, f"Failed to fetch runs: {str(e)}")