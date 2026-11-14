class DomainError(Exception):
    code = "domain_error"
    message = "Request failed"

    def __init__(self, message: str | None = None) -> None:
        if message is not None:
            self.message = message
        super().__init__(self.message)


class ModelFailure(DomainError):
    code = "model_failure"
    message = "Language model failed"


class EmbeddingsFailure(ModelFailure):
    code = "embeddings_failure"
    message = "Embeddings service unavailable"


class DecisionFailure(ModelFailure):
    code = "decision_failure"
    message = "Decision model failed"


class InvalidQuestion(DomainError):
    code = "invalid_question"
    message = "Decision question is invalid"


class DataUnavailable(DomainError):
    code = "data_unavailable"
    message = "Forecast data is unavailable"

    def __init__(self, issues: tuple[str, ...] = ()) -> None:
        self.issues = issues
        super().__init__(f"{self.message}: {len(issues)} issues" if issues else None)


class PipeNotFound(DomainError):
    code = "pipe_not_found"
    message = "Pipe is not a forecast target"


class SegmentNotFound(DomainError):
    code = "segment_not_found"
    message = "Segment does not exist on this pipe"


class InvalidRange(DomainError):
    code = "invalid_range"
    message = "Distance range is invalid"
