"""Buffer transport for creating and verifying undated drafts."""

from __future__ import annotations

import http.client
import json

from ice.publishing_queue import BufferError, wire_payload

CREATE_DRAFT = """
mutation CreateDraft($input: CreatePostInput!) {
  createPost(input: $input) {
    __typename
    ... on PostActionSuccess { post { id } }
    ... on MutationError { message }
  }
}
"""
GET_DRAFT = """
query GetDraft($input: PostInput!) {
  post(input: $input) { id channelId status dueAt text assets { source mimeType } }
}
"""


class BufferAPI:
    def __init__(self, token: str):
        self.token = token

    def create(self, payload: dict) -> dict:
        if payload.get("saveToDraft") is not True or payload.get("mode") != "addToQueue" or "dueAt" in payload:
            raise BufferError("Buffer transport accepts undated drafts only", retryable=False)
        if payload.get("visualRequired") and not payload.get("assets"):
            raise BufferError("Buffer transport requires visual media", retryable=False)
        result = self._request(CREATE_DRAFT, {"input": wire_payload(payload)}, write=True).get("createPost") or {}
        if result.get("message") and not result.get("post"):
            raise BufferError("Buffer rejected the draft (" + result["__typename"] + ")", retryable=False)
        post_id = (result.get("post") or {}).get("id")
        if not post_id:
            raise BufferError("Buffer did not confirm a post ID", ambiguous=True)
        try:
            return self.get_post(post_id)
        except BufferError as exc:
            raise BufferError("Buffer returned a post ID but readback failed", ambiguous=True, post_id=post_id) from exc

    def get_post(self, post_id: str) -> dict:
        post = self._request(GET_DRAFT, {"input": {"id": post_id}}).get("post")
        if not post or post.get("id") != post_id:
            raise BufferError("Buffer did not return the requested post", retryable=False)
        return post

    def _request(self, query: str, variables: dict, *, write: bool = False) -> dict:
        connection = http.client.HTTPSConnection("api.buffer.com", timeout=20)
        try:
            connection.request(
                "POST", "/",
                json.dumps({"query": query, "variables": variables}),
                {"Content-Type": "application/json", "Authorization": "Bearer " + self.token},
            )
            reply = connection.getresponse()
            if reply.status in {401, 403}:
                raise BufferError("Buffer authorization failed", retryable=False)
            if reply.status == 429:
                raise BufferError("Buffer rate limited the request")
            if reply.status != 200:
                raise BufferError(f"Unexpected Buffer HTTP status {reply.status}", ambiguous=write)
            response = json.loads(reply.read())
        except (OSError, http.client.HTTPException, ValueError) as exc:
            raise BufferError("Buffer response unavailable", ambiguous=write) from exc
        finally:
            connection.close()
        if not isinstance(response, dict) or response.get("errors") or not isinstance(response.get("data"), dict):
            raise BufferError("Buffer returned an unconfirmed GraphQL response", ambiguous=write)
        return response["data"]
