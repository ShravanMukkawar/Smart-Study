from fastapi import FastAPI, Request
from pydantic import BaseModel
from langchain_community.llms import Ollama
from langchain_community.embeddings import OllamaEmbeddings
from langchain.schema import Document
from langchain_community.vectorstores import Chroma
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from langchain.chains import RetrievalQA
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from bson import ObjectId
import os
import requests
import re
import streamlit as st
from langchain.chains import create_history_aware_retriever,create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_community.vectorstores import Chroma
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.prompts import ChatPromptTemplate,MessagesPlaceholder
from langchain_groq import ChatGroq
import os
from dotenv import load_dotenv
from langchain_community.embeddings import OllamaEmbeddings
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
import requests
load_dotenv()

app = FastAPI()

mongo_uri = "mongodb+srv://Shravan:Shravan_2004@cluster0.1gdhi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(mongo_uri)

db = client["test"]
groups_collection = db["groups"]
resources_collection=db["resources"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or use ["http://localhost:3000"] to limit to your frontend
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, OPTIONS, etc.)
    allow_headers=["*"],  # Allow all headers (like Content-Type, Authorization)
)

class QueryRequest(BaseModel):
    question: str

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
    You are a strict assistant. From the given context, identify the **five most relevant groups ma,es** for the user's question.
    Always check If there are groups which are not relevant remove it from the list.
    Each group is described with fields like "Name" only.

    Your task is to:
    - Extract and return only the **group names**
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

    return {"response": f"{response}"}


def convert_dropbox_link(url: str) -> str:
    if "dropbox.com" in url:
        return url.replace("dl=0", "dl=1")  # Force direct download
    return url

def extract_title_from_url(url: str) -> str:
    filename = os.path.basename(url.split("?")[0])  
    name_without_ext = os.path.splitext(filename)[0]  
    parts = re.split(r"[-_]", name_without_ext) 
    if len(parts) > 2:
        return "_".join(parts[:2])
    return name_without_ext

@app.post("/chat")
async def chat(request: Request):
    body = await request.json()
    user_input = body.get("input")
    print("user_input",user_input)
    group_id = body.get("groupId")
    print("groupid",group_id)
    groupid =group_id
    group = groups_collection.find_one({"_id": ObjectId(groupid)})
    embedding=OllamaEmbeddings(model="llama2:7b")
    api_key=os.getenv("GROQ_API")

    llm=ChatGroq(groq_api_key=api_key,model_name='Llama3-8b-8192')
    if not group or "resources" not in group:
        return {"error": "Group or resources not found"}

    resources = group["resources"]
    print(resources)
    storage_dir = "storage"
    os.makedirs(storage_dir, exist_ok=True)
    downloaded_files = []

    for resource_id in resources:
        # Fetch actual resource document
        resource = resources_collection.find_one({"_id": resource_id})
        if not resource:
            print(f"Resource {resource_id} not found")
            continue

        url = convert_dropbox_link(resource.get("url", ""))
        print(url)
        title = extract_title_from_url(url)

        if url and "pdf" in url.lower():
            try:
                print("hi")
                response = requests.get(url)
                if response.status_code == 200:
                    file_path = os.path.join(storage_dir, f"{title}.pdf")
                    with open(file_path, "wb") as f:
                        f.write(response.content)
                    downloaded_files.append(file_path)
                    print(f"Downloaded: {file_path}")
                else:
                    print(f"Failed to download {url} (status {response.status_code})")
            except Exception as e:
                print(f"Error downloading {url}: {e}")

            print("✅ All downloads complete.")
            print("Downloaded files:", downloaded_files)

    all_documents = []
    for file in os.listdir(storage_dir):
        if file.endswith(".pdf"):
            file_path = os.path.join(storage_dir, file)
            loader = PyPDFLoader(file_path)
            docs = loader.load()
            all_documents.extend(docs)

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    splits = text_splitter.split_documents(all_documents)
    persist_directory = './testing_db'

    vectorstore = Chroma.from_documents(
        documents=splits,
        embedding=embedding,
        persist_directory=persist_directory
    )
    vectorstore.persist()
    print("✅ Vectorstore persisted successfully.")
    retriever = vectorstore.as_retriever()
    contextualized_q_prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a helpful assistant that answers questions based on the provided context."),
        MessagesPlaceholder("chat_history"),
        ("human", "{input}"),
    ])
    history_aware_retriever = create_history_aware_retriever(llm, retriever, contextualized_q_prompt)

    system_prompt = (
        "You are a helpful assistant that answers questions based on the provided context. "
        "If you don't know the answer, just say that you don't know. "
        "You can also ask for clarification if needed. Answer concisely.\n\n{context}"
    )

    qa_prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder("chat_history"),
        ("human", "{input}"),
    ])
    question_answer_chain = create_stuff_documents_chain(llm, qa_prompt)
    rag_chain = create_retrieval_chain(history_aware_retriever, question_answer_chain)

    # 6. Session and Message History
    session_id = "default_session"
    store = {}
    def get_session_history(session: str) -> BaseChatMessageHistory:
        if session not in store:
            store[session] = ChatMessageHistory()
        return store[session]

    conversational_rag_chain = RunnableWithMessageHistory(
        rag_chain,
        get_session_history,
        input_messages_key="input",
        history_messages_key="chat_history",
        output_messages_key="answer"
    )

    session_history = get_session_history(session_id)
    response = conversational_rag_chain.invoke(
        {"input": user_input},
            config={"configurable": {"session_id": session_id}}
        )
    print("Assistant:", response["answer"])
    # print("\n--- Chat History ---")
    # for msg in session_history.messages:
    #     role = "You" if msg.type == "human" else "Assistant"
    #     print(f"{role}: {msg.content}")
    #     print("---------------------\n")
    return {"answer":response["answer"]}

