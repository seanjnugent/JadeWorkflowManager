from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from datetime import datetime, timedelta
from ..get_health_check import get_db
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/workflow-run-stats")
async def get_workflow_run_stats(days: int = 30, db: Session = Depends(get_db)):
    """Get workflow run statistics for the last N days"""
    try:
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)

        # Aggregate run counts and status
        run_stats = db.execute(
            text("""
                SELECT 
                    DATE(started_at) as run_date,
                    COUNT(*) as total_runs,
SUM(CASE WHEN LOWER(status) = 'success' THEN 1 ELSE 0 END) as successful_runs,
SUM(CASE WHEN LOWER(status) IN ('failed', 'failure') THEN 1 ELSE 0 END) as failed_runs,
                    AVG(duration_ms::float / 1000) as avg_duration_seconds
                FROM workflow.run
                WHERE started_at >= :start_date AND started_at <= :end_date
                GROUP BY DATE(started_at)
                ORDER BY run_date
            """),
            {"start_date": start_date, "end_date": end_date}
        ).fetchall()

        return {
            "run_stats": [
                {
                    "date": str(row.run_date),
                    "total_runs": row.total_runs,
                    "successful_runs": row.successful_runs,
                    "failed_runs": row.failed_runs,
                    "avg_duration_seconds": round(row.avg_duration_seconds or 0, 2)
                } for row in run_stats
            ]
        }
    except Exception as e:
        logger.error(f"Failed to fetch run stats: {str(e)}")
        raise HTTPException(500, f"Failed to fetch run stats: {str(e)}")

@router.get("/failure-analysis")
async def get_failure_analysis(days: int = 30, db: Session = Depends(get_db)):
    """Get details of failed runs"""
    try:
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)

        failures = db.execute(
            text("""
                SELECT 
                    r.id,
                    r.workflow_id,
                    w.name as workflow_name,
                    r.started_at,
                    r.error_message,
                    r.dagster_run_id
                FROM workflow.run r
                JOIN workflow.workflow w ON r.workflow_id = w.id
                WHERE r.status = 'failed'
                AND r.started_at >= :start_date AND r.started_at <= :end_date
                ORDER BY r.started_at DESC
                LIMIT 50
            """),
            {"start_date": start_date, "end_date": end_date}
        ).fetchall()

        return {
            "failures": [
                {
                    "run_id": row.id,
                    "workflow_id": row.workflow_id,
                    "workflow_name": row.workflow_name,
                    "started_at": str(row.started_at),
                    "error_message": row.error_message,
                    "dagster_run_id": row.dagster_run_id
                } for row in failures
            ]
        }
    except Exception as e:
        logger.error(f"Failed to fetch failure analysis: {str(e)}")
        raise HTTPException(500, f"Failed to fetch failure analysis: {str(e)}")

@router.get("/user-activity")
async def get_user_activity(days: int = 30, db: Session = Depends(get_db)):
    """Get user activity metrics"""
    try:
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)

        user_activity = db.execute(
            text("""
                SELECT 
                    u.id,
                    u.username,
                    u.email,
                    u.last_login_at,
                    u.login_count,
                    COUNT(r.id) as trigger_count
                FROM workflow.user u
                LEFT JOIN workflow.run r ON u.id = r.triggered_by
                WHERE (r.started_at >= :start_date AND r.started_at <= :end_date) 
                    OR r.started_at IS NULL
                GROUP BY u.id, u.username, u.email, u.last_login_at, u.login_count
                ORDER BY trigger_count DESC
            """),
            {"start_date": start_date, "end_date": end_date}
        ).fetchall()

        return {
            "users": [
                {
                    "user_id": row.id,
                    "username": row.username,
                    "email": row.email,
                    "last_login_at": str(row.last_login_at) if row.last_login_at else None,
                    "login_count": row.login_count,
                    "trigger_count": row.trigger_count
                } for row in user_activity
            ]
        }
    except Exception as e:
        logger.error(f"Failed to fetch user activity: {str(e)}")
        raise HTTPException(500, f"Failed to fetch user activity: {str(e)}")

@router.get("/step-performance")
async def get_step_performance(days: int = 30, db: Session = Depends(get_db)):
    """Get performance metrics for workflow steps"""
    try:
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)

        step_stats = db.execute(
            text("""
                SELECT 
                    ws.workflow_id,
                    w.name as workflow_name,
                    ws.label as step_label,
                    ws.step_code,
                    COUNT(rss.id) as execution_count,
                    SUM(CASE WHEN rss.status = 'failed' THEN 1 ELSE 0 END) as failure_count,
                    AVG(rss.duration_ms::float / 1000) as avg_duration_seconds
                FROM workflow.workflow_step ws
                JOIN workflow.workflow w ON ws.workflow_id = w.id
                LEFT JOIN workflow.run_step_status rss ON ws.step_code = rss.step_code
                WHERE rss.started_at >= :start_date AND rss.started_at <= :end_date
                GROUP BY ws.workflow_id, w.name, ws.label, ws.step_code
                ORDER BY failure_count DESC, avg_duration_seconds DESC
            """),
            {"start_date": start_date, "end_date": end_date}
        ).fetchall()

        return {
            "step_stats": [
                {
                    "workflow_id": row.workflow_id,
                    "workflow_name": row.workflow_name,
                    "step_label": row.step_label,
                    "step_code": row.step_code,
                    "execution_count": row.execution_count,
                    "failure_count": row.failure_count,
                    "avg_duration_seconds": round(row.avg_duration_seconds or 0, 2)
                } for row in step_stats
            ]
        }
    except Exception as e:
        logger.error(f"Failed to fetch step performance: {str(e)}")
        raise HTTPException(500, f"Failed to fetch step performance: {str(e)}")