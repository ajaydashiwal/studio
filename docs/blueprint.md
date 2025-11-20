
# Project Blueprint

This document outlines the architecture of the project, including the client and server modules and their dependencies.

## Overview

The project is a web application with a client-server architecture. The client is built with React and the server is a set of API routes.

## Client-side Architecture

The client is responsible for rendering the user interface and interacting with the server to fetch and display data. It is composed of the following modules:

- **`src/app`**: The main application folder, containing the core layout and pages.
- **`src/components`**: Contains reusable React components used throughout the application.
- **`src/hooks`**: Holds custom React hooks for managing state and logic.
- **`src/lib`**: A library of utility functions and data definitions.
- **`src/ui`**: Base UI components, likely part of a component library.

## Server-side Architecture (API Routes)

The server is responsible for providing data to the client and handling business logic. It is composed of the following modules:

- **`src/app/api/auth`**: Handles user authentication.
- **`src/app/api/dashboard`**: Provides data for the main dashboard.
- **`src/app/api/complaints`**: Manages complaints and suggestions.
- **`src/app/api/expenditure`**: Handles financial expenditures.
- **`src/app/api/maintenance`**: Manages maintenance records.
- **`src/app/api/master-membership`**: Manages membership data.
- **`src/app/api/notifications`**: Handles notifications.
- **`src/app/api/summary`**: Provides summary data.
- **`src/app/api/users`**: Manages user data.
- **`src/app/api/reports`**: Generates various reports.
- **`src/app/api/payment`**: Handles payment processing.

## Dependencies

The client and server are decoupled and communicate via a well-defined API. The client depends on the server for data, but the server does not depend on the client.
