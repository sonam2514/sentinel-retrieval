# import pytest

# from src.llm import LLMError, answer_question


# class FakeResponse:
#     def raise_for_status(self):
#         return None

#     def json(self):
#         return {"response": "Asthma can cause wheezing. [Source 1]"}


# class FakeSession:
#     def post(self, url, **kwargs):
#         self.url = url
#         self.payload = kwargs["json"]
#         return FakeResponse()


# def test_answer_question_sends_retrieved_context_to_ollama():
#     session = FakeSession()
#     answer = answer_question(
#         "What can asthma cause?",
#         [{"text": "Asthma can cause wheezing.", "title": "Medical text"}],
#         session=session,
#     )

#     assert answer == "Asthma can cause wheezing. [Source 1]"
#     assert session.url.endswith("/api/generate")
#     assert "Asthma can cause wheezing." in session.payload["prompt"]
#     assert session.payload["stream"] is False


# def test_answer_question_rejects_empty_context():
#     with pytest.raises(LLMError, match="No retrieved context"):
#         answer_question("What is asthma?", [], session=FakeSession())
from src.llm import answer_with_retrieval

answer = answer_with_retrieval("What are the symptoms of asthma?")
print(answer)