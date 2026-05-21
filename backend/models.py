from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime

# --- 1. PROJE MODELLERİ ---
class ProjectBase(SQLModel):
    name: str
    description: Optional[str] = None

class Project(ProjectBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    sprints: List["Sprint"] = Relationship(back_populates="project")
    tasks: List["Task"] = Relationship(back_populates="project")

# --- 2. KULLANICI MODELLERİ ---
class UserBase(SQLModel):
    username: str = Field(unique=True)
    email: str = Field(unique=True)

class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    tasks: List["Task"] = Relationship(back_populates="assignee")

# --- 3. SPRINT MODELLERİ ---
class SprintBase(SQLModel):
    name: str
    start_date: datetime
    end_date: datetime
    is_active: bool = Field(default=True)
    
    # Timeline Koordinat Alanları
    start_month: str = Field(default="April")
    start_week: int = Field(default=1)
    end_month: str = Field(default="April")
    end_week: int = Field(default=2)
    color: str = Field(default="#0052cc")
    project_id: int = Field(foreign_key="project.id") # Proje Bağlantısı

class Sprint(SprintBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    # DÜZELTME: back_populates alanı olması gerektiği gibi "sprints" olarak düzeltildi
    project: Optional[Project] = Relationship(back_populates="sprints")
    tasks: List["Task"] = Relationship(back_populates="sprint")

# --- 4. TASK (GÖREV) MODELLERİ ---
class TaskBase(SQLModel):
    title: str
    description: Optional[str] = None
    status: str = Field(default="To Do")
    priority: str = Field(default="Medium")
    type: str = Field(default="Task")
    sprint_id: int = Field(foreign_key="sprint.id") 
    assignee_id: int = Field(foreign_key="user.id")
    project_id: int = Field(foreign_key="project.id") # Proje Bağlantısı

class Task(TaskBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    
    project: Optional[Project] = Relationship(back_populates="tasks")
    sprint: Optional[Sprint] = Relationship(back_populates="tasks")
    assignee: Optional[User] = Relationship(back_populates="tasks")
    subtasks: List["SubTask"] = Relationship(back_populates="parent_task")
    comments: List["Comment"] = Relationship(back_populates="task")

# --- 5. ALT GÖREV VE YORUM MODELLERİ ---
class SubTaskBase(SQLModel):
    title: str
    status: str = Field(default="To Do")
    task_id: int = Field(foreign_key="task.id")

class SubTask(SubTaskBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    parent_task: Task = Relationship(back_populates="subtasks")

class CommentBase(SQLModel):
    content: str
    task_id: int = Field(foreign_key="task.id")

class Comment(CommentBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    task: Task = Relationship(back_populates="comments")