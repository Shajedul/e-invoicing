# E-Invoice Prototype System

![E-Invoice System](https://via.placeholder.com/800x400?text=E-Invoice+Prototype+Screenshot)

A full-stack electronic invoice management system with **React frontend** and **Flask backend**, containerized using Docker.

## Features

- 🧾 Create electronic invoices with real-time calculations  
- 📊 Generate XML invoice documents  
- ✅ Validate invoices with ZATCA system (simulated)  
- 📋 View invoice history and status  
- 🔍 QR code verification (Dummy)
- 📱 Responsive design  

---

## Prerequisites

Before you begin, ensure you have the following installed:

- [Docker](https://www.docker.com/get-started) (version 20.10.7+)
- [Docker Compose](https://docs.docker.com/compose/install/) (version 1.29.2+)

> **Note:** On Linux, you may need to install Docker Compose separately. Windows and macOS users typically get it with Docker Desktop.

---

## Getting Started

### 1. Clone the repository

```bash
git clone git@github.com:Shajedul/e-invoicing.git
cd e-invoicing
```

### 2. Build and run using Docker Compose

```bash
docker-compose up --build
```

🕒 **Wait until both the backend and frontend are fully loaded** — this may take a minute or two on the first run.

### 3. Access the application

Once the services are running, open your browser and go to:

```
http://localhost:3005
```

This loads the **React frontend**.

The **Flask backend API** is available internally at:
```
http://localhost:5005
```

> Internally, the frontend talks to the backend using `http://backend:5005` through the Docker bridge network.

---

## Project Structure

```
e-invoice-prototype/
│
├── frontend/       # React application (port 3005)
│   └── Dockerfile
│
├── backend/        # Flask application (port 5005)
│   └── Dockerfile
│
└── docker-compose.yml
```

---

## Example Workflow

1. User fills in invoice details in the React frontend.
2. The invoice is converted into an XML structure.
3. The frontend sends the data to the Flask backend via API.
4. The backend simulates ZATCA validation and returns a status.
5. The response is stored and reflected in the invoice list/history.

---

## Stopping the Application

To stop and remove all Docker containers:

```bash
docker-compose down
```

---

## License

This project is licensed under the MIT License.