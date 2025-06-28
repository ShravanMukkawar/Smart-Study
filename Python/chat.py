import os
import streamlit as st
from langchain_groq import ChatGroq
from langchain_community.embeddings import OllamaEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate
from langchain.chains import create_retrieval_chain
from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import PyPDFDirectoryLoader
from dotenv import load_dotenv

load_dotenv()
os.environ["GROQ_API"] = os.getenv("GROQ_API")

groq_api=os.getenv("GROQ_API")

llm=ChatGroq(groq_api_key=groq_api,model_name='Llama3-8b-8192')
prompt=ChatPromptTemplate.from_template(
    """
    Answer the question based on the context provided.
    Please provide the most accurate answer response based on the question and context.
    <context>
    {context}
    </context>
    Question:{input}

    """ 

)
def create_vector_embedding():
    if "vectors" not in st.session_state:
        st.session_state.embeddings = OllamaEmbeddings()
        st.session_state.loader = PyPDFDirectoryLoader("pdfs")
        st.session_state.docs = st.session_state.loader.load()
        st.session_state.text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        st.session_state.final_documents=st.session_state.text_splitter.split_documents(st.session_state.docs[:50])
        st.session_state.vectors=FAISS.from_documents(st.session_state.final_documents,st.session_state.embeddings)

        # if not st.session_state.documents:
        #     st.error("No documents were loaded from the 'pdfs' folder. Please check that the folder exists and contains valid PDFs.")
        #     return

        # st.write(f"Loaded {len(st.session_state.documents)} documents")
        # st.write("First doc preview:", st.session_state.documents[0].page_content[:200])

        # st.session_state.text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        # st.session_state.final_documents = st.session_state.text_splitter.split_documents(st.session_state.documents)

        # if not st.session_state.final_documents:
        #     st.error("Documents were loaded, but no chunks were created. Check if the PDFs contain readable text.")
        #     return

        # st.write(f"Number of chunks: {len(st.session_state.final_documents)}")
        # st.write("Sample chunk:", st.session_state.final_documents[0].page_content[:200])

        # st.session_state.vectorstore = FAISS.from_documents(
        #     st.session_state.final_documents, 
        #     st.session_state.embeddings
        # )


user_prompt=st.text_input("Enter your document")
 
if st.button("Document Embedding"):
    create_vector_embedding()
    st.write("Vector database is ready")

if user_prompt:
    document_chain=create_stuff_documents_chain(llm,prompt)
    retriever=st.session_state.vectors.as_retriever()
    retrievel_chain=create_retrieval_chain(retriever,document_chain)
    response=retrievel_chain.invoke({'input':user_prompt})
    st.write(response['answer'])

    with st.expander("Document similarity Search"):
        for i,doc in enumerate(response['context']):
            st.write(doc.page_content)
            st.write("-----------------------------")