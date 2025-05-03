from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import logging
from pydantic import BaseModel
from .get_health_check import get_db

logger = logging.getLogger(__name__)

class ConnectionCreate(BaseModel):
    name: str
    type: str
    host: str
    port: int
    database_name: str
    username: str
    password: str
    created_by: int

router = APIRouter()

@router.post("/connections/")
async def create_connection(
    connection: ConnectionCreate,
    db: Session = Depends(get_db)
):
    """Create a new database connection"""
    try:
        logger.info(f"Creating new connection: {connection.name}")
        result = db.execute(
            text("""
                INSERT INTO workflow.connection (
                    name, type, host, port,
                    database_name, username, password_hash,
                    created_by, created_at, updated_at
                ) VALUES (
                    :name, :type, :host, :port,
                    :database_name, :username, crypt(:password, gen_salt('bf')),
                    :created_by, NOW(), NOW()
                )
                RETURNING id, name, type, host
            """),
            {
                "name": connection.name,
                "type": connection.type,
                "host": connection.host,
                "port": connection.port,
                "database_name": connection.database_name,
                "username": connection.username,
                "password": connection.password,
                "created_by": connection.created_by
            }
        )
        conn_record = result.fetchone()
        db.commit()
        logger.info(f"Connection {connection.name} created successfully")
        return {"connection": dict(conn_record._mapping)}
    except Exception as e:
        logger.error(f"Failed to create connection: {str(e)}")
        db.rollback()
        raise HTTPException(500, f"Failed to create connection: {str(e)}")

@router.get("/connections/")
async def list_connections(
    db: Session = Depends(get_db)
):
    """List all connections (without passwords)"""
    try:
        logger.info("Listing connections")
        result = db.execute(
            text("""
                SELECT id, name, type, host, port, database_name, username
                FROM workflow.connection
                ORDER BY name
            """)
        )
        connections = [dict(row._mapping) for row in result.fetchall()]
        logger.info(f"Retrieved {len(connections)} connections")
        return connections
    except Exception as e:
        logger.error(f"Failed to fetch connections: {str(e)}")
        raise HTTPException(500, f"Failed to fetch connections: {str(e)}")
