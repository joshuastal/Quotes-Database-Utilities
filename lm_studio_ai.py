from enum import Enum

import lmstudio as lms

# from lmstudio.json_api import AnyPrediction
from pydantic import BaseModel, Field

"""
    Set load parameters

    client = lms.get_default_client()
    model = client.llm.load_new_instance(AI_MODEL, config={})
"""

"""
    Possible config settings:
    {
        "temperature":
        "maxTokens":
        "contextLength":
        "gpu": {
            "ratio":
    }
        ...

    https://lmstudio.ai/docs/typescript/api-reference/llm-load-model-config
"""

AI_MODEL = "google/gemma-4-26b-a4b-qat"


class Tag(str, Enum):
    # Spiritual life and theology
    SPIRITUAL_LIVING = "spiritual_living"
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
    ANXIETY = "anxiety"
    FEAR = "fear"
    DESPAIR = "despair"
    DOUBT = "doubt"
    GRIEF = "grief"
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
    ADDICTION = "addiction"
    MODERATION = "moderation"
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


def initialize_model(ai_model: str) -> lms.LLM:
    loaded_models = lms.list_loaded_models("llm")

    for model in loaded_models:
        # if the current item in loaded_models is an LLM AND is the model we want
        if isinstance(model, lms.LLM) and model.identifier == ai_model:
            print(f"{ai_model} already loaded.")
            return model

    print(f"Model {ai_model} not found. Loading...")
    return lms.llm(ai_model, config={"contextLength": 8192})


def generate_tags(quotes: list[str], model: lms.LLM):
    for quote in quotes:
        prompt = f"""
        Return between one and three tags. Do not add a tag merely to reach
        three. Every selected tag must be directly supported by the quote.

        Do not repeat tags. All tags must be unique.

        Identify unique 3 tags based off of this quote:

        {quote}
        """

        # Initial prompt
        chat = lms.Chat(
            "You classify quotations by their concrete, directly supported topics."
        )

        # Full prompt
        chat = lms.Chat(prompt)

        result_stream = model.respond(
            chat,
            response_format=TagSchema,
            config={"temperature": 1.0, "maxTokens": 50},
        )

        tags = result_stream.parsed["tags"]

        if len(tags) != len(set(tags)):
            print("Warning: Tags are not unique")
        else:
            print(tags)


def main():

    model = initialize_model(AI_MODEL)

    quotes = [
        # gluttony, self control, temptation
        "Where there is surfeiting, there the devils surely hold their choirs.",
        # despair, temptation, hope
        "The devil will tell you that you are sinful, to make you despair. You should answer him abruptly saying: 'What's that to you? When I want to say that I am a sinner I will and not when the devil wishes'; because when the devil wishes he'll bring me to despair.",
        # prayer, spiritual living
        "Do not forget prayer—it is the life of the soul.",
        # truthfulness, integrity, persecution
        "Adorn yourself with truth, try to speak truth in all things; and do not support a lie, no matter who asks you. If you speak the truth and someone gets mad at you, don't be upset, but take comfort in the words of the Lord: 'Blessed are those who are persecuted for the sake of truth, for theirs is the kingdom of Heaven.'",
        # prayer, diligence
        "Never miss daily prayer. There is no excuse for not spending some of your time with God, for He is there for you always. Every day of missed prayer is a step backwards.",
        # lust, love, truthfulness
        "Man was made to rise, above curiosity and lust, to love, and through love to the attainment of truth.",
    ]

    generate_tags(quotes, model)

    # cancelled = False

    # for fragment in result_stream:
    #     if cancelled:
    #         result_stream.cancel()
    #     print(fragment.content, end="", flush=True)


if __name__ == "__main__":
    main()
