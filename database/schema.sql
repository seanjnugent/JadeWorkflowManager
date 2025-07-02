--
-- PostgreSQL database dump
--

-- Dumped from database version 15.8
-- Dumped by pg_dump version 17.0

-- Started on 2025-07-01 11:40:23

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 20 (class 2615 OID 17476)
-- Name: workflow; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA workflow;


ALTER SCHEMA workflow OWNER TO postgres;

--
-- TOC entry 442 (class 1255 OID 73560)
-- Name: change_password(integer, text); Type: FUNCTION; Schema: workflow; Owner: postgres
--

CREATE FUNCTION workflow.change_password(p_user_id integer, p_new_password text) RETURNS void
    LANGUAGE plpgsql
    AS $$BEGIN
    -- Update the user's password with a hashed version of the new password
    UPDATE workflow."user"
    SET password_hash = workflow.hash_password(p_new_password),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id;

    -- Optional: Check that the update affected a row (i.e., user existed)
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User with ID % not found', p_user_id;
    END IF;
END;$$;


ALTER FUNCTION workflow.change_password(p_user_id integer, p_new_password text) OWNER TO postgres;

--
-- TOC entry 409 (class 1255 OID 43190)
-- Name: get_effective_config(integer); Type: FUNCTION; Schema: workflow; Owner: postgres
--

CREATE FUNCTION workflow.get_effective_config(p_workflow_id integer) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT 
        CASE 
            WHEN config_template IS NOT NULL THEN config_template
            ELSE jsonb_build_object(
                'ops', jsonb_build_object(
                    'load_input_workflow_job_' || id, jsonb_build_object(
                        'config', jsonb_build_object(
                            'input_file_path', '',
                            'output_file_path', '',
                            'workflow_id', id
                        )
                    ),
                    'transform_workflow_job_' || id, jsonb_build_object(
                        'config', jsonb_build_object(
                            'workflow_id', id,
                            'parameters', '{}'::jsonb
                        )
                    ),
                    'save_output_workflow_job_' || id, jsonb_build_object(
                        'config', jsonb_build_object(
                            'output_file_path', '',
                            'workflow_id', id
                        )
                    )
                )
            )
        END
    INTO v_result
    FROM workflow.workflow 
    WHERE id = p_workflow_id;
    
    RETURN v_result;
END;
$$;


ALTER FUNCTION workflow.get_effective_config(p_workflow_id integer) OWNER TO postgres;

--
-- TOC entry 432 (class 1255 OID 87608)
-- Name: get_recent_activity(integer, integer); Type: FUNCTION; Schema: workflow; Owner: postgres
--

CREATE FUNCTION workflow.get_recent_activity(user_id integer, limit_count integer DEFAULT 3) RETURNS TABLE(run_id integer, status character varying, workflow_name character varying, workflow_id text, triggered_by_username text, last_updated timestamp with time zone, latest_activity text)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.id AS run_id,
        r.status,
        w.name AS workflow_name,
        w.id::TEXT AS workflow_id,
        concat(u.first_name, ' ', u.surname) AS triggered_by_username,
        COALESCE(
            MAX(r.finished_at),
            MAX(r.started_at),
            MAX(log_max.timestamp)
        ) AS last_updated,
        COALESCE(
            (SELECT rs.status || ' - ' || rs.step_code FROM workflow.run_step_status rs WHERE rs.run_id = r.id ORDER BY rs.finished_at DESC LIMIT 1),
            'No activity yet'
        ) AS latest_activity
    FROM workflow.run r
    JOIN workflow.workflow w ON r.workflow_id = w.id
    JOIN workflow.user u ON r.triggered_by = u.id
    LEFT JOIN workflow.run_log log_max ON r.id = log_max.run_id
    GROUP BY r.id, w.name, w.id, u.first_name, u.surname
    ORDER BY last_updated DESC NULLS LAST
    LIMIT get_recent_activity.limit_count;
END;
$$;


ALTER FUNCTION workflow.get_recent_activity(user_id integer, limit_count integer) OWNER TO postgres;

--
-- TOC entry 582 (class 1255 OID 17709)
-- Name: get_user_details(integer); Type: FUNCTION; Schema: workflow; Owner: postgres
--

