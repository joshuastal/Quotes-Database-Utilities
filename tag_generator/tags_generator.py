import json
import os
import time
from concurrent.futures import ThreadPoolExecutor
from threading import Event

from dotenv import load_dotenv
from openai import OpenAI

from progress_bar import ProgressBar
from Quote import Quote
from .output_colors import DiffColors
from .tag_data import TagSchema

load_dotenv()
print("Environment Variables Loaded...\n")
AI_MODEL = "gpt-5.6-luna"
API_KEY = os.getenv("GPT_API_KEY")
QUOTES: list[Quote] = [
    Quote(Author="", Quote=quote) for quote in json.loads(os.getenv("QUOTES", "[]"))
]


class TagGenerator:
    def __init__(self):
        self.client = self.initialize_model()

    def initialize_model(self) -> OpenAI:
        client = OpenAI(api_key=API_KEY)

        if client.api_key == "":
            raise ValueError(DiffColors.FAIL + "API key is not set")
        elif not client:
            raise ValueError(DiffColors.FAIL + "Client not initialized")

        print(DiffColors.GREEN + "Model Initialized...\n" + DiffColors.ENDC)
        return client

    def _generate_tags(
            self,
            client: OpenAI,
            quote: Quote,
            progress_bar: ProgressBar,
            stop_event: Event,
    ) -> TagSchema:
        if stop_event.is_set():
            raise RuntimeError("Tag generation was stopped")

        try:
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

                    {quote.quote}
                """

            tag_response = client.responses.parse(
                model=AI_MODEL,
                instructions=(
                    "You are a content classification specialist. "
                    "You specialize in classifying and tagging content."
                ),
                input=prompt,
                reasoning={"effort": "low"},
                max_output_tokens=500,
                text_format=TagSchema,
            )

            parsed_tags = tag_response.output_parsed

            if parsed_tags is None:
                print("Invalid schema generated for quote:", quote.quote)
                raise RuntimeError(
                    f"No parsed tags for quote: {quote.quote!r}; "
                    f"status={tag_response.status!r}; "
                    f"incomplete_details={tag_response.incomplete_details!r}; "
                    f"output={tag_response.output!r}"
                )

            progress_bar.increment()
            return parsed_tags  # pyright: ignore

        except Exception:
            stop_event.set()
            raise

    def generate_tags_multithreaded(
            self, client: OpenAI, quotes: list[Quote], runs: int, max_workers: int = 8
    ) -> list[list[TagSchema]]:

        if runs < 1:
            raise ValueError("runs must be at least 1")

        # if 3 quotes with 2 runs, 6 tasks need to be run since this does each quote as its own task now
        total_tasks = len(quotes) * runs
        if total_tasks == 0:
            raise ValueError("No quotes to classify")

        progress_bar = ProgressBar(total_tasks, prefix="Classifying Quotes ")
        progress_bar.update_progress(0)  # pyright: ignore

        stop_event = Event()

        # With two runs:
        # [quote 1, quote 2, ..., quote 600,
        #  quote 1, quote 2, ..., quote 600]
        # adds runs copies of each quote to the list
        work_quotes = [
            quote
            for _ in range(runs)
            for quote in quotes
        ]

        # use ThreadPoolExecutor as context manager
        # When block finishes, it waits for the submitted tasks
        # and shuts down the pool
        # min(...) -> use whichever is smaller
        with ThreadPoolExecutor(max_workers=min(max_workers, total_tasks)) as executor:
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
            
            .map(...) also returns input results in the order of which they were created
            """

            flat_results = list(
                executor.map(
                    self._generate_tags,
                    [client] * total_tasks,
                    work_quotes,
                    [progress_bar] * total_tasks,
                    [stop_event] * total_tasks,
                )
            )
        quote_count = len(quotes)

        # Turn the flat list back into one list per run.
        # list[TagSchema] = result for one run
        # list[list[TagSchema]] = result for all runs
        results_by_run: list[list[TagSchema]] = []

        # Put 1 list with the first quote_count tag schemas into the first index
        # The next index will contain the next quote_count tag schemas and so on and so forth
        # results_by_run[0] will contain the results from the first run over the whole list
        # results_by_run[1] will contain the results from the second run over the whole list
        # ...
        for run_index in range(runs):
            start = run_index * quote_count
            stop = (run_index + 1) * quote_count

            # results_by_run contains lists, so we append lists to it as its objects
            one_run = flat_results[start:stop]
            results_by_run.append(one_run)

        return results_by_run

    def print_differences(self, list1: list[TagSchema], list2: list[TagSchema]):
        total_diff_schemas = 0

        def format_tag(tag: str) -> str:
            if tag in different_tags:
                return DiffColors.FAIL + tag + DiffColors.ENDC
            return tag

        different_tags: set[str] = set()

        for i, (tag1, tag2) in enumerate(zip(list1, list2)):
            tag_values1 = sorted(tag.value for tag in tag1.tags)
            tag_values2 = sorted(tag.value for tag in tag2.tags)

            # set(list1) ^ set(list2) calculates the symmetric differences between 2 sets
            different_tags = set(tag_values1) ^ set(tag_values2)

            tag1_diffs = [format_tag(tag) for tag in tag_values1]
            tag2_diffs = [format_tag(tag) for tag in tag_values2]

            if not different_tags:
                continue

            print(
                f"Index {i}: [{', '.join(tag1_diffs)}] != [{', '.join(tag2_diffs)}] | {len(different_tags)} different tags")
            total_diff_schemas += 1
        print(f"\nTotal different schemas: {total_diff_schemas}")

    def print_differences_by_index(self, tag_schema1: TagSchema, tag_schema2: TagSchema):
        def format_tag(tag: str) -> str:
            if tag in different_tags:
                return DiffColors.FAIL + tag + DiffColors.ENDC
            return tag

        different_tags: set[str] = set()

        tag_values1 = sorted(tag.value for tag in tag_schema1.tags)
        tag_values2 = sorted(tag.value for tag in tag_schema2.tags)

        different_tags = set(tag_values1) ^ set(tag_values2)

        tag1_diffs = [format_tag(tag) for tag in tag_values1]
        tag2_diffs = [format_tag(tag) for tag in tag_values2]

        if not different_tags:
            return

        print(f"[{', '.join(tag1_diffs)}] != [{', '.join(tag2_diffs)}] | {len(different_tags)} different tags")

    def print_tag_schema(self, tag_schema: list[TagSchema]):
        for index, tags in enumerate(tag_schema):
            print(f"{index}: {[tag.value for tag in tags.tags]}")


def main():
    tg = TagGenerator()

    start = time.time()

    runs = 2

    tag_schema1, tag_schema2 = tg.generate_tags_multithreaded(tg.client, QUOTES, runs)

    end = time.time()

    print("\nTag Schema 1:")
    tg.print_tag_schema(tag_schema1)
    print()

    print("Tag Schema 2:")
    tg.print_tag_schema(tag_schema2)
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
        tg.print_differences(tag_schema1, tag_schema2)

    print(f"\nTime taken: {end - start:.0f} seconds")


if __name__ == "__main__":
    main()
