# 🚀 Agile Task Management System (Jira Clone)

A full-stack Agile project management web application developed during my Software Engineering Internship at 4A Labs. Designed with a decoupled architecture to streamline team collaboration, sprint planning, and task tracking.

🌐 **Live Demo:** [Check out the Live Application](http://136.111.161.239:5173)

---

## 🛠️ Tech Stack & Architecture

### Backend (Python / FastAPI)
* **Framework:** FastAPI for high-performance, asynchronous RESTful API development.
* **Database:** SQLite with `SQLModel` (SQLAlchemy & Pydantic) for robust relational data modeling.
* **Data Integrity:** Implemented deep cascade deletion logic ensuring seamless removal of projects, sprints, tasks, and subtasks without leaving orphaned data.
* **Security:** Configured CORS Middleware for secure cross-origin resource sharing.

### Frontend (React / Vite)
* **Core Framework:** React.js powered by Vite for instant server start and lightning-fast HMR.
* **Drag and Drop:** `@dnd-kit/core` & `@dnd-kit/sortable` for fluid, interactive Kanban board mechanics.
* **State & Fetching:** Axios for HTTP client requests.
* **UI/UX:** Custom CSS architecture with `lucide-react` for scalable iconography.

---

## ✨ Key Features

* **🔄 Project & Sprint Lifecycle:** Create multiple projects and define custom sprints with specific start/end date ranges.
* **📊 Interactive Kanban Board:** Drag-and-drop task management across customizable columns (*To Do, In Progress, Done*).
* **📅 Gantt-Style Timeline:** Visual timeline representation for tracking sprint durations and project milestones.
* **📋 Advanced Backlog:** Centralized backlog view with multi-variable filtering (by priority, status, assignee, and sprint).
* **👥 Team Collaboration:** Assign tasks to team members, manage subtask lifecycles, and add timestamped comments.

---

## ⚙️ Local Development Setup

### 1. Backend Setup
```bash
cd backend
python -m venv venv

# Activate Virtual Environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies and run the server
pip install fastapi sqlmodel uvicorn
uvicorn main:app --reload
```
*API will run on `http://localhost:8000`*

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*Frontend will run on `http://localhost:5173`*

---

## 👨‍💻 Developer
**Bora Eskin**
* GitHub: [@boraeskin](https://github.com/boraeskin)
* Developed as an internship project at 4A Labs (Feb 2026 - Jun 2026).
