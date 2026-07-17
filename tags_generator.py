import os
import time
from enum import Enum
from io import text_encoding

from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel, Field

load_dotenv()

AI_MODEL = "gpt-5.6-luna"
API_KEY = os.getenv("GPT_API_KEY")
QUOTES = [
    # gluttony, self control, temptation
    "Where there is surfeiting, there the devils surely hold their choirs.",
    # despair, temptation, hope
    "The devil will tell you that you are sinful, to make you despair. You should answer him abruptly saying: 'What's that to you? When I want to say that I am a sinner I will and not when the devil wishes'; because when the devil wishes he'll bring me to despair.",
    # prayer
    "Do not forget prayer—it is the life of the soul.",
    # truthfulness, integrity, persecution
    "Adorn yourself with truth, try to speak truth in all things; and do not support a lie, no matter who asks you. If you speak the truth and someone gets mad at you, don't be upset, but take comfort in the words of the Lord: 'Blessed are those who are persecuted for the sake of truth, for theirs is the kingdom of Heaven.'",
    # prayer, diligence
    "Never miss daily prayer. There is no excuse for not spending some of your time with God, for He is there for you always. Every day of missed prayer is a step backwards.",
    # lust, love, truthfulness
    "Man was made to rise, above curiosity and lust, to love, and through love to the attainment of truth.",
]


class Tag(str, Enum):
    # Spiritual life and theology
    THEOSIS = "theosis"
    FAITH = "faith"
    HOPE = "hope"
    GRACE = "grace"
    SALVATION = "salvation"

    # Virtues and character
    HUMILITY = "humility"
    OBEDIENCE = "obedience"
    VIRTUES = "virtues"
    COMPASSION = "compassion"
    WISDOM = "wisdom"
    REPENTEANCE = "repentance"
    LOVE = "love"
    SERVICE = "service"
    MERCY = "mercy"
    GRATITUDE = "gratitude"
    COURAGE = "courage"
    PEACE = "peace"
    JOY = "joy"
    GOODNESS = "goodness"
    SELF_CONTROL = "self_control"
    LONG_SUFFERING = "long-suffering"

    # Spiritual practices
    FASTING = "fasting"
    ALMSGIVING = "almsgiving"
    PRAYER = "prayer"
    READING = "reading"
    CHURCH_ATTENDANCE = "church_attendance"
    CONFESSION = "confession"
    COMMUNION = "communion"
    WORSHIP = "worship"
    SILENCE = "silence"
    SOLITUDE = "solitude"
    WATCHFULNESS = "watchfulness"
    DISCERNMENT = "discernment"
    DRYNESS = "dryness"

    # Thoughts and emotions
    ANGER = "anger"
    FEAR = "fear"
    DESPAIR = "despair"
    DOUBT = "doubt"
    LONELINESS = "loneliness"
    PRIDE = "pride"
    ENVY = "envy"
    SHAME = "shame"
    DISTRACTION = "distraction"

    # Temptations and habits
    TEMPTATION = "temptation"
    LUST = "lust"
    GREED = "greed"
    GLUTTONY = "gluttony"
    LAZINESS = "laziness"
    CONTENTMENT = "contentment"
    SIMPLICITY = "simplicity"

    # Speech and relationships
    COMMUNITY = "community"
    FAMILY = "family"
    MARRIAGE = "marriage"
    FORGIVENESS = "forgiveness"
    FRIENDSHIP = "friendship"
    PARENTING = "parenting"
    CHILDREN = "children"
    HOSPITALITY = "hospitality"
    GOSSIP = "gossip"
    JUDGEMENT = "judgement"
    TRUTHFULNESS = "truthfulness"
    LISTENING = "listening"
    ENCOURAGEMENT = "encouragement"

    # Work and daily responsibilities
    WORK = "work"
    MONEY = "money"
    STEWARDSHIP = "stewardship"
    DILIGENCE = "diligence"
    REST = "rest"
    RESPONSIBILITY = "responsibility"
    INTEGRITY = "integrity"

    # Hardship and mortality
    SUFFERING = "suffering"
    ILLNESS = "illness"
    DEATH = "death"
    FAILURE = "failure"
    PERSECUTION = "persecution"
    INJUSTICE = "injustice"
    BURNOUT = "burnout"


class TagSchema(BaseModel):
    tags: list[Tag] = Field(min_length=1, max_length=3)


def initialize_model() -> OpenAI:
    client = OpenAI(api_key=API_KEY)

    if client.api_key == "":
        raise ValueError("API key is not set")
    elif not client:
        raise ValueError("Client not initialized")

    return client


def generate_tags(client: OpenAI, quotes: list[str]) -> list[TagSchema]:
    tags: list[TagSchema] = []

    for quote in quotes:
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

    return tags


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
            print(f"Index {i}: {tag_values1} != {tag_values2}")


def main():
    client = initialize_model()

    # test_model_time(client)

    tag_schema1 = generate_tags(client, QUOTES)
    tag_schema2 = generate_tags(client, QUOTES)

    if tag_schema1 == tag_schema2:
        print("Tag schemas are identical")
    else:
        print("Tag schemas are different")

    # print("\n".join(f"{index}: {tags}" for index, tags in enumerate(tag_schema1)))
    # print("\n".join(f"{index}: {tags}" for index, tags in enumerate(tag_schema2)))

    print_differences(tag_schema1, tag_schema2)


if __name__ == "__main__":
    main()
