from fastapi import FastAPI, Request
from pydantic import BaseModel
from langchain_community.llms import Ollama
from langchain_community.embeddings import OllamaEmbeddings
from langchain.schema import Document
from langchain_community.vectorstores import Chroma
from langchain.chains import LLMChain, RetrievalQA
from langchain.prompts import PromptTemplate
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from bson import ObjectId
import os
import requests
import re
from langchain.chains import create_history_aware_retriever, create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_groq import ChatGroq
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
from pymongo.collection import Collection

load_dotenv()

app = FastAPI()

mongo_uri = "mongodb+srv://Shravan:Shravan_2004@cluster0.1gdhi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(mongo_uri)

db = client["test"]
groups_collection = db["groups"]
resources_collection=db["resources"]
chat_collection = db["chat_history"]  # MongoDB collection

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or use ["http://localhost:3000"] to limit to your frontend
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, OPTIONS, etc.)
    allow_headers=["*"],  # Allow all headers (like Content-Type, Authorization)
)

class QueryRequest(BaseModel):
    question: str

class MongoChatHistory(BaseChatMessageHistory):
    def __init__(self, session_id: str, collection: Collection):
        self.session_id = session_id
        self.collection = collection
        self._load()

    def _load(self):
        record = self.collection.find_one({"session_id": self.session_id})
        self.messages = []
        if record:
            for msg in record.get("messages", []):
                if msg["role"] == "user":
                    self.messages.append(HumanMessage(content=msg["content"]))
                elif msg["role"] == "assistant":
                    self.messages.append(AIMessage(content=msg["content"]))

    def add_message(self, message):
        self.messages.append(message)
        self._persist()

    def clear(self):
        self.messages = []
        self.collection.delete_one({"session_id": self.session_id})

    def _persist(self):
        self.collection.update_one(
            {"session_id": self.session_id},
            {
                "$set": {
                    "messages": [
                        {
                            "role": "user" if isinstance(m, HumanMessage) else "assistant",
                            "content": m.content,
                        }
                        for m in self.messages
                    ]
                }
            },
            upsert=True
        )
@app.get("/")
def read_root():
    return {"message": "FastAPI is working!"}
@app.post("/chat")
async def chat(request: Request):
    body = await request.json()
    user_input = body.get("input")
    groupid = body.get("groupId")

    if not user_input or not groupid:
        return {"answer": "Missing input or groupId."}

    group = groups_collection.find_one({"_id": ObjectId(groupid)})
    if not group or "resources" not in group:
        return {"answer": "Group or resources not found."}

    group_name = group.get("name", f"group_{groupid}")
    safe_group_name = group_name.replace(" ", "_").replace("/", "_").lower()

    storage_dir = os.path.join("storage", f"{safe_group_name}_pdfs")
    vector_dir = os.path.join("storage", f"store_{safe_group_name}")
    os.makedirs(storage_dir, exist_ok=True)
    os.makedirs(vector_dir, exist_ok=True)

    downloaded_new_file = False
    for resource_id in group["resources"]:
        resource = resources_collection.find_one({"_id": resource_id})
        if not resource:
            continue
        url = convert_dropbox_link(resource.get("url", ""))
        if "pdf" in url.lower():
            title = extract_title_from_url(url)
            file_path = os.path.join(storage_dir, f"{title}.pdf")

            if not os.path.exists(file_path):
                try:
                    response = requests.get(url)
                    if response.status_code == 200:
                        with open(file_path, "wb") as f:
                            f.write(response.content)
                        downloaded_new_file = True
                except Exception as e:
                    print(f"Download error for {url}: {e}")
            else:
                print(f"✅ Already downloaded: {file_path}")

    embedding = OllamaEmbeddings(model="llama2:7b")
    if downloaded_new_file:
        print("🔄 Creating or updating vector DB...")
        all_documents = []
        for file in os.listdir(storage_dir):
            if file.endswith(".pdf"):
                file_path = os.path.join(storage_dir, file)
                loader = PyPDFLoader(file_path)
                all_documents.extend(loader.load())

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        splits = text_splitter.split_documents(all_documents)

        vectorstore = Chroma.from_documents(splits, embedding=embedding, persist_directory=vector_dir)
        vectorstore.persist()
    else:
        print("✅ Using existing vector DB...")
        vectorstore = Chroma(persist_directory=vector_dir, embedding_function=embedding)

    retriever = vectorstore.as_retriever()

    llm = ChatGroq(groq_api_key=os.getenv("GROQ_API"), model_name="Llama3-8b-8192")

    contextualized_q_prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a helpful assistant that answers questions based on the provided context."),
        MessagesPlaceholder("chat_history"),
        ("human", "{input}"),
    ])
    history_aware_retriever = create_history_aware_retriever(llm, retriever, contextualized_q_prompt)

    qa_prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a helpful assistant that answers questions based on the provided context:\n\n{context}\n\nIf unsure, say you don't know."),
        MessagesPlaceholder("chat_history"),
        ("human", "{input}"),
    ])
    question_answer_chain = create_stuff_documents_chain(llm, qa_prompt)
    rag_chain = create_retrieval_chain(history_aware_retriever, question_answer_chain)

    session_id = str(groupid)
    def get_session_history(session: str) -> BaseChatMessageHistory:
        return MongoChatHistory(session_id=session, collection=chat_collection)

    conversational_rag_chain = RunnableWithMessageHistory(
        rag_chain,
        get_session_history,
        input_messages_key="input",
        history_messages_key="chat_history",
        output_messages_key="answer"
    )

    response = conversational_rag_chain.invoke(
        {"input": user_input},
        config={"configurable": {"session_id": session_id}}
    )

    return {"answer": response["answer"]}

def convert_dropbox_link(url: str) -> str:
    if "dropbox.com" in url:
        return url.replace("dl=0", "dl=1")
    return url

def extract_title_from_url(url: str) -> str:
    filename = os.path.basename(url.split("?")[0])
    name_without_ext = os.path.splitext(filename)[0]
    parts = re.split(r"[-_]", name_without_ext)
    return "_".join(parts[:2]) if len(parts) > 2 else name_without_ext


@app.post("/get_chat_history")
async def get_chat_history(request: Request):
    body = await request.json()
    groupid = body.get("groupId")
    if not groupid:
        return {"error": "Missing groupId"}

    session_id = str(groupid)
    record = chat_collection.find_one({"session_id": session_id})
    if not record:
        return {"history": []}

    history = []
    for msg in record.get("messages", []):
        history.append({
            "from": "user" if msg["role"] == "user" else "bot",
            "text": msg["content"]
        })

    return {"history": history}