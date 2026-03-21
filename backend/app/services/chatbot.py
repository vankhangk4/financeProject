import os
from typing import List, Optional
from app.core.config import settings

LANGCHAIN_GROQ_AVAILABLE = False
LANGCHAIN_OLLAMA_AVAILABLE = False

try:
    from langchain_groq import ChatGroq
    LANGCHAIN_GROQ_AVAILABLE = True
except ImportError:
    pass

try:
    from langchain_community.llms import Ollama
    from langchain_community.vectorstores import Chroma
    from langchain_community.embeddings import OllamaEmbeddings
    from langchain.text_splitter import RecursiveCharacterTextSplitter
    LANGCHAIN_OLLAMA_AVAILABLE = True
except ImportError:
    pass


FINANCE_KNOWLEDGE = """
# Hướng dẫn Quản lý Tài chính Cá nhân

## Nguyên tắc 50/30/20
- 50% Thu nhập cho nhu cầu thiết yếu (nhà ở, thực phẩm, đi lại)
- 30% Thu nhập cho mong muốn (giải trí, mua sắm)
- 20% Thu nhập cho tiết kiệm và trả nợ

## Mẹo Tiết kiệm
1. Lập ngân sách hàng tháng và theo dõi chi tiêu
2. Trả tiền cho bản thân trước - ngay khi nhận lương, hãy chuyển tiền tiết kiệm trước
3. Theo dõi mọi khoản chi tiêu nhỏ - chúng tích lũy thành số lớn
4. Giảm chi tiêu không cần thiết (đi ăn ngoài, mua sắm冲动)
5. Tự nấu ăn thay vì ăn ngoài
6. Sử dụng phương tiện công cộng hoặc đi xe đạp
7. Mua hàng secondhand hoặc so sánh giá trước khi mua

## Quỹ khẩn cấp
- Nên có quỹ khẩn cấp bằng 3-6 tháng chi phí sinh hoạt
- Đặt trong tài khoản tiết kiệm dễ truy cập
- Chỉ sử dụng cho trường hợp thực sự khẩn cấp

## Trả nợ
- Ưu tiên trả nợ lãi suất cao trước (phương pháp avalanche)
- Hoặc trả nợ nhỏ trước để tạo động lực (phương pháp snowball)
- Không tích lũy thêm nợ mới

## Đầu tư cơ bản
- Đa dạng hóa danh mục đầu tư
- Đầu tư định kỳ (dollar-cost averaging)
- Hiểu rõ mức độ rủi ro có thể chấp nhận
- Đầu tư dài hạn thay vì ngắn hạn
- ETF và quỹ chỉ số là lựa chọn tốt cho người mới

## Theo dõi Chi tiêu
- Ghi chép mọi khoản thu chi hàng ngày
- Phân loại chi tiêu theo danh mục
- Đánh giá và điều chỉnh ngân sách hàng tháng
- Sử dụng ứng dụng quản lý tài chính

## Mục tiêu Tài chính
1. Xác định mục tiêu ngắn hạn (mua xe, du lịch)
2. Mục tiêu trung hạn (mua nhà, kinh doanh)
3. Mục tiêu dài hạn (nghỉ hưu, tự do tài chính)
4. Đặt ra số tiền cụ thể và thời hạn cho từng mục tiêu
"""


