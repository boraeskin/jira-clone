from fastapi import FastAPI, Depends, HTTPException
from sqlmodel import SQLModel, create_engine, Session, select
from models import (
    Project, ProjectBase,
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

# --- 1. PROJE İŞLEMLERİ (YENİLİK) ---
@app.post("/projects/", response_model=Project)
def create_project(project_in: ProjectBase, session: Session = Depends(get_session)):
    db_project = Project.from_orm(project_in)
    session.add(db_project)
    session.commit()
    session.refresh(db_project)
    return db_project

@app.get("/projects/", response_model=List[Project])
def list_projects(session: Session = Depends(get_session)):
    return session.exec(select(Project)).all()

@app.delete("/projects/{project_id}")
def delete_project(project_id: int, session: Session = Depends(get_session)):
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Proje bulunamadı.")
    
    # Proje silinirken ona bağlı ne varsa derinlemesine temizliyoruz (Cascade)
    for task in session.exec(select(Task).where(Task.project_id == project_id)).all():
        for subtask in task.subtasks: session.delete(subtask)
        for comment in task.comments: session.delete(comment)
        session.delete(task)
    for sprint in session.exec(select(Sprint).where(Sprint.project_id == project_id)).all():
        session.delete(sprint)
        
    session.delete(project)
    session.commit()
    return {"ok": True, "message": f"ID {project_id} olan proje başarıyla silindi."}

# --- 2. KULLANICI İŞLEMLERİ ---
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

# --- 3. SPRINT İŞLEMLERİ ---
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

@app.delete("/sprints/{sprint_id}")
def delete_sprint(sprint_id: int, session: Session = Depends(get_session)):
    sprint = session.get(Sprint, sprint_id)
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint bulunamadı.")
    
    statement = select(Task).where(Task.sprint_id == sprint_id)
    linked_tasks = session.exec(statement).all()
    
    for task in linked_tasks:
        for subtask in task.subtasks: session.delete(subtask)
        for comment in task.comments: session.delete(comment)
        session.delete(task)
        
    session.delete(sprint)
    session.commit()
    return {"ok": True, "message": f"Sprint #{sprint_id} ve bağlı tüm alt kırılımları silindi."}

# --- 4. TASK (GÖREV) İŞLEMLERİ ---
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

@app.put("/tasks/{task_id}", response_model=Task)
def update_task(task_id: int, updated_data: dict, session: Session = Depends(get_session)):
    db_task = session.get(Task, task_id)
    if not db_task:
        raise HTTPException(status_code=404, detail="Görev bulunamadı.")
    
    updated_data.pop("id", None)
    updated_data.pop("subtasks", None)
    updated_data.pop("comments", None)
    updated_data.pop("assignee", None)
    updated_data.pop("project", None) # Pop güvencesi
    
    for key, value in updated_data.items():
        if hasattr(db_task, key):
            setattr(db_task, key, value)
            
    session.add(db_task)
    session.commit()
    session.refresh(db_task)
    return db_task

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

# --- 5. SUBTASK & COMMENT İŞLEMLERİ ---
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

@app.patch("/subtasks/{subtask_id}/status")
def update_subtask_status(subtask_id: int, new_status: str, session: Session = Depends(get_session)):
    subtask = session.get(SubTask, subtask_id)
    if not subtask:
        raise HTTPException(status_code=404, detail="Alt görev bulunamadı.")
    subtask.status = new_status
    session.add(subtask)
    session.commit()
    session.refresh(subtask)
    return subtask