# 🔮 UniDB-Go

**UniDB-Go** is a high-performance, unified database middleware and execution engine built in Go. It provides a single interface to interact with federated SQL (PostgreSQL, MySQL) and NoSQL (MongoDB) databases, featuring an intelligent query pipeline with built-in security, AST parsing, and dynamic routing.

![Dashboard Preview](https://img.shields.io/badge/UI-Glassmorphic-blueviolet?style=for-the-badge)
![Go Version](https://img.shields.io/badge/Go-1.21+-00ADD8?style=for-the-badge&logo=go)

## 🚀 Features

- **Unified SQL Editor**: Execute queries across multiple database types from a single console.
- **Visual Execution Pipeline**: Real-time visualization of query lifecycle (Parse → Security → Plan → Exec).
- **SQL Lab & AST Explorer**: Deep-dive into Abstract Syntax Trees generated from your queries.
- **Security Shield**: AST-based heuristic analysis to detect and block SQL injection and malicious patterns.
- **Database Explorer**: Integrated schema browser for discovering tables and columns across all instances.
- **Live Connection Pooling**: Real-time metrics for active and idle connections per database driver.

## 🛠 Tech Stack

- **Backend**: Go (Golang)
- **Frontend**: Vanilla HTML5, CSS3 (Glassmorphism), JavaScript (ES6+)
- **Libraries**:
  - `Vitess SQL Parser` (SQL -> AST)
  - `Highlight.js` (Code syntax highlighting)
  - `Google Fonts (Inter, Fira Code)`

## 🏁 Getting Started

### Prerequisites
- [Go 1.21+](https://go.dev/dl/) installed on your machine.

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/Go-DataBase-Connectivity.git
   cd Go-DataBase-Connectivity
   ```

2. **Install dependencies**:
   ```bash
   go mod tidy
   ```

### Running the Dashboard

1. **Start the web server**:
   ```bash
   go run cmd/unidb-web/main.go
   ```

2. **Access the Dashboard**:
   Open your browser and navigate to:
   [http://localhost:8080](http://localhost:8080)

## 📁 Project Structure

```text
unidb-go/
├── cmd/             # Main entry points
│   └── unidb-web/   # Web dashboard launcher
├── web/             # Frontend & API Handlers
│   ├── static/      # HTML/CSS/JS assets
│   └── server.go    # Go HTTP server
├── parser/          # SQL to AST transformation
├── security/        # Threat detection engine
├── planner/         # Query routing & optimization
├── drivers/         # DB-specific abstractions
└── internal/        # Core engine logic
```

## 📜 License
This project is licensed under the MIT License.
