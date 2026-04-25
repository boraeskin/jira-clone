from fastapi import FastAPI, Depends, HTTPException
from sqlmodel import SQLModel, create_engine, Session, select
from models import (
    User, UserBase, 
    Sprint, SprintBase, 
    Task, TaskBase, 
    SubTask, SubTaskBase, 
    Comment, CommentBase
)
from typing import List, Optional
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import IntegrityError

sqlite_url = "sqlite:///database.db"
engine = create_engine(sqlite_url, echo=True)

app = FastAPI(title="Task Management API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_session():
    with Session(engine) as session:
        yield session

@app.on_event("startup")
def on_startup():
    SQLModel.metadata.create_all(engine)

@app.get("/")
def home():
    return {"status": "Task Management Backend is Online!"}

# --- 1. KULLANICI İŞLEMLERİ ---
@app.post("/users/", response_model=User)
def create_user(user_in: UserBase, session: Session = Depends(get_session)):
    try:
        db_user = User.from_orm(user_in)
        session.add(db_user)
        session.commit()
        session.refresh(db_user)
        return db_user
    except IntegrityError:
        session.rollback()
        raise HTTPException(status_code=400, detail="Bu e-posta veya kullanıcı adı zaten kayıtlı!")

@app.get("/users/", response_model=List[User])
def list_users(session: Session = Depends(get_session)):
    return session.exec(select(User)).all()

@app.delete("/users/{user_id}")
def delete_user(user_id: int, session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
    session.delete(user)
    session.commit()
    return {"message": f"ID {user_id} olan kullanıcı silindi."}

# --- 2. SPRINT İŞLEMLERİ ---
@app.post("/sprints/", response_model=Sprint)
def create_sprint(sprint_in: SprintBase, session: Session = Depends(get_session)):
    db_sprint = Sprint.from_orm(sprint_in)
    session.add(db_sprint)
    session.commit()
    session.refresh(db_sprint)
    return db_sprint

@app.get("/sprints/", response_model=List[Sprint])
def list_sprints(session: Session = Depends(get_session)):
    return session.exec(select(Sprint)).all()

# --- 3. TASK (GÖREV) İŞLEMLERİ ---
@app.post("/tasks/", response_model=Task)
def create_task(task_in: TaskBase, session: Session = Depends(get_session)):
    db_task = Task.from_orm(task_in)
    session.add(db_task)
    session.commit()
    session.refresh(db_task)
    return db_task

@app.get("/tasks/", response_model=List[Task])
def get_tasks(sprint_id: Optional[int] = None, session: Session = Depends(get_session)):
    statement = select(Task)
    if sprint_id:
        statement = statement.where(Task.sprint_id == sprint_id)
    return session.exec(statement).all()

@app.get("/tasks/{task_id}")
def get_task_detail(task_id: int, session: Session = Depends(get_session)):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Görev bulunamadı.")
    return {
        "task": task,
        "subtasks": task.subtasks,
        "comments": task.comments,
        "assignee": task.assignee
    }

@app.patch("/tasks/{task_id}/status")
def update_task_status(task_id: int, new_status: str, session: Session = Depends(get_session)):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Görev bulunamadı.")
    task.status = new_status
    session.add(task)
    session.commit()
    session.refresh(task)
    return task

@app.delete("/tasks/{task_id}")
def delete_task(task_id: int, session: Session = Depends(get_session)):
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Görev bulunamadı")
    session.delete(task)
    session.commit()
    return {"ok": True, "message": f"ID {task_id} olan görev başarıyla silindi."}

# --- 4. SUBTASK & COMMENT İŞLEMLERİ ---
@app.post("/subtasks/", response_model=SubTask)
def add_subtask(subtask_in: SubTaskBase, session: Session = Depends(get_session)):
    db_subtask = SubTask.from_orm(subtask_in)
    session.add(db_subtask)
    session.commit()
    session.refresh(db_subtask)
    return db_subtask

@app.post("/comments/", response_model=Comment)
def add_comment(comment_in: CommentBase, session: Session = Depends(get_session)):
    db_comment = Comment.from_orm(comment_in)
    db_comment.created_at = datetime.utcnow()
    session.add(db_comment)
    session.commit()
    session.refresh(db_comment)
    return db_comment