CREATE FUNCTION workflow.get_user_details(p_user_id integer) RETURNS TABLE(id integer, username character varying, email character varying, role character varying, created_at timestamp without time zone, last_login_at timestamp without time zone, login_count integer, is_locked boolean, total_logins integer, account_age_days integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        u.id,
        u.username,
        u.email,
        u.role,
        u.created_at,
        u.last_login_at,
        u.login_count,
        u.is_locked,
        COALESCE(u.login_count, 0) AS total_logins,
        EXTRACT(DAY FROM (CURRENT_TIMESTAMP - u.created_at))::INTEGER AS account_age_days
    FROM 
        workflow."user" u
    WHERE 
        u.id = p_user_id;
END;
$$;


ALTER FUNCTION workflow.get_user_details(p_user_id integer) OWNER TO postgres;

--
-- TOC entry 410 (class 1255 OID 72253)
-- Name: get_workflow_with_stats(integer); Type: FUNCTION; Schema: workflow; Owner: postgres
--

CREATE FUNCTION workflow.get_workflow_with_stats(p_workflow_id integer) RETURNS TABLE(id integer, name character varying, description text, status character varying, parameters jsonb, input_structure jsonb, config_template jsonb, default_parameters jsonb, resources_config jsonb, requires_file boolean, supported_file_types jsonb, total_runs bigint, successful_runs bigint, failed_runs bigint, last_run_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        w.id,
        w.name,
        w.description,
        w.status,
        w.parameters,
        w.input_structure,
        w.config_template,
        w.default_parameters,
        w.resources_config,
        w.requires_file,
        w.supported_file_types,
        COUNT(r.id) as total_runs,
        COUNT(CASE WHEN r.status = 'SUCCESS' THEN 1 END) as successful_runs,
        COUNT(CASE WHEN r.status IN ('FAILURE', 'ERROR') THEN 1 END) as failed_runs,
        MAX(r.started_at) as last_run_at
    FROM workflow.workflow w
    LEFT JOIN workflow.run r ON w.id = r.workflow_id
    WHERE w.id = p_workflow_id
    GROUP BY w.id, w.name, w.description, w.status, w.parameters,
             w.input_structure, w.config_template, w.default_parameters,
             w.resources_config, w.requires_file, w.supported_file_types;
END;
$$;


ALTER FUNCTION workflow.get_workflow_with_stats(p_workflow_id integer) OWNER TO postgres;

--
-- TOC entry 583 (class 1255 OID 17710)
-- Name: hash_password(text); Type: FUNCTION; Schema: workflow; Owner: postgres
--

CREATE FUNCTION workflow.hash_password(plain_password text) RETURNS text
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN crypt(plain_password, gen_salt('bf'));
END;
$$;


ALTER FUNCTION workflow.hash_password(plain_password text) OWNER TO postgres;

--
-- TOC entry 399 (class 1255 OID 43191)
-- Name: update_successful_config(); Type: FUNCTION; Schema: workflow; Owner: postgres
--

CREATE FUNCTION workflow.update_successful_config() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.status IN ('Completed', 'Success') 
       AND OLD.status != NEW.status 
       AND NEW.config_used IS NOT NULL 
       AND NEW.config_validation_passed = true THEN
        UPDATE workflow.workflow 
        SET last_successful_config = NEW.config_used
        WHERE id = NEW.workflow_id;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION workflow.update_successful_config() OWNER TO postgres;

--
-- TOC entry 408 (class 1255 OID 43189)
-- Name: update_workflow_config(integer, jsonb, jsonb); Type: FUNCTION; Schema: workflow; Owner: postgres
--

CREATE FUNCTION workflow.update_workflow_config(p_workflow_id integer, p_config_template jsonb, p_default_parameters jsonb DEFAULT NULL::jsonb) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_current_version INTEGER;
BEGIN
    SELECT config_version INTO v_current_version 
    FROM workflow.workflow 
    WHERE id = p_workflow_id;
    
    UPDATE workflow.workflow 
    SET 
        config_template = p_config_template,
        default_parameters = COALESCE(p_default_parameters, default_parameters),
        config_version = COALESCE(v_current_version, 0) + 1,
        updated_at = NOW()
    WHERE id = p_workflow_id;
    
    INSERT INTO workflow.config_validation_log (
        workflow_id,
        config_data,
        validation_result,
        is_valid,
        dagster_job_name
    ) VALUES (
        p_workflow_id,
        jsonb_build_object(
            'config_template', p_config_template,
            'default_parameters', p_default_parameters
        ),
        jsonb_build_object('updated_by', 'system', 'action', 'config_update'),
        true,
        'workflow_job_' || p_workflow_id
    );
    
    RETURN TRUE;
END;
$$;


ALTER FUNCTION workflow.update_workflow_config(p_workflow_id integer, p_config_template jsonb, p_default_parameters jsonb) OWNER TO postgres;

--
-- TOC entry 400 (class 1255 OID 61985)
-- Name: validate_login(character varying, character varying); Type: FUNCTION; Schema: workflow; Owner: postgres
--

CREATE FUNCTION workflow.validate_login(p_email character varying, p_password character varying) RETURNS TABLE(user_id integer, first_name text, surname text, role character varying)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_user RECORD;
BEGIN
    -- Find user by email
    SELECT * INTO v_user 
    FROM workflow."user" 
    WHERE email = p_email;

    -- Check if user exists and password matches
    IF v_user.id IS NOT NULL AND 
       v_user.password_hash = crypt(p_password, v_user.password_hash) THEN
        
        -- Update last login timestamp
        UPDATE workflow."user" 
        SET 
            updated_at = CURRENT_TIMESTAMP,
            last_login_at = CURRENT_TIMESTAMP,
            login_count = COALESCE(login_count, 0) + 1
        WHERE id = v_user.id;

        -- Return user details
        RETURN QUERY 
        SELECT 
            v_user.id, 
            v_user.first_name, 
            v_user.surname, 
            v_user.role;
    END IF;

    -- Return nothing if login fails
    RETURN;
END;
$$;


ALTER FUNCTION workflow.validate_login(p_email character varying, p_password character varying) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 352 (class 1259 OID 43168)
-- Name: config_validation_log; Type: TABLE; Schema: workflow; Owner: postgres
--

CREATE TABLE workflow.config_validation_log (
    id integer NOT NULL,
    workflow_id integer,
    config_data jsonb NOT NULL,
    validation_result jsonb,
    is_valid boolean,
    validated_at timestamp without time zone DEFAULT now(),
    dagster_job_name character varying(255),
    error_details text
);


ALTER TABLE workflow.config_validation_log OWNER TO postgres;

--
-- TOC entry 351 (class 1259 OID 43167)
-- Name: config_validation_log_id_seq; Type: SEQUENCE; Schema: workflow; Owner: postgres
--

CREATE SEQUENCE workflow.config_validation_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE workflow.config_validation_log_id_seq OWNER TO postgres;

--
-- TOC entry 4117 (class 0 OID 0)
-- Dependencies: 351
-- Name: config_validation_log_id_seq; Type: SEQUENCE OWNED BY; Schema: workflow; Owner: postgres
--

ALTER SEQUENCE workflow.config_validation_log_id_seq OWNED BY workflow.config_validation_log.id;


--
-- TOC entry 325 (class 1259 OID 17947)
-- Name: connection; Type: TABLE; Schema: workflow; Owner: postgres
--

CREATE TABLE workflow.connection (
    id integer NOT NULL,
    name character varying,
    type character varying,
    host character varying,
    port integer,
    database_name character varying,
    username character varying,
    password_hash character varying,
    created_by integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone
);


ALTER TABLE workflow.connection OWNER TO postgres;

--
-- TOC entry 4118 (class 0 OID 0)
-- Dependencies: 325
-- Name: COLUMN connection.type; Type: COMMENT; Schema: workflow; Owner: postgres
--

COMMENT ON COLUMN workflow.connection.type IS 'e.g., PostgreSQL, MySQL, BigQuery, CSV';


--
-- TOC entry 356 (class 1259 OID 61987)
-- Name: refresh_tokens; Type: TABLE; Schema: workflow; Owner: postgres
--

CREATE TABLE workflow.refresh_tokens (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token character varying NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE workflow.refresh_tokens OWNER TO postgres;

--
-- TOC entry 355 (class 1259 OID 61986)
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: workflow; Owner: postgres
--

CREATE SEQUENCE workflow.refresh_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE workflow.refresh_tokens_id_seq OWNER TO postgres;

--
-- TOC entry 4119 (class 0 OID 0)
-- Dependencies: 355
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: workflow; Owner: postgres
--

ALTER SEQUENCE workflow.refresh_tokens_id_seq OWNED BY workflow.refresh_tokens.id;


--
-- TOC entry 373 (class 1259 OID 70984)
-- Name: run; Type: TABLE; Schema: workflow; Owner: postgres
--

CREATE TABLE workflow.run (
    id integer NOT NULL,
    dagster_run_id character varying(255) NOT NULL,
    workflow_id integer,
    started_at timestamp with time zone DEFAULT now(),
    finished_at timestamp with time zone,
    status character varying(50) NOT NULL,
    config jsonb,
    input_file_path character varying(255),
    output_file_path character varying(255),
    error_message text,
    duration_ms double precision,
    triggered_by bigint,
    config_used jsonb
);


ALTER TABLE workflow.run OWNER TO postgres;

--
-- TOC entry 372 (class 1259 OID 70983)
-- Name: run_id_seq; Type: SEQUENCE; Schema: workflow; Owner: postgres
--

CREATE SEQUENCE workflow.run_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE workflow.run_id_seq OWNER TO postgres;

--
-- TOC entry 4120 (class 0 OID 0)
-- Dependencies: 372
-- Name: run_id_seq; Type: SEQUENCE OWNED BY; Schema: workflow; Owner: postgres
--

ALTER SEQUENCE workflow.run_id_seq OWNED BY workflow.run.id;


--
-- TOC entry 375 (class 1259 OID 70999)
-- Name: run_log; Type: TABLE; Schema: workflow; Owner: postgres
--

CREATE TABLE workflow.run_log (
    id integer NOT NULL,
    dagster_run_id character varying(255) NOT NULL,
    workflow_id integer,
    step_code character varying(255),
    log_level character varying(50),
    message text NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now(),
    run_id bigint,
    event_data jsonb DEFAULT '{}'::jsonb,
    event_type character varying(100)
);


ALTER TABLE workflow.run_log OWNER TO postgres;

--
-- TOC entry 374 (class 1259 OID 70998)
-- Name: run_log_id_seq; Type: SEQUENCE; Schema: workflow; Owner: postgres
--

CREATE SEQUENCE workflow.run_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE workflow.run_log_id_seq OWNER TO postgres;

--
-- TOC entry 4121 (class 0 OID 0)
-- Dependencies: 374
-- Name: run_log_id_seq; Type: SEQUENCE OWNED BY; Schema: workflow; Owner: postgres
--

ALTER SEQUENCE workflow.run_log_id_seq OWNED BY workflow.run_log.id;


--
-- TOC entry 377 (class 1259 OID 71014)
-- Name: run_step_status; Type: TABLE; Schema: workflow; Owner: postgres
--

CREATE TABLE workflow.run_step_status (
    id integer NOT NULL,
    dagster_run_id character varying(255) NOT NULL,
    workflow_id integer,
    step_code character varying(255) NOT NULL,
    status character varying(50) NOT NULL,
    start_time timestamp with time zone DEFAULT now(),
    end_time timestamp with time zone,
    duration_ms double precision,
    started_at timestamp with time zone,
    run_id bigint,
    finished_at timestamp with time zone,
    error_message text
);


ALTER TABLE workflow.run_step_status OWNER TO postgres;

--
-- TOC entry 376 (class 1259 OID 71013)
-- Name: run_step_status_id_seq; Type: SEQUENCE; Schema: workflow; Owner: postgres
--

CREATE SEQUENCE workflow.run_step_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE workflow.run_step_status_id_seq OWNER TO postgres;

--
-- TOC entry 4122 (class 0 OID 0)
-- Dependencies: 376
-- Name: run_step_status_id_seq; Type: SEQUENCE OWNED BY; Schema: workflow; Owner: postgres
--

ALTER SEQUENCE workflow.run_step_status_id_seq OWNED BY workflow.run_step_status.id;


--
-- TOC entry 326 (class 1259 OID 17965)
-- Name: user; Type: TABLE; Schema: workflow; Owner: postgres
--

CREATE TABLE workflow."user" (
    id integer NOT NULL,
    first_name text,
    email text,
    password_hash character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone,
    role character varying,
    last_login_at timestamp without time zone,
    login_count integer DEFAULT 0,
    is_locked boolean DEFAULT false,
    failed_login_attempts integer DEFAULT 0,
    locked_until timestamp without time zone,
    surname text,
    user_group_id bigint
);


ALTER TABLE workflow."user" OWNER TO postgres;

--
-- TOC entry 4123 (class 0 OID 0)
-- Dependencies: 326
-- Name: COLUMN "user".role; Type: COMMENT; Schema: workflow; Owner: postgres
--

COMMENT ON COLUMN workflow."user".role IS 'e.g., admin, user, viewer';


--
-- TOC entry 353 (class 1259 OID 61959)
-- Name: user_group; Type: TABLE; Schema: workflow; Owner: postgres
--

CREATE TABLE workflow.user_group (
    id bigint NOT NULL,
    name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE workflow.user_group OWNER TO postgres;

--
-- TOC entry 354 (class 1259 OID 61962)
-- Name: user_group_id_seq; Type: SEQUENCE; Schema: workflow; Owner: postgres
--

ALTER TABLE workflow.user_group ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME workflow.user_group_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 379 (class 1259 OID 75834)
-- Name: user_id_seq; Type: SEQUENCE; Schema: workflow; Owner: postgres
--

ALTER TABLE workflow."user" ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME workflow.user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 371 (class 1259 OID 70971)
-- Name: workflow; Type: TABLE; Schema: workflow; Owner: postgres
--

CREATE TABLE workflow.workflow (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    status character varying(50) DEFAULT 'ready'::character varying,
    schedule character varying(255),
    last_run_at timestamp with time zone,
    next_run_at timestamp with time zone,
    input_structure jsonb,
    parameters jsonb,
    input_file_path character varying(255),
    destination character varying(50),
    dag_path character varying(255),
    config_template jsonb,
    default_parameters jsonb,
    config_version integer DEFAULT 1,
    dag_status text,
    commit_sha text,
    destination_config jsonb,
    resources_config jsonb DEFAULT '{}'::jsonb,
    dagster_location_name character varying(255) DEFAULT 'server.app.dagster.repo'::character varying,
    dagster_repository_name character varying(255) DEFAULT '__repository__'::character varying,
    requires_file boolean DEFAULT true,
    output_file_pattern character varying(255) DEFAULT 'workflow-files/outputs/output_{{workflow_id}}_{{run_uuid}}.{{output_extension}}'::character varying,
    supported_file_types jsonb DEFAULT '["csv", "xlsx", "json"]'::jsonb
);


ALTER TABLE workflow.workflow OWNER TO postgres;

--
-- TOC entry 370 (class 1259 OID 70970)
-- Name: workflow_id_seq; Type: SEQUENCE; Schema: workflow; Owner: postgres
--

CREATE SEQUENCE workflow.workflow_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE workflow.workflow_id_seq OWNER TO postgres;

--
-- TOC entry 4124 (class 0 OID 0)
-- Dependencies: 370
-- Name: workflow_id_seq; Type: SEQUENCE OWNED BY; Schema: workflow; Owner: postgres
--

ALTER SEQUENCE workflow.workflow_id_seq OWNED BY workflow.workflow.id;


--
-- TOC entry 327 (class 1259 OID 17986)
-- Name: workflow_permission; Type: TABLE; Schema: workflow; Owner: postgres
--

CREATE TABLE workflow.workflow_permission (
    id integer NOT NULL,
    user_id integer,
    workflow_id integer,
    permission_level character varying,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE workflow.workflow_permission OWNER TO postgres;

--
-- TOC entry 4125 (class 0 OID 0)
-- Dependencies: 327
-- Name: COLUMN workflow_permission.permission_level; Type: COMMENT; Schema: workflow; Owner: postgres
--

COMMENT ON COLUMN workflow.workflow_permission.permission_level IS 'e.g., read, write, execute';


--
-- TOC entry 329 (class 1259 OID 34710)
-- Name: workflow_permission_id_seq; Type: SEQUENCE; Schema: workflow; Owner: postgres
--

ALTER TABLE workflow.workflow_permission ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME workflow.workflow_permission_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 378 (class 1259 OID 72248)
-- Name: workflow_runs_view; Type: VIEW; Schema: workflow; Owner: postgres
--

CREATE VIEW workflow.workflow_runs_view AS
 SELECT r.id AS run_id,
    r.workflow_id,
    w.name AS workflow_name,
    w.description AS workflow_description,
    r.triggered_by,
    r.status,
    r.dagster_run_id,
    r.input_file_path,
    r.config_used,
    r.started_at,
    r.finished_at AS completed_at,
    r.error_message,
    w.destination,
    w.parameters AS workflow_parameters,
    w.requires_file
   FROM (workflow.run r
     JOIN workflow.workflow w ON ((r.workflow_id = w.id)))
  ORDER BY r.started_at DESC;


ALTER VIEW workflow.workflow_runs_view OWNER TO postgres;

--
-- TOC entry 3880 (class 2604 OID 43171)
-- Name: config_validation_log id; Type: DEFAULT; Schema: workflow; Owner: postgres
--

ALTER TABLE ONLY workflow.config_validation_log ALTER COLUMN id SET DEFAULT nextval('workflow.config_validation_log_id_seq'::regclass);


--
-- TOC entry 3883 (class 2604 OID 61990)
-- Name: refresh_tokens id; Type: DEFAULT; Schema: workflow; Owner: postgres
--

ALTER TABLE ONLY workflow.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('workflow.refresh_tokens_id_seq'::regclass);


--
-- TOC entry 3896 (class 2604 OID 70987)
-- Name: run id; Type: DEFAULT; Schema: workflow; Owner: postgres
--

ALTER TABLE ONLY workflow.run ALTER COLUMN id SET DEFAULT nextval('workflow.run_id_seq'::regclass);


--
-- TOC entry 3898 (class 2604 OID 71002)
-- Name: run_log id; Type: DEFAULT; Schema: workflow; Owner: postgres
--

ALTER TABLE ONLY workflow.run_log ALTER COLUMN id SET DEFAULT nextval('workflow.run_log_id_seq'::regclass);


--
-- TOC entry 3901 (class 2604 OID 71017)
-- Name: run_step_status id; Type: DEFAULT; Schema: workflow; Owner: postgres
--

ALTER TABLE ONLY workflow.run_step_status ALTER COLUMN id SET DEFAULT nextval('workflow.run_step_status_id_seq'::regclass);


--
-- TOC entry 3885 (class 2604 OID 70974)
-- Name: workflow id; Type: DEFAULT; Schema: workflow; Owner: postgres
--

ALTER TABLE ONLY workflow.workflow ALTER COLUMN id SET DEFAULT nextval('workflow.workflow_id_seq'::regclass);


--
-- TOC entry 3914 (class 2606 OID 43176)
-- Name: config_validation_log config_validation_log_pkey; Type: CONSTRAINT; Schema: workflow; Owner: postgres
--

ALTER TABLE ONLY workflow.config_validation_log
    ADD CONSTRAINT config_validation_log_pkey PRIMARY KEY (id);


--
-- TOC entry 3904 (class 2606 OID 18072)
-- Name: connection connection_pkey; Type: CONSTRAINT; Schema: workflow; Owner: postgres
--

ALTER TABLE ONLY workflow.connection
    ADD CONSTRAINT connection_pkey PRIMARY KEY (id);


--
-- TOC entry 3921 (class 2606 OID 61995)
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: workflow; Owner: postgres
--

ALTER TABLE ONLY workflow.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- TOC entry 3929 (class 2606 OID 73491)
-- Name: run run_dagster_run_id_unique; Type: CONSTRAINT; Schema: workflow; Owner: postgres
--

ALTER TABLE ONLY workflow.run
    ADD CONSTRAINT run_dagster_run_id_unique UNIQUE (dagster_run_id);


--
-- TOC entry 3937 (class 2606 OID 71007)
-- Name: run_log run_log_pkey; Type: CONSTRAINT; Schema: workflow; Owner: postgres
--

ALTER TABLE ONLY workflow.run_log
    ADD CONSTRAINT run_log_pkey PRIMARY KEY (id);


--
-- TOC entry 3939 (class 2606 OID 87033)
-- Name: run_log run_log_unique_event; Type: CONSTRAINT; Schema: workflow; Owner: postgres
--

ALTER TABLE ONLY workflow.run_log
    ADD CONSTRAINT run_log_unique_event UNIQUE (dagster_run_id, event_type, "timestamp");


--
-- TOC entry 3931 (class 2606 OID 70992)
-- Name: run run_pkey; Type: CONSTRAINT; Schema: workflow; Owner: postgres
--

ALTER TABLE ONLY workflow.run
    ADD CONSTRAINT run_pkey PRIMARY KEY (id);


--
-- TOC entry 3943 (class 2606 OID 71022)
-- Name: run_step_status run_step_status_pkey; Type: CONSTRAINT; Schema: workflow; Owner: postgres
--

ALTER TABLE ONLY workflow.run_step_status
    ADD CONSTRAINT run_step_status_pkey PRIMARY KEY (id);


--
-- TOC entry 3945 (class 2606 OID 87145)
-- Name: run_step_status run_step_status_unique_run_step; Type: CONSTRAINT; Schema: workflow; Owner: postgres
--

ALTER TABLE ONLY workflow.run_step_status
    ADD CONSTRAINT run_step_status_unique_run_step UNIQUE (dagster_run_id, step_code);


--
-- TOC entry 3906 (class 2606 OID 61958)
-- Name: user user_email_key; Type: CONSTRAINT; Schema: workflow; Owner: postgres
--

ALTER TABLE ONLY workflow."user"
    ADD CONSTRAINT user_email_key UNIQUE (email);


--
-- TOC entry 3917 (class 2606 OID 61970)
-- Name: user_group user_group_pkey; Type: CONSTRAINT; Schema: workflow; Owner: postgres
--

ALTER TABLE ONLY workflow.user_group
    ADD CONSTRAINT user_group_pkey PRIMARY KEY (id);


--
-- TOC entry 3908 (class 2606 OID 75836)
-- Name: user user_id_key; Type: CONSTRAINT; Schema: workflow; Owner: postgres
--

ALTER TABLE ONLY workflow."user"
    ADD CONSTRAINT user_id_key UNIQUE (id);


--
-- TOC entry 3910 (class 2606 OID 18080)
-- Name: user user_pkey; Type: CONSTRAINT; Schema: workflow; Owner: postgres
--

ALTER TABLE ONLY workflow."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- TOC entry 3912 (class 2606 OID 18084)
-- Name: workflow_permission workflow_permission_pkey; Type: CONSTRAINT; Schema: workflow; Owner: postgres
--

ALTER TABLE ONLY workflow.workflow_permission
    ADD CONSTRAINT workflow_permission_pkey PRIMARY KEY (id);


--
-- TOC entry 3924 (class 2606 OID 70982)
-- Name: workflow workflow_pkey; Type: CONSTRAINT; Schema: workflow; Owner: postgres
--

ALTER TABLE ONLY workflow.workflow
    ADD CONSTRAINT workflow_pkey PRIMARY KEY (id);


--
-- TOC entry 3915 (class 1259 OID 43182)
-- Name: idx_config_validation_workflow; Type: INDEX; Schema: workflow; Owner: postgres
--

CREATE INDEX idx_config_validation_workflow ON workflow.config_validation_log USING btree (workflow_id, validated_at DESC);


--
-- TOC entry 3918 (class 1259 OID 62002)
-- Name: idx_refresh_tokens_token; Type: INDEX; Schema: workflow; Owner: postgres
--

CREATE INDEX idx_refresh_tokens_token ON workflow.refresh_tokens USING btree (token);


--
-- TOC entry 3919 (class 1259 OID 62001)
-- Name: idx_refresh_tokens_user_id; Type: INDEX; Schema: workflow; Owner: postgres
--

CREATE INDEX idx_refresh_tokens_user_id ON workflow.refresh_tokens USING btree (user_id);


--
-- TOC entry 3925 (class 1259 OID 71028)
-- Name: idx_run_dagster_run_id; Type: INDEX; Schema: workflow; Owner: postgres
--

CREATE INDEX idx_run_dagster_run_id ON workflow.run USING btree (dagster_run_id);


--
-- TOC entry 3932 (class 1259 OID 71029)
-- Name: idx_run_log_dagster_run_id; Type: INDEX; Schema: workflow; Owner: postgres
--

CREATE INDEX idx_run_log_dagster_run_id ON workflow.run_log USING btree (dagster_run_id);


--
-- TOC entry 3933 (class 1259 OID 86970)
-- Name: idx_run_log_event_type; Type: INDEX; Schema: workflow; Owner: postgres
--

CREATE INDEX idx_run_log_event_type ON workflow.run_log USING btree (event_type);


--
-- TOC entry 3934 (class 1259 OID 86969)
-- Name: idx_run_log_run_id; Type: INDEX; Schema: workflow; Owner: postgres
--

CREATE INDEX idx_run_log_run_id ON workflow.run_log USING btree (run_id);


--
-- TOC entry 3935 (class 1259 OID 87166)
-- Name: idx_run_log_step_code; Type: INDEX; Schema: workflow; Owner: postgres
--

CREATE INDEX idx_run_log_step_code ON workflow.run_log USING btree (step_code);


--
-- TOC entry 3926 (class 1259 OID 72247)
-- Name: idx_run_status; Type: INDEX; Schema: workflow; Owner: postgres
--

CREATE INDEX idx_run_status ON workflow.run USING btree (status);


--
-- TOC entry 3940 (class 1259 OID 71030)
-- Name: idx_run_step_status_dagster_run_id; Type: INDEX; Schema: workflow; Owner: postgres
--

CREATE INDEX idx_run_step_status_dagster_run_id ON workflow.run_step_status USING btree (dagster_run_id);


--
-- TOC entry 3941 (class 1259 OID 87123)
-- Name: idx_run_step_status_step_code; Type: INDEX; Schema: workflow; Owner: postgres
--

CREATE INDEX idx_run_step_status_step_code ON workflow.run_step_status USING btree (step_code);


--
-- TOC entry 3927 (class 1259 OID 72246)
-- Name: idx_run_workflow_id; Type: INDEX; Schema: workflow; Owner: postgres
--

CREATE INDEX idx_run_workflow_id ON workflow.run USING btree (workflow_id);


--
-- TOC entry 3922 (class 1259 OID 72245)
-- Name: idx_workflow_status; Type: INDEX; Schema: workflow; Owner: postgres
--

CREATE INDEX idx_workflow_status ON workflow.workflow USING btree (status);


--
-- TOC entry 3946 (class 2606 OID 18221)
-- Name: connection connection_created_by_fkey; Type: FK CONSTRAINT; Schema: workflow; Owner: postgres
--

ALTER TABLE ONLY workflow.connection
    ADD CONSTRAINT connection_created_by_fkey FOREIGN KEY (created_by) REFERENCES workflow."user"(id);


--
-- TOC entry 3951 (class 2606 OID 73492)
-- Name: run_log fk_run_log_run; Type: FK CONSTRAINT; Schema: workflow; Owner: postgres
--

ALTER TABLE ONLY workflow.run_log
    ADD CONSTRAINT fk_run_log_run FOREIGN KEY (dagster_run_id) REFERENCES workflow.run(dagster_run_id);


--
-- TOC entry 3953 (class 2606 OID 73497)
-- Name: run_step_status fk_run_step_status_run; Type: FK CONSTRAINT; Schema: workflow; Owner: postgres
--

ALTER TABLE ONLY workflow.run_step_status
    ADD CONSTRAINT fk_run_step_status_run FOREIGN KEY (dagster_run_id) REFERENCES workflow.run(dagster_run_id);


--
-- TOC entry 3949 (class 2606 OID 61996)
-- Name: refresh_tokens fk_user; Type: FK CONSTRAINT; Schema: workflow; Owner: postgres
--

ALTER TABLE ONLY workflow.refresh_tokens
    ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES workflow."user"(id) ON DELETE CASCADE;


--
-- TOC entry 3952 (class 2606 OID 71008)
-- Name: run_log run_log_workflow_id_fkey; Type: FK CONSTRAINT; Schema: workflow; Owner: postgres
--

ALTER TABLE ONLY workflow.run_log
    ADD CONSTRAINT run_log_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES workflow.workflow(id);


--
-- TOC entry 3954 (class 2606 OID 71023)
-- Name: run_step_status run_step_status_workflow_id_fkey; Type: FK CONSTRAINT; Schema: workflow; Owner: postgres
--

ALTER TABLE ONLY workflow.run_step_status
    ADD CONSTRAINT run_step_status_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES workflow.workflow(id);


--
-- TOC entry 3950 (class 2606 OID 70993)
-- Name: run run_workflow_id_fkey; Type: FK CONSTRAINT; Schema: workflow; Owner: postgres
--

ALTER TABLE ONLY workflow.run
    ADD CONSTRAINT run_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES workflow.workflow(id);


--
-- TOC entry 3947 (class 2606 OID 61978)
-- Name: user user_user_group_id_fkey; Type: FK CONSTRAINT; Schema: workflow; Owner: postgres
--

ALTER TABLE ONLY workflow."user"
    ADD CONSTRAINT user_user_group_id_fkey FOREIGN KEY (user_group_id) REFERENCES workflow.user_group(id) ON DELETE SET NULL;


--
-- TOC entry 3948 (class 2606 OID 18261)
-- Name: workflow_permission workflow_permission_user_id_fkey; Type: FK CONSTRAINT; Schema: workflow; Owner: postgres
--

ALTER TABLE ONLY workflow.workflow_permission
    ADD CONSTRAINT workflow_permission_user_id_fkey FOREIGN KEY (user_id) REFERENCES workflow."user"(id);


--
-- TOC entry 4110 (class 0 OID 61959)
-- Dependencies: 353
-- Name: user_group; Type: ROW SECURITY; Schema: workflow; Owner: postgres
--

ALTER TABLE workflow.user_group ENABLE ROW LEVEL SECURITY;

-- Completed on 2025-07-01 11:40:34

--
-- PostgreSQL database dump complete
--

