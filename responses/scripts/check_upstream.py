from llama_stack_client import LlamaStackClient


def main() -> None:
    base_url = "http://localhost:8321"
    client = LlamaStackClient(base_url=base_url)
    models = client.models.list()
    print(f"Connected to {base_url}")
    print("Available models:")
    for model in models:
        identifier = getattr(model, "identifier", None) or getattr(model, "model_id", None)
        provider = getattr(model, "provider_id", None)
        print(f"- {identifier} (provider={provider})")


if __name__ == "__main__":
    main()
