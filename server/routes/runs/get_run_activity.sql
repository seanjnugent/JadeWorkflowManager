               
                SELECT a.id, a.workflow_id, a.status, rss.step_code, rss.started_at, wf.name, wf.description
FROM workflow.run a
inner join workflow.workflow wf on a.workflow_id  = wf.id
left join workflow.run_step_status rss on a.id = rss.run_id
left join workflow.run_log rl on a.id = rl.run_id