class FinanceChatbot:
    def __init__(self, user_id: int):
        self.user_id = user_id
        self.llm = None
        self.qa_chain = None
        self.provider = settings.LLM_PROVIDER
        self._setup()

    def _setup(self):
        if self.provider == "groq" and LANGCHAIN_GROQ_AVAILABLE and settings.GROQ_API_KEY:
            self._setup_groq()
        elif self.provider == "ollama" and LANGCHAIN_OLLAMA_AVAILABLE:
            self._setup_ollama()
        else:
            # Fallback: try groq if key exists
            if settings.GROQ_API_KEY and LANGCHAIN_GROQ_AVAILABLE:
                self._setup_groq()
            elif LANGCHAIN_OLLAMA_AVAILABLE:
                self._setup_ollama()

    def _setup_groq(self):
        try:
            from langchain_core.prompts import ChatPromptTemplate
            from langchain_core.runnables import RunnablePassthrough
            from langchain_core.output_parsers import StrOutputParser
            from langchain.text_splitter import RecursiveCharacterTextSplitter
            from langchain_community.vectorstores import Chroma
            from langchain_community.embeddings import HuggingFaceBgeEmbeddings

            self.llm = ChatGroq(
                api_key=settings.GROQ_API_KEY,
                model="llama-3.1-8b-instant",
                temperature=0.7,
            )

            # Create embeddings using a local model
            embeddings = HuggingFaceBgeEmbeddings(
                model_name="BAAI/bge-small-zh-v1.5",
                model_kwargs={"device": "cpu"},
                encode_kwargs={"normalize_embeddings": True},
            )

            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=500,
                chunk_overlap=50,
            )
            texts = text_splitter.split_text(FINANCE_KNOWLEDGE)

            vectorstore = Chroma.from_texts(
                texts=texts,
                embedding=embeddings,
                persist_directory=f"/tmp/chroma_groq_{self.user_id}",
            )

            retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

            prompt_template = """Bạn là một chuyên gia tư vấn tài chính cá nhân.
Dựa trên thông tin sau, hãy trả lời câu hỏi của người dùng một cách hữu ích và chi tiết.

Ngữ cảnh:
{context}

Câu hỏi: {question}

Trả lời (bằng tiếng Việt):"""

            prompt = ChatPromptTemplate.from_template(prompt_template)

            self.qa_chain = (
                {"context": retriever, "question": RunnablePassthrough()}
                | prompt
                | self.llm
                | StrOutputParser()
            )
        except Exception as e:
            print(f"Groq setup failed: {e}")
            self.qa_chain = None

    def _setup_ollama(self):
        if not LANGCHAIN_OLLAMA_AVAILABLE:
            return
        try:
            self.llm = Ollama(
                model="llama3",
                base_url=settings.OLLAMA_BASE_URL,
                temperature=0.7,
            )

            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=500,
                chunk_overlap=50,
            )
            texts = text_splitter.split_text(FINANCE_KNOWLEDGE)

            embeddings = OllamaEmbeddings(
                model="llama3",
                base_url=settings.OLLAMA_BASE_URL,
            )

            vectorstore = Chroma.from_texts(
                texts=texts,
                embedding=embeddings,
                persist_directory=f"/tmp/chroma_ollama_{self.user_id}",
            )

            from langchain.prompts import PromptTemplate
            prompt_template = """Bạn là một chuyên gia tư vấn tài chính cá nhân.
Dựa trên thông tin sau, hãy trả lời câu hỏi của người dùng một cách hữu ích và chi tiết.

Ngữ cảnh:
{context}

Câu hỏi: {question}

Trả lời (bằng tiếng Việt):"""

            PROMPT = PromptTemplate(
                template=prompt_template,
                input_variables=["context", "question"],
            )

            from langchain.chains.combine_documents import create_stuff_documents_chain
            document_chain = create_stuff_documents_chain(self.llm, PROMPT)
            from langchain.chains.retrieval import create_retrieval_chain
            retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
            self.qa_chain = create_retrieval_chain(retriever, document_chain)
        except Exception as e:
            print(f"Ollama setup failed: {e}")
            self.qa_chain = None

    def chat(self, message: str) -> dict:
        if self.qa_chain is None:
            response = self._fallback_response(message)
            return {"response": response, "sources": []}

        try:
            result = self.qa_chain.invoke(message)
            if isinstance(result, str):
                return {"response": result, "sources": []}
            return {
                "response": result.get("answer", result),
                "sources": [],
            }
        except Exception as e:
            print(f"Chat error: {e}")
            return {"response": self._fallback_response(message), "sources": []}

    def _fallback_response(self, message: str) -> str:
        msg_lower = message.lower()
        if any(kw in msg_lower for kw in ["tiết kiệm", "tiet kiem", "save"]):
            return (
                "Để tiết kiệm hiệu quả, bạn nên:\n"
                "1. Áp dụng quy tắc 50/30/20: 50% thu nhập cho nhu cầu, 30% cho mong muốn, 20% cho tiết kiệm.\n"
                "2. Tự động chuyển tiền tiết kiệm ngay khi nhận lương.\n"
                "3. Theo dõi chi tiêu hàng ngày để phát hiện khoản chi không cần thiết.\n"
                "4. Thiết lập quỹ khẩn cấp bằng 3-6 tháng chi phí sinh hoạt."
            )
        elif any(kw in msg_lower for kw in ["đầu tư", "dau tu", "invest"]):
            return (
                "Về đầu tư cơ bản:\n"
                "1. Đa dạng hóa danh mục để giảm rủi ro.\n"
                "2. Đầu tư định kỳ (dollar-cost averaging) thay vì all-in.\n"
                "3. ETF và quỹ chỉ số là lựa chọn tốt cho người mới bắt đầu.\n"
                "4. Đầu tư dài hạn, không react theo biến động ngắn hạn.\n"
                "5. Hiểu rõ mức độ rủi ro bạn có thể chấp nhận."
            )
        elif any(kw in msg_lower for kw in ["ngân sách", "ngan sach", "budget", "chi tiêu", "chi tieu"]):
            return (
                "Để quản lý ngân sách hiệu quả:\n"
                "1. Ghi chép mọi khoản thu chi hàng ngày.\n"
                "2. Phân loại chi tiêu theo danh mục (ăn uống, di chuyển, giải trí...).\n"
                "3. Đặt giới hạn chi tiêu cho từng danh mục.\n"
                "4. Đánh giá và điều chỉnh ngân sách hàng tháng.\n"
                "5. Ưu tiên chi tiêu cho nhu cầu thiết yếu trước."
            )
        elif any(kw in msg_lower for kw in ["nợ", "no", "trả nợ", "tra no", "debt"]):
            return (
                "Về quản lý nợ:\n"
                "1. Ưu tiên trả nợ lãi suất cao trước (phương pháp avalanche).\n"
                "2. Hoặc trả nợ nhỏ trước để tạo động lực (phương pháp snowball).\n"
                "3. Không tích lũy thêm nợ mới trong khi trả nợ cũ.\n"
                "4. Thương lượng lãi suất thấp hơn với ngân hàng nếu có thể."
            )
        elif any(kw in msg_lower for kw in ["quỹ khẩn cấp", "quy khan cap", "emergency"]):
            return (
                "Quỹ khẩn cấp nên có:\n"
                "1. Số tiền bằng 3-6 tháng chi phí sinh hoạt.\n"
                "2. Đặt trong tài khoản tiết kiệm dễ truy cập.\n"
                "3. Chỉ sử dụng cho trường hợp thực sự khẩn cấp (mất việc, bệnh tật, sửa nhà gấp).\n"
                "4. Bổ sung lại quỹ sau khi sử dụng."
            )
        else:
            return (
                "Tôi có thể tư vấn về:\n"
                "- Tiết kiệm và quỹ khẩn cấp\n"
                "- Lập kế hoạch ngân sách\n"
                "- Quản lý và trả nợ\n"
                "- Đầu tư cơ bản\n"
                "- Mục tiêu tài chính\n\n"
                "Bạn muốn hỏi về chủ đề nào?"
            )
