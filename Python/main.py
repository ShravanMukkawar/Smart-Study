from fastapi import FastAPI, HTTPException, Request
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
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_groq import ChatGroq
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
from pymongo.collection import Collection
from datetime import datetime, timedelta,timezone

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
    def __init__(self, group_id: str, chat_id: str, user_id: str, collection: Collection):
        self.group_id = group_id
        self.chat_id = chat_id
        self.user_id = user_id
        self.collection = collection
        self.messages = []
        self._load()

    def _load(self):
        record = self.collection.find_one({
            "groupId": self.group_id,
            "chatId": self.chat_id,
            "userId": self.user_id
        })
        self.messages = []
        if record:
            for msg in record.get("messages", []):
                if msg["role"] == "user":
                    self.messages.append(HumanMessage(content=msg["content"]))
                elif msg["role"] == "assistant":
                    self.messages.append(AIMessage(content=msg["content"]))

    def add_message(self, message):
        msg_doc = {
            "role": "user" if isinstance(message, HumanMessage) else "assistant",
            "content": message.content,
            "timestamp": datetime.now(timezone.utc)
        }

        self.collection.update_one(
            {
                "groupId": self.group_id,
                "chatId": self.chat_id,
                "userId": self.user_id
            },
            {
                "$push": {"messages": msg_doc},
                "$setOnInsert": {
                    "groupId": self.group_id,
                    "chatId": self.chat_id,
                    "userId": self.user_id,
                    "createdAt": datetime.now(timezone.utc)
                }
            },
            upsert=True
        )

        self.messages.append(message)

    def clear(self):
        self.messages = []
        self.collection.delete_one({
            "groupId": self.group_id,
            "chatId": self.chat_id,
            "userId": self.user_id
        })

    def _persist(self):
        # Optional full overwrite – use with caution
        self.collection.update_one(
            {
                "groupId": self.group_id,
                "chatId": self.chat_id,
                "userId": self.user_id
            },
            {
                "$set": {
                    "messages": [
                        {
                            "role": "user" if isinstance(m, HumanMessage) else "assistant",
                            "content": m.content,
                            "timestamp": datetime.now(timezone.utc)
                        }
                        for m in self.messages
                    ]
                },
                "$setOnInsert": {
                    "groupId": self.group_id,
                    "chatId": self.chat_id,
                    "userId": self.user_id,
                    "createdAt": datetime.now(timezone.utc)
                }
            },
            upsert=True
        )
@app.get("/")
def read_root():
    return {"message": "FastAPI is working!"}

@app.post("/getgroups")
def ask_question(item: QueryRequest):
    llm=Ollama(model='llama2:7b')
    embedding_model = OllamaEmbeddings(model='llama2:7b')
    documents = []
    groups = []

    with open("groups_info.txt", "r", encoding="utf-8") as f:
        content = f.read().split("----------------------------------------\n")
        for block in content:
            if block.strip():
                groups.append(block.strip())

    # print(groups)
    for group in groups:
        lines = group.splitlines()
        metadata = {}
        content_parts = []

        for line in lines:
            if line.startswith("Name"):
                metadata["name"] = line.split(":", 1)[1].strip()
            elif line.startswith("Description"):
                description = line.split(":", 1)[1].strip()
                content_parts.append(description)
            elif line.startswith("Category"):
                category = line.split(":", 1)[1].strip()
                content_parts.append(category)
            elif line.startswith("Tags"):
                tags_str = line.split(":", 1)[1].strip()
                tags = [tag.strip() for tag in tags_str.split(",")]
                content_parts.extend(tags)

        merged_content = " ".join(content_parts)
        documents.append(Document(page_content=merged_content, metadata=metadata))
    vectorstore = Chroma(
        collection_name="example_collection",
        embedding_function=embedding_model,
        persist_directory="./chroma_langchain_db"
    )

    retriever = vectorstore.as_retriever(search_kwargs={"k":3})

    prompt = PromptTemplate(
        input_variables=["context", "question"],
        template="""
    You are a strict assistant. From the given context, identify the *five most relevant groups ma,es* for the user's question.
    Always check If there are groups which are not relevant remove it from the list.
    Each group is described with fields like "Name" only.

    Your task is to:
    - Extract and return only the *group names*
    - Do not include any explanation or extra text

    Return the group names as a numbered list.
    Strictly follow the format below:
    Context:
    {context}

    Question:
    {question}

    Return format:
    1. <Group Name 1>  
    2. <Group Name 2>  
    3. <Group Name 3>  
    4. <Group Name 4>  
    5. <Group Name 5>
    """
    )

    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=retriever,
        chain_type_kwargs={"prompt": prompt}
    )

    question = item.question
    response = qa_chain.run(question)

    return {"response":f"{response}"}

@app.post("/chat")
async def chat(request: Request):
    body = await request.json()
    user_input = body.get("input")
    groupid = body.get("groupId")
    chat_id = body.get("chatId") 
    user_id = body.get("userId")  # 👈 NEW

    if not user_input or not groupid or not chat_id:
        return {"answer": "Missing input, groupId, or chatId."}

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
        (
            "system",
            "You are a helpful assistant. Your only task is to reframe the user's question using the context in the conversation history, if it helps clarify the question. "
            "If the context does not contain relevant information, return the original question as-is. Do not answer the question."
        ),
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
    def get_session_history(_: str) -> BaseChatMessageHistory:
        return MongoChatHistory(group_id=str(groupid), chat_id=str(chat_id),user_id=str(user_id),
 collection=chat_collection)

    conversational_rag_chain = RunnableWithMessageHistory(
        rag_chain,
        get_session_history,
        input_messages_key="input",
        history_messages_key="chat_history",
        output_messages_key="answer"
    )
    response = conversational_rag_chain.invoke(
        {"input": user_input},
        config={"configurable": {"session_id": f"{groupid}_{chat_id}_{user_id}"}}
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



@app.get("/list_chats")
def list_chats(groupId: str, userId: str):
    if not groupId or not userId:
        raise HTTPException(status_code=400, detail="groupId and userId are required")
    print("userid",userId)
    print("groupid",groupId)
    chats = chat_collection.find({"groupId": groupId, "userId": userId})
    print(chats)
    chat_list = []

    for chat in chats:
        print("chat",chat)
        created = chat.get("createdAt")
        chat_list.append({
            "chatId": chat.get("chatId"),
            "createdAt": created.isoformat(),
            "title": chat.get("title") or f"Chat on {created.strftime('%b %d, %Y')}"
        })
    # print(chat_list)
    return chat_list


@app.post("/get_chat_history")
async def get_chat_history(request: Request):
    data = await request.json()
    group_id = data.get("groupId")
    chat_id = data.get("chatId")
    user_id = data.get("userId")  # ✅ Corrected

    if not group_id or not chat_id or not user_id:
        return {"error": "Missing groupId, chatId, or userId"}

    record = chat_collection.find_one({
        "groupId": group_id,
        "chatId": chat_id,
        "userId": user_id
    })

    if not record:
        return {"history": []}

    history = [
        {
            "from": "user" if msg["role"] == "user" else "bot",
            "text": msg["content"]
        }
        for msg in record.get("messages", [])
    ]

    return {"history": history}