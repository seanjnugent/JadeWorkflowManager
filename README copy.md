# Emerald Open Data Portal (Alpha)

A React-based frontend for PxStat, designed to provide a user-friendly interface for exploring and managing open data and statistics. This project is part of an alpha testing phase to evaluate its effectiveness among a range of open data portal tools.



---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Getting Started](#getting-started)
   - [Prerequisites](#prerequisites)
   - [Installation](#installation)
   - [Configuration](#configuration)
4. [Usage](#usage)
5. [API Integration](#api-integration)
6. [Contributing](#contributing)

---

## Overview

The Emerald Open Data Portal is a frontend built with React that interacts with a PxStat backend via its JSON-RPC.

This project is currently in alpha testing and is being evaluated alongside other open data portal tools. 
---

## Features

- **Search and Filter**: Easily search and filter datasets by keywords, organisations, and resource types.
- **Dataset Details**: View detailed information about datasets, including metadata, resources, and download links.
- **PxStat API Integration**: Seamlessly communicates with a PxStat instance using its JSON-RPC APIs.
- **CSV Exploration**: Allows users to visualise and slice data.

---

## Getting Started

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v16 or higher)
- [npm](https://www.npmjs.com/) (v8 or higher)
- A running instance of [PxStat] (for backend API)

## Installation

1. Clone the repository:
```bash
   git clone https://github.com/ScotGovAnalysis/EmeraldDataPlatform.git
   cd CobaltDataPlatform
```

2. Install dependencies:
```bash
    npm install
```

### Configuration

Before running the project, configure the environment:

1.  Copy the appropriate environment template:

For development:
```bash
    cp .env.development.template .env.development
```

For release:
```bash
   cp .env.release.template .env.release
```
2.  Populate the .env.development or .env.release file with the necessary configuration values.

## Usage
### Running in Development

To start the development server:

```bash
   npm start
```
Open your browser and navigate to http://localhost:3000.

### Building for Production
To create a development build:

```bash
   npm run build:dev
```
To create a release build:

```bash
   npm run build:release
```

To serve the built app locally:

```bash
   npx serve -s build --single -l 3000
```

## API Integration
The frontend interacts with PxStat using its JSON-RPC API. 

For more information, refer to the PxStat Documentation.

## Contributing
We welcome contributions! Please follow these guidelines when reporting issues:

- Bug Description (include screenshots if possible)
- Expected Behavior
- Actual Behavior
- Steps to Reproduce
For feature requests, please describe the proposed functionality and its potential impact.
