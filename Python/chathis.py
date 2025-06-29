import streamlit as st
from langchain.chains import create_history_aware_retriever,create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_chroma import Chroma
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

embedding=OllamaEmbeddings(model="llama2:7b")

st.title("Conversational Rag with Pdf Upload with chat History")
st.write("Upload pdf and chat with a content")

api_key=st.text_input("Enter your Groq API Key", type="password")

if api_key:
    llm=ChatGroq(groq_api_key=api_key,model="Llama3-8b-8192")
    ## chat interface
    session_id=st.text_input("Session Id",value="default_session")

    ## statefully manage chat history
    if 'store' not in st.session_state:
        st.session_state.store = {}
    uploaded_files = st.file_uploader("Upload PDF", type="pdf",accept_multiple_files=True)

    ##Process the uploaded PDF files
    if uploaded_files:
        documents = []
        for uploaded_file in uploaded_files:
            temppdf=f"./temp.pdf"
            with open(temppdf, "wb") as file:
                file.write(uploaded_file.getvalue())
                file_name=uploaded_file.name
            loader=PyPDFLoader(temppdf)
            docs=loader.load()
            documents.extend(docs)
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        splits=text_splitter.split_documents(documents)
        vectorstore=Chroma.from_documents(documents=splits,embedding=embedding)
        retriever=vectorstore.as_retriever()

        contextualized_q_prompt=ChatPromptTemplate.from_messages(
            [
                ("system", "You are a helpful assistant that answers questions based on the provided context."),
                MessagesPlaceholder("chat_history"),
                ("human", "{input}"),
            ]
        )
        history_aware_retriever=create_history_aware_retriever(llm,retriever,contextualized_q_prompt)

        ## Answer Question
        System_prompt=(
            "You are a helpful assistant that answers questions based on the provided context. "
            "If you don't know the answer, just say that you don't know. "
            "You can also ask for clarification if needed."
            "answer concise"
            "\n\n"
            "{context}"
        )
        qa_prompt=ChatPromptTemplate.from_messages(
            [
                ("system", System_prompt),
                MessagesPlaceholder("chat_history"),
                ("human", "{input}"),
            ]
        )
        question_answer_chain=create_stuff_documents_chain(llm,qa_prompt)
        rag_chain=create_retrieval_chain(history_aware_retriever,question_answer_chain)

        def get_session_history(session:str)-> BaseChatMessageHistory:
            if session_id not in st.session_state.store:
                st.session_state.store[session_id] =ChatMessageHistory()
            return st.session_state.store[session_id]
        
        conversational_rag_chain=RunnableWithMessageHistory(
            rag_chain,get_session_history,
            input_messages_key="input",
            history_messages_key="chat_history",
            output_messages_key="answer"
        )
        user_input = st.text_input("Ask a question about the PDF content:")
        if user_input:
            session_history=get_session_history(session_id)
            response=conversational_rag_chain.invoke(
                {"input": user_input},
                config={
                    "configurable":{"session_id": session_id}
                }
            )
            st.write(st.session_state.store)
            st.write("Assistant",response["answer"])
            st.write("Chat History:",session_history.messages)
else:
    st.warning("Please enter your Groq API Key to use the application.")   