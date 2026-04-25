from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime

# --- 1. KULLANICI MODELLERİ ---
class UserBase(SQLModel):
    username: str = Field(unique=True)
    email: str = Field(unique=True)

class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    # İlişki: Bir kullanıcının birden fazla görevi (tasks) olabilir
    tasks: List["Task"] = Relationship(back_populates="assignee")

# --- 2. SPRINT MODELLERİ ---
class SprintBase(SQLModel):
    name: str
    start_date: datetime
    end_date: datetime
    is_active: bool = Field(default=True)

class Sprint(SprintBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    # İlişki: Bir sprint içinde birden fazla görev (tasks) olabilir
    tasks: List["Task"] = Relationship(back_populates="sprint")

# --- 3. TASK (GÖREV) MODELLERİ ---
class TaskBase(SQLModel):
    title: str
    description: Optional[str] = None
    status: str = Field(default="To Do")
    priority: str = Field(default="Medium")
    type: str = Field(default="Task")
    # BURASI KRİTİK: Foreign Key tanımlarını ekledik
    sprint_id: int = Field(foreign_key="sprint.id") 
    assignee_id: int = Field(foreign_key="user.id")

class Task(TaskBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Arka plandaki bağlantılar
    sprint: Optional[Sprint] = Relationship(back_populates="tasks")
    assignee: Optional[User] = Relationship(back_populates="tasks")
    subtasks: List["SubTask"] = Relationship(back_populates="parent_task")
    comments: List["Comment"] = Relationship(back_populates="task")

# --- 4. ALT GÖREV VE YORUM MODELLERİ ---
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