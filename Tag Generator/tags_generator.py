import itertools
import json
import os
import threading
import time

from dotenv import load_dotenv
from openai import OpenAI
from tag_data import TagSchema

load_dotenv()

AI_MODEL = "gpt-5.6-luna"
API_KEY = os.getenv("GPT_API_KEY")
QUOTES: list[str] = json.loads(os.getenv("QUOTES", "[]"))


def initialize_model() -> OpenAI:
    client = OpenAI(api_key=API_KEY)

    if client.api_key == "":
        raise ValueError("API key is not set")
    elif not client:
        raise ValueError("Client not initialized")

    return client


def generate_tags(client: OpenAI, quotes: list[str]) -> list[TagSchema]:
    tags: list[TagSchema] = []

    for index, quote in enumerate(quotes, 1):
        prompt = f"""
        Select between one and three unique tags that would help someone find this
        quote while browsing by practical topic.

        A tag is supported when the quote:
        1. directly discusses the topic,
        2. warns against the opposite vice or behavior, or
        3. clearly teaches the corresponding virtue or practical response.

        When more than three tags apply, prioritize:
        1. the central subject,
        2. the behavior or virtue being taught,
        3. the principal struggle or consequence.

        Apply these distinctions:
        - self_control applies to warnings against excess or indulgence.
        - temptation applies when demonic influence or enticement toward sin is central.
        - hope applies when the quote teaches resistance to despair.
        - integrity applies when someone remains truthful despite pressure or consequences.
        - courage applies only when confronting fear or danger is itself a central subject.
        - Prefer integrity over courage when the central lesson is refusing to lie.

        Do not add merely associated religious concepts.

        Identify unique 3 tags based off of this quote:

        {quote}
        """

        message = f"Classifying quote: {index}/{len(quotes)}"
        stop_event = threading.Event()
        spinner_thread = threading.Thread(
            target=show_spinner, args=(message, stop_event), daemon=True
        )
        spinner_thread.start()

        try:
            tag_response = client.responses.parse(
                model=AI_MODEL,
                instructions=(
                    "You are a content classification specialist. "
                    "You specialize in classifying and tagging content."
                ),
                input=prompt,
                reasoning={"effort": "high"},
                max_output_tokens=500,
                text_format=TagSchema,
            )

            tags.append(tag_response.output_parsed)  # pyright: ignore

        finally:
            stop_event.set()
            spinner_thread.join()
            print(f"\r{message} done")

    return tags


def show_spinner(message: str, stop_event: threading.Event):
    for symbol in itertools.cycle("|/-\\"):
        if stop_event.wait(0.1):
            break

        print(f"\r{message} {symbol}", end="", flush=True)


def test_model_time(client: OpenAI):
    total_time = 0

    print("Starting Test")
    print("=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=")

    for _ in range(5):
        start_time = time.time()

        text_response = client.responses.create(
            model=AI_MODEL,
            input="Tell me a joke about Python programming",
            reasoning={"effort": "medium"},
            max_output_tokens=50,
        )

        end_time = time.time()

        total_time += end_time - start_time

        print(f"Response: {text_response.output_text}\n")

    print("=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=")
    print(f"Average time: {total_time / 5:.2f} seconds")


def print_differences(list1: list[TagSchema], list2: list[TagSchema]):
    for i, (tag1, tag2) in enumerate(zip(list1, list2)):
        tag_values1 = sorted(tag.value for tag in tag1.tags)
        tag_values2 = sorted(tag.value for tag in tag2.tags)

        if tag_values1 != tag_values2:
            print(f"Index {i + 1}: {tag_values1} != {tag_values2}")


def print_tag_schema(tag_schema: list[TagSchema]):
    for index, tags in enumerate(tag_schema):
        print(f"{index}: {[tag.value for tag in tags.tags]}")


def main():
    client = initialize_model()

    # test_model_time(client)

    tag_schema1 = generate_tags(client, QUOTES)
    tag_schema2 = generate_tags(client, QUOTES)

    if tag_schema1 == tag_schema2:
        print("Tag schemas are identical")
    else:
        print("Tag schemas are different")

    print_differences(tag_schema1, tag_schema2)

    print("Tag Schema 1: ")
    print_tag_schema(tag_schema1)
    print()
    print("Tag Schema 2: ")
    print_tag_schema(tag_schema2)


if __name__ == "__main__":
    main()
