import json
import os
import time
from concurrent.futures import ThreadPoolExecutor

from dotenv import load_dotenv
from openai import OpenAI

from output_colors import DiffColors
from progress_bar import ProgressBar
from tag_data import TagSchema

load_dotenv()
print("Environment Variables Loaded...\n")
AI_MODEL = "gpt-5.6-luna"
API_KEY = os.getenv("GPT_API_KEY")
QUOTES: list[str] = json.loads(os.getenv("QUOTES", "[]"))


def initialize_model() -> OpenAI:
    client = OpenAI(api_key=API_KEY)

    if client.api_key == "":
        raise ValueError(DiffColors.FAIL + "API key is not set")
    elif not client:
        raise ValueError(DiffColors.FAIL + "Client not initialized")

    print(DiffColors.GREEN + "Model Initialized...\n" + DiffColors.ENDC)
    return client


def generate_tags(
        client: OpenAI, quotes: list[str], progress_bar: ProgressBar
) -> list[TagSchema]:
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
        progress_bar.increment()

    return tags


def print_differences(list1: list[TagSchema], list2: list[TagSchema]):
    def format_tag(tag: str) -> str:
        if tag in different_tags:
            return DiffColors.FAIL + tag + DiffColors.ENDC
        return tag

    for i, (tag1, tag2) in enumerate(zip(list1, list2)):
        tag_values1 = sorted(tag.value for tag in tag1.tags)
        tag_values2 = sorted(tag.value for tag in tag2.tags)

        # set(list1) ^ set(list2) calculates the symmetric differences between 2 sets
        different_tags = set(tag_values1) ^ set(tag_values2)

        tag1_diffs = [format_tag(tag) for tag in tag_values1]
        tag2_diffs = [format_tag(tag) for tag in tag_values2]

        if not different_tags:
            continue

        print(f"Index {i}: [{', '.join(tag1_diffs)}] != [{', '.join(tag2_diffs)}]")


def print_tag_schema(tag_schema: list[TagSchema]):
    for index, tags in enumerate(tag_schema):
        print(f"{index}: {[tag.value for tag in tags.tags]}")


def main():
    client = initialize_model()

    start = time.time()

    RUNS = 2

    progress_bar = ProgressBar(len(QUOTES) * RUNS, prefix="Classifying Quotes ")
    progress_bar.update_progress(0)

    # use ThreadPoolExecutor as context manager
    # When block finishes, it waits for the submitted tasks
    # and shuts down the pool
    with ThreadPoolExecutor() as executor:
        """
        executor.map calls generate_tags() once for each pair of arguments
        it's call structure looks like this:
        .map(
          function,
          [iterable of arguments for the 1st argument in the function],
          [iterable of arguments for the 2nd argument in the function]
        )

        executor.map(...) schedules the calls and returns a result iterator.
        list(...) consumes that iterator and collects its results.

        .map returns one iterator object that can yield multiple results,
        one for each function call scheduled

        without list(...), results refers directly to the iterator returned by
        executor.map(...), which can be consumed with a for loop:
            for result in results:
                print(result)

        or to use it to retrieve individual results (no for loop):
            first_result = next(results)
            second_result = next(results)

        in this case, if the corresponding task has not finished when next(results) is called,
        the program will wait.

        the current results list(...) is equivalent to:

            result_iterator = executor.map(
                generate_tags,
                [client, client],
                [QUOTES, QUOTES],
            )

            results = []

            for result in result_iterator:
                results.append(result)

        without list(...), the functions are still scheduled and called.
        results can be retrieved one at a time by iterating over the returned
        iterator. Retrieving a result waits for the corresponding task in input
        order, but other tasks may still be running.

        executor.map(...) always returns an iterator.
        Without list(...), results refers directly to that iterator.
        With list(...), results is a list, and code after the list(...) call
        runs only after all mapped results have been collected successfully.
        """

        results = list(
            executor.map(
                generate_tags, [client] * RUNS, [QUOTES] * RUNS, [progress_bar] * RUNS
            )
        )

    tag_schema1, tag_schema2 = results
    end = time.time()

    print("\nTag Schema 1:")
    print_tag_schema(tag_schema1)
    print()

    print("Tag Schema 2:")
    print_tag_schema(tag_schema2)
    print()

    if all(  # all(...) returns True when every value inside it is True
            # each schema is a list of tags
            # check each tag in each sorted list and compare the item in the
            # same index in the other list
            sorted(tag.value for tag in schema1.tags)
            == sorted(tag.value for tag in schema2.tags)
            for schema1, schema2 in zip(tag_schema1, tag_schema2, strict=True)
    ):
        print(DiffColors.GREEN + "Tag schemas are identical" + DiffColors.ENDC)
    else:
        print(DiffColors.FAIL + "Tag schemas are different" + DiffColors.ENDC)
        print_differences(tag_schema1, tag_schema2)

    print(f"\nTime taken: {end - start:.0f} seconds")


if __name__ == "__main__":
    main()
