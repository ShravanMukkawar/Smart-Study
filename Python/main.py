from fastapi import FastAPI
from pydantic import BaseModel
from langchain_community.llms import Ollama
from langchain_community.embeddings import OllamaEmbeddings
from langchain.schema import Document
from langchain.vectorstores import Chroma
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from langchain.chains import RetrievalQA
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()



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