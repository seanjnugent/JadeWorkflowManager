from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
import logging
from ..get_health_check import get_db
from sqlalchemy import text
from typing import Optional, List

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/workflows", tags=["workflows"])

@router.get("/filter-options")
async def get_filter_options(db: Session = Depends(get_db)):
    """Get unique filter options for workflows"""
    try:
        logger.info("Fetching filter options")
        
        # Fetch unique statuses
        statuses = db.execute(
            text("SELECT DISTINCT status FROM workflow.workflow WHERE status IS NOT NULL")
        ).fetchall()
        statuses = [row[0] for row in statuses]

        # Fetch unique owners
        owners = db.execute(
            text("""
                SELECT DISTINCT CONCAT(b.first_name, ' ', b.surname) as owner
                FROM workflow.workflow a
                LEFT JOIN workflow.user b ON a.created_by = b.id
                WHERE b.first_name IS NOT NULL AND b.surname IS NOT NULL
            """)
        ).fetchall()
        owners = [row[0] for row in owners]

        # Fetch unique group names
        group_names = db.execute(
            text("""
                SELECT DISTINCT d."name" as group_name
                FROM workflow.workflow a
                LEFT JOIN workflow.user b ON a.created_by = b.id
                LEFT JOIN workflow.user_group d ON b.user_group_id = d.id
                WHERE d."name" IS NOT NULL
            """)
        ).fetchall()
        group_names = [row[0] for row in group_names]

        logger.info("Filter options retrieved successfully")
        return {
            "status": statuses,
            "owner": owners,
            "group_name": group_names
        }

    except Exception as e:
        logger.error(f"Failed to fetch filter options: {str(e)}")
        raise HTTPException(500, f"Failed to fetch filter options: {str(e)}")

@router.get("/")
async def list_workflows(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    user_id: int = Query(None, description="Filter workflows by user permission"),
    search: Optional[str] = None,
    status: Optional[str] = None,
    owner: Optional[str] = None,
    group_name: Optional[str] = None,
    sort_by: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all workflows with pagination, filtering, and sorting"""
    try:
        logger.info(f"Listing workflows, page {page}, limit {limit}, user_id={user_id}")
        offset = (page - 1) * limit

        # Base query
        query = """
            SELECT a.id, a.name, a.description, a.status, a.created_at, a.destination,
                   MAX(b.started_at) as last_run,
                   CONCAT(c.first_name, ' ', c.surname) as owner,
                   c.id as owner_id, d."name" as group_name
            FROM workflow.workflow a
            LEFT JOIN workflow.run b ON a.id = b.workflow_id
            LEFT JOIN workflow.user c ON a.created_by = c.id
            LEFT JOIN workflow.user_group d ON c.user_group_id = d.id
            INNER JOIN workflow.workflow_permission e ON a.id = e.workflow_id
            WHERE 1=1
        """
        count_query = """
            SELECT COUNT(*)
            FROM workflow.workflow a
            LEFT JOIN workflow.user c ON a.created_by = c.id
            LEFT JOIN workflow.user_group d ON c.user_group_id = d.id
            LEFT JOIN workflow.workflow_permission e ON a.id = e.workflow_id
            WHERE 1=1
        """
        params = {"limit": limit, "offset": offset}

        # Apply user filter
        if user_id is not None:
            query += " AND e.user_id = :user_id"
            count_query += " AND e.user_id = :user_id"
            params["user_id"] = user_id

        # Apply filters
        if search:
            query += " AND (a.name ILIKE :search OR a.description ILIKE :search OR a.id::text ILIKE :search)"
            count_query += " AND (a.name ILIKE :search OR a.description ILIKE :search OR a.id::text ILIKE :search)"
            params["search"] = f"%{search}%"

        if status:
            status_list = status.split(',')
            query += f" AND a.status IN ({','.join([':status' + str(i) for i in range(len(status_list))])})"
            count_query += f" AND a.status IN ({','.join([':status' + str(i) for i in range(len(status_list))])})"
            for i, s in enumerate(status_list):
                params[f"status{i}"] = s.strip()

        if owner:
            owner_list = owner.split(',')
            query += f" AND CONCAT(c.first_name, ' ', c.surname) IN ({','.join([':owner' + str(i) for i in range(len(owner_list))])})"
            count_query += f" AND CONCAT(c.first_name, ' ', c.surname) IN ({','.join([':owner' + str(i) for i in range(len(owner_list))])})"
            for i, o in enumerate(owner_list):
                params[f"owner{i}"] = o.strip()

        if group_name:
            group_name_list = group_name.split(',')
            query += f" AND d.\"name\" IN ({','.join([':group_name' + str(i) for i in range(len(group_name_list))])})"
            count_query += f" AND d.\"name\" IN ({','.join([':group_name' + str(i) for i in range(len(group_name_list))])})"
            for i, g in enumerate(group_name_list):
                params[f"group_name{i}"] = g.strip()

        # Apply sorting
        sort_mapping = {
            'Newest first': 'a.created_at DESC',
            'Oldest first': 'a.created_at ASC',
            'A-Z': 'a.name ASC',
            'Z-A': 'a.name DESC'
        }
        sort_clause = sort_mapping.get(sort_by, 'a.created_at DESC')
        query += f" GROUP BY a.id, a.name, a.description, a.status, a.created_at, a.destination, c.first_name, c.surname, c.id, d.\"name\" ORDER BY {sort_clause}"

        # Add pagination
        query += " LIMIT :limit OFFSET :offset"

        # Execute queries
        result = db.execute(text(query), params)
        workflows = [dict(row._mapping) for row in result.fetchall()]

        count_result = db.execute(text(count_query), params)
        total = count_result.scalar()

        logger.info(f"Retrieved {len(workflows)} workflows, total {total}")
        return {
            "workflows": workflows,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        }

    except Exception as e:
        logger.error(f"Failed to fetch workflows: {str(e)}")
        raise HTTPException(500, f"Failed to fetch workflows: {str(e)}")