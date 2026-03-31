from openai import OpenAI


def main() -> None:
    client = OpenAI(
        base_url="http://localhost:8321/v1",
        api_key="not-required-for-local-llama-stack",
    )
    response = client.responses.create(
        model="openai/gpt-5.4",
        input="Write a short explanation of how Llama Stack routes this request.",
    )
    print(response.output_text)


if __name__ == "__main__":
    main()
