#Jade

Jade is a lightweight, user-friendly data pipeline tool designed to simplify the process of loading, transforming, and automating data workflows in the cloud. It provides a dynamic interface for running code and managing data transformations, enabling users to upload files, transform data, and send it to various destinations such as databases, files, or APIs. Jade supports seamless automation of data journeys, offering an intuitive dashboard for managing workflows, monitoring execution history, and configuring pipeline settings.

##Features

- Dynamic Workflow Management: Browse, create, and manage data processing pipelines with an intuitive web interface.
- Execution History Tracking: Monitor workflow run details, including status, timestamps, and outcomes.
- Flexible Data Sources and Destinations: Supports databases, file uploads, and APIs as both input sources and output destinations.
- Secure Authentication: Implements hashed passwords, JWT tokens, and role-based permissions (user vs. admin) for secure access.
- API Key Security: Uses Fernet key encryption for secure API key management.
- Customizable Workflows: Define and configure workflows with Dagster, synced with GitHub for DAG management.

##Screenshots

###Home Page Dashboard
The dashboard provides quick access to key features:
- Browse Workflows: Explore and manage your data pipelines.
- View History: Track execution history with detailed insights.

<img width="1511" height="1153" alt="image" src="https://github.com/user-attachments/assets/92f391c1-541b-404b-be22-2347c8a0e62b" />

###Workflow Details
- View detailed information about each workflow, including the DAG, creator, and creation date.

<img width="1408" height="1009" alt="image" src="https://github.com/user-attachments/assets/e8452c55-9462-4301-921e-1495a0e8de55" />

###Run Details
- Monitor specific workflow run details, including execution timestamps and status.

<img width="1140" height="1173" alt="image" src="https://github.com/user-attachments/assets/9727eefc-e729-41ff-a76e-83750f99f039" />


##Getting Started

###Prerequisites

- Node.js (for the client-side application)
- Python 3.8+ (for Dagster and FastAPI)
- PostgreSQL (for storing user credentials, workflow configurations, and definitions)
- Git (for syncing DAGs with GitHub)
- Docker (optional, for containerized deployment)

###Installation

- Clone the repository:

git clone https://github.com/seanjnugent/jade.git
cd jade

- Build the client:

cd client
npm install
npm run build

- Start the backend and frontend:

cd ..
npm run dev


Configure Dagster:
- Dagster runs on Python and listens on port 3500.
- Ensure DAGs are synced with a GitHub repository for workflow definitions.

Set up PostgreSQL:
-Create a database for user credentials, workflow configurations, and workflow definitions.
-Update connection settings in the configuration file (e.g., .env).

Configure FastAPI:
- The backend uses FastAPI for API endpoints. It listens on port 8000 and has OpenAPI documentation available at /api/docs

Ensure environment variables for JWT secrets and Fernet key are set for authentication and encryption.

## Security

Authentication: User passwords are hashed and stored in PostgreSQL. JWT tokens are used for session authentication.
Permissions: Users are assigned roles (user or admin), with permissions tied to specific DAGs.
API Security: API keys are encrypted using a Fernet key for secure access.

Technology Stack
Frontend: React (built with npm run build)
Backend: FastAPI (Python-based API framework)
Workflow Orchestration: Dagster (running on port 3500, synced with GitHub)
Database: PostgreSQL (stores user credentials, workflow configs, and definitions)
DevOps: Supports CI/CD pipelines (e.g., GitHub Actions) for automated deployment and testing.
Cloud: Deployable on AWS for scalable test environments (e.g., EC2, S3 for file storage).

Usage
Access the dashboard at http://localhost:3500 (or your deployed URL).
Log in with your credentials (admin or user role).
Browse or create workflows, defining sources (e.g., database, file, API) and destinations.
Configure transformations using Dagster’s DAG definitions.
Monitor run history and troubleshoot using detailed logs.



Contributing
Contributions are welcome! Please follow these steps:
Fork the repository.
Create a feature branch (git checkout -b feature/your-feature).
Commit changes (git commit -m 'Add your feature').
Push to the branch (git push origin feature/your-feature).
Open a pull request.